import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  Loader2,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { company } from "../../data/mockData";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import {
  isResultsEmpty,
  searchGlobal,
  type SearchResult,
  type SearchResults,
} from "../../lib/search";

interface TopbarProps {
  onOpenSidebar: () => void;
}

const EMPTY_RESULTS: SearchResults = { orders: [], materials: [], employees: [] };

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  const { user, signOut, configured, companyId } = useAuth();
  const canSearch = configured && !!companyId;

  // Плоский список для клавиатурной навигации.
  const flatResults: SearchResult[] = useMemo(
    () => [...searchResults.orders, ...searchResults.materials, ...searchResults.employees],
    [searchResults],
  );

  // Закрываем дропдауны при клике/тапе вне или по Escape.
  useEffect(() => {
    if (!profileOpen && !notifOpen && !searchOpen) return;
    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (profileOpen && profileRef.current && target && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifOpen && notifRef.current && target && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (searchOpen && searchRef.current && target && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [profileOpen, notifOpen, searchOpen]);

  // Ctrl+K / Cmd+K — фокус в поиск.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (!canSearch) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(EMPTY_RESULTS);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    const handle = setTimeout(async () => {
      try {
        const res = await searchGlobal(companyId!, q);
        setSearchResults(res);
        setActiveIndex(0);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Ошибка поиска");
        setSearchResults(EMPTY_RESULTS);
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [searchQuery, canSearch, companyId]);

  function goToResult(r: SearchResult) {
    setSearchOpen(false);
    setSearchQuery("");
    if (r.kind === "order") navigate(`/app/orders/${r.number}`);
    else if (r.kind === "material") navigate("/app/warehouse");
    else navigate("/app/employees");
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatResults[activeIndex];
      if (item) goToResult(item);
    }
  }

  // Display name: real user metadata if logged in, otherwise mock company owner.
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    company.owner;
  const displayEmail = user?.email || company.name;

  async function handleSignOut() {
    if (configured) await signOut();
    navigate("/");
  }

  const queryTrimmed = searchQuery.trim();
  const showDropdown = searchOpen && queryTrimmed.length > 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-panel-border bg-surface/85 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-700 hover:bg-panel-muted lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex max-w-xl flex-1 items-center" ref={searchRef}>
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-600" />
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder={
            canSearch ? "Поиск заказов, клиентов, материалов…" : "Поиск (войдите в аккаунт)"
          }
          disabled={!canSearch}
          className="input pl-9 pr-16 disabled:cursor-not-allowed disabled:opacity-60"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSearchResults(EMPTY_RESULTS);
              searchInputRef.current?.focus();
            }}
            aria-label="Очистить"
            className="absolute right-12 grid h-6 w-6 place-items-center rounded-md text-ink-600 hover:bg-panel-muted hover:text-ink-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="absolute right-3 hidden text-[11px] font-medium text-ink-600 md:block">
          <span className="kbd">Ctrl</span> <span className="kbd">K</span>
        </span>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-12 z-30 max-h-[70vh] origin-top overflow-y-auto rounded-2xl border border-panel-border bg-panel p-1.5 shadow-soft animate-fade-in">
            {searchLoading && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-ink-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Ищем…
              </div>
            )}
            {searchError && !searchLoading && (
              <div className="px-3 py-3 text-sm text-rose-300">{searchError}</div>
            )}
            {!searchLoading &&
              !searchError &&
              queryTrimmed.length < 2 && (
                <div className="px-3 py-3 text-xs text-ink-600">
                  Введите минимум 2 символа
                </div>
              )}
            {!searchLoading &&
              !searchError &&
              queryTrimmed.length >= 2 &&
              isResultsEmpty(searchResults) && (
                <div className="px-3 py-4 text-sm text-ink-600">
                  Ничего не нашли по «{queryTrimmed}»
                </div>
              )}

            {!searchLoading && !searchError && !isResultsEmpty(searchResults) && (
              <ResultGroups
                results={searchResults}
                flat={flatResults}
                activeIndex={activeIndex}
                onSelect={goToResult}
                onHover={setActiveIndex}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="hidden h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted sm:grid"
          aria-label="Помощь"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted"
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-surface" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 origin-top-right animate-fade-in rounded-2xl border border-panel-border bg-panel p-2 shadow-soft">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-semibold text-ink-900">Уведомления</p>
                <button className="text-xs font-medium text-brand-300">
                  Прочитать всё
                </button>
              </div>
              <ul className="space-y-1">
                {[
                  {
                    title: "Заказ #1045 может опоздать",
                    desc: "Дедлайн 28 мая, выполнено 62%",
                    tone: "bg-rose-500",
                  },
                  {
                    title: "Низкий остаток ткани «Рибана»",
                    desc: "Осталось 40 кг, ниже минимума",
                    tone: "bg-amber-500",
                  },
                  {
                    title: "Заказ #1049 готов к отгрузке",
                    desc: "Партия 400 шт упакована",
                    tone: "bg-emerald-500",
                  },
                ].map((n) => (
                  <li
                    key={n.title}
                    className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-panel-muted"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.tone}`} />
                    <div>
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      <p className="text-xs text-ink-600">{n.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition hover:bg-panel-muted"
          >
            <Avatar name={displayName} color="#2563EB" size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-ink-900">
                {displayName}
              </p>
              <p className="text-[11px] leading-tight text-ink-600">
                {user ? "Аккаунт" : "Демо-режим"}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-600 sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 w-60 origin-top-right animate-fade-in rounded-2xl border border-panel-border bg-panel p-2 shadow-soft">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-ink-900">{displayName}</p>
                <p className="truncate text-xs text-ink-600">{displayEmail}</p>
              </div>
              <div className="divider my-1" />
              <button
                onClick={() => navigate("/app/settings")}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-800 hover:bg-panel-muted"
              >
                Настройки
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/15"
              >
                <LogOut className="h-4 w-4" /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface ResultGroupsProps {
  results: SearchResults;
  flat: SearchResult[];
  activeIndex: number;
  onSelect: (r: SearchResult) => void;
  onHover: (i: number) => void;
}

function ResultGroups({ results, flat, activeIndex, onSelect, onHover }: ResultGroupsProps) {
  function indexOf(r: SearchResult): number {
    return flat.findIndex((x) => x.kind === r.kind && x.id === r.id);
  }
  return (
    <div className="space-y-2">
      {results.orders.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            Заказы
          </p>
          <ul>
            {results.orders.map((r) => {
              const i = indexOf(r);
              return (
                <li key={`o-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onSelect(r)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      i === activeIndex ? "bg-panel-muted" : "hover:bg-panel-muted/60"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        #{r.number} · {r.product}
                      </p>
                      <p className="truncate text-xs text-ink-600">
                        {r.client} · {r.status}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {results.materials.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            Материалы
          </p>
          <ul>
            {results.materials.map((r) => {
              const i = indexOf(r);
              return (
                <li key={`m-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onSelect(r)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      i === activeIndex ? "bg-panel-muted" : "hover:bg-panel-muted/60"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500/15 text-teal-300">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{r.name}</p>
                      <p className="truncate text-xs text-ink-600">
                        {r.type} · остаток {r.stock} {r.unit}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {results.employees.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            Сотрудники
          </p>
          <ul>
            {results.employees.map((r) => {
              const i = indexOf(r);
              return (
                <li key={`e-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onSelect(r)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      i === activeIndex ? "bg-panel-muted" : "hover:bg-panel-muted/60"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{r.name}</p>
                      <p className="truncate text-xs text-ink-600">{r.role}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
