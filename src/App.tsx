import React from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordRequest } from '@/pages/auth/ForgotPasswordRequest';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// ERP Pages
import { DashboardHome } from '@/pages/erp/DashboardHome';
import { ClientList } from '@/pages/erp/ClientList';
import { ClientHistoryPage } from '@/pages/erp/ClientHistoryPage';
import { SupplierList } from '@/pages/erp/SupplierList';
import { ProductList } from '@/pages/erp/ProductList';
import { ProductFormPage } from '@/pages/erp/ProductFormPage';
import { StockList } from '@/pages/erp/StockList';
import { StockAdjustmentPage } from '@/pages/erp/StockAdjustmentPage';
import { SalesPage } from '@/pages/erp/SalesPage';
import { TeamList } from '@/pages/erp/TeamList';
import { ErpSettingsPage } from '@/pages/erp/ErpSettingsPage';
import { ManagementReportPage } from '@/pages/erp/ManagementReportPage';
import { ErpProfilePage } from '@/pages/erp/ErpProfilePage';

// Site Pages
import { HomePage } from '@/pages/site/HomePage';
import { ProductDetailsPage } from '@/pages/site/ProductDetailsPage';
import { CustomerProfilePage } from '@/pages/site/CustomerProfilePage';
import { CheckoutPage } from '@/pages/site/CheckoutPage';
import { CustomerLoginPage } from '@/pages/site/CustomerLoginPage';

// Contexts & Shared
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ErpLayout } from '@/layouts/ErpLayout';
import { SiteLayout } from '@/layouts/SiteLayout';

const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();
  if (userRole !== 'manager') return <Navigate to="/erp/home" replace />;
  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* ─── E-COMMERCE ROUTES ─────────────────────────────────── */}
            <Route path="/" element={<SiteLayout><HomePage /></SiteLayout>} />
            <Route path="/product/:id" element={<SiteLayout><ProductDetailsPage /></SiteLayout>} />
            <Route path="/checkout" element={<SiteLayout><CheckoutPage /></SiteLayout>} />
            <Route path="/my-account" element={<SiteLayout><CustomerProfilePage /></SiteLayout>} />
            <Route path="/entrar" element={<CustomerLoginPage />} />

            {/* ─── AUTH ROUTES (ERP) ─────────────────────────────────── */}
            <Route path="/erp/login" element={<LoginPage />} />
            <Route path="/erp/register" element={<RegisterPage />} />
            <Route path="/erp/forgot-password" element={<ForgotPasswordRequest />} />
            <Route path="/erp/reset-password" element={<ResetPasswordPage />} />

            {/* ─── ERP ROUTES (PROTECTED) ───────────────────────────── */}
            <Route path="/erp" element={<ProtectedRoute><ErpLayout><Navigate to="/erp/home" replace /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/home" element={<ProtectedRoute><ErpLayout><DashboardHome /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/clients" element={<ProtectedRoute><ErpLayout><ClientList /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/clients/:clientId/history" element={<ProtectedRoute><ErpLayout><ClientHistoryPage /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/suppliers" element={<ProtectedRoute><ErpLayout><SupplierList /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/products" element={<ProtectedRoute><ErpLayout><ProductList /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/products/new" element={<ProtectedRoute><ErpLayout><ProductFormPage /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/products/update/:id" element={<ProtectedRoute><ErpLayout><ProductFormPage /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/stock" element={<ProtectedRoute><ErpLayout><StockList /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/stock/adjustment" element={<ProtectedRoute><ErpLayout><StockAdjustmentPage /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/sales" element={<ProtectedRoute><ErpLayout><SalesPage /></ErpLayout></ProtectedRoute>} />
            <Route path="/erp/profile" element={<ProtectedRoute><ErpLayout><ErpProfilePage /></ErpLayout></ProtectedRoute>} />

            {/* ERP Manager Routes */}
            <Route path="/erp/team" element={<ProtectedRoute><ManagerRoute><ErpLayout><TeamList /></ErpLayout></ManagerRoute></ProtectedRoute>} />
            <Route path="/erp/settings" element={<ProtectedRoute><ManagerRoute><ErpLayout><ErpSettingsPage /></ErpLayout></ManagerRoute></ProtectedRoute>} />
            <Route path="/erp/reports" element={<ProtectedRoute><ManagerRoute><ErpLayout><ManagementReportPage /></ErpLayout></ManagerRoute></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
