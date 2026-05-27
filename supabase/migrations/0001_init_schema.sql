-- =============================================================================
-- Tigim — migration 0001: initial schema
-- =============================================================================
-- Что внутри:
--   • companies + multi-tenancy (каждая бизнес-таблица знает свою company_id)
--   • profiles 1:1 с auth.users + автотриггер
--   • company_members (m:n profiles <-> companies + role)
--   • employees, materials, material_movements
--   • orders, order_sizes, order_stages
--   • defects, activity_events
--   • leads (заявки с лендинга)
--   • helpers: set_updated_at(), user_company_ids(), create_company(), next_order_number()
--
-- ВАЖНО:
--   В конце мы включаем RLS для всех таблиц БЕЗ политик — это «default deny».
--   До миграции 0002 (RLS policies) anon-ключ не сможет читать/писать вообще.
--   Это намеренно — защищает данные пока политики не настроены.
-- =============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";


-- ---------- Helper: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------- Profiles 1:1 with auth.users ----------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- Companies (tenant root) ----------
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  address         text,
  currency        text not null default 'KGS',
  timezone        text not null default 'Asia/Bishkek',
  plan            text not null default 'trial'
                  check (plan in ('trial','start','pro','factory')),
  trial_ends_at   timestamptz default (now() + interval '14 days'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_companies_updated
  before update on public.companies
  for each row execute function public.set_updated_at();


-- ---------- Company members (m:n profiles <-> companies) ----------
create type public.company_role as enum (
  'owner','manager','master','warehouse','qc','staff'
);

create table public.company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.company_role not null default 'staff',
  created_at  timestamptz not null default now(),
  unique (company_id, user_id)
);
create index idx_company_members_user on public.company_members(user_id);
create index idx_company_members_company on public.company_members(company_id);


-- Helper: company_ids the current user belongs to (used heavily in RLS)
create or replace function public.user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.company_members where user_id = auth.uid();
$$;


-- Atomic "create company + add me as owner" RPC
create or replace function public.create_company(
  p_name    text,
  p_phone   text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name, phone, address)
  values (p_name, p_phone, p_address)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'owner');

  return v_company_id;
end;
$$;


-- ---------- Employees (not necessarily auth users) ----------
create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  role          text not null
                check (role in ('Закройщик','Швея','ОТК','Упаковщик','Менеджер','Мастер цеха')),
  stage         text check (stage in ('Раскрой','Печать/вышивка','Пошив','ОТК','Упаковка','Готово')),
  norm          int not null default 0,
  salary        numeric(12,2) not null default 0,
  status        text not null default 'active'
                check (status in ('active','vacation','sick','fired')),
  avatar_color  text,
  user_id       uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_employees_company on public.employees(company_id);
create trigger trg_employees_updated
  before update on public.employees
  for each row execute function public.set_updated_at();


-- ---------- Materials (склад) ----------
create table public.materials (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('ткань','фурнитура','упаковка','нить')),
  color           text,
  unit            text not null check (unit in ('кг','м','шт','рул')),
  stock           numeric(14,3) not null default 0,
  min_stock       numeric(14,3) not null default 0,
  price_per_unit  numeric(14,2) not null default 0,
  supplier        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_materials_company on public.materials(company_id);
create trigger trg_materials_updated
  before update on public.materials
  for each row execute function public.set_updated_at();


-- ---------- Orders ----------
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  number          text not null,
  client          text not null,
  client_phone    text,
  product         text not null,
  fabric          text,
  colors          text[] default '{}',
  qty             int not null check (qty >= 0),
  unit_price      numeric(14,2) not null default 0,
  unit_cost       numeric(14,2) not null default 0,
  deadline        date,
  status          text not null default 'Новый'
                  check (status in ('Новый','Раскрой','Пошив','ОТК','Упаковка','Готово','Отгружено','Проблема')),
  progress        int not null default 0 check (progress between 0 and 100),
  priority        text not null default 'normal' check (priority in ('low','normal','high')),
  responsible_id  uuid references public.employees(id) on delete set null,
  comment         text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, number)
);
create index idx_orders_company on public.orders(company_id);
create index idx_orders_status on public.orders(company_id, status);
create index idx_orders_deadline on public.orders(company_id, deadline);
create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();


