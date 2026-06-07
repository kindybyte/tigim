import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Briefcase,
  Building2,
  Check,
  Crown,
  Eye,
  Loader2,
  Plug,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import ChangeRoleModal from "../components/ChangeRoleModal";
import InviteUserModal from "../components/InviteUserModal";
import { company as mockCompany } from "../data/mockData";
import { useAuth } from "../lib/auth";
import {
  getCompanyMembers,
  getRoleCounts,
  removeMember,
  updateCompany,
  type CompanyMember,
  type VisibleRole,
} from "../lib/company";
import {
  inviteUrl,
  listInvitations,
  revokeInvitation,
  type Invitation,
} from "../lib/invitations";

const ALL_TABS = [
  { key: "company", label: "Компания", icon: Building2, ownerOnly: true },
  { key: "users", label: "Пользователи", icon: Users, ownerOnly: true },
  { key: "roles", label: "Роли", icon: Shield, ownerOnly: true },
  { key: "notifications", label: "Уведомления", icon: Bell, ownerOnly: false },
  { key: "integrations", label: "Интеграции", icon: Plug, ownerOnly: false },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

// Человекочитаемая подпись роли.
function roleLabel(role: VisibleRole | "master"): string {
  switch (role) {
    case "owner": return "Владелец";
    case "manager": return "Менеджер";
    case "technologist": return "Технолог";
    case "warehouse": return "Склад";
    case "qc": return "ОТК";
    case "staff": return "Сотрудник";
    case "master": return "Мастер цеха";
  }
}

// Русское склонение «человек / человека / людей» для счётчика 0..n.
function pluralPeople(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "человек";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "человека";
  return "человек";
}

// Системные роли в UI (master намеренно скрыт). Совпадает по `code`
// с public.company_role в БД, кроме master.
interface SystemRole {
  code: VisibleRole;
  name: string;
  desc: string;
  icon: LucideIcon;
  iconClass: string;
  can: string[];
  view: string[]; // только просмотр
}

const SYSTEM_ROLES: SystemRole[] = [
  {
    code: "owner",
    name: "Владелец",
    desc: "Полный доступ ко всему. Эту роль получает создатель компании.",
    icon: Crown,
    iconClass: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    can: [
      "Управлять настройками компании и курсом валют",
      "Приглашать пользователей и менять их роли",
      "Заказы / склад / сотрудники / финансы — всё CRUD",
      "Видеть и менять расходы по заказам",
    ],
    view: [],
  },
  {
    code: "manager",
    name: "Менеджер",
    desc: "Операционное управление цехом: заказы, клиенты, склад, отчёты.",
    icon: Briefcase,
    iconClass: "bg-brand-500/15 text-brand-300 ring-brand-500/30",
    can: [
      "Создавать, редактировать и удалять заказы",
      "Добавлять, изменять и увольнять сотрудников",
      "Материалы и движения склада",
      "Фиксировать и удалять брак",
      "Расходы по заказу: добавлять и удалять",
      "Записывать выработку",
    ],
    view: ["Финансы и отчёты"],
  },
  {
    code: "technologist",
    name: "Технолог",
    desc: "Производственный лид: распределяет работу, ведёт сотрудников и склад. Не видит выручку и финансы.",
    icon: Wrench,
    iconClass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    can: [
      "Создавать и редактировать заказы (без видимости цен)",
      "Добавлять и редактировать сотрудников, видеть зарплаты",
      "Закупать материалы, делать движения склада",
      "Записывать выработку и закрывать этапы",
      "Фиксировать брак",
      "Записывать расходы по заказу (купленные материалы)",
    ],
    view: ["Заказы (без цен)", "Брак"],
  },
  {
    code: "warehouse",
    name: "Склад",
    desc: "Материалы и движения. Не лезет в заказы и финансы.",
    icon: Boxes,
    iconClass: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
    can: [
      "Добавлять и редактировать материалы",
      "Приход / расход / списание материалов",
      "Списывать материалы на заказ (это создаёт расход в заказе)",
    ],
    view: ["Заказы", "Брак"],
  },
  {
    code: "qc",
    name: "ОТК",
    desc: "Контроль качества. Этап ОТК и брак.",
    icon: ShieldCheck,
    iconClass: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    can: [
      "Переводить заказы на/с этапа ОТК",
      "Менять прогресс этапов",
      "Фиксировать и редактировать брак",
      "Записывать выработку",
    ],
    view: ["Заказы", "Склад", "Сотрудники"],
  },
  {
    code: "staff",
    name: "Сотрудник",
    desc: "Только просмотр данных компании. Базовая роль по умолчанию.",
    icon: User,
    iconClass: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
    can: [],
    view: ["Заказы", "Склад", "Сотрудники", "Финансы (если разрешено)"],
  },
];

const INTEGRATIONS = [
  { name: "Telegram bot", desc: "Уведомления и быстрые отчёты", connected: false },
  { name: "WhatsApp", desc: "Сообщения клиентам", connected: false },
  { name: "Excel", desc: "Импорт и экспорт таблиц", connected: true },
  { name: "Google Sheets", desc: "Синхронизация с таблицами", connected: false },
  { name: "1C", desc: "Бухгалтерия и склад", connected: false },
  { name: "Marketplace", desc: "Загрузка карточек товаров", connected: false },
];

export default function Settings() {
  const [tab, setTab] = useState<TabKey>("company");
  const { configured, companyId, company, refreshCompany, user, currentRole } = useAuth();
  const isReal = configured && !!companyId && !!company;
  // В демо-режиме показываем все вкладки (mock-данные). На реальной компании —
  // фильтруем по роли: tabs.ownerOnly прячутся для всех кроме owner.
  const TABS = ALL_TABS.filter((t) => !t.ownerOnly || !isReal || currentRole === "owner");

  // Если активная вкладка стала недоступна — переключаем на первую видимую.
  useEffect(() => {
    if (!TABS.find((t) => t.key === tab)) {
      setTab(TABS[0]?.key ?? "notifications");
    }
  }, [TABS, tab]);

  // --- Роли: счётчики пользователей ---
  const [roleCounts, setRoleCounts] = useState<Partial<Record<VisibleRole | "master", number>>>({});
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoleCounts = useCallback(async () => {
    if (!isReal || !companyId) return;
    setRolesLoading(true);
    try {
      const counts = await getRoleCounts(companyId);
      setRoleCounts(counts);
    } catch (err) {
      console.warn("[settings] role counts failed:", err);
    } finally {
      setRolesLoading(false);
    }
  }, [isReal, companyId]);

  useEffect(() => {
    if (tab === "roles") void fetchRoleCounts();
  }, [tab, fetchRoleCounts]);

  // --- Пользователи: реальные company_members ---
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleFor, setChangeRoleFor] = useState<CompanyMember | null>(null);

  const isOwner = members.find((m) => m.userId === user?.id)?.role === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const fetchUsers = useCallback(async () => {
    if (!isReal || !companyId) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const [m, i] = await Promise.all([
        getCompanyMembers(companyId),
        // listInvitations может вернуть [] для неowner из-за RLS — не ошибка.
        listInvitations(companyId).catch(() => [] as Invitation[]),
      ]);
      setMembers(m);
      setInvitations(i.filter((inv) => !inv.acceptedAt));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Не удалось загрузить пользователей");
    } finally {
      setUsersLoading(false);
    }
  }, [isReal, companyId]);

  useEffect(() => {
    if (tab === "users") void fetchUsers();
  }, [tab, fetchUsers]);

  async function handleRevokeInvitation(id: string) {
    if (!confirm("Отозвать приглашение? Ссылка перестанет работать.")) return;
    try {
      await revokeInvitation(id);
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось отозвать");
    }
  }

  async function handleRemoveMember(member: CompanyMember) {
    if (member.userId === user?.id) {
      alert("Удалить самого себя нельзя. Передайте роль владельца другому или выйдите через signout.");
      return;
    }
    if (!confirm(`Удалить ${member.fullName} из компании? Он потеряет доступ к данным.`)) return;
    try {
      await removeMember(member.id);
      await fetchUsers();
      await fetchRoleCounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  async function copyInviteLink(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
    } catch {
      /* ignore */
    }
  }

  // Локальное состояние формы (синхронизируется с context при загрузке)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [usdRate, setUsdRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setPhone(company.phone ?? "");
      setAddress(company.address ?? "");
      setUsdRate(String(company.usdRate));
    } else if (!isReal) {
      // Демо
      setName(mockCompany.name);
      setPhone(mockCompany.phone);
      setAddress(mockCompany.address);
      setUsdRate("88");
    }
  }, [company, isReal]);

  async function handleCompanySave(e: FormEvent) {
    e.preventDefault();
    if (!isReal || !companyId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCompany(companyId, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        usdRate: parseFloat(usdRate) || 88,
      });
      await refreshCompany();
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Настройки" description="Параметры компании, пользователи, роли и интеграции" />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1 self-start rounded-2xl border border-panel-border bg-panel p-2 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-brand-500/15 text-brand-300"
                  : "text-ink-700 hover:bg-panel-muted"
              }`}
            >
              <t.icon className={`h-4 w-4 ${tab === t.key ? "text-brand-300" : "text-ink-600"}`} />
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "company" && (
            <Card title="Компания" subtitle="Основные данные и курс валют">
              <form onSubmit={handleCompanySave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Название компании</label>
                    <input
                      className="input mt-1.5"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div>
                    <label className="label">Телефон</label>
                    <input
                      className="input mt-1.5"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Адрес</label>
                    <input
                      className="input mt-1.5"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-panel-border bg-panel-muted/40 p-4">
                    <label className="label">Курс USD → KGS</label>
                    <p className="mt-0.5 text-xs text-ink-600">
                      Применяется ко всем материалам с ценой в долларах. Меняйте когда курс
                      существенно сдвинулся — для уже списанных партий цифра не пересчитывается.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-700">1 USD =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value)}
                        className="input max-w-[140px] tabular-nums"
                        disabled={!isReal}
                      />
                      <span className="text-sm font-semibold text-ink-700">сом</span>
                    </div>
                  </div>
                </div>

                {saveError && (
                  <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                    {saveError}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                  {savedAt && !saveError && (
                    <span className="text-xs text-emerald-300">
                      Сохранено в {savedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={!isReal || saving}
                    title={isReal ? undefined : "В демо-режиме сохранение недоступно"}
                    className="btn-brand"
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</>
                    ) : (
                      <><Save className="h-4 w-4" /> Сохранить</>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {tab === "users" && (
            <Card
              title="Пользователи"
              subtitle="Люди с логином в Tigim. У каждого свой email и роль доступа."
              action={
                isOwner && (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="btn-brand text-sm"
                  >
                    <UserPlus className="h-4 w-4" /> Пригласить
                  </button>
                )
              }
            >
              <div className="mb-4 rounded-xl bg-brand-500/10 px-4 py-3 text-xs text-brand-200 ring-1 ring-brand-500/20">
                Это не работники цеха. Швеи, закройщицы, упаковщики и другие сотрудники — в разделе{" "}
                <Link to="/app/employees" className="font-semibold underline hover:text-brand-100">
                  Сотрудники
                </Link>
                . Логин им не нужен — выработку записываете вы как мастер.
              </div>

              {!isReal && (
                <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  Демо-режим: список пользователей доступен только в реальной компании.
                </p>
              )}

              {isReal && usersLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Загружаем…
                </div>
              )}

              {isReal && usersError && (
                <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                  {usersError}{" "}
                  <button onClick={() => void fetchUsers()} className="font-semibold underline">
                    Повторить
                  </button>
                </div>
              )}

              {isReal && !usersLoading && !usersError && (
                <>
                  <ul className="divide-y divide-panel-border">
                    {members.map((m) => {
                      const isSelf = m.userId === user?.id;
                      const isLastOwner = m.role === "owner" && ownerCount === 1;
                      return (
                        <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                          <Avatar name={m.fullName} color="#2563EB" size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900">
                              {m.fullName}
                              {isSelf && (
                                <span className="ml-2 text-[10px] font-medium text-ink-600">вы</span>
                              )}
                            </p>
                            <p className="text-xs text-ink-600">
                              {roleLabel(m.role)}
                              {m.role === "master" && (
                                <span className="ml-1 text-amber-200">· устаревшая</span>
                              )}
                            </p>
                          </div>
                          <Badge tone={m.role === "owner" ? "brand" : "neutral"} dot>
                            {roleLabel(m.role)}
                          </Badge>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => setChangeRoleFor(m)}
                                className="text-xs font-semibold text-brand-300 hover:text-brand-200"
                              >
                                Изменить роль
                              </button>
                              {!isSelf && !isLastOwner && (
                                <button
                                  onClick={() => void handleRemoveMember(m)}
                                  aria-label="Удалить из компании"
                                  className="rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Pending invitations */}
                  {isOwner && invitations.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
                        Ожидают регистрации
                      </p>
                      <ul className="space-y-2">
                        {invitations.map((inv) => {
                          const expired = new Date(inv.expiresAt) < new Date();
                          return (
                            <li
                              key={inv.id}
                              className="flex flex-wrap items-center gap-3 rounded-lg bg-panel-muted/40 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-ink-800">{inv.email}</p>
                                <p className="text-[11px] text-ink-600">
                                  Роль: {roleLabel(inv.role)}
                                  {expired && (
                                    <span className="ml-1 text-rose-300">
                                      <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                                      истёкло
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => void copyInviteLink(inv.token)}
                                className="text-xs font-semibold text-brand-300 hover:text-brand-200"
                              >
                                Копировать ссылку
                              </button>
                              <button
                                onClick={() => void handleRevokeInvitation(inv.id)}
                                aria-label="Отозвать приглашение"
                                className="rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {members.length === 1 && (
                    <p className="mt-4 rounded-lg bg-panel-muted/40 px-3 py-2 text-xs text-ink-600">
                      Вы пока единственный пользователь. Нажмите «Пригласить» чтобы добавить менеджера, склад или ОТК.
                    </p>
                  )}
                </>
              )}
            </Card>
          )}

          {tab === "roles" && (
            <Card
              title="Роли"
              subtitle="Что может делать каждый тип сотрудника. Назначение ролей — во вкладке «Пользователи»."
            >
              {!isReal && (
                <p className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  Демо-режим: счётчики пользователей показываются как «—».
                </p>
              )}

              <ul className="grid gap-3 sm:grid-cols-2">
                {SYSTEM_ROLES.map((role) => {
                  const Icon = role.icon;
                  const count = roleCounts[role.code];
                  return (
                    <li
                      key={role.code}
                      className="rounded-xl border border-panel-border bg-panel-muted/40 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${role.iconClass}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-ink-900">{role.name}</p>
                            <span className="shrink-0 rounded-full bg-panel px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-700">
                              {!isReal
                                ? "—"
                                : rolesLoading
                                  ? "…"
                                  : `${count ?? 0} ${pluralPeople(count ?? 0)}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-600">{role.desc}</p>
                        </div>
                      </div>

                      {(role.can.length > 0 || role.view.length > 0) && (
                        <div className="mt-3 space-y-1.5 border-t border-panel-border pt-3 text-xs">
                          {role.can.map((c) => (
                            <p key={c} className="flex items-start gap-2 text-ink-800">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                              <span>{c}</span>
                            </p>
                          ))}
                          {role.view.map((v) => (
                            <p key={v} className="flex items-start gap-2 text-ink-600">
                              <Eye className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{v} — только просмотр</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Если в БД кто-то унаследован с ролью master — покажем тонкую плашку */}
              {isReal && (roleCounts.master ?? 0) > 0 && (
                <p className="mt-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  В БД есть {roleCounts.master} пользовател{(roleCounts.master ?? 0) === 1 ? "ь" : "и"} с устаревшей ролью «Мастер цеха».
                  Откройте вкладку «Пользователи» чтобы переназначить их на «Менеджер» или «ОТК».
                </p>
              )}
            </Card>
          )}

          {tab === "notifications" && (
            <Card title="Уведомления" subtitle="Когда система должна вас оповещать">
              <ul className="divide-y divide-panel-border">
                {[
                  { l: "Заказ может опоздать", on: true },
                  { l: "Низкий остаток материала", on: true },
                  { l: "Зафиксирован брак", on: true },
                  { l: "Сотрудник не вышел на смену", on: false },
                  { l: "Завершён этап производства", on: true },
                  { l: "Получена оплата", on: false },
                ].map((n) => (
                  <li key={n.l} className="flex items-center justify-between py-3">
                    <p className="text-sm text-ink-800">{n.l}</p>
                    <span
                      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition ${
                        n.on ? "bg-brand-600" : "bg-panel-border"
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-panel shadow transition ${n.on ? "translate-x-5" : "translate-x-0.5"}`} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "integrations" && (
            <Card title="Интеграции" subtitle="Подключите внешние сервисы">
              <ul className="grid gap-3 sm:grid-cols-2">
                {INTEGRATIONS.map((it) => (
                  <li key={it.name} className="flex items-center justify-between rounded-xl border border-panel-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-panel-muted text-ink-700">
                        <Plug className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">{it.name}</p>
                        <p className="text-xs text-ink-600">{it.desc}</p>
                      </div>
                    </div>
                    <button className={`btn ${it.connected ? "btn-secondary" : "btn-brand"} px-3 py-1.5 text-xs`}>
                      {it.connected ? "Отключить" : "Подключить"}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {isReal && companyId && (
        <>
          <InviteUserModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onCreated={() => void fetchUsers()}
            companyId={companyId}
          />
          {changeRoleFor && (
            <ChangeRoleModal
              open={!!changeRoleFor}
              onClose={() => setChangeRoleFor(null)}
              onSaved={() => {
                setChangeRoleFor(null);
                void fetchUsers();
                void fetchRoleCounts();
                void refreshCompany();
              }}
              memberId={changeRoleFor.id}
              memberName={changeRoleFor.fullName}
              currentRole={changeRoleFor.role}
              isSelf={changeRoleFor.userId === user?.id}
              isLastOwner={changeRoleFor.role === "owner" && ownerCount === 1}
            />
          )}
        </>
      )}
    </div>
  );
}
