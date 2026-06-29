import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { landingPath } from '@/lib/landing';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/AdminLayout';
import { WaiterLayout } from '@/components/WaiterLayout';

// Route-level code-splitting: each page is its own chunk (keeps the recharts/
// framer-motion weight off the initial login bundle). Named exports → default.
const named = <T extends Record<string, ComponentType<unknown>>>(p: Promise<T>, key: keyof T) =>
  p.then((m) => ({ default: m[key] }));

const LoginPage = lazy(() => named(import('@/pages/LoginPage'), 'LoginPage'));
const DashboardPage = lazy(() => named(import('@/pages/admin/DashboardPage'), 'DashboardPage'));
const StaffPage = lazy(() => named(import('@/pages/admin/StaffPage'), 'StaffPage'));
const RolesPage = lazy(() => named(import('@/pages/admin/RolesPage'), 'RolesPage'));
const SettingsPage = lazy(() => named(import('@/pages/admin/SettingsPage'), 'SettingsPage'));
const CategoriesPage = lazy(() => named(import('@/pages/admin/CategoriesPage'), 'CategoriesPage'));
const MenuItemsPage = lazy(() => named(import('@/pages/admin/MenuItemsPage'), 'MenuItemsPage'));
const InventoryPage = lazy(() => named(import('@/pages/admin/InventoryPage'), 'InventoryPage'));
const OrdersPage = lazy(() => named(import('@/pages/OrdersPage'), 'OrdersPage'));
const OrderDetailPage = lazy(() => named(import('@/pages/admin/OrderDetailPage'), 'OrderDetailPage'));
const TablesManagementPage = lazy(() => named(import('@/pages/admin/TablesManagementPage'), 'TablesManagementPage'));
const BillingPage = lazy(() => named(import('@/pages/admin/BillingPage'), 'BillingPage'));
const InvoicesPage = lazy(() => named(import('@/pages/admin/InvoicesPage'), 'InvoicesPage'));
const CustomersPage = lazy(() => named(import('@/pages/admin/CustomersPage'), 'CustomersPage'));
const ReportsPage = lazy(() => named(import('@/pages/admin/ReportsPage'), 'ReportsPage'));
const TablesPage = lazy(() => named(import('@/pages/waiter/TablesPage'), 'TablesPage'));
const OrderPage = lazy(() => named(import('@/pages/waiter/OrderPage'), 'OrderPage'));
const KitchenPage = lazy(() => named(import('@/pages/kitchen/KitchenPage'), 'KitchenPage'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute permission="view_dashboard">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff"
            element={
              <ProtectedRoute permission="manage_staff">
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="roles"
            element={
              <ProtectedRoute permission="manage_roles">
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="categories"
            element={
              <ProtectedRoute permission="manage_categories">
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="menu-items"
            element={
              <ProtectedRoute permission="manage_menu_items">
                <MenuItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="restaurant-settings"
            element={
              <ProtectedRoute permission="manage_restaurant_settings">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute permission="view_inventory">
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="tables"
            element={
              <ProtectedRoute permission="manage_restaurant_settings">
                <TablesManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute permission="view_orders">
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute permission="view_orders">
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="billing/:orderId"
            element={
              <ProtectedRoute permission="generate_invoice">
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <ProtectedRoute permission="search_invoices">
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers"
            element={
              <ProtectedRoute permission="manage_customers">
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute permission="view_reports">
                <ReportsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Waiter / POS */}
        <Route
          path="/waiter"
          element={
            <ProtectedRoute permission="create_order">
              <WaiterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="tables" replace />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="tables/:tableId/order" element={<OrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>

        {/* Kitchen */}
        <Route
          path="/kitchen/orders"
          element={
            <ProtectedRoute permission="update_order_status">
              <KitchenPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Send each user to their role's landing page.
function RootRedirect() {
  const { status, user } = useAuthStore();
  if (status === 'idle' || status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  return <Navigate to={status === 'authenticated' ? landingPath(user) : '/login'} replace />;
}
