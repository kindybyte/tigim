import { getSupabase } from "./supabase";

export interface SearchResultOrder {
  kind: "order";
  id: string;        // uuid
  number: string;    // display number
  client: string;
  product: string;
  status: string;
}

export interface SearchResultMaterial {
  kind: "material";
  id: string;
  name: string;
  type: string;
  unit: string;
  stock: number;
}

export interface SearchResultEmployee {
  kind: "employee";
  id: string;
  name: string;
  role: string;
}

export type SearchResult =
  | SearchResultOrder
  | SearchResultMaterial
  | SearchResultEmployee;

export interface SearchResults {
  orders: SearchResultOrder[];
  materials: SearchResultMaterial[];
  employees: SearchResultEmployee[];
}

const EMPTY: SearchResults = { orders: [], materials: [], employees: [] };

// Экранируем спецсимволы PostgREST для безопасной подстановки в ilike-pattern.
// Запятая и скобки в `.or()`-фильтре могут сломать парсер.
function escape(q: string): string {
  return q.replace(/[\\%_,()]/g, " ").trim();
}

export async function searchGlobal(
  companyId: string,
  query: string,
): Promise<SearchResults> {
  const q = escape(query);
  if (q.length < 2) return EMPTY;
  const like = `%${q}%`;
  const sb = getSupabase();

  const [ordersRes, materialsRes, employeesRes] = await Promise.all([
    sb
      .from("orders")
      .select("id, number, client, product, status, client_phone")
      .eq("company_id", companyId)
      .or(
        `number.ilike.${like},client.ilike.${like},product.ilike.${like},client_phone.ilike.${like}`,
      )
      .order("created_at", { ascending: false })
      .limit(5),
    sb
      .from("materials")
      .select("id, name, type, unit, stock, color, supplier")
      .eq("company_id", companyId)
      .or(`name.ilike.${like},color.ilike.${like},supplier.ilike.${like}`)
      .order("name", { ascending: true })
      .limit(5),
    sb
      .from("employees")
      .select("id, name, role")
      .eq("company_id", companyId)
      .neq("status", "fired")
      .or(`name.ilike.${like},role.ilike.${like}`)
      .order("name", { ascending: true })
      .limit(5),
  ]);

  const orders: SearchResultOrder[] = (ordersRes.data ?? []).map((r) => ({
    kind: "order",
    id: r.id as string,
    number: r.number as string,
    client: r.client as string,
    product: r.product as string,
    status: r.status as string,
  }));
  const materials: SearchResultMaterial[] = (materialsRes.data ?? []).map((r) => ({
    kind: "material",
    id: r.id as string,
    name: r.name as string,
    type: r.type as string,
    unit: r.unit as string,
    stock: Number(r.stock) || 0,
  }));
  const employees: SearchResultEmployee[] = (employeesRes.data ?? []).map((r) => ({
    kind: "employee",
    id: r.id as string,
    name: r.name as string,
    role: r.role as string,
  }));

  return { orders, materials, employees };
}

export function isResultsEmpty(r: SearchResults): boolean {
  return r.orders.length === 0 && r.materials.length === 0 && r.employees.length === 0;
}
