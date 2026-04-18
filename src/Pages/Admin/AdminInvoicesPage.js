import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-invoices-page.css';

// ── helpers ───────────────────────────────────────────────────────────────────

const YEAR_META = {
  1: { label: 'سنة 1', color: '#2563eb', amount: 1500 },
  2: { label: 'سنة 2', color: '#7c3aed', amount: 2700 },
  3: { label: 'سنة 3', color: '#0f766e', amount: 3300 },
};

const STATUS_META = {
  pending:       { label: 'بانتظار الدفع', cls: 'ainv-pill--pending',  icon: 'fa-clock' },
  admin_pending: { label: 'قيد المراجعة',   cls: 'ainv-pill--review',   icon: 'fa-hourglass-half' },
  approved:      { label: 'مقبول',           cls: 'ainv-pill--approved', icon: 'fa-circle-check' },
  rejected:      { label: 'مرفوض',           cls: 'ainv-pill--rejected', icon: 'fa-circle-xmark' },
};

function fmtSAR(n) { return Number(n || 0).toLocaleString('ar-En'); }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-En', { year: 'numeric', month: '2-digit', day: '2-digit' });
}



// ── RejectModal ───────────────────────────────────────────────────────────────

const RejectModal = ({ invoice, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/invoices/${invoice.id}/reject`,
        { notes: notes.trim() || 'تم رفض الإيصال. يرجى إعادة الرفع.' },
        { headers: getAuthHeaders() }
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر رفض الفاتورة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ainv-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="ainv-modal ainv-modal--sm">
        <div className="ainv-modal-head">
          <h3 className="ainv-modal-title">رفض الفاتورة</h3>
          <button type="button" className="ainv-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <p className="ainv-modal-desc">
          سيتم رفض هذا الإيصال وإنشاء فاتورة جديدة للمستثمر تلقائياً.
        </p>
        <div className="ainv-modal-field">
          <label className="ainv-field-label">سبب الرفض (اختياري)</label>
          <textarea
            className="ainv-textarea"
            rows={3}
            placeholder="مثال: الإيصال غير واضح، يرجى إعادة الرفع بصورة أوضح."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        {error && (
          <div className="ainv-modal-error" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true"></i> {error}
          </div>
        )}
        <div className="ainv-modal-foot">
          <button type="button" className="ainv-btn ainv-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="ainv-btn ainv-btn--danger" onClick={submit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> جاري...</> : <><i className="fas fa-circle-xmark" aria-hidden="true"></i> تأكيد الرفض</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── InvoiceRow ────────────────────────────────────────────────────────────────

const InvoiceRow = ({ invoice, onApprove, onReject, approving }) => {
  const meta     = STATUS_META[invoice.status] || STATUS_META.pending;
  const yearMeta = YEAR_META[invoice.year]     || YEAR_META[1];
  const canAct   = invoice.status === 'admin_pending';

  return (
    <tr className={canAct ? 'ainv-row--highlight' : ''}>
      <td>
        <div className="ainv-user-cell">
          <span className="ainv-user-name">{invoice.user?.name || '—'}</span>
          <span className="ainv-user-id">{invoice.user?.national_id}</span>
        </div>
      </td>
      <td>
        <div className="ainv-contract-cell">
          <span>#{invoice.contract?.id}</span>
          <span className="ainv-contract-title">{invoice.contract?.title}</span>
        </div>
      </td>
      <td className="ainv-center">
        <span className="ainv-year-badge" style={{ background: yearMeta.color }}>
          {yearMeta.label}
        </span>
      </td>
      <td className="ainv-amount">{fmtSAR(invoice.amount)} ر.س</td>
      <td className="ainv-center">{fmtDate(invoice.due_date)}</td>
      <td className="ainv-center">
        <span className={`ainv-pill ${meta.cls}`}>
          <i className={`fas ${meta.icon}`} aria-hidden="true"></i>
          {meta.label}
        </span>
      </td>
      <td className="ainv-center">
        {invoice.receipt_url
          ? <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="ainv-btn ainv-btn--link">
              <i className="fas fa-eye" aria-hidden="true"></i> عرض
            </a>
          : <span className="ainv-no-receipt">—</span>}
      </td>
      <td className="ainv-center">
        {canAct ? (
          <div className="ainv-actions-cell">
            <button
              type="button"
              className="ainv-btn ainv-btn--approve"
              onClick={() => onApprove(invoice)}
              disabled={approving === invoice.id}
            >
              {approving === invoice.id
                ? <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                : <><i className="fas fa-check" aria-hidden="true"></i> قبول</>}
            </button>
            <button
              type="button"
              className="ainv-btn ainv-btn--reject"
              onClick={() => onReject(invoice)}
              disabled={approving === invoice.id}
            >
              <i className="fas fa-times" aria-hidden="true"></i> رفض
            </button>
          </div>
        ) : invoice.status === 'approved' ? (
          <span className="ainv-done-mark">
            <i className="fas fa-circle-check" aria-hidden="true"></i> تم
          </span>
        ) : invoice.status === 'rejected' ? (
          <span className="ainv-rejected-mark" title={invoice.admin_notes || ''}>
            <i className="fas fa-circle-xmark" aria-hidden="true"></i>
            {invoice.admin_notes ? 'مرفوض' : 'مرفوض'}
          </span>
        ) : '—'}
      </td>
    </tr>
  );
};

// ── AdminInvoicesPage ─────────────────────────────────────────────────────────

const AdminInvoicesPage = () => {
  const { getAuthHeaders } = useAuth();

  const [invoices, setInvoices]       = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [approving, setApproving]     = useState(null); // invoice id being approved
  const [rejectModal, setRejectModal] = useState(null); // invoice to reject

  const [filters, setFilters] = useState({
    status: 'admin_pending', // default: show what needs action
    year: '',
    due_from: '',
    due_to: '',
    page: 1,
  });

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val, page: 1 }));

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.set('status',   filters.status);
      if (filters.year)     params.set('year',     filters.year);
      if (filters.due_from) params.set('due_from', filters.due_from);
      if (filters.due_to)   params.set('due_to',   filters.due_to);
      params.set('page',     String(filters.page));
      params.set('per_page', '50');

      const res = await axios.get(
        `${API_BASE_URL}/admin/invoices?${params.toString()}`,
        { headers: getAuthHeaders() }
      );
      const d = res.data?.data;
      setInvoices(d?.invoices?.length ? d.invoices : []);
      setPagination(d?.pagination || null);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── approve ───────────────────────────────────────────────────────────────

  const handleApprove = async (invoice) => {
    setApproving(invoice.id);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/invoices/${invoice.id}/approve`,
        {},
        { headers: getAuthHeaders() }
      );
      // Update row in-place
      setInvoices(prev => prev.map(i =>
        i.id === invoice.id ? { ...i, status: 'approved' } : i
      ));
    } catch (e) {
      alert(e?.response?.data?.message || 'تعذر قبول الفاتورة.');
    } finally {
      setApproving(null);
    }
  };

  // ── reject success ────────────────────────────────────────────────────────

  const handleRejectSuccess = ({ rejected_invoice, new_invoice }) => {
    setRejectModal(null);
    // Replace rejected invoice row + add new pending invoice at top
    setInvoices(prev => {
      const updated = prev.map(i =>
        i.id === rejected_invoice.id ? rejected_invoice : i
      );
      // If current filter shows pending, also show the re-issued one
      if (!filters.status || filters.status === 'pending') {
        return [new_invoice, ...updated];
      }
      return updated;
    });
  };

  // ── stats from current list ───────────────────────────────────────────────

  const pendingReview = invoices.filter(i => i.status === 'admin_pending').length;
  const approved      = invoices.filter(i => i.status === 'approved').length;

  return (
    <div className="ainv-page" dir="rtl">
      {rejectModal && (
        <RejectModal
          invoice={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={handleRejectSuccess}
        />
      )}

      {/* header */}
      <div className="ainv-header">
        <div>
          <h1 className="ainv-title">
            <i className="fas fa-file-invoice-dollar" aria-hidden="true"></i>
إدارة مخصصات الصيانة التشغيلية
          </h1>
          <p className="ainv-subtitle">مراجعة وقبول أو رفض إيصالات تأمين الصيانة للمستثمرين</p>
        </div>
      </div>

      {/* stat cards */}
      {!loading && (
        <div className="ainv-stats">
          <div className="ainv-stat ainv-stat--blue">
            <span className="ainv-stat-label">قيد المراجعة</span>
            <strong className="ainv-stat-value">{pendingReview}</strong>
          </div>
          <div className="ainv-stat ainv-stat--green">
            <span className="ainv-stat-label">مقبولة</span>
            <strong className="ainv-stat-value">{approved}</strong>
          </div>
          <div className="ainv-stat">
            <span className="ainv-stat-label">إجمالي الظاهر</span>
            <strong className="ainv-stat-value">{invoices.length}</strong>
          </div>
          <div className="ainv-stat">
            <span className="ainv-stat-label">إجمالي المبالغ</span>
            <strong className="ainv-stat-value" style={{ fontSize: 14 }}>
              {fmtSAR(invoices.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0))} ر.س
            </strong>
          </div>
        </div>
      )}

      {/* filters */}
      <div className="ainv-filters">
        <div className="ainv-filter-group">
          <label className="ainv-filter-label">الحالة</label>
          <select className="ainv-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="admin_pending">قيد المراجعة</option>
            <option value="pending">بانتظار الدفع</option>
            <option value="approved">مقبولة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>
        <div className="ainv-filter-group">
          <label className="ainv-filter-label">السنة</label>
          <select className="ainv-select" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
            <option value="">جميع السنوات</option>
            <option value="1">السنة الأولى</option>
            <option value="2">السنة الثانية</option>
            <option value="3">السنة الثالثة</option>
          </select>
        </div>
        <div className="ainv-filter-group">
          <label className="ainv-filter-label">الاستحقاق من</label>
          <input type="date" className="ainv-input" value={filters.due_from} onChange={e => setFilter('due_from', e.target.value)} />
        </div>
        <div className="ainv-filter-group">
          <label className="ainv-filter-label">إلى</label>
          <input type="date" className="ainv-input" value={filters.due_to} onChange={e => setFilter('due_to', e.target.value)} />
        </div>
        <button
          type="button"
          className="ainv-btn ainv-btn--ghost ainv-filter-reset"
          onClick={() => setFilters({ status: 'admin_pending', year: '', due_from: '', due_to: '', page: 1 })}
        >
          <i className="fas fa-rotate-right" aria-hidden="true"></i> إعادة تعيين
        </button>
      </div>

      {/* table */}
      <div className="ainv-table-card">
        {loading ? (
          <div className="ainv-loading" role="status">
            <div className="ainv-spinner" aria-hidden="true"></div>
            <span>جاري تحميل الفواتير...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="ainv-empty">
            <i className="fas fa-inbox" aria-hidden="true"></i>
            <p>لا توجد فواتير تطابق الفلتر المحدد.</p>
          </div>
        ) : (
          <div className="ainv-table-wrap">
            <table className="ainv-table">
              <thead>
                <tr>
                  <th>المستثمر</th>
                  <th>العقد</th>
                  <th className="ainv-center">السنة</th>
                  <th>المبلغ</th>
                  <th className="ainv-center">الاستحقاق</th>
                  <th className="ainv-center">الحالة</th>
                  <th className="ainv-center">الإيصال</th>
                  <th className="ainv-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onApprove={handleApprove}
                    onReject={setRejectModal}
                    approving={approving}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="ainv-pagination">
            <button
              type="button" className="ainv-btn ainv-btn--ghost"
              disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
            >
              <i className="fas fa-chevron-right" aria-hidden="true"></i> السابق
            </button>
            <span className="ainv-page-info">{filters.page} / {pagination.last_page}</span>
            <button
              type="button" className="ainv-btn ainv-btn--ghost"
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

export default AdminInvoicesPage;