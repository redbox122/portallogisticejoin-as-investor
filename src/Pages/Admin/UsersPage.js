import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Store } from 'react-notifications-component';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuthHeaders } from '../../utils/api';
import {
  postAdminUserActivate,
  postAdminUserDeactivate,
} from '../../utils/adminUserApi';
import AdminUserStatusConfirmModal from '../../Components/Admin/AdminUserStatusConfirmModal';
import '../../Css/pages/admin-users-page.css';
import { API_BASE_URL } from '../../config';

function rowIsActive(u) {
  if (typeof u.is_active === 'boolean') return u.is_active;
  return u.status === 'active';
}

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common']);
  const isRTL = i18n.language === 'ar';

  const [form, setForm] = useState({
    name: '',
    national_id: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [statusModal, setStatusModal] = useState({ open: false, userId: null, variant: null });
  const [statusLoading, setStatusLoading] = useState(false);

  const adminUsersBase = `${API_BASE_URL}/portallogistice/admin/users`;
  const legacyAdminUsersBase = adminUsersBase;

  const loadUsers = useCallback(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/portallogistice/admin/users`, {
        headers: getAuthHeaders(),
        params: { per_page: 15, page: pagination.current_page, search },
      })
      .then((res) => {
        setUsers(res.data.data.data);
        setPagination({
          current_page: res.data.data.current_page,
          last_page: res.data.data.last_page,
          total: res.data.data.total,
        });
      })
      .catch((err) => {
        if (err?.response?.status === 401) navigate('/', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [pagination.current_page, search, navigate]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      console.log('TOKEN:', localStorage.getItem('token'));
      try {
        await axios.post(adminUsersBase, form, { headers: getAuthHeaders() });
      } catch (primaryError) {
        const status = primaryError?.response?.status;
        if (status === 404 || status === 405) {
          await axios.post(legacyAdminUsersBase, form, { headers: getAuthHeaders() });
        } else {
          throw primaryError;
        }
      }
      Store.addNotification({
        title: 'نجاح',
        message: 'تم إنشاء المستخدم بنجاح',
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 },
      });

      const createdUser = {
        id: Date.now(),
        name: form.name,
        national_id: form.national_id,
        phone: form.phone || null,
        status: 'active',
      };
      setUsers((prev) => [createdUser, ...prev]);
      setPagination((prev) => ({
        ...prev,
        total: (prev.total || 0) + 1,
      }));

      setForm({ name: '', national_id: '', phone: '', email: '', password: '' });
    } catch (error) {
      console.log(error);
      const isUnauthenticated = error?.response?.status === 401;
      if (isUnauthenticated) {
        navigate('/', { replace: true });
      }
      const validationErrors = error?.response?.data?.errors;
      const firstValidationMessage = validationErrors
        ? Object.values(validationErrors).flat().find(Boolean)
        : null;
      const msg = isUnauthenticated
        ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
        : firstValidationMessage || error?.response?.data?.message || 'حدث خطأ أثناء إنشاء المستخدم';
      Store.addNotification({
        title: 'خطأ',
        message: msg,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.name || ''} ${u.national_id || ''}`.toLowerCase().includes(q);
  });

  const openStatusModal = (u, variant) => {
    if (u?.id == null) return;
    setStatusModal({ open: true, userId: u.id, variant });
  };

  const closeStatusModal = () => setStatusModal({ open: false, userId: null, variant: null });

  const confirmStatusFromList = async () => {
    const { userId, variant } = statusModal;
    if (!userId || !variant) return;
    setStatusLoading(true);
    try {
      const headers = getAuthHeaders();
      const res =
        variant === 'deactivate'
          ? await postAdminUserDeactivate(userId, headers)
          : await postAdminUserActivate(userId, headers);
      const ok = res?.data?.success !== false;
      if (ok) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: res?.data?.message || t('admin.success.user_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000 },
        });
        closeStatusModal();
        loadUsers();
      } else {
        throw new Error(res?.data?.message || 'Request failed');
      }
    } catch (err) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: err?.response?.data?.message || err?.message || t('admin.error.update_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 },
      });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="admin-users-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <AdminUserStatusConfirmModal
        open={statusModal.open}
        variant={statusModal.variant}
        loading={statusLoading}
        onCancel={() => {
          if (!statusLoading) closeStatusModal();
        }}
        onConfirm={confirmStatusFromList}
      />

      <div className="users-create-card">
        <h2>إنشاء مستخدم جديد</h2>
        <form className="users-create-form" onSubmit={submit}>
          <div className="form-group">
            <label>الاسم</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>الهوية الوطنية</label>
            <input
              value={form.national_id}
              onChange={(e) => setForm((p) => ({ ...p, national_id: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>الجوال (اختياري)</label>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>البريد (اختياري)</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>كلمة السر</label>
            <input
              type="password"
              value={form.password}
              minLength={6}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>
          <button className="create-btn" type="submit" disabled={submitting}>
            {submitting ? 'جاري الإنشاء...' : 'إنشاء مستخدم'}
          </button>
        </form>
      </div>

      <div className="users-table-card">
        <div className="users-table-header">
          <h3>{t('admin.users.list')}</h3>
          <input
            className="users-search"
            placeholder={t('admin.users.search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </div>

        {loading ? (
          <p>{t('dashboard.loading')}</p>
        ) : (
          <>
            <div className="users-table-scroll">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>{t('admin.users.name')}</th>
                    <th>{t('national_id')}</th>
                    <th>{t('phone_number')}</th>
                    <th>{t('admin.users.status')}</th>
                    <th>{t('admin.users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty">
                        {t('admin.users.empty')}
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => {
                    const active = rowIsActive(u);
                    return (
                      <tr key={u.id}>
                        <td>{u.name || '-'}</td>
                        <td>{u.national_id || '-'}</td>
                        <td>{u.phone || '-'}</td>
                        <td>
                          <span className={`status ${active ? 'active' : 'inactive'}`}>
                            {active ? t('admin.users.active') : t('admin.users.inactive')}
                          </span>
                        </td>
                        <td>
                          <div className="users-actions-cell">
                            <button
                              className="action-btn action-btn--primary"
                              type="button"
                              onClick={() => navigate(`/admin/users/${u.id}/show`)}
                            >
                              {t('admin.users.view')}
                            </button>
                            <button
                              className="action-btn action-btn--secondary"
                              type="button"
                              onClick={() => navigate(`/admin/users/${u.id}/update`)}
                            >
                              {t('admin.users.update')}
                            </button>
                            {active ? (
                              <button
                                className="action-btn action-btn--danger"
                                type="button"
                                onClick={() => openStatusModal(u, 'deactivate')}
                              >
                                {t('admin.users.deactivate')}
                              </button>
                            ) : (
                              <button
                                className="action-btn action-btn--success"
                                type="button"
                                onClick={() => openStatusModal(u, 'activate')}
                              >
                                {t('admin.users.activate')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                {t('admin.users.total_users', { count: pagination.total })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
