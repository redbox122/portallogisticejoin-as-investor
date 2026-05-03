import React from 'react';
import ReactDOM from 'react-dom/client';
import './Css/index.css';
import './Css/style.css';
import './Css/landingpage.css';
import './Css/dashboard.css';
import './Css/dashboard-sidebar.css';
import './Css/admin-dashboard.css';
import './Css/admin-layout.css';
import './Css/admin-sidebar.css';
import './Css/pages/common.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './Context/AuthContext';
import DashboardLayout from './Components/DashboardLayout';
import AnalyticsPage from './features/analytics/pages/AnalyticsPage';
import ProfilePage from './features/profile/pages/ProfilePage';

import AdminLayout from './Components/AdminLayout';
import AdminStatisticsPage from './features/admin-statistics/pages/AdminStatisticsPage';
import AdminUsersPage from './features/admin-users/pages/AdminUsersPage.jsx';
import AdminUserShowPage from './features/admin-users/pages/AdminUserShowPage.jsx';
import AdminUserUpdatePage from './features/admin-users/pages/AdminUserUpdatePage.jsx';
import AdminContractsPage from './features/admin-contracts/pages/AdminContractsPage';
import './i18n/i18n.js';
import { ReactNotifications } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import InvestmentsPage from './features/investments/pages/InvestmentsPage.jsx';
import AdminInvestmentsPage from './features/admin-investments/pages/AdminInvestmentsPage.jsx';
import InvoicesPage from './features/invoices/pages/InvoicesPage';
import AdminInvoicesPage from './features/admin-invoices/pages/AdminInvoicesPage.jsx';
import RequestsPage from './features/requests/pages/RequestsPage';
import AdminRequestsPage from './features/admin-requests/pages/AdminRequestsPage.jsx';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ContractsPage from './features/contracts/pages/ContractsPage';

/* Apply saved theme + RTL before first paint (user dashboard + global) */
(() => {
  try {
    const th = localStorage.getItem('theme') || localStorage.getItem('user_theme');
    document.documentElement.classList.toggle('dark', th === 'dark');
    const lang = localStorage.getItem('lang');
    if (lang === 'ar' || lang === 'en') {
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
  } catch (e) {
    /* ignore */
  }
})();


const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactNotifications />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route - Login page (default) */}
            <Route path="/" element={<LoginPage />} />

            {/* Protected user dashboard routes with layout */}
            <Route
              path="/dashboard"
              // element={
              //   <ProtectedRoute>
              //     <DashboardLayout />
              //   </ProtectedRoute>
              // }
              element={<DashboardLayout />}
            >
              <Route index element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="investments" element={<InvestmentsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="settings" element={<ProfilePage />} />
            </Route>

            {/* Protected admin routes with layout */}
            <Route
              path="/admin"
              // element={
              //   <ProtectedRoute requireAdmin={true}>
              //     <AdminLayout />
              //   </ProtectedRoute>
              // }
              element={<AdminLayout />}
            >
              <Route index element={<AdminStatisticsPage />} />

              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId/show" element={<AdminUserShowPage />} />
              <Route path="users/:userId/update" element={<AdminUserUpdatePage />} />
              <Route path="investments" element={<AdminInvestmentsPage />} />
              <Route path="contracts" element={<AdminContractsPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
            </Route>

            {/* Legacy admin route redirect */}
            <Route
              path="/admin/dashboard"
              element={<Navigate to="/admin" replace />}
            />


          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode >
);