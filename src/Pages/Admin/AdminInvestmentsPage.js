import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-investments-page.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date() ;
}

const STATUS_META = {
  pending:          { label: 'قيد الانتظار',        cls: 'aip-pill--pending'  },
  sent:             { label: 'مُرسل',               cls: 'aip-pill--sent'     },
  received:         { label: 'مستلم',               cls: 'aip-pill--received' },
  reported_missing: { label: 'مُبلَّغ عن غيابه',   cls: 'aip-pill--missing'  },
};

// ── static test data ──────────────────────────────────────────────────────────

// ── ReceiptModal ──────────────────────────────────────────────────────────────

const ReceiptModal = ({ payment, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const inputRef   = useRef(null);
  const [file, setFile]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [preview, setPreview] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!file) { setError('يرجى اختيار ملف الإيصال أولاً.'); return; }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('receipt', file);
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      const res = await axios.post(
        `${API_BASE_URL}/admin/payments/${payment.id}/receipt`,
        form,
        { headers }
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        (e?.response?.status === 422 ? 'تأكد من نوع الملف وحجمه (PDF أو صورة حتى 10MB).' : null) ||
        'تعذر رفع الإيصال. حاول مرة أخرى.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Clean up object URL
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="aip-overlay" role="dialog" aria-modal="true" aria-label="رفع إيصال الدفع" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="aip-modal">
        {/* header */}
        <div className="aip-modal-head">
          <div>
            <h3 className="aip-modal-title">رفع إيصال الدفع</h3>
            <p className="aip-modal-sub">
              {payment.contract?.title} — الشهر {payment.month_number} — {(payment.amount || 0).toLocaleString('ar-SA')} ر.س
            </p>
          </div>
          <button type="button" className="aip-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        {/* drop zone */}
        <div
          className={`aip-dropzone${file ? ' aip-dropzone--has-file' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {preview ? (
            <img src={preview} alt="معاينة الإيصال" className="aip-dropzone-preview" />
          ) : (
            <>
              <i className={`fas ${file ? 'fa-file-check' : 'fa-cloud-arrow-up'} aip-dropzone-icon`} aria-hidden="true"></i>
              <p className="aip-dropzone-label">
                {file ? file.name : 'اسحب الملف هنا أو انقر للاختيار'}
              </p>
              <p className="aip-dropzone-hint">PDF، JPG، PNG، WEBP — حتى 10MB</p>
            </>
          )}
        </div>

        {file && !preview && (
          <div className="aip-file-chip">
            <i className="fas fa-file-pdf" aria-hidden="true"></i>
            <span>{file.name}</span>
            <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="aip-file-chip-remove" aria-label="إزالة">×</button>
          </div>
        )}

        {error && (
          <div className="aip-modal-error" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true"></i> {error}
          </div>
        )}

        {/* footer */}
        <div className="aip-modal-foot">
          <button type="button" className="aip-btn aip-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="aip-btn aip-btn--primary" onClick={submit} disabled={saving || !file}>
            {saving ? <><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> جاري الرفع...</> : <><i className="fas fa-cloud-arrow-up" aria-hidden="true"></i> رفع الإيصال</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── PaymentRow ────────────────────────────────────────────────────────────────

const PaymentRow = ({ payment, onUpload }) => {
  const meta     = STATUS_META[payment.status] || STATUS_META.pending;
  const overdue  = payment.status !== 'received' && isOverdue(payment.due_date);

  return (
    <tr className={overdue ? 'aip-row--overdue' : ''}>
      <td>
        <div className="aip-user-cell">
          <span className="aip-user-name">{payment.user?.name || '—'}</span>
          <span className="aip-user-id">{payment.user?.national_id || ''}</span>
        </div>
      </td>
      <td>
        <div className="aip-contract-cell">
          <span>#{payment.contract?.id}</span>
          <span className="aip-contract-title">{payment.contract?.title}</span>
        </div>
      </td>
      <td className="aip-center">{payment.month_number}</td>
      <td className="aip-amount">{(payment.amount || 0).toLocaleString('ar-SA')} ر.س</td>
      <td className={`aip-center${overdue ? ' aip-overdue-date' : ''}`}>
        {formatDate(payment.due_date)}
        {overdue && <span className="aip-overdue-badge">متأخر</span>}
      </td>
      <td className="aip-center">{formatDate(payment.payment_date)}</td>
      <td className="aip-center">
        <span className={`aip-pill ${meta.cls}`}>{meta.label}</span>
      </td>
      <td className="aip-center">
        {payment.receipt_url ? (
          <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="aip-btn aip-btn--link">
            <i className="fas fa-eye" aria-hidden="true"></i> عرض
          </a>
        ) : '—'}
      </td>
      <td className="aip-center">
        {payment.status !== 'received' && (
          <button type="button" className="aip-btn aip-btn--upload" onClick={() => onUpload(payment)}>
            <i className="fas fa-cloud-arrow-up" aria-hidden="true"></i>
            رفع إيصال
          </button>
        )}
        {payment.status === 'received' && (
          <span className="aip-received-mark">
            <i className="fas fa-circle-check" aria-hidden="true"></i> مستلم
          </span>
        )}
      </td>
    </tr>
  );
};

// ── AdminInvestmentsPage ──────────────────────────────────────────────────────

const AdminInvestmentsPage = () => {
  const { getAuthHeaders } = useAuth();

  const [payments, setPayments]       = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [modalPayment, setModalPayment] = useState(null);

  const [users, setUsers]             = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch]   = useState('');

  // filters
  const [filters, setFilters] = useState({
    user_id:  '',
    status:   '',
    due_from: '',
    due_to:   '',
    page:     1,
  });

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

  const fetchUsers = useCallback(async (searchTerm = '') => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '100');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/users?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      const payload = response.data?.data;
      setUsers(payload?.data || []);
    } catch (e) {
      console.error('Failed to fetch users for payments filter', e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUsers(userSearch);
  }, [fetchUsers, userSearch]);

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.set('user_id', String(filters.user_id));
      if (filters.status)   params.set('status',   filters.status);
      if (filters.due_from) params.set('due_from', filters.due_from);
      if (filters.due_to)   params.set('due_to',   filters.due_to);
      params.set('page',     String(filters.page));
      params.set('per_page', '50');

      const res = await axios.get(
        `${API_BASE_URL}/admin/payments?${params.toString()}`,
        { headers: getAuthHeaders() }
      );
      const d = res.data?.data;
      setPayments(d?.payments?.length ? d.payments : []);
      setPagination(d?.pagination || null);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, filters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── after receipt upload: update row in-place (no full reload) ────────────

  const handleUploadSuccess = (updatedPayment) => {
    setModalPayment(null);
    setPayments(prev =>
      prev.map(p => (p.id === updatedPayment.id ? updatedPayment : p))
    );
  };

  // ── stats ─────────────────────────────────────────────────────────────────

  const pendingCount  = payments.filter(p => p.status === 'pending').length;
  const receivedCount = payments.filter(p => p.status === 'received').length;
  const overdueCount  = payments.filter(p => p.status !== 'received' && isOverdue(p.due_date)).length;
  const totalAmount   = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="aip-page" dir="rtl">
      {/* modal */}
      {modalPayment && (
        <ReceiptModal
          payment={modalPayment}
          onClose={() => setModalPayment(null)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* header */}
      <div className="aip-header">
        <div>
          <h1 className="aip-title">
            <i className="fas fa-chart-line" aria-hidden="true"></i> إدارة الدفعات
          </h1>
          <p className="aip-subtitle">رفع إيصالات الدفع وتتبع حالة الدفعات الشهرية لجميع عقود الاستثمار.</p>
        </div>
      </div>

      {/* stat cards */}
      {!loading && (
        <div className="aip-stats">
          <div className="aip-stat">
            <span className="aip-stat-label">إجمالي الدفعات</span>
            <strong className="aip-stat-value">{payments.length}</strong>
          </div>
          <div className="aip-stat aip-stat--warning">
            <span className="aip-stat-label">قيد الانتظار</span>
            <strong className="aip-stat-value">{pendingCount}</strong>
          </div>
          <div className="aip-stat aip-stat--danger">
            <span className="aip-stat-label">متأخرة</span>
            <strong className="aip-stat-value">{overdueCount}</strong>
          </div>
          <div className="aip-stat aip-stat--success">
            <span className="aip-stat-label">مستلمة</span>
            <strong className="aip-stat-value">{receivedCount}</strong>
          </div>
          <div className="aip-stat">
            <span className="aip-stat-label">إجمالي المبالغ</span>
            <strong className="aip-stat-value">{totalAmount.toLocaleString('ar-SA')} ر.س</strong>
          </div>
        </div>
      )}

      {/* filters */}
      <div className="aip-filters">
        <div className="aip-filter-group aip-filter-group--user-search">
          <label className="aip-filter-label" htmlFor="aip-user-search">بحث عن المستثمر</label>
          <input
            id="aip-user-search"
            type="text"
            className="aip-input"
            placeholder="ابحث بالاسم أو الهوية"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="aip-filter-group aip-filter-group--user">
          <label className="aip-filter-label" htmlFor="aip-user-id">المستثمر</label>
          <select
            id="aip-user-id"
            className="aip-select aip-select--user"
            value={filters.user_id}
            onChange={(e) => setFilter('user_id', e.target.value)}
          >
            <option value="">
              {usersLoading ? 'جاري تحميل المستخدمين...' : 'جميع المستثمرين'}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || `User #${u.id}`} — {u.national_id || 'بدون هوية'}
              </option>
            ))}
          </select>
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">الحالة</label>
          <select
            className="aip-select"
            value={filters.status}
            onChange={e => setFilter('status', e.target.value)}
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="sent">مُرسل</option>
            <option value="received">مستلم</option>
            <option value="reported_missing">مُبلَّغ عن غيابه</option>
          </select>
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">تاريخ الاستحقاق من</label>
          <input
            type="date"
            className="aip-input"
            value={filters.due_from}
            onChange={e => setFilter('due_from', e.target.value)}
          />
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">إلى</label>
          <input
            type="date"
            className="aip-input"
            value={filters.due_to}
            onChange={e => setFilter('due_to', e.target.value)}
          />
        </div>

        <button
          type="button"
          className="aip-btn aip-btn--ghost aip-filter-reset"
          onClick={() => {
            setUserSearch('');
            setFilters({ user_id: '', status: '', due_from: '', due_to: '', page: 1 });
          }}
        >
          <i className="fas fa-rotate-right" aria-hidden="true"></i> إعادة تعيين
        </button>
      </div>

      {/* table */}
      <div className="aip-table-card">
        {loading ? (
          <div className="aip-loading" role="status" aria-live="polite">
            <div className="aip-spinner" aria-hidden="true"></div>
            <span>جاري تحميل الدفعات...</span>
          </div>
        ) : error ? (
          <div className="aip-error" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
            <span>{error}</span>
            <button type="button" className="aip-btn aip-btn--ghost" onClick={fetchPayments}>إعادة المحاولة</button>
          </div>
        ) : payments.length === 0 ? (
          <div className="aip-empty">
            <i className="fas fa-inbox" aria-hidden="true"></i>
            <p>لا توجد دفعات تطابق الفلتر المحدد.</p>
          </div>
        ) : (
          <div className="aip-table-wrap">
            <table className="aip-table">
              <thead>
                <tr>
                  <th>المستثمر</th>
                  <th>العقد</th>
                  <th className="aip-center">الشهر</th>
                  <th>المبلغ</th>
                  <th className="aip-center">تاريخ الاستحقاق</th>
                  <th className="aip-center">تاريخ الدفع</th>
                  <th className="aip-center">الحالة</th>
                  <th className="aip-center">الإيصال</th>
                  <th className="aip-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <PaymentRow key={p.id} payment={p} onUpload={setModalPayment} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="aip-pagination">
            <button
              type="button"
              className="aip-btn aip-btn--ghost"
              disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
            >
              <i className="fas fa-chevron-right" aria-hidden="true"></i> السابق
            </button>
            <span className="aip-page-info">
              {filters.page} / {pagination.last_page}
            </span>
            <button
              type="button"
              className="aip-btn aip-btn--ghost"
              disabled={filters.page >= pagination.last_page}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
            >
              التالي <i className="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInvestmentsPage;