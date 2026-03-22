import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-contracts-page.css';

const STATUS_LABELS = {
  admin_pending: { text: '⏳ قيد المراجعة', icon: 'fa-clock', tone: 'pending' },
  approved: { text: '✅ مقبول', icon: 'fa-circle-check', tone: 'approved' },
  rejected: { text: '❌ مرفوض', icon: 'fa-circle-xmark', tone: 'rejected' },
  sent: { text: 'تم الإرسال', icon: 'fa-paper-plane', tone: 'sent' },
  nafath_pending: { text: 'بانتظار نفاذ', icon: 'fa-shield-halved', tone: 'nafath-pending' },
  nafath_approved: { text: 'موثق عبر نفاذ', icon: 'fa-badge-check', tone: 'nafath-approved' },
  draft: { text: 'مسودة', icon: 'fa-file-lines', tone: 'draft' },
};

const TAB_FILTERS = {
  all: () => true,
  pending: (c) => c.status === 'admin_pending' || c.status === 'nafath_approved',
  approved: (c) => c.status === 'approved',
  rejected: (c) => c.status === 'rejected',
};

const AdminContractsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [tab, setTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [form, setForm] = useState({
    user_id: '',
    type: 'sale',
    title: '',
    file: null,
  });

  const fetchUsers = useCallback(async (searchTerm = '') => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '100');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      let response;
      try {
        response = await axios.get(`${API_BASE_URL}/admin/users?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
      } catch (e) {
        // Backward compatibility for prefixed route.
        response = await axios.get(`${API_BASE_URL}/portallogistice/admin/users?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
      }

      const payload = response.data?.data;
      setUsers(payload?.data || []);
    } catch (e) {
      console.error('Failed to fetch users for contract assignment', e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`, {
        headers: getAuthHeaders(),
      });
      setContracts(response.data?.data || []);
    } catch (e) {
      console.error('Failed to fetch contracts', e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    fetchUsers(userSearch);
  }, [fetchUsers, userSearch]);

  const filteredContracts = useMemo(
    () => contracts.filter(TAB_FILTERS[tab]),
    [contracts, tab]
  );

  const sendContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/send`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally {
      setActionLoadingId(null);
    }
  };

  const approveContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/admin-approve`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/reject`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally {
      setActionLoadingId(null);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    data.append('user_id', form.user_id);
    data.append('type', form.type);
    data.append('title', form.title);
    if (form.file) data.append('file', form.file);

    try {
      await axios.post(`${API_BASE_URL}/contracts`, data, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      setForm({ user_id: '', type: 'sale', title: '', file: null });
      await fetchContracts();
    } finally {
      setSubmitting(false);
    }
  };

  const tabCounts = useMemo(() => ({
    all: contracts.length,
    pending: contracts.filter(TAB_FILTERS.pending).length,
    approved: contracts.filter(TAB_FILTERS.approved).length,
    rejected: contracts.filter(TAB_FILTERS.rejected).length,
  }), [contracts]);

  return (
    <div className="admin-contracts-dashboard" dir="rtl">
      <div className="acd-header-card">
        <div className="acd-header-title-wrap">
          <h2 className="acd-title">إدارة العقود</h2>
          <p className="acd-subtitle">إدارة دورة العقود من الإرسال حتى الاعتماد النهائي.</p>
        </div>
        <div className="acd-stat-grid">
          <div className="acd-stat-item">
            <span className="acd-stat-label">جميع العقود</span>
            <strong className="acd-stat-value">{tabCounts.all}</strong>
          </div>
          <div className="acd-stat-item">
            <span className="acd-stat-label">قيد المراجعة</span>
            <strong className="acd-stat-value">{tabCounts.pending}</strong>
          </div>
          <div className="acd-stat-item">
            <span className="acd-stat-label">مقبولة</span>
            <strong className="acd-stat-value">{tabCounts.approved}</strong>
          </div>
          <div className="acd-stat-item">
            <span className="acd-stat-label">مرفوضة</span>
            <strong className="acd-stat-value">{tabCounts.rejected}</strong>
          </div>
        </div>
      </div>

      <div className="acd-form-card">
        <div className="acd-card-title-row">
          <h3 className="acd-card-title"><i className="fas fa-file-signature"></i> إنشاء عقد جديد</h3>
        </div>
        <form onSubmit={submitCreate} className="acd-form-grid">
          <div className="acd-field">
            <label htmlFor="contract-user-search">بحث عن المستخدم</label>
            <input
              id="contract-user-search"
              placeholder="ابحث بالاسم أو الهوية"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="acd-field">
            <label htmlFor="contract-user-id">المستخدم</label>
            <select
              id="contract-user-id"
              value={form.user_id}
              onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))}
              required
            >
              <option value="">
                {usersLoading ? 'جاري تحميل المستخدمين...' : 'اختر المستخدم'}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || `User #${u.id}`} - {u.national_id || 'بدون هوية'}
                </option>
              ))}
            </select>
          </div>

          <div className="acd-field">
            <label htmlFor="contract-type">نوع العقد</label>
            <select
              id="contract-type"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="sale">عقد مبايعة (sale)</option>
              <option value="rental">عقد استئجار (rental)</option>
            </select>
          </div>

          <div className="acd-field acd-field-full">
            <label htmlFor="contract-title">عنوان العقد</label>
            <input
              id="contract-title"
              placeholder="مثال: عقد مبايعة دراجة نارية"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>

          <div className="acd-field acd-field-full">
            <label htmlFor="contract-pdf">ملف PDF</label>
            <input
              id="contract-pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            />
          </div>

          <div className="acd-form-actions">
            <button className="acd-btn acd-btn-primary" type="submit" disabled={submitting}>
              <i className="fas fa-plus"></i>
              {submitting ? 'جاري الإنشاء...' : 'إنشاء العقد'}
            </button>
          </div>
        </form>
      </div>

      <div className="acd-table-card">
        <div className="acd-card-title-row">
          <h3 className="acd-card-title"><i className="fas fa-table-list"></i> قائمة العقود</h3>
          <div className="acd-tabs">
            <button className={`acd-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
              جميع العقود <span>{tabCounts.all}</span>
            </button>
            <button className={`acd-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
              قيد المراجعة <span>{tabCounts.pending}</span>
            </button>
            <button className={`acd-tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>
              مقبولة <span>{tabCounts.approved}</span>
            </button>
            <button className={`acd-tab ${tab === 'rejected' ? 'active' : ''}`} onClick={() => setTab('rejected')}>
              مرفوضة <span>{tabCounts.rejected}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="acd-loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>جاري تحميل العقود...</p>
          </div>
        ) : (
          <div className="acd-table-wrap">
            <table className="acd-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>النوع</th>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th>PDF</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="acd-empty-row">لا توجد عقود ضمن هذا التصنيف.</td>
                  </tr>
                )}
                {filteredContracts.map((contract) => {
                  const badge = STATUS_LABELS[contract.status] || { text: contract.status, icon: 'fa-circle-info', tone: 'draft' };
                  const isBusy = actionLoadingId === contract.id;

                  return (
                    <tr key={contract.id}>
                      <td className="acd-id-cell">#{contract.id}</td>
                      <td>
                        <span className={`acd-type-pill ${contract.type}`}>
                          <i className={`fas ${contract.type === 'sale' ? 'fa-file-contract' : 'fa-file'}`}></i>
                          {contract.type === 'sale' ? 'مبايعة' : 'استئجار'}
                        </span>
                      </td>
                      <td className="acd-title-cell">{contract.title}</td>
                      <td>
                        <span className={`acd-status-badge ${badge.tone}`}>
                          <i className={`fas ${badge.icon}`}></i>
                          {badge.text}
                        </span>
                      </td>
                      <td>
                        {contract.file_url ? (
                          <a className="acd-link-btn" href={contract.file_url} target="_blank" rel="noreferrer">
                            <i className="fas fa-eye"></i>
                            عرض PDF
                          </a>
                        ) : (
                          <span className="acd-no-file">—</span>
                        )}
                      </td>
                      <td>
                        <div className="acd-actions">
                          {contract.status === 'draft' && (
                            <button className="acd-btn acd-btn-secondary" onClick={() => sendContract(contract.id)} disabled={isBusy}>
                              <i className="fas fa-paper-plane"></i>
                              {isBusy ? '...' : 'إرسال'}
                            </button>
                          )}
                          {(contract.status === 'admin_pending' || contract.status === 'nafath_approved') && (
                            <>
                              <button className="acd-btn acd-btn-success" onClick={() => approveContract(contract.id)} disabled={isBusy}>
                                <i className="fas fa-check"></i>
                                {isBusy ? '...' : 'اعتماد'}
                              </button>
                              <button className="acd-btn acd-btn-danger" onClick={() => rejectContract(contract.id)} disabled={isBusy}>
                                <i className="fas fa-xmark"></i>
                                {isBusy ? '...' : 'رفض'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContractsPage;
