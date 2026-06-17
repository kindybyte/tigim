import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import AppLayout from "./components/app/AppLayout";
import RequireAuth from "./components/RequireAuth";

// Каждая страница — отдельный JS-чанк. Загружается по требованию.
// Initial bundle падает с ~300 KB до ~150-180 KB gzipped.
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Offer = lazy(() => import("./pages/legal/Offer"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const Production = lazy(() => import("./pages/Production"));
const Warehouse = lazy(() => import("./pages/Warehouse"));
const Defects = lazy(() => import("./pages/Defects"));
const Employees = lazy(() => import("./pages/Employees"));
const Finance = lazy(() => import("./pages/Finance"));
// ИИ-помощник временно скрыт до выкатки в production. Файл оставлен.
// const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/offer" element={<Offer />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="production" element={<Production />} />
            <Route path="warehouse" element={<Warehouse />} />
            <Route path="defects" element={<Defects />} />
            <Route path="employees" element={<Employees />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin/leads" element={<AdminLeads />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
