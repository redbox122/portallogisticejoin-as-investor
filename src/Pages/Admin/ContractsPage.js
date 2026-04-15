import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-contracts-page.css';

const FULL_PRICE = 6600;

// ── Status labels (expanded) ──────────────────────────────────────────────────

const STATUS_LABELS = {
  admin_pending:  { text: '⏳ قيد المراجعة',    icon: 'fa-clock',         tone: 'pending' },
  nafath_approved:{ text: 'موثق نفاذ',           icon: 'fa-badge-check',   tone: 'nafath-approved' },
  nafath_pending: { text: 'بانتظار نفاذ',         icon: 'fa-shield-halved', tone: 'nafath-pending' },
  approved:       { text: '✅ مقبول',             icon: 'fa-circle-check',  tone: 'approved' },
  accepted:       { text: '✅ مكتمل',             icon: 'fa-circle-check',  tone: 'approved' },
  rejected:       { text: '❌ مرفوض',             icon: 'fa-circle-xmark',  tone: 'rejected' },
  sent:           { text: 'تم الإرسال',           icon: 'fa-paper-plane',   tone: 'sent' },
  draft:          { text: 'مسودة',               icon: 'fa-file-lines',    tone: 'draft' },
  need_to_pay:    { text: '💳 بانتظار الدفع',     icon: 'fa-money-bill-wave', tone: 'pending' },
  receipt_review: { text: '📋 مراجعة الإيصال',   icon: 'fa-hourglass-half', tone: 'pending' },
};

const TAB_FILTERS = {
  all:           () => true,
  pending:       (c) => ['admin_pending', 'nafath_approved', 'receipt_review'].includes(c.status),
  need_to_pay:   (c) => c.status === 'need_to_pay',
  approved:      (c) => ['approved', 'accepted'].includes(c.status),
  rejected:      (c) => c.status === 'rejected',
};

function fmtSAR(n) { return Number(n || 0).toLocaleString('ar-En'); }

// ── ReviewPaymentModal ────────────────────────────────────────────────────────

