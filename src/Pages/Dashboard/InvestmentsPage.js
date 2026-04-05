import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/investments-page.css';

// ── helpers ──────────────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateAr(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Returns { activated: bool, activationDate: Date, daysLeft: number } */
function getActivationInfo(approvedAt) {
  if (!approvedAt) return { activated: false, activationDate: null, daysLeft: null };
  const activationDate = addDays(approvedAt, 35);
  const now = new Date();
  const activated = now >= activationDate;
  const daysLeft = activated
    ? 0
    : Math.ceil((activationDate - now) / (1000 * 60 * 60 * 24));
  return { activated, activationDate, daysLeft };
}

/** Progress 0–100 from approval toward 35-day activation */
function activationProgressPercent(approvedAt, daysLeft, activated) {
  if (activated || daysLeft == null) return 100;
  const elapsed = Math.max(0, 35 - daysLeft);
  return Math.min(100, Math.round((elapsed / 35) * 100));
}

/** Build 12 monthly payment rows starting one month after activationDate (client fallback) */
function buildPaymentSchedule(contract, activationDate) {
  const monthlyAmount = contract.monthly_payment_amount
    || (contract.total_amount ? Math.round(contract.total_amount / 12) : 0);

  const rows = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(activationDate);
    start.setMonth(start.getMonth() + i + 1);
    start.setDate(1);

    const end = new Date(start);
    end.setDate(start.getDate() + 29);

    const apiPayment = contract.payments?.find((p) => p.month_number === i + 1);

    rows.push({
      month: i + 1,
      start,
      end,
      amount: apiPayment?.amount != null ? Number(apiPayment.amount) : monthlyAmount,
      status: apiPayment?.status ?? 'pending',
      payment_date: apiPayment?.payment_date ?? null,
    });
  }
  return rows;
}

/**
 * GET /contracts/{id}/payments or /portallogistice/contracts/{id}/payments
 * @returns {{ contract_id?: number, activation_date?: string, payments: Array }}
 */
async function fetchContractPaymentsPayload(contractId, headers) {
  const urls = [
    `${API_BASE_URL}/contracts/${contractId}/payments`,
    `${API_BASE_URL}/portallogistice/contracts/${contractId}/payments`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers });
      const data = res.data?.data;
      if (res.data?.success && data && Array.isArray(data.payments)) {
        return data;
      }
      throw new Error(res.data?.message || 'استجابة غير متوقعة من الخادم');
    } catch (e) {
      lastError = e;
      if (e.response?.status === 404) continue;
      throw e;
    }
  }
  throw lastError || new Error('تعذر الوصول لجدول الدفعات');
}

/** Map API payment rows (due_date, month_number, …) to table rows */
function mapPaymentsApiToRows(apiData, contract, clientActivationDate) {
  const activationRef = apiData.activation_date
    ? new Date(apiData.activation_date)
    : clientActivationDate;

  const monthlyAmount = contract.monthly_payment_amount
    || (contract.total_amount ? Math.round(Number(contract.total_amount) / 12) : 0);

  const list = apiData.payments || [];
  const byMonth = new Map(
    list.map((p) => [Number(p.month_number ?? p.monthNumber), p])
  );

  const rows = [];
  for (let i = 0; i < 12; i++) {
    const m = i + 1;
    const p = byMonth.get(m);
    let start;
    let end;

    const due = p?.due_date ?? p?.dueDate;
    if (due) {
      start = new Date(due);
      end = addDays(start, 29);
    } else {
      start = new Date(activationRef);
      start.setMonth(start.getMonth() + i + 1);
      start.setDate(1);
      end = new Date(start);
      end.setDate(start.getDate() + 29);
    }

    const amount = p?.amount != null ? Number(p.amount) : monthlyAmount;
    const paymentDate = p?.payment_date ?? p?.paymentDate ?? null;

    rows.push({
      month: m,
      start,
      end,
      amount,
      status: p?.status ?? 'pending',
      payment_date: paymentDate,
    });
  }
  return rows;
}

