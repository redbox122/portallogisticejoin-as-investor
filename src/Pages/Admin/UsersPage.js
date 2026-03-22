import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Store } from 'react-notifications-component';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-users-page.css';

const AdminUsersPage = () => {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState({
    name: '',
    national_id: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  const fetchUsers = useCallback(async (targetPage = page, targetSearch = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('per_page', '10');
      if (targetSearch.trim()) params.set('search', targetSearch.trim());

      const response = await axios.get(`${API_BASE_URL}/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      const payload = response.data?.data;
      setUsers(payload?.data || []);
      setPagination({
        current_page: payload?.current_page || 1,
        last_page: payload?.last_page || 1,
        total: payload?.total || 0,
      });
    } catch (error) {
      const isUnauthenticated = error?.response?.status === 401;
      Store.addNotification({
        title: 'خطأ',
        message: isUnauthenticated
          ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
          : (error?.response?.data?.message || 'تعذر تحميل المستخدمين'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 4000 },
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, page, search]);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/admin/users`, form, { headers: getAuthHeaders() });
      Store.addNotification({
        title: 'نجاح',
        message: 'تم إنشاء المستخدم بنجاح',
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 },
      });
      setForm({ name: '', national_id: '', phone: '', email: '' });
      setPage(1);
      fetchUsers(1, search);
    } catch (error) {
      const isUnauthenticated = error?.response?.status === 401;
      const validationNationalId = error?.response?.data?.errors?.national_id?.[0];
      const msg = isUnauthenticated
        ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
        : (validationNationalId || error?.response?.data?.message || 'حدث خطأ أثناء إنشاء المستخدم');
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
              setPage(1);
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
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty">لا يوجد مستخدمون</td>
                  </tr>
                )}
                {users.map((u) => (
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
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                السابق
              </button>
              <span>{pagination.current_page} / {pagination.last_page}</span>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((p) => p + 1)}>
                التالي
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
