# Tigim — Database migrations

Миграции лежат в `supabase/migrations/` в порядке выполнения.
Каждый файл — самодостаточный SQL, применяется один раз.

## Как применить миграцию (без CLI)

1. Открой проект на https://supabase.com/dashboard
2. В левом меню жми **SQL Editor**
3. Жми **+ New query**
4. Скопируй содержимое нужного файла из `supabase/migrations/`
5. Вставь в редактор → жми **Run** (или `Ctrl/Cmd + Enter`)
6. Должно появиться `Success. No rows returned`

Порядок выполнения важен — миграции запускай по номерам (`0001_`, `0002_`, ...).

## Как применить через Supabase CLI (опционально, удобнее для команды)

```bash
# Установка
npm i -g supabase

# Логин
supabase login

# Линковка к существующему проекту
supabase link --project-ref keebppestihfqzqiyxka

# Применить все миграции
supabase db push
```

## Список миграций

| Файл | Что делает |
|---|---|
| `0001_init_schema.sql` | Создаёт все таблицы, helpers, триггеры. Включает RLS в режиме «default deny» (anon-ключ ничего не может — это безопасно по умолчанию). |
| `0002_rls_policies.sql` | Политики RLS: tenant-изоляция по company_id + write-доступ по ролям (owner/manager/master/warehouse/qc/staff). Лиды доступны на INSERT всем, читать может только service_role. |

## Откат миграции

Supabase Free план не делает автобэкапы, поэтому осторожно. Простой откат —
`drop schema public cascade; create schema public;` в SQL Editor, затем
запустить миграции заново. Делай только если в проекте нет важных данных.
