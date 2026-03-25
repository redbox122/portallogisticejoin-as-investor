import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Store } from 'react-notifications-component';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../../utils/api';
import '../../Css/pages/admin-users-page.css';
import { API_BASE_URL } from '../../config'

const AdminUsersPage = () => {
  const navigate = useNavigate();
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
  // Force same-origin API path to avoid env misconfiguration (e.g. posting to /admin/users).
 const adminUsersBase = `${API_BASE_URL}/portallogistice/admin/users`;
const legacyAdminUsersBase=adminUsersBase;
useEffect(() => {
  setLoading(true);
  axios.get(`${API_BASE_URL}/portallogistice/admin/users`, {
    headers: getAuthHeaders(),
    params: { per_page: 15, page: pagination.current_page, search }
  })
  .then(res => {
    setUsers(res.data.data.data);
    setPagination({
      current_page: res.data.data.current_page,
      last_page: res.data.data.last_page,
      total: res.data.data.total,
    });
  })
  .catch(err => {
    if (err?.response?.status === 401) navigate('/', { replace: true });
  })
  .finally(() => setLoading(false));
}, [pagination.current_page, search]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Debug token existence before request.
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
        : (firstValidationMessage || error?.response?.data?.message || 'حدث خطأ أثناء إنشاء المستخدم');
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
    return (`${u.name || ''} ${u.national_id || ''}`.toLowerCase().includes(q));
  });

  return (
    <div className="admin-users-page">
      <div className="users-create-card">
        <h2>إنشاء مستخدم جديد</h2>
        <form className="users-create-form" onSubmit={submit}>
          <div className="form-group">
            <label>الاسم</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>الهوية الوطنية</label>
            <input value={form.national_id} onChange={(e) => setForm((p) => ({ ...p, national_id: e.target.value }))} required />
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
          <h3>المستخدمون</h3>
          <input
            className="users-search"
            placeholder="بحث بالاسم أو الهوية"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهوية الوطنية</th>
                  <th>الجوال</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty">لا يوجد مستخدمون</td>
                  </tr>
                )}
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '-'}</td>
                    <td>{u.national_id || '-'}</td>
                    <td>{u.phone || '-'}</td>
                    <td>
                      <span className={`status ${u.status === 'active' ? 'active' : 'inactive'}`}>
                        {u.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" type="button">عرض</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <span>إجمالي المستخدمين: {pagination.total}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
