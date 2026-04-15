import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-requests-page.css';

// ── constants ─────────────────────────────────────────────────────────────────

const TYPE_META = {
  renew_contract: { label: 'تجديد العقد',   icon: 'fa-rotate-right', color: '#2563eb', bg: '#eff6ff' },
  sell_bike:      { label: 'تصفية وبيع',    icon: 'fa-motorcycle',   color: '#b45309', bg: '#fffbeb' },
  add_bike:       { label: 'إضافة دراجة',   icon: 'fa-plus-circle',  color: '#0f766e', bg: '#f0fdfa' },
};

const STATUS_META = {
  pending:       { label: 'قيد المراجعة',  cls: 'arq-pill--pending',   icon: 'fa-clock' },
  in_review:     { label: 'تحت المعالجة',  cls: 'arq-pill--review',    icon: 'fa-hourglass-half' },
  approved:      { label: 'تمت الموافقة',  cls: 'arq-pill--approved',  icon: 'fa-circle-check' },
  rejected:      { label: 'مرفوض',         cls: 'arq-pill--rejected',  icon: 'fa-circle-xmark' },
  whatsapp_sent: { label: 'تم التواصل',    cls: 'arq-pill--whatsapp',  icon: 'fa-comment-dots' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}


// ── RejectModal ───────────────────────────────────────────────────────────────

const RejectModal = ({ req, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/requests/${req.id}/reject`,
        { notes: notes.trim() || 'تم رفض الطلب.' }, { headers: getAuthHeaders() });
      onSuccess(res.data?.data);
    } catch (e) { setError(e?.response?.data?.message || 'تعذر رفض الطلب.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="arq-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="arq-modal arq-modal--sm">
        <div className="arq-modal-head">
          <h3 className="arq-modal-title">رفض الطلب</h3>
          <button type="button" className="arq-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق"><i className="fas fa-times"></i></button>
        </div>
        <p className="arq-modal-desc">طلب: <strong>{req.type_label}</strong> — {req.full_name}</p>
        <div className="arq-modal-field">
          <label className="arq-field-label">سبب الرفض (اختياري)</label>
          <textarea className="arq-textarea" rows={3} placeholder="اكتب سبب الرفض..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <div className="arq-modal-error" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}
        <div className="arq-modal-foot">
          <button type="button" className="arq-btn arq-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="arq-btn arq-btn--danger" onClick={submit} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> جاري...</> : <><i className="fas fa-circle-xmark"></i> تأكيد الرفض</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── InvoiceViewerModal ───────────────────────────────────────────────────────

const InvoiceViewerModal = ({ invoicePath, onClose }) => {
  if (!invoicePath) return null;
  
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(invoicePath);
  const isPDF = /\.pdf$/i.test(invoicePath);
  const fullUrl = `${window.location.origin}/storage/${invoicePath}`;

  return (
    <div className="arq-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="arq-invoice-modal">
        <div className="arq-invoice-header">
          <h3 className="arq-invoice-title">عرض المستند</h3>
          <div className="arq-invoice-actions">
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="arq-btn arq-btn--primary arq-btn--sm" download>
              <i className="fas fa-download"></i> تحميل
            </a>
            <button type="button" className="arq-invoice-close" onClick={onClose} aria-label="إغلاق">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div className="arq-invoice-body">
          {isImage && (
            <img src={fullUrl} alt="Invoice" className="arq-invoice-img" />
          )}
          {isPDF && (
            <iframe src={fullUrl} title="Invoice PDF" className="arq-invoice-pdf"></iframe>
          )}
          {!isImage && !isPDF && (
            <div className="arq-invoice-unsupported">
              <i className="fas fa-file"></i>
              <p>لا يمكن عرض هذا النوع من الملفات.</p>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="arq-btn arq-btn--primary" download>
                <i className="fas fa-download"></i> تحميل الملف
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── DeployContractModal ───────────────────────────────────────────────────────

const DeployContractModal = ({ req, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const [file, setFile]         = useState(null);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileInputRef            = React.useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) { setFile(null); setFileName(''); return; }
    
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    
    if (f.size > maxSize) { setError('حجم الملف يجب أن يكون أقل من 20 ميجابايت.'); return; }
    if (!allowedTypes.includes(f.type)) { setError('نوع الملف غير مدعوم. استخدم PDF أو صورة.'); return; }
    
    setFile(f);
    setFileName(f.name);
    setError('');
  };

  const submit = async () => {
    if (!file) { setError('اختر ملف لتحميله.'); return; }
    setSaving(true); setError('');
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      
      const res = await axios.post(`${API_BASE_URL}/admin/requests/${req.id}/deploy-contract`,
        formData,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      onSuccess(res.data?.data);
    } catch (e) { setError(e?.response?.data?.message || 'تعذر تحميل الملف.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="arq-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="arq-modal arq-modal--sm">
        <div className="arq-modal-head">
          <h3 className="arq-modal-title">تحميل العقد</h3>
          <button type="button" className="arq-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق"><i className="fas fa-times"></i></button>
        </div>
        <p className="arq-modal-desc">المستثمر: <strong>{req.full_name}</strong> — {req.user?.national_id}</p>
        <div className="arq-modal-field">
          <label className="arq-field-label">ملف العقد (PDF أو صورة) *</label>
          <div className="arq-file-upload">
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="arq-file-input"
              aria-label="اختر ملف العقد"
            />
            <button 
              type="button" 
              className="arq-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <i className="fas fa-cloud-arrow-up"></i> اختر ملف
            </button>
            {fileName && <span className="arq-file-name">{fileName}</span>}
          </div>
          <span className="arq-field-hint">الحد الأقصى للملف: 20 ميجابايت</span>
        </div>
        {error && <div className="arq-modal-error" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}
        <div className="arq-modal-foot">
          <button type="button" className="arq-btn arq-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="arq-btn arq-btn--primary" onClick={submit} disabled={saving || !file}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> جاري التحميل...</> : <><i className="fas fa-file-upload"></i> تحميل العقد</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── RequestRow ────────────────────────────────────────────────────────────────

const RequestRow = ({ req, onApprove, onReject, onWhatsapp, onDeploy, onViewInvoice, actioning }) => {
  const meta     = STATUS_META[req.status] || STATUS_META.pending;
  const typeMeta = TYPE_META[req.type]     || {};
  const busy     = actioning === req.id;
  const canAct   = ['pending', 'in_review'].includes(req.status);
  const isAddBike = req.type === 'add_bike';
  const hasInvoice = req.admin_invoice_path;

  return (
    <tr className={canAct ? 'arq-row--highlight' : ''}>
      <td>
        <div className="arq-user-cell">
          <span className="arq-user-name">{req.user?.name || req.full_name}</span>
          <span className="arq-user-id">{req.user?.national_id || req.national_id}</span>
          <span className="arq-user-phone">{req.phone}</span>
        </div>
      </td>
      <td>
        <div className="arq-type-cell">
          <span className="arq-type-badge" style={{ background: typeMeta.bg, color: typeMeta.color }}>
            <i className={`fas ${typeMeta.icon || 'fa-file'}`} aria-hidden="true"></i>
            {typeMeta.label || req.type_label}
          </span>
        </div>
      </td>
      <td className="arq-center">
        {req.contract ? (
          <div className="arq-contract-cell">
            <span>#{req.contract.id}</span>
            <span className="arq-contract-title">{req.contract.title}</span>
          </div>
        ) : '—'}
      </td>
      <td className="arq-center">{fmtDate(req.created_at)}</td>
      <td className="arq-center">
        <span className={`arq-pill ${meta.cls}`}>
          <i className={`fas ${meta.icon}`} aria-hidden="true"></i> {meta.label}
        </span>
      </td>
      <td className="arq-center">
        <div className="arq-actions-cell">
          {canAct && !isAddBike && (
            <>
              <button type="button" className="arq-btn arq-btn--approve" onClick={() => onApprove(req)} disabled={busy}>
                {busy ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> قبول</>}
              </button>
              <button type="button" className="arq-btn arq-btn--reject" onClick={() => onReject(req)} disabled={busy}>
                <i className="fas fa-times"></i> رفض
              </button>
            </>
          )}
          {canAct && isAddBike && (
            <>
              <button type="button" className="arq-btn arq-btn--whatsapp" onClick={() => onWhatsapp(req)} disabled={busy}>
                {busy ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fab fa-whatsapp"></i> واتساب</>}
              </button>
              <button type="button" className="arq-btn arq-btn--reject" onClick={() => onReject(req)} disabled={busy}>
                <i className="fas fa-times"></i> رفض
              </button>
            </>
          )}
          {req.status !== 'rejected' && (
            <button type="button" className="arq-btn arq-btn--deploy" onClick={() => onDeploy(req)} disabled={busy}>
              <i className="fas fa-file-signature"></i> عقد
            </button>
          )}
          {hasInvoice && (
            <button type="button" className="arq-btn arq-btn--view" onClick={() => onViewInvoice(req.admin_invoice_path)} title="عرض المستند المرفق">
              <i className="fas fa-eye"></i> عرض
            </button>
          )}
          {req.status === 'approved' && <span className="arq-done-mark"><i className="fas fa-circle-check"></i></span>}
          {req.status === 'whatsapp_sent' && <span className="arq-done-mark arq-done-mark--green"><i className="fas fa-comment-dots"></i></span>}
        </div>
      </td>
    </tr>
  );
};

// ── AdminRequestsPage ─────────────────────────────────────────────────────────

const AdminRequestsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [requests, setRequests]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [actioning, setActioning]   = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);
  const [deployModal, setDeployModal]   = useState(null);
  const [invoiceViewer, setInvoiceViewer] = useState(null);
  const [feedback, setFeedback]         = useState('');
  const [filters, setFilters] = useState({ status: 'pending', type: '', page: 1 });

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type)   params.set('type',   filters.type);
      params.set('page', String(filters.page));
      params.set('per_page', '50');

      const res = await axios.get(`${API_BASE_URL}/admin/requests?${params}`, { headers: getAuthHeaders() });
      const d   = res.data?.data;
      setRequests(d?.requests?.length ? d.requests : []);
      setPagination(d?.pagination || null);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, [getAuthHeaders, filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (req) => {
    setActioning(req.id);
    try {
      await axios.post(`${API_BASE_URL}/admin/requests/${req.id}/approve`, {}, { headers: getAuthHeaders() });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      setFeedback('تم قبول الطلب.');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { alert(e?.response?.data?.message || 'تعذر قبول الطلب.'); }
    finally { setActioning(null); }
  };

  const handleWhatsapp = async (req) => {
    setActioning(req.id);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/requests/${req.id}/send-whatsapp`, {}, { headers: getAuthHeaders() });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'whatsapp_sent' } : r));
      setFeedback(`تم إرسال واتساب لـ ${req.phone}`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) { alert(e?.response?.data?.message || 'تعذر إرسال الواتساب.'); }
    finally { setActioning(null); }
  };

  const handleRejectSuccess = (updated) => {
    setRejectModal(null);
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setFeedback('تم رفض الطلب.');
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleDeploySuccess = ({ request: updated }) => {
    setDeployModal(null);
    if (updated) setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setFeedback('تم إنشاء العقد وإرفاقه بالطلب.');
    setTimeout(() => setFeedback(''), 4000);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="arq-page" dir="rtl">
      {rejectModal && <RejectModal req={rejectModal} onClose={() => setRejectModal(null)} onSuccess={handleRejectSuccess} />}
      {deployModal && <DeployContractModal req={deployModal} onClose={() => setDeployModal(null)} onSuccess={handleDeploySuccess} />}
      {invoiceViewer && <InvoiceViewerModal invoicePath={invoiceViewer} onClose={() => setInvoiceViewer(null)} />}

      {/* header */}
      <div className="arq-header">
        <div>
          <h1 className="arq-title"><i className="fas fa-inbox" aria-hidden="true"></i> إدارة الطلبات</h1>
          <p className="arq-subtitle">مراجعة طلبات المستثمرين وإجراء اللازم</p>
        </div>
      </div>

      {/* stat cards */}
      {!loading && (
        <div className="arq-stats">
          <div className="arq-stat arq-stat--amber">
            <span className="arq-stat-label">قيد المراجعة</span>
            <strong className="arq-stat-value">{pendingCount}</strong>
          </div>
          <div className="arq-stat">
            <span className="arq-stat-label">إجمالي الظاهر</span>
            <strong className="arq-stat-value">{requests.length}</strong>
          </div>
          <div className="arq-stat arq-stat--blue">
            <span className="arq-stat-label">إضافة دراجة</span>
            <strong className="arq-stat-value">{requests.filter(r => r.type === 'add_bike').length}</strong>
          </div>
        </div>
      )}

      {/* feedback */}
      {feedback && (
        <div className="arq-feedback-banner" role="status">
          <i className="fas fa-circle-check"></i> {feedback}
          <button type="button" className="arq-dismiss" onClick={() => setFeedback('')} aria-label="إغلاق">×</button>
        </div>
      )}

      {/* filters */}
      <div className="arq-filters">
        <div className="arq-filter-group">
          <label className="arq-filter-label">الحالة</label>
          <select className="arq-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="in_review">تحت المعالجة</option>
            <option value="approved">تمت الموافقة</option>
            <option value="rejected">مرفوض</option>
            <option value="whatsapp_sent">تم التواصل</option>
          </select>
        </div>
        <div className="arq-filter-group">
          <label className="arq-filter-label">نوع الطلب</label>
          <select className="arq-select" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
            <option value="">جميع الأنواع</option>
            <option value="renew_contract">تجديد العقد</option>
            <option value="sell_bike">تصفية وبيع</option>
            <option value="add_bike">إضافة دراجة</option>
          </select>
        </div>
        <button type="button" className="arq-btn arq-btn--ghost arq-filter-reset"
          onClick={() => setFilters({ status: 'pending', type: '', page: 1 })}>
          <i className="fas fa-rotate-right"></i> إعادة تعيين
        </button>
      </div>

      {/* table */}
      <div className="arq-table-card">
        {loading ? (
          <div className="arq-loading" role="status">
            <div className="arq-spinner" aria-hidden="true"></div>
            <span>جاري تحميل الطلبات...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="arq-empty"><i className="fas fa-inbox" aria-hidden="true"></i><p>لا توجد طلبات تطابق الفلتر.</p></div>
        ) : (
          <div className="arq-table-wrap">
            <table className="arq-table">
              <thead>
                <tr>
                  <th>المستثمر</th>
                  <th>نوع الطلب</th>
                  <th className="arq-center">العقد</th>
                  <th className="arq-center">التاريخ</th>
                  <th className="arq-center">الحالة</th>
                  <th className="arq-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <RequestRow key={req.id} req={req}
                    onApprove={handleApprove}
                    onReject={setRejectModal}
                    onWhatsapp={handleWhatsapp}
                    onDeploy={setDeployModal}
                    onViewInvoice={setInvoiceViewer}
                    actioning={actioning}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.last_page > 1 && (
          <div className="arq-pagination">
            <button type="button" className="arq-btn arq-btn--ghost" disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>
              <i className="fas fa-chevron-right"></i> السابق
            </button>
            <span className="arq-page-info">{filters.page} / {pagination.last_page}</span>
            <button type="button" className="arq-btn arq-btn--ghost" disabled={filters.page >= pagination.last_page}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>
              التالي <i className="fas fa-chevron-left"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestsPage;