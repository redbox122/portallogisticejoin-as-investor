import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Watch } from 'react-loader-spinner';
import { getAnalyticsSummary, getAnalyticsPayments } from '../../api/dashboardApi';
import '../../Css/pages/analytics-page.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n) {
  return Number(n || 0).toLocaleString('ar-SA');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── static fallback ───────────────────────────────────────────────────────────

const STATIC_SUMMARY = {
  total_contracts: 0, active_contracts: 0, pending_contracts: 0,
  total_invested: 0, total_received: 0, pending_payments: 0,
  completion_rate: 0,
  next_payment: { amount: 0, due_date: null, days_remaining: 0 },
};

const STATIC_MONTHLY = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  month_name: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  month_name_ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i],
  total_amount: i < 3 ? 15000 : 0,
  pending_amount: i >= 3 && i < 12 ? 15000 : 0,
  count_received: i < 3 ? 1 : 0,
  count_pending: i >= 3 ? 1 : 0,
}));

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`an-kpi an-kpi--${accent}`}>
      <div className="an-kpi-icon"><i className={`fas ${icon}`} aria-hidden="true"></i></div>
      <div className="an-kpi-value">{value}</div>
      <div className="an-kpi-label">{label}</div>
      {sub && <div className="an-kpi-sub">{sub}</div>}
    </div>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────────────

