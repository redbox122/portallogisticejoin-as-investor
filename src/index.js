import React from 'react';
import ReactDOM from 'react-dom/client';
import './Css/index.css';
import './Css/style.css';
import './Css/landingpage.css';
import './Css/join-as-driver.css';
import './Css/login.css';
import './Css/dashboard.css';
import './Css/dashboard-sidebar.css';
import './Css/dashboard-layout.css';
import './Css/admin-dashboard.css';
import './Css/admin-layout.css';
import './Css/admin-sidebar.css';
import './Css/pages/common.css';
import './Css/pages/overview-page.css';
import './Css/pages/contracts-page.css';
import './Css/pages/profile-page.css';
import './Css/pages/payments-page.css';
import './Css/pages/tasks-page.css';
import './Css/pages/analytics-page.css';
import './Css/pages/contract-info-page.css';
import './Css/notification-bell.css';
import './Css/pages/notifications-page.css';
import './Css/pages/admin-overview-page.css';
import './Css/pages/admin-statistics-page.css';
import './Css/pages/admin-payments-page.css';
import './Css/pages/admin-analytics-page.css';
import './Css/pages/admin-documents-page.css';
import './Css/pages/admin-activity-page.css';
import './Css/pages/admin-settings-page.css';
import './Css/pages/admin-users-page.css';
import './Css/pages/admin-contracts-page.css';
import './Css/pages/admin-email-templates-page.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import LoginPage from './Pages/LoginPage';
import DashboardLayout from './Components/DashboardLayout';
import OverviewPage from './Pages/Dashboard/OverviewPage';
import AnalyticsPage from './Pages/Dashboard/AnalyticsPage';
import ContractsWorkflowPage from './Pages/Dashboard/ContractsWorkflowPage';
import PaymentsPage from './Pages/Dashboard/PaymentsPage';
import ProfilePage from './Pages/Dashboard/ProfilePage';
import TasksPage from './Pages/Dashboard/TasksPage';
import NotificationsPage from './Pages/Dashboard/NotificationsPage';
import ContractInfoPage from './Pages/Dashboard/ContractInfoPage';
import AdminLayout from './Components/AdminLayout';
import AdminOverviewPage from './Pages/Admin/OverviewPage';
import AdminStatisticsPage from './Pages/Admin/StatisticsPage';
import AdminUsersSection from './Pages/Admin/AdminUsersSection';
import AdminUsersPage from './Pages/Admin/UsersPage';
import AdminUserShowPage from './Pages/Admin/AdminUserShowPage';
import AdminUserUpdatePage from './Pages/Admin/AdminUserUpdatePage';
import AdminContractsPage from './Pages/Admin/ContractsPage';
import AdminPaymentsPage from './Pages/Admin/PaymentsPage';
import AdminAnalyticsPage from './Pages/Admin/AnalyticsPage';
import AdminDocumentsPage from './Pages/Admin/DocumentsPage';
import AdminActivityLogsPage from './Pages/Admin/ActivityLogsPage';
import AdminSettingsPage from './Pages/Admin/SettingsPage';
import AdminEmailTemplatesPage from './Pages/Admin/EmailTemplatesPage';
import ProtectedRoute from './Components/ProtectedRoute';
import './i18n/i18n.js';
import { ReactNotifications } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import { setupAxios401Interceptor } from './utils/api';
import InvestmentsPage from './Pages/Dashboard/InvestmentsPage.js';
import AdminInvestmentsPage from './Pages/Admin/AdminInvestmentsPage.js';
import InvoicesPage from './Pages/Dashboard/InvoicesPage.js';
import AdminInvoicesPage from './Pages/Admin/AdminInvoicesPage.js';
import RequestsPage from './Pages/Dashboard/RequestsPagte.js';
import AdminRequestsPage from './Pages/Admin/AdminRequestsPage.js';

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

setupAxios401Interceptor();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ReactNotifications />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route - Login page (default) */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Protected user dashboard routes with layout */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="contracts" element={<ContractsWorkflowPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="investments" element={<InvestmentsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="contractor-info" element={<ContractInfoPage />} />
         <Route path="requests" element={<RequestsPage />} />
          </Route>
          
          {/* Protected admin routes with layout */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="statistics" element={<AdminStatisticsPage />} />
            <Route path="users" element={<AdminUsersSection />}>
              <Route index element={<AdminUsersPage />} />
              <Route path=":userId/show" element={<AdminUserShowPage />} />
              <Route path=":userId/update" element={<AdminUserUpdatePage />} />
            </Route>
            <Route path="investments" element={<AdminInvestmentsPage />} />
            <Route path="contracts" element={<AdminContractsPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="documents" element={<AdminDocumentsPage />} />
            <Route path="activity" element={<AdminActivityLogsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path ="invoices" element={<AdminInvoicesPage />} />
            <Route path="email-templates" element={<AdminEmailTemplatesPage />} />
              <Route path="requests" element={<AdminRequestsPage />}  />
          </Route>
          
          {/* Legacy admin route redirect */}
          <Route 
            path="/admin/dashboard" 
            element={<Navigate to="/admin" replace />} 
          />
          
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);