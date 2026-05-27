import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/app/AppLayout";
import RequireAuth from "./components/RequireAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import Offer from "./pages/legal/Offer";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Production from "./pages/Production";
import Warehouse from "./pages/Warehouse";
import Defects from "./pages/Defects";
import Employees from "./pages/Employees";
import Finance from "./pages/Finance";
import AIAssistant from "./pages/AIAssistant";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
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
          <Route path="ai" element={<AIAssistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