function BarChart({ data, isAr }) {
  const maxReceived = Math.max(...data.map(d => d.total_amount), 1);
  const maxPending  = Math.max(...data.map(d => d.pending_amount), 1);
  const maxVal      = Math.max(maxReceived, maxPending, 1);

  return (
    <div className="an-bar-chart">
      {data.map((month) => {
        const receivedH = Math.round((month.total_amount  / maxVal) * 100);
        const pendingH  = Math.round((month.pending_amount / maxVal) * 100);
        const name      = isAr ? month.month_name_ar : month.month_name;
        const isCurrentMonth = month.month === new Date().getMonth() + 1;

        return (
          <div key={month.month} className={`an-bar-col${isCurrentMonth ? ' an-bar-col--current' : ''}`}>
            <div className="an-bar-tooltip">
              <span className="an-tooltip-received">{fmtSAR(month.total_amount)} ر.س</span>
              {month.pending_amount > 0 && <span className="an-tooltip-pending">{fmtSAR(month.pending_amount)} ر.س</span>}
            </div>
            <div className="an-bars">
              <div className="an-bar an-bar--pending"  style={{ height: `${pendingH}%` }}></div>
              <div className="an-bar an-bar--received" style={{ height: `${receivedH}%` }}></div>
            </div>
            <span className="an-bar-label">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AnalyticsPage ─────────────────────────────────────────────────────────────

const AnalyticsPage = () => {
  const { i18n } = useTranslation(['common']);
  const isAr = i18n.language === 'ar';

  const [summary, setSummary]   = useState(null);
  const [monthly, setMonthly]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [sumRes, payRes] = await Promise.allSettled([
          getAnalyticsSummary(),
          getAnalyticsPayments(),
        ]);
        if (sumRes.status === 'fulfilled' && sumRes.value.data?.success) {
          setSummary(sumRes.value.data.data);
        }
        if (payRes.status === 'fulfilled' && payRes.value.data?.success) {
          setMonthly(payRes.value.data.data?.monthly_data);
        }
      } catch {
        // fallback below
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const s  = summary ?? STATIC_SUMMARY;
  const md = monthly ?? STATIC_MONTHLY;

  const next      = s.next_payment;
  const daysLeft  = next?.days_remaining ?? 0;
  const isOverdue = daysLeft < 0;
  const isUrgent  = !isOverdue && daysLeft <= 7;

  // total amounts for chart legend
  const totalReceivedChart = useMemo(() => md.reduce((a, m) => a + m.total_amount, 0), [md]);
  const totalPendingChart  = useMemo(() => md.reduce((a, m) => a + m.pending_amount, 0), [md]);

  if (loading) {
    return (
      <div className="an-center">
        <Watch height="52" width="52" radius="9" color="#073491" ariaLabel="loading" />
        <p className="an-loading-text">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  return (
    <div className="an-page" dir="rtl">

      {/* header */}
      <div className="an-header">
        <h1 className="an-title">
          <i className="fas fa-chart-bar" aria-hidden="true"></i> التحليلات
        </h1>
        <p className="an-subtitle">نظرة شاملة على أداء استثماراتك وحركة الدفعات</p>
      </div>

      {/* KPI row */}
      <div className="an-kpi-grid">
        <KpiCard
          icon="fa-wallet"
          label="إجمالي الاستثمار"
          value={`${fmtSAR(s.total_invested)} ر.س`}
          sub={`${s.total_contracts} عقد`}
          accent="blue"
        />
        <KpiCard
          icon="fa-money-bill-wave"
          label="إجمالي المُستلَم"
          value={`${fmtSAR(s.total_received)} ر.س`}
          sub={`نسبة الإنجاز ${s.completion_rate}%`}
          accent="green"
        />
        <KpiCard
          icon="fa-clock"
          label="المبالغ المعلقة"
          value={`${fmtSAR(s.pending_payments)} ر.س`}
          sub={`${s.active_contracts} عقد نشط`}
          accent="amber"
        />
        <KpiCard
          icon="fa-file-contract"
          label="العقود"
          value={s.total_contracts}
          sub={s.pending_contracts > 0 ? `${s.pending_contracts} قيد المراجعة` : 'جميعها معتمدة'}
          accent="teal"
        />
      </div>

      {/* completion + next payment row */}
      <div className="an-mid-grid">

        {/* completion rate */}
        <div className="an-card an-completion-card">
          <h2 className="an-card-title">
            <i className="fas fa-circle-check" aria-hidden="true"></i> نسبة الإنجاز
          </h2>
          <div className="an-completion-bar-wrap">
            <div className="an-completion-row">
              <span>المُستلَم</span>
              <strong>{s.completion_rate}%</strong>
            </div>
            <div className="an-completion-bar">
              <div className="an-completion-fill an-completion-fill--green" style={{ width: `${s.completion_rate}%` }}></div>
            </div>
          </div>
          <div className="an-completion-bar-wrap">
            <div className="an-completion-row">
              <span>المعلق</span>
              <strong>{(100 - s.completion_rate).toFixed(1)}%</strong>
            </div>
            <div className="an-completion-bar">
              <div className="an-completion-fill an-completion-fill--amber" style={{ width: `${100 - s.completion_rate}%` }}></div>
            </div>
          </div>
          <div className="an-totals">
            <div className="an-total-item">
              <span className="an-total-dot" style={{ background: '#10b981' }}></span>
              <span>مُستلَم</span>
              <strong>{fmtSAR(s.total_received)} ر.س</strong>
            </div>
            <div className="an-total-item">
              <span className="an-total-dot" style={{ background: '#f59e0b' }}></span>
              <span>معلق</span>
              <strong>{fmtSAR(s.pending_payments)} ر.س</strong>
            </div>
          </div>
        </div>

        {/* next payment */}
        <div className="an-card an-next-card">
          <h2 className="an-card-title">
            <i className="fas fa-calendar-check" aria-hidden="true"></i> الدفعة القادمة
          </h2>
          {next ? (
            <div className="an-next-body">
              <div className={`an-next-amount${isOverdue ? ' an-next--overdue' : isUrgent ? ' an-next--urgent' : ''}`}>
                {fmtSAR(next.amount)} <span className="an-next-currency">ر.س</span>
              </div>
              <div className="an-next-date">
                <i className="fas fa-calendar-alt" aria-hidden="true"></i>
                {fmtDate(next.due_date)}
              </div>
              <div className={`an-next-chip${isOverdue ? ' an-chip--overdue' : isUrgent ? ' an-chip--urgent' : ' an-chip--ok'}`}>
                {isOverdue ? `متأخرة بـ ${Math.abs(daysLeft)} يوم` : daysLeft === 0 ? 'اليوم' : `بعد ${daysLeft} يوم`}
              </div>
            </div>
          ) : (
            <div className="an-next-empty">
              <i className="fas fa-circle-check" aria-hidden="true"></i>
              <p>لا توجد دفعات قادمة</p>
            </div>
          )}
        </div>

      </div>

      {/* monthly bar chart */}
      <div className="an-card an-chart-card">
        <div className="an-chart-head">
          <div>
            <h2 className="an-card-title" style={{ margin: 0 }}>
              <i className="fas fa-chart-column" aria-hidden="true"></i> حركة الدفعات الشهرية
            </h2>
            <p className="an-chart-year">{new Date().getFullYear()}</p>
          </div>
          <div className="an-chart-legend">
            <span className="an-legend-item">
              <span className="an-legend-dot" style={{ background: '#10b981' }}></span>
              مُستلَم — {fmtSAR(totalReceivedChart)} ر.س
            </span>
            <span className="an-legend-item">
              <span className="an-legend-dot" style={{ background: '#e5e7eb' }}></span>
              معلق — {fmtSAR(totalPendingChart)} ر.س
            </span>
          </div>
        </div>
        <BarChart data={md} isAr={isAr} />
      </div>

    </div>
  );
};

export default AnalyticsPage;