const STATUS_LABEL = {
  received: 'مدفوع',
  pending: 'قيد الانتظار',
  sent: 'مُرسل',
  reported_missing: 'مُبلَّغ عن غيابه',
};

const STATUS_CLASS = {
  received: 'investments-status-pill--received',
  pending: 'investments-status-pill--pending',
  sent: 'investments-status-pill--sent',
  reported_missing: 'investments-status-pill--reported_missing',
};

// ── sub-components ────────────────────────────────────────────────────────────

const PaymentRow = ({ row }) => {
  const pillClass = STATUS_CLASS[row.status] || 'investments-status-pill--pending';
  return (
    <tr>
      <td>{row.month}</td>
      <td>{formatDateShort(row.start)}</td>
      <td>{formatDateShort(row.end)}</td>
      <td className="investments-td-amount">{(row.amount || 0).toLocaleString('ar-SA')} ر.س</td>
      <td>{row.payment_date ? formatDateShort(row.payment_date) : '—'}</td>
      <td>
        <span className={`investments-status-pill ${pillClass}`}>
          {STATUS_LABEL[row.status] || row.status}
        </span>
      </td>
    </tr>
  );
};

const ContractCard = ({ contract, getAuthHeaders }) => {
  const [expanded, setExpanded] = useState(false);
  const [payPanel, setPayPanel] = useState({
    status: 'idle',
    rows: null,
    message: '',
  });

  const { activated, activationDate, daysLeft } = getActivationInfo(contract.approved_at);
  const progressPct = activationProgressPercent(contract.approved_at, daysLeft, activated);

  const schedule = payPanel.status === 'ready' && payPanel.rows ? payPanel.rows : [];
  const totalPaid = schedule.filter((r) => r.status === 'received').reduce((s, r) => s + r.amount, 0);
  const totalAmount = schedule.reduce((s, r) => s + r.amount, 0);

  const handleToggleSchedule = async () => {
    if (!activated) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);

    if (payPanel.status === 'loading') return;
    if (payPanel.status === 'ready' && payPanel.rows?.length) return;

    setPayPanel({ status: 'loading', rows: null, message: '' });
    try {
      const data = await fetchContractPaymentsPayload(contract.id, getAuthHeaders());
      const rows = mapPaymentsApiToRows(data, contract, activationDate);
      setPayPanel({ status: 'ready', rows, message: '' });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (typeof err?.message === 'string' ? err.message : null) ||
        'تعذر تحميل جدول الدفعات.';
      if (status === 422) {
        setPayPanel({ status: 'error', rows: null, message: msg });
        return;
      }
      const rows = buildPaymentSchedule(contract, activationDate);
      setPayPanel({ status: 'ready', rows, message: '' });
    }
  };

  const typeClass =
    contract.type === 'sale' ? 'investments-badge-type--sale' : 'investments-badge-type--rental';

  return (
    <article className="investments-card">
      <div className="investments-card-head">
        <div>
          <div className="investments-card-meta">
            <span className="investments-card-id">#{contract.id}</span>
            <span className={`investments-badge-type ${typeClass}`}>
              {contract.type === 'sale' ? 'عقد مبايعة' : 'عقد استئجار'}
            </span>
          </div>
          <strong className="investments-card-title">{contract.title}</strong>
        </div>
        <span className="investments-badge-approved">
          <i className="fas fa-circle-check" aria-hidden="true"></i>
          مكتمل
        </span>
      </div>

      <div className="investments-card-date">
        تاريخ الاعتماد: <strong>{formatDateAr(contract.approved_at)}</strong>
      </div>

      {activated ? (
        <div className="investments-callout investments-callout--ok" role="status">
          <i className="fas fa-circle-check" aria-hidden="true"></i>
          <span>
            تاريخ تفعيل الاستثمار: <strong>{formatDateAr(activationDate)}</strong>
          </span>
          <span className="investments-callout-status investments-callout-status--ok">مُفعَّل</span>
        </div>
      ) : (
        <div className="investments-callout investments-callout--pending" role="status">
          <i className="fas fa-hourglass-half" aria-hidden="true"></i>
          <span>
            سيتم تفعيل الاستثمار بتاريخ <strong>{formatDateAr(activationDate)}</strong>
            {' — '}
            متبقٍ <strong>{daysLeft}</strong> {daysLeft === 1 ? 'يوم' : 'أيام'}
          </span>
        </div>
      )}

      {!activated && daysLeft != null && (
        <div>
          <div className="investments-activation-bar" aria-hidden="true">
            <div className="investments-activation-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="investments-activation-bar-label">
            مراحل التفعيل: {progressPct}% من مدة الانتظار (35 يوماً من الاعتماد)
          </div>
        </div>
      )}

      <button
        type="button"
        className={`investments-toggle${activated ? ' investments-toggle--active' : ''}`}
        disabled={!activated}
        aria-expanded={activated ? expanded : false}
        aria-controls={activated ? `investments-schedule-${contract.id}` : undefined}
        aria-busy={payPanel.status === 'loading'}
        id={`investments-toggle-${contract.id}`}
        onClick={handleToggleSchedule}
      >
        {payPanel.status === 'loading' ? (
          <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
        ) : (
          <i className={`fas fa-${expanded ? 'chevron-up' : 'table-list'}`} aria-hidden="true"></i>
        )}
        {payPanel.status === 'loading'
          ? 'جاري تحميل الجدول...'
          : expanded
            ? 'إخفاء جدول الدفعات'
            : 'عرض جدول الدفعات (12 شهراً)'}
      </button>

      {expanded && activated && (
        <div
          className="investments-schedule"
          id={`investments-schedule-${contract.id}`}
          role="region"
          aria-labelledby={`investments-toggle-${contract.id}`}
          aria-busy={payPanel.status === 'loading'}
        >
          {payPanel.status === 'loading' && (
            <div className="investments-schedule-loading" role="status" aria-live="polite">
              <div className="investments-loading-spinner" aria-hidden="true"></div>
              <span>جاري جلب جدول الدفعات من الخادم...</span>
            </div>
          )}

          {payPanel.status === 'error' && (
            <div className="investments-schedule-error" role="alert">
              <i className="fas fa-circle-exclamation" aria-hidden="true"></i>
              <span>{payPanel.message}</span>
            </div>
          )}

          {payPanel.status === 'ready' && payPanel.rows && (
            <>
              <div className="investments-summary-bar">
                <div className="investments-summary-pill">
                  إجمالي العقد
                  <strong>{totalAmount.toLocaleString('ar-SA')} ر.س</strong>
                </div>
                <div className="investments-summary-pill investments-summary-pill--paid">
                  المدفوع
                  <strong>{totalPaid.toLocaleString('ar-SA')} ر.س</strong>
                </div>
                <div className="investments-summary-pill investments-summary-pill--due">
                  المتبقي
                  <strong>{(totalAmount - totalPaid).toLocaleString('ar-SA')} ر.س</strong>
                </div>
              </div>

              <div className="investments-table-wrap">
                <table className="investments-table">
                  <thead>
                    <tr>
                      {['الشهر', 'بداية الشهر', 'نهاية الشهر', 'قيمة الدفعة', 'تاريخ الدفع', 'الحالة'].map(
                        (h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <PaymentRow key={row.month} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="investments-table-hint">مرّر أفقياً على الشاشات الصغيرة لعرض كامل الجدول</p>
            </>
          )}
        </div>
      )}
    </article>
  );
};

// ── STATIC TEST DATA ──────────────────────────────────────────────────────────

const STATIC_CONTRACTS = [
  {
    id: 11,
    title: 'عقد استثمار - وحدة A3',
    type: 'sale',
    status: 'approved',
    approved_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount: 180000,
    monthly_payment_amount: 15000,
    payments: [
      { month_number: 1, amount: 15000, status: 'received', payment_date: null },
      { month_number: 2, amount: 15000, status: 'received', payment_date: null },
      { month_number: 3, amount: 15000, status: 'pending', payment_date: null },
    ],
  },
  {
    id: 12,
    title: 'عقد استثمار - وحدة B7',
    type: 'rental',
    status: 'approved',
    approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount: 120000,
    monthly_payment_amount: 10000,
    payments: [],
  },
];

// ── main page ─────────────────────────────────────────────────────────────────

const InvestmentsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/contracts`, {
        headers: getAuthHeaders(),
      });
      const all = res.data?.data || [];
      const approved = all.filter((c) => c.status === 'approved');
      setContracts(approved.length ? approved : STATIC_CONTRACTS);
    } catch (err) {
      console.error('Failed to load contracts', err);
      setContracts(STATIC_CONTRACTS);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const stats = useMemo(() => {
    const count = contracts.length;
    const totalValue = contracts.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
    const activatedCount = contracts.filter((c) => getActivationInfo(c.approved_at).activated).length;
    return { count, totalValue, activatedCount };
  }, [contracts]);

  return (
    <div className="investments-page">
      <header className="investments-hero">
        <div className="investments-hero-inner">
          <p className="investments-kicker">
            <i className="fas fa-piggy-bank" aria-hidden="true"></i>
            محفظة الاستثمار
          </p>
          <h1 className="investments-title">استثماراتي</h1>
          <p className="investments-lead">
            عقودك المعتمدة وجداول الدفعات الشهرية. يُفعَّل الاستثمار تلقائياً بعد{' '}
            <strong>35 يوماً</strong> من تاريخ اعتماد العقد، ثم يبدأ جدول الدفعات لمدة 12 شهراً.
          </p>

          {!loading && contracts.length > 0 && (
            <div className="investments-stats" aria-label="ملخص الاستثمارات">
              <div className="investments-stat">
                <span className="investments-stat-label">عقود معتمدة</span>
                <span className="investments-stat-value investments-stat-value--accent">
                  {stats.count.toLocaleString('ar-SA')}
                </span>
              </div>
              <div className="investments-stat">
                <span className="investments-stat-label">إجمالي قيمة العقود</span>
                <span className="investments-stat-value">
                  {stats.totalValue.toLocaleString('ar-SA')} ر.س
                </span>
              </div>
              <div className="investments-stat">
                <span className="investments-stat-label">استثمارات مُفعَّلة</span>
                <span className="investments-stat-value investments-stat-value--success">
                  {stats.activatedCount.toLocaleString('ar-SA')}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {loading && (
        <div className="investments-loading" role="status" aria-live="polite">
          <div className="investments-loading-spinner" aria-hidden="true"></div>
          <span className="investments-loading-text">جاري تحميل العقود...</span>
          <div className="investments-skeleton" style={{ width: '100%', marginTop: 8 }}>
            <div className="investments-skeleton-card" />
            <div className="investments-skeleton-card" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="investments-error" role="alert">
          <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <span>{error}</span>
          <button type="button" className="investments-error-retry" onClick={loadContracts}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && contracts.length === 0 && (
        <div className="investments-empty">
          <div className="investments-empty-icon" aria-hidden="true">
            <i className="fas fa-file-contract"></i>
          </div>
          <h2>لا توجد عقود معتمدة</h2>
          <p>عند اعتماد عقدك سيظهر هنا مع جدول الدفعات بعد تفعيل الاستثمار.</p>
        </div>
      )}

      {!loading &&
        contracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} getAuthHeaders={getAuthHeaders} />
        ))}
    </div>
  );
};

export default InvestmentsPage;