const ReviewPaymentModal = ({ contract, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const [amount, setAmount]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const paid      = contract.total_amount_paid || 0;
  const remaining = FULL_PRICE - paid;

  const submit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('يرجى إدخال مبلغ صحيح.'); return; }
    if (val > FULL_PRICE)  { setError(`المبلغ لا يمكن أن يتجاوز ${fmtSAR(FULL_PRICE)} ر.س.`); return; }
    setSaving(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/contracts/${contract.id}/review-payment`,
        { amount_paid: val },
        { headers: getAuthHeaders() }
      );
      onSuccess(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر تسجيل الدفعة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acd-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="acd-review-modal">
        {/* header */}
        <div className="acd-review-head">
          <div>
            <h3 className="acd-review-title">مراجعة الإيصال</h3>
            <p className="acd-review-sub">#{contract.id} — {contract.title}</p>
          </div>
          <button type="button" className="acd-review-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* receipt preview */}
        {contract.sale_receipt_url && (
          <div className="acd-review-receipt">
            {contract.sale_receipt_url.match(/\.(jpg|jpeg|png|webp)$/i)
              ? <img src={contract.sale_receipt_url} alt="إيصال الدفع" className="acd-review-receipt-img" />
              : (
                <a href={contract.sale_receipt_url} target="_blank" rel="noreferrer" className="acd-review-pdf-link">
                  <i className="fas fa-file-pdf"></i> فتح الإيصال (PDF)
                </a>
              )
            }
          </div>
        )}

        {/* payment summary */}
        <div className="acd-review-summary">
          <div className="acd-review-summary-item">
            <span>إجمالي السعر</span>
            <strong>{fmtSAR(FULL_PRICE)} ر.س</strong>
          </div>
          <div className="acd-review-summary-item acd-review-summary-item--paid">
            <span>المدفوع حتى الآن</span>
            <strong>{fmtSAR(paid)} ر.س</strong>
          </div>
          <div className="acd-review-summary-item acd-review-summary-item--due">
            <span>المتبقي</span>
            <strong>{fmtSAR(remaining)} ر.س</strong>
          </div>
          {contract.payment_window_days_left !== null && (
            <div className="acd-review-summary-item">
              <span>أيام متبقية من الـ 60</span>
              <strong className={contract.payment_window_days_left <= 5 ? 'acd-text-danger' : ''}>
                {contract.payment_window_days_left} يوم
              </strong>
            </div>
          )}
        </div>

        {/* amount input */}
        <div className="acd-review-field">
          <label className="acd-review-label">المبلغ الذي دفعه المستثمر (ر.س) *</label>
          <input
            ref={inputRef}
            type="number"
            min="1"
            max={FULL_PRICE}
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(''); }}
            className={`acd-review-input${error ? ' acd-review-input--error' : ''}`}
            placeholder="مثال: 3300"
          />
          {amount && !isNaN(parseFloat(amount)) && (
            <p className="acd-review-input-hint">
              إجمالي بعد هذه الدفعة: <strong>{fmtSAR(paid + parseFloat(amount))} ر.س</strong>
              {' '}
              {(paid + parseFloat(amount)) >= FULL_PRICE
                ? <span className="acd-text-success">— سيتم إغلاق العقد ✓</span>
                : <span className="acd-text-warning">— سيبقى مفتوحاً (جزئي)</span>
              }
            </p>
          )}
          {error && <p className="acd-review-error" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</p>}
        </div>

        {/* footer */}
        <div className="acd-review-foot">
          <button type="button" className="acd-btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="acd-btn acd-btn-success" onClick={submit} disabled={saving || !amount}>
            {saving
              ? <><i className="fas fa-spinner fa-spin"></i> جاري التسجيل...</>
              : <><i className="fas fa-check"></i> قبول الدفعة</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AdminContractsPage ────────────────────────────────────────────────────────

const AdminContractsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [tab, setTab]                     = useState('pending');
  const [users, setUsers]                 = useState([]);
  const [usersLoading, setUsersLoading]   = useState(false);
  const [userSearch, setUserSearch]       = useState('');
  const [reviewModal, setReviewModal]     = useState(null); // contract to review
  const [reviewResult, setReviewResult]   = useState(null); // feedback message
  const [form, setForm] = useState({ user_id: '', type: 'sale', title: '', file: null });

  const fetchUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await axios.get(`${API_BASE_URL}/portallogistice/admin/users?${params}`,
        { headers: getAuthHeaders() });
      setUsers(res.data?.data?.data || []);
    } catch { setUsers([]); }
    finally { setUsersLoading(false); }
  }, [getAuthHeaders]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/contracts`, { headers: getAuthHeaders() });
      setContracts(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر تحميل العقود.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);
  useEffect(() => { fetchUsers(userSearch); }, [fetchUsers, userSearch]);

  const filteredContracts = useMemo(
    () => contracts.filter(TAB_FILTERS[tab] || (() => true)),
    [contracts, tab]
  );

  const sendContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/send`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally { setActionLoadingId(null); }
  };

  const approveContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/admin-approve`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally { setActionLoadingId(null); }
  };

  const rejectContract = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.post(`${API_BASE_URL}/contracts/${id}/reject`, {}, { headers: getAuthHeaders() });
      await fetchContracts();
    } finally { setActionLoadingId(null); }
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setForm({ user_id: '', type: 'sale', title: '', file: null });
      await fetchContracts();
    } finally { setSubmitting(false); }
  };

  // After admin reviews a payment
  const handleReviewSuccess = (result) => {
    setReviewModal(null);
    setReviewResult(result);
    // Update the contract in state
    if (result?.data) {
      setContracts(prev => prev.map(c => c.id === result.data.id ? result.data : c));
    }
  };

  const tabCounts = useMemo(() => ({
    all:         contracts.length,
    pending:     contracts.filter(TAB_FILTERS.pending).length,
    need_to_pay: contracts.filter(TAB_FILTERS.need_to_pay).length,
    approved:    contracts.filter(TAB_FILTERS.approved).length,
    rejected:    contracts.filter(TAB_FILTERS.rejected).length,
  }), [contracts]);

  // ── render helpers ─────────────────────────────────────────────────────────

  const renderActions = (contract) => {
    const isBusy   = actionLoadingId === contract.id;
    const canApproveReject = ['admin_pending', 'nafath_approved'].includes(contract.status);
    const isReceiptReview  = contract.status === 'receipt_review';

    return (
      <div className="acd-actions">
        {contract.file_url && (
          <a className="acd-link-btn" href={contract.file_url} target="_blank" rel="noreferrer">
            <i className="fas fa-eye"></i> عرض PDF
          </a>
        )}

        {/* Show receipt button for sale contracts with uploaded receipt */}
        {(contract.sale_receipt_url || isReceiptReview) && (
          <button
            type="button"
            className="acd-btn acd-btn-info"
            onClick={() => setReviewModal(contract)}
          >
            <i className="fas fa-file-invoice-dollar"></i>
            {isReceiptReview ? 'مراجعة الإيصال' : 'عرض الإيصال'}
          </button>
        )}

        {contract.payment_receipt_url && (
          <a className="acd-link-btn" href={contract.payment_receipt_url} target="_blank" rel="noreferrer">
            <i className="fas fa-receipt"></i> عرض الإيصال
          </a>
        )}

        {contract.status === 'draft' && (
          <button className="acd-btn acd-btn-secondary" onClick={() => sendContract(contract.id)} disabled={isBusy}>
            <i className="fas fa-paper-plane"></i> {isBusy ? '...' : 'إرسال'}
          </button>
        )}

        {canApproveReject && (
          <>
            <button className="acd-btn acd-btn-success" onClick={() => approveContract(contract.id)} disabled={isBusy}>
              <i className="fas fa-check"></i> {isBusy ? '...' : 'اعتماد'}
            </button>
            <button className="acd-btn acd-btn-danger" onClick={() => rejectContract(contract.id)} disabled={isBusy}>
              <i className="fas fa-xmark"></i> {isBusy ? '...' : 'رفض'}
            </button>
          </>
        )}

        {/* need_to_pay: show payment info */}
        {contract.status === 'need_to_pay' && (
          <span className="acd-need-to-pay-info">
            <i className="fas fa-coins"></i>
            {fmtSAR(contract.total_amount_paid)} / {fmtSAR(FULL_PRICE)} ر.س
            {contract.payment_window_days_left !== null && (
              <span className={`acd-days-left${contract.payment_window_days_left <= 7 ? ' acd-days-left--urgent' : ''}`}>
                ({contract.payment_window_days_left}د)
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="admin-contracts-dashboard" dir="rtl">

      {/* Review payment modal */}
      {reviewModal && (
        <ReviewPaymentModal
          contract={reviewModal}
          onClose={() => setReviewModal(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Review result feedback */}
      {reviewResult && (
        <div className="acd-review-result-banner">
          <i className="fas fa-circle-check"></i>
          <span>{reviewResult.message}</span>
          {reviewResult.days_left !== undefined && (
            <span className="acd-result-days">| متبقي: <strong>{reviewResult.days_left} يوم</strong></span>
          )}
          <button type="button" className="acd-dismiss" onClick={() => setReviewResult(null)} aria-label="إغلاق">×</button>
        </div>
      )}

      {/* Page header */}
      <div className="acd-header-card">
        <div className="acd-header-title-wrap">
          <h2 className="acd-title">إدارة العقود</h2>
          <p className="acd-subtitle">إدارة دورة العقود من الإرسال حتى الاعتماد النهائي.</p>
        </div>
        <div className="acd-stat-grid">
          <div className="acd-stat-item"><span className="acd-stat-label">جميع</span><strong className="acd-stat-value">{tabCounts.all}</strong></div>
          <div className="acd-stat-item"><span className="acd-stat-label">قيد المراجعة</span><strong className="acd-stat-value">{tabCounts.pending}</strong></div>
          <div className="acd-stat-item"><span className="acd-stat-label">بانتظار الدفع</span><strong className="acd-stat-value">{tabCounts.need_to_pay}</strong></div>
          <div className="acd-stat-item"><span className="acd-stat-label">مقبولة</span><strong className="acd-stat-value">{tabCounts.approved}</strong></div>
          <div className="acd-stat-item"><span className="acd-stat-label">مرفوضة</span><strong className="acd-stat-value">{tabCounts.rejected}</strong></div>
        </div>
      </div>

      {/* Create form */}
      <div className="acd-form-card">
        <div className="acd-card-title-row">
          <h3 className="acd-card-title"><i className="fas fa-file-signature"></i> إنشاء عقد جديد</h3>
        </div>
        <form onSubmit={submitCreate} className="acd-form-grid">
          <div className="acd-field">
            <label>بحث عن المستخدم</label>
            <input placeholder="ابحث بالاسم أو الهوية" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <div className="acd-field">
            <label>المستخدم</label>
            <select value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))} required>
              <option value="">{usersLoading ? 'جاري التحميل...' : 'اختر المستخدم'}</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || `User #${u.id}`} - {u.national_id || 'بدون هوية'}</option>
              ))}
            </select>
          </div>
          <div className="acd-field">
            <label>نوع العقد</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="sale">عقد مبايعة (sale)</option>
              <option value="rental">عقد استئجار (rental)</option>
            </select>
          </div>
          <div className="acd-field acd-field-full">
            <label>عنوان العقد</label>
            <input placeholder="مثال: عقد مبايعة دراجة نارية" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="acd-field acd-field-full">
            <label>ملف PDF</label>
            <input type="file" accept="application/pdf" onChange={e => setForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
          </div>
          <div className="acd-form-actions">
            <button className="acd-btn acd-btn-primary" type="submit" disabled={submitting}>
              <i className="fas fa-plus"></i> {submitting ? 'جاري الإنشاء...' : 'إنشاء العقد'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="acd-table-card">
        <div className="acd-card-title-row">
          <h3 className="acd-card-title"><i className="fas fa-table-list"></i> قائمة العقود</h3>
          <div className="acd-tabs">
            {[
              { key: 'all',         label: 'الكل',          count: tabCounts.all },
              { key: 'pending',     label: 'قيد المراجعة',  count: tabCounts.pending },
              { key: 'need_to_pay', label: 'بانتظار الدفع', count: tabCounts.need_to_pay },
              { key: 'approved',    label: 'مقبولة',         count: tabCounts.approved },
              { key: 'rejected',    label: 'مرفوضة',         count: tabCounts.rejected },
            ].map(t => (
              <button key={t.key} className={`acd-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} <span>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="acd-loading-state"><i className="fas fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>
        ) : error ? (
          <div className="acd-error-state">
            <i className="fas fa-triangle-exclamation"></i><p>{error}</p>
            <button className="acd-btn acd-btn-primary" type="button" onClick={fetchContracts}>
              <i className="fas fa-rotate-right"></i> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="acd-table-desktop acd-table-wrap">
              <table className="acd-table">
                <thead>
                  <tr><th>#</th><th>النوع</th><th>العنوان</th><th>الحالة</th><th>المدفوع</th><th>الإجراءات</th></tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 && (
                    <tr><td colSpan="6" className="acd-empty-row">لا توجد عقود.</td></tr>
                  )}
                  {filteredContracts.map(contract => {
                    const badge = STATUS_LABELS[contract.status] || { text: contract.status, icon: 'fa-circle-info', tone: 'draft' };
                    return (
                      <tr key={contract.id} className={contract.status === 'receipt_review' ? 'acd-row-highlight' : ''}>
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
                            <i className={`fas ${badge.icon}`}></i> {badge.text}
                          </span>
                        </td>
                        <td>
                          {contract.type === 'sale' && contract.total_amount_paid > 0 ? (
                            <span className="acd-paid-cell">
                              {fmtSAR(contract.total_amount_paid)} / {fmtSAR(FULL_PRICE)} ر.س
                            </span>
                          ) : '—'}
                        </td>
                        <td>{renderActions(contract)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="acd-cards-mobile acd-cards-wrap">
              {filteredContracts.length === 0 ? (
                <div className="acd-empty-state"><i className="fas fa-inbox"></i><p>لا توجد عقود.</p></div>
              ) : (
                filteredContracts.map(contract => {
                  const badge = STATUS_LABELS[contract.status] || { text: contract.status, icon: 'fa-circle-info', tone: 'draft' };
                  return (
                    <div key={contract.id} className={`acd-contract-card${contract.status === 'receipt_review' ? ' acd-card-highlight' : ''}`}>
                      <div className="acd-card-header-row">
                        <div className="acd-card-title">
                          <span className="acd-id-cell">#{contract.id}</span>
                          <span className="acd-title-cell">{contract.title}</span>
                        </div>
                        <span className={`acd-type-pill ${contract.type}`}>
                          <i className={`fas ${contract.type === 'sale' ? 'fa-file-contract' : 'fa-file'}`}></i>
                          {contract.type === 'sale' ? 'مبايعة' : 'استئجار'}
                        </span>
                      </div>
                      <div className="acd-card-meta-row">
                        <span className={`acd-status-badge ${badge.tone}`}>
                          <i className={`fas ${badge.icon}`}></i> {badge.text}
                        </span>
                        {contract.type === 'sale' && contract.total_amount_paid > 0 && (
                          <span className="acd-paid-cell">
                            {fmtSAR(contract.total_amount_paid)} / {fmtSAR(FULL_PRICE)} ر.س
                          </span>
                        )}
                      </div>
                      <div className="acd-actions">{renderActions(contract)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminContractsPage;