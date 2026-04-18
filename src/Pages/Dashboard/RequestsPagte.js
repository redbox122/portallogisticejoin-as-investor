import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/requests-page.css';

// ── constants ─────────────────────────────────────────────────────────────────

const REQUEST_TYPES = [
  {
    key: 'renew_contract', label: 'طلب تجديد العقد',
    desc: 'تجديد عقد الاستئجار الحالي لفترة جديدة',
    icon: 'fa-rotate-right', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', needContract: true,
  },
  {
    key: 'sell_bike', label: 'طلب تصفية وبيع الدراجة',
    desc: 'طلب إنهاء العقد وتصفية الحصة وبيع الدراجة',
    icon: 'fa-motorcycle', color: '#b45309', bg: '#fffbeb', border: '#fde68a', needContract: true,
  },
  {
    key: 'add_bike', label: 'طلب إضافة دراجة',
    desc: 'إضافة دراجة نارية جديدة لمحفظتك الاستثمارية',
    icon: 'fa-plus-circle', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', needContract: false,
  },
];

const STATUS_META = {
  pending:       { label: 'قيد المراجعة',  cls: 'rq-pill--pending',   icon: 'fa-clock' },
  in_review:     { label: 'تحت المعالجة',  cls: 'rq-pill--review',    icon: 'fa-hourglass-half' },
  approved:      { label: 'تمت الموافقة',  cls: 'rq-pill--approved',  icon: 'fa-circle-check' },
  rejected:      { label: 'مرفوض',         cls: 'rq-pill--rejected',  icon: 'fa-circle-xmark' },
  whatsapp_sent: { label: 'تم التواصل',    cls: 'rq-pill--whatsapp',  icon: 'fa-comment-dots' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}



// ── NafathModal ───────────────────────────────────────────────────────────────

const NafathModal = ({ req, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const [initiating, setInitiating] = useState(false);
  const [nafathCode, setNafathCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('waiting'); // 'waiting', 'pending', 'approved', 'failed'

  const handleInitiate = async () => {
    setInitiating(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/investor-requests/${req.id}/nafath`,
        {},
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setNafathCode(res.data?.challenge_number || '');
        setStatus('pending');
      } else {
        setError(res.data?.message || 'فشل بدء التوثيق');
        setStatus('failed');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'خطأ في بدء التوثيق');
      setStatus('failed');
    } finally {
      setInitiating(false);
    }
  };

  return (
    <div className="rq-overlay" onClick={e => e.target === e.currentTarget && !initiating && onClose()}>
      <div className="rq-modal">
        <div className="rq-modal-head" style={{ borderRightColor: '#0f766e' }}>
          <div className="rq-modal-icon" style={{ background: '#0f766e' + '18', color: '#0f766e' }}>
            <i className="fas fa-lock" aria-hidden="true"></i>
          </div>
          <div className="rq-modal-head-text">
            <h3 className="rq-modal-title">توثيق الفاتورة</h3>
            <p className="rq-modal-sub">توقيع الفاتورة عبر تطبيق نفاذ</p>
          </div>
          <button type="button" className="rq-modal-close" onClick={onClose} disabled={initiating} aria-label="إغلاق">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {status === 'waiting' && (
          <>
            <p className="rq-modal-intro">اضغط أدناه لبدء عملية التوثيق الآمنة عبر تطبيق نفاذ</p>
            {error && <div className="rq-error-chip" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}
            <div className="rq-modal-foot">
              <button type="button" className="rq-btn rq-btn--ghost" onClick={onClose} disabled={initiating}>إلغاء</button>
              <button type="button" className="rq-btn rq-btn--primary" onClick={handleInitiate} disabled={initiating} style={{ background: '#0f766e' }}>
                {initiating ? <><i className="fas fa-spinner fa-spin"></i> جاري الإرسال...</> : <><i className="fas fa-mobile-screen-button"></i> فتح نفاذ</>}
              </button>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="rq-modal-intro">
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📱</div>
                <p><strong>تم إرسال الطلب إلى تطبيق نفاذ</strong></p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>يرجى فتح التطبيق واختيار الرقم للموافقة</p>
                {nafathCode && <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '6px', marginTop: '15px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>{nafathCode}</div>}
              </div>
            </div>
            <div className="rq-modal-foot">
              <button type="button" className="rq-btn rq-btn--ghost" onClick={onClose}>إغلاق</button>
              <button type="button" className="rq-btn rq-btn--primary" onClick={onSuccess} style={{ background: '#0f766e' }}>
                <i className="fas fa-circle-check"></i> تمت الموافقة
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <p className="rq-modal-intro" style={{ textAlign: 'center', color: '#cc0000' }}>
              <i className="fas fa-circle-exclamation"></i> حدث خطأ
            </p>
            {error && <div className="rq-error-chip" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}
            <div className="rq-modal-foot">
              <button type="button" className="rq-btn rq-btn--ghost" onClick={onClose}>إغلاق</button>
              <button type="button" className="rq-btn rq-btn--primary" onClick={handleInitiate} style={{ background: '#0f766e' }}>
                <i className="fas fa-rotate-right"></i> إعادة المحاولة
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── ConfirmModal ──────────────────────────────────────────────────────────────

const ConfirmModal = ({ requestType, userContracts, user, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const typeMeta = REQUEST_TYPES.find(t => t.key === requestType);
  const [form, setForm]   = useState({ full_name: user?.name || '', national_id: user?.national_id || '', phone: user?.phone || '', contract_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setField = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const submit = async () => {
    if (!form.full_name.trim())                             { setError('الاسم الكامل مطلوب.');  return; }
    if (!form.national_id.trim())                           { setError('رقم الهوية مطلوب.');     return; }
    if (!form.phone.trim())                                 { setError('رقم الجوال مطلوب.');     return; }
    if (typeMeta?.needContract && !form.contract_id)        { setError('يرجى اختيار العقد.');    return; }
    setSaving(true); setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/portallogistice/requests`, {
        type: requestType, full_name: form.full_name.trim(), national_id: form.national_id.trim(),
        phone: form.phone.trim(), contract_id: form.contract_id || undefined,
      }, { headers: getAuthHeaders() });
      onSuccess(res.data?.data);
    } catch (e) { setError(e?.response?.data?.message || 'تعذر تقديم الطلب.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rq-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="rq-modal">
        <div className="rq-modal-head" style={{ borderRightColor: typeMeta?.color }}>
          <div className="rq-modal-icon" style={{ background: typeMeta?.color + '18', color: typeMeta?.color }}>
            <i className={`fas ${typeMeta?.icon}`} aria-hidden="true"></i>
          </div>
          <div className="rq-modal-head-text">
            <h3 className="rq-modal-title">{typeMeta?.label}</h3>
            <p className="rq-modal-sub">{typeMeta?.desc}</p>
          </div>
          <button type="button" className="rq-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <p className="rq-modal-intro">يرجى التأكد من صحة بياناتك قبل تقديم الطلب.</p>

        <div className="rq-modal-form">
          <div className="rq-field">
            <label className="rq-label">الاسم الكامل *</label>
            <input className="rq-input" type="text" value={form.full_name} onChange={e => setField('full_name', e.target.value)} />
          </div>
          <div className="rq-field">
            <label className="rq-label">رقم الهوية الوطنية *</label>
            <input className="rq-input" type="text" value={form.national_id} dir="ltr" onChange={e => setField('national_id', e.target.value)} />
          </div>
          <div className="rq-field">
            <label className="rq-label">رقم الجوال *</label>
            <input className="rq-input" type="tel" value={form.phone} dir="ltr" onChange={e => setField('phone', e.target.value)} />
          </div>
          {typeMeta?.needContract && userContracts.length > 0 && (
            <div className="rq-field">
              <label className="rq-label">العقد المرتبط *</label>
              <select className="rq-select" value={form.contract_id} onChange={e => setField('contract_id', e.target.value)}>
                <option value="">اختر العقد</option>
                {userContracts.map(c => (
                  <option key={c.id} value={c.id}>#{c.id} — {c.title} ({c.type === 'rental' ? 'استئجار' : 'مبايعة'})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {requestType === 'add_bike' && (
          <div className="rq-whatsapp-note">
            <i className="fab fa-whatsapp" aria-hidden="true"></i>
            سيتم التواصل معك عبر الواتساب لتأكيد بيانات العنوان الوطني والآيبان.
          </div>
        )}

        {error && <div className="rq-error-chip" role="alert"><i className="fas fa-triangle-exclamation"></i> {error}</div>}

        <div className="rq-modal-foot">
          <button type="button" className="rq-btn rq-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="rq-btn rq-btn--primary" onClick={submit} disabled={saving}
            style={{ background: typeMeta?.color, borderColor: typeMeta?.color }}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> جاري الإرسال...</> : <><i className="fas fa-paper-plane"></i> تأكيد وإرسال</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── RequestCard ───────────────────────────────────────────────────────────────

const RequestCard = ({ req, onSignRequest }) => {
  const meta     = STATUS_META[req.status] || STATUS_META.pending;
  const typeMeta = REQUEST_TYPES.find(t => t.key === req.type);
  const hasInvoice = req.admin_invoice_path;
  const canSign = hasInvoice && ['invoice_sent', 'nafath_pending', 'waiting_signature'].includes(req.status);

  const handleViewInvoice = () => {
    if (hasInvoice) {
      const fullUrl = `${window.location.origin}/storage/${req.admin_invoice_path}`;
      window.open(fullUrl, '_blank');
    }
  };

  return (
    <div className="rq-history-card">
      <div className="rq-history-icon" style={{ background: typeMeta?.color + '18', color: typeMeta?.color }}>
        <i className={`fas ${typeMeta?.icon || 'fa-file'}`} aria-hidden="true"></i>
      </div>
      <div className="rq-history-body">
        <div className="rq-history-top">
          <span className="rq-history-type">{req.type_label}</span>
          <span className={`rq-pill ${meta.cls}`}>
            <i className={`fas ${meta.icon}`} aria-hidden="true"></i> {meta.label}
          </span>
        </div>
        <div className="rq-history-date">{fmtDate(req.created_at)}</div>
        {req.contract_id && <div className="rq-history-contract"><i className="fas fa-file-contract"></i> عقد #{req.contract_id}</div>}
        {req.admin_notes && <div className="rq-history-notes"><i className="fas fa-circle-info"></i> {req.admin_notes}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          {hasInvoice && (
            <button type="button" className="rq-history-view-btn" onClick={handleViewInvoice} title="عرض المستند المرفق">
              <i className="fas fa-eye"></i> عرض المستند
            </button>
          )}
          {canSign && (
            <button 
              type="button" 
              className="rq-history-sign-btn" 
              onClick={() => onSignRequest(req)} 
              title="توقيع الفاتورة عبر نفاذ"
              style={{ background: '#0f766e', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
            >
              <i className="fas fa-pen-fancy"></i> توقيع الفاتورة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── RequestsPage ──────────────────────────────────────────────────────────────

const RequestsPage = () => {
  const { getAuthHeaders, user } = useAuth();
  const [requests, setRequests]       = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [confirmType, setConfirmType] = useState(null);
  const [nafathRequest, setNafathRequest] = useState(null);
  const [successMsg, setSuccessMsg]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/portallogistice/requests`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/contracts?type=rental`, { headers: getAuthHeaders() }),
      ]);
      if (rRes.status === 'fulfilled' && rRes.value.data?.success) {
        setRequests(rRes.value.data.data.requests || []);
        setSummary(rRes.value.data.data.summary || null);
      } else { setRequests([]); }
      if (cRes.status === 'fulfilled' && cRes.value.data?.success) setContracts(cRes.value.data.data || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleSuccess = (newReq) => {
    setConfirmType(null);
    setSuccessMsg('تم تقديم طلبك بنجاح. سيتواصل معك فريقنا قريباً.');
    setRequests(prev => [newReq, ...prev]);
    setSummary(prev => prev ? { ...prev, pending: (prev.pending || 0) + 1, total: (prev.total || 0) + 1 } : null);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSignRequest = (req) => {
    setNafathRequest(req);
  };

  const handleNafathSuccess = () => {
    setNafathRequest(null);
    setSuccessMsg('تم توقيع الفاتورة بنجاح! سيتم تحديث حالة الطلب قريباً.');
    // Reload requests to get updated status
    load();
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="rq-page" dir="rtl">
      {confirmType && (
        <ConfirmModal requestType={confirmType} userContracts={contracts} user={user}
          onClose={() => setConfirmType(null)} onSuccess={handleSuccess} />
      )}
      {nafathRequest && (
        <NafathModal req={nafathRequest} 
          onClose={() => setNafathRequest(null)} onSuccess={handleNafathSuccess} />
      )}

      <div className="rq-header">
        <h1 className="rq-title"><i className="fas fa-hand-holding-hand" aria-hidden="true"></i> طلباتي</h1>
        <p className="rq-subtitle">قدّم طلباتك المتعلقة بعقودك واستثماراتك</p>
      </div>

      {successMsg && (
        <div className="rq-success-banner" role="status">
          <i className="fas fa-circle-check"></i> {successMsg}
          <button type="button" onClick={() => setSuccessMsg('')} className="rq-dismiss" aria-label="إغلاق">×</button>
        </div>
      )}

      {!loading && summary && (
        <div className="rq-summary-strip">
          <div className="rq-summary-item"><span className="rq-summary-num">{summary.total || 0}</span><span className="rq-summary-lbl">إجمالي الطلبات</span></div>
          <div className="rq-summary-item rq-summary-item--amber"><span className="rq-summary-num">{summary.pending || 0}</span><span className="rq-summary-lbl">قيد المراجعة</span></div>
          <div className="rq-summary-item rq-summary-item--green"><span className="rq-summary-num">{summary.approved || 0}</span><span className="rq-summary-lbl">تمت الموافقة</span></div>
        </div>
      )}

      {/* request type cards */}
      <div className="rq-types-grid">
        {REQUEST_TYPES.map(t => (
          <div key={t.key} className="rq-type-card" style={{ borderColor: t.border, background: t.bg }}>
            <div className="rq-type-icon" style={{ background: t.color + '18', color: t.color }}>
              <i className={`fas ${t.icon}`} aria-hidden="true"></i>
            </div>
            <div className="rq-type-body">
              <h3 className="rq-type-title" style={{ color: t.color }}>{t.label}</h3>
              <p className="rq-type-desc">{t.desc}</p>
            </div>
            <button type="button" className="rq-type-btn" style={{ background: t.color, borderColor: t.color }}
              onClick={() => setConfirmType(t.key)}>
              <i className="fas fa-plus" aria-hidden="true"></i> تقديم طلب
            </button>
          </div>
        ))}
      </div>

      {/* history */}
      <div className="rq-history-section">
        <h2 className="rq-section-title"><i className="fas fa-clock-rotate-left" aria-hidden="true"></i> سجل الطلبات</h2>
        {loading ? (
          <div className="rq-loading" role="status"><div className="rq-spinner" aria-hidden="true"></div><span>جاري التحميل...</span></div>
        ) : requests.length === 0 ? (
          <div className="rq-empty"><i className="fas fa-inbox" aria-hidden="true"></i><p>لم تقدّم أي طلبات بعد.</p></div>
        ) : (
          <div className="rq-history-list">{requests.map(r => <RequestCard key={r.id} req={r} onSignRequest={handleSignRequest} />)}</div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;