-- Next available order number per company (1001, 1002, ...)
create or replace function public.next_order_number(p_company_id uuid)
returns text
language sql
stable
as $$
  select coalesce(max(number::int) + 1, 1001)::text
  from public.orders
  where company_id = p_company_id and number ~ '^\d+$';
$$;


-- ---------- Order sizes ----------
create table public.order_sizes (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  size      text not null,
  qty       int not null check (qty >= 0),
  done      int not null default 0 check (done >= 0)
);
create index idx_order_sizes_order on public.order_sizes(order_id);


-- ---------- Order stages ----------
create table public.order_stages (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  name            text not null
                  check (name in ('Раскрой','Печать/вышивка','Пошив','ОТК','Упаковка','Готово')),
  status          text not null default 'Ожидает'
                  check (status in ('Ожидает','В работе','Завершено','Проблема')),
  position        int not null,
  responsible_id  uuid references public.employees(id) on delete set null,
  started_at      timestamptz,
  finished_at     timestamptz,
  progress        int not null default 0 check (progress between 0 and 100),
  comment         text,
  unique (order_id, name)
);
create index idx_order_stages_order on public.order_stages(order_id);


-- ---------- Material movements (history) ----------
create table public.material_movements (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  material_id  uuid not null references public.materials(id) on delete cascade,
  kind         text not null check (kind in ('in','out','write_off')),
  qty          numeric(14,3) not null,
  order_id     uuid references public.orders(id) on delete set null,
  note         text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_material_movements_material on public.material_movements(material_id);
create index idx_material_movements_company on public.material_movements(company_id);


-- ---------- Defects (брак) ----------
create table public.defects (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete cascade,
  date         date not null default current_date,
  product      text,
  size         text,
  qty          int not null check (qty >= 0),
  reason       text not null
               check (reason in ('Неровный шов','Пятно на ткани','Неправильный размер',
                                 'Ошибка в крое','Ошибка вышивки/печати','Повреждение ткани')),
  stage        text check (stage in ('Раскрой','Печать/вышивка','Пошив','ОТК','Упаковка','Готово')),
  employee_id  uuid references public.employees(id) on delete set null,
  loss         numeric(14,2) not null default 0,
  photo_url    text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_defects_company on public.defects(company_id);
create index idx_defects_order on public.defects(order_id);


-- ---------- Activity events (для дашборда: timeline) ----------
create table public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  type        text not null check (type in ('order','defect','stock','employee','finance')),
  text        text not null,
  order_id    uuid references public.orders(id) on delete set null,
  actor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_activity_company on public.activity_events(company_id);
create index idx_activity_company_time on public.activity_events(company_id, created_at desc);


-- ---------- Leads (заявки с лендинга, не привязаны к company) ----------
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  email           text,
  workshop_type   text,
  team_size       text,
  tier            text,
  comment         text,
  source          text,
  page_url        text,
  status          text not null default 'new'
                  check (status in ('new','contacted','qualified','won','lost')),
  notes           text,
  created_at      timestamptz not null default now()
);
create index idx_leads_status on public.leads(status, created_at desc);


-- =============================================================================
-- Enable RLS (default deny) — policies appear in migration 0002.
-- Until then, anon key cannot read/write any of these tables.
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.company_members     enable row level security;
alter table public.employees           enable row level security;
alter table public.materials           enable row level security;
alter table public.material_movements  enable row level security;
alter table public.orders              enable row level security;
alter table public.order_sizes         enable row level security;
alter table public.order_stages        enable row level security;
alter table public.defects             enable row level security;
alter table public.activity_events     enable row level security;
alter table public.leads               enable row level security;

-- Done.
