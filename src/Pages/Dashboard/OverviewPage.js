import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Watch } from 'react-loader-spinner';
import { getDashboardData } from '../../api/dashboardApi';
import ProfileCompletionModal from '../../Components/ProfileCompletionModal';
import '../../Css/pages/overview-page.css';

// ── tiny helpers ──────────────────────────────────────────────────────────────

function fmtSAR(n) {
  return Number(n || 0).toLocaleString('ar-SA');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ── static fallback when API returns no data ──────────────────────────────────

const STATIC = {
  investment: {
    total: 0, monthlyDeposit: 0, totalReceived: 0,
    totalPending: 0, monthsPassed: 0  , contractStartMonths: [],
  },
  contracts: { total: 0, approved: 0, pending: 0, activated: 0 },
  paymentStatus: { total: 0, received: 0, pending: 0, reported_missing: 0 },
  nextPayment: { amount: 0, due_date: null, days_remaining: 0 },
};

// ── mini chart components ─────────────────────────────────────────────────────

function Sparkline({ data, color = '#2563eb' }) {
  const w = 80; const h = 28; const pad = 3;
  const min = Math.min(...data); const max = Math.max(...data);
  const sx = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const sy = (v) => max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const pts = data.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ProgressRing({ pct, size = 80, stroke = 8, color = '#2563eb' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent, sparkData }) {
  return (
    <div className={`ov-kpi ov-kpi--${accent}`}>
      <div className="ov-kpi-top">
        <div className="ov-kpi-icon">
          <i className={`fas ${icon}`} aria-hidden="true"></i>
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent === 'blue' ? '#2563eb' : accent === 'green' ? '#10b981' : '#f59e0b'} />}
      </div>
      <div className="ov-kpi-value">{value}</div>
      <div className="ov-kpi-label">{label}</div>
      {sub && <div className="ov-kpi-sub">{sub}</div>}
    </div>
  );
}

// ── OverviewPage ──────────────────────────────────────────────────────────────

const OverviewPage = () => {
  const { i18n } = useTranslation(['common']);
  const isAr = i18n.language === 'ar';

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [skipProfile]               = useState(() => localStorage.getItem('skip_profile_completion') === '1');

  // ── load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('portal_logistics_token');
    if (!token) { setLoading(false); setError('غير مسجّل'); return; }
    try {
      const res = await getDashboardData(token);
      if (res?.data?.success && res?.data?.data) {
        setData(res.data.data);
        const user = res.data.data.user;
        if (!skipProfile && user && hasMissingFields(user)) setShowProfile(true);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [skipProfile]);

  useEffect(() => { load(); }, [load]);

  // ── derived values ────────────────────────────────────────────────────────

  const inv       = data?.investment     ?? STATIC.investment;
  const cs        = data?.contracts      ?? STATIC.contracts;
  const ps        = data?.paymentStatus  ?? STATIC.paymentStatus;
  const next      = data?.nextPayment    ?? STATIC.nextPayment;
  const user      = data?.user           ?? {};

  const progressPct  = clamp(Math.round(((ps.received) / Math.max(ps.total, 1)) * 100), 0, 100);
  const completionPct = clamp(Math.round((inv.totalReceived / Math.max(inv.total, 1)) * 100), 0, 100);

  // Dummy sparkline data based on monthsPassed
  const sparkReceived = useMemo(() => {
    const base = Array.from({ length: 6 }, (_, i) =>
      i < (inv.monthsPassed % 6) ? (inv.monthlyDeposit || 1000) : 0
    );
    return base.some(v => v > 0) ? base : [1, 2, 3, 2, 4, 3];
  }, [inv.monthsPassed, inv.monthlyDeposit]);

  // Next payment urgency
  const daysLeft   = next?.days_remaining ?? 0;
  const isOverdue  = daysLeft < 0;
  const isUrgent   = !isOverdue && daysLeft <= 7;

  if (loading) {
    return (
      <div className="ov-center">
        <Watch height="52" width="52" radius="9" color="#073491" ariaLabel="loading" />
        <p className="ov-loading-text">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="ov-page" dir="rtl">

      {/* greeting */}
      <div className="ov-greeting">
        <div>
          <h1 className="ov-greeting-title">
            مرحباً{user.first_name ? `، ${user.first_name}` : ''} 👋
          </h1>
          <p className="ov-greeting-sub">إليك ملخص استثماراتك اليوم</p>
        </div>
        {error && <span className="ov-error-chip"><i className="fas fa-triangle-exclamation"></i> {error}</span>}
      </div>

      {/* KPI row */}
      <div className="ov-kpi-grid">
        <KpiCard
          icon="fa-wallet"
          label="إجمالي الاستثمار"
          value={`${fmtSAR(inv.total)} ر.س`}
          sub={`${cs.approved || 0} عقد معتمد`}
          accent="blue"
        />
        <KpiCard
          icon="fa-money-bill-wave"
          label="إجمالي المُستلَم"
          value={`${fmtSAR(inv.totalReceived)} ر.س`}
          sub={`${ps.received} دفعة مكتملة`}
          accent="green"
          sparkData={sparkReceived}
        />
        <KpiCard
          icon="fa-clock"
          label="المبلغ المتبقي"
          value={`${fmtSAR(inv.totalPending)} ر.س`}
          sub={`${ps.pending} دفعة قادمة`}
          accent="amber"
        />
        <KpiCard
          icon="fa-file-contract"
          label="العقود النشطة"
          value={cs.activated ?? cs.approved ?? 0}
          sub={cs.pending > 0 ? `${cs.pending} قيد المراجعة` : 'جميعها مكتملة'}
          accent="teal"
        />
      </div>

      {/* main content: progress + next payment */}
      <div className="ov-main-grid">

        {/* investment progress */}
        <div className="ov-card ov-progress-card">
          <h2 className="ov-card-title">
            <i className="fas fa-chart-pie" aria-hidden="true"></i> تقدم الاستثمار
          </h2>
          <div className="ov-progress-body">
            <div className="ov-ring-wrap">
              <ProgressRing pct={completionPct} size={110} stroke={10} color="#2563eb" />
              <div className="ov-ring-center">
                <span className="ov-ring-pct">{completionPct}%</span>
                <span className="ov-ring-label">مُستلَم</span>
              </div>
            </div>
            <div className="ov-progress-stats">
              <div className="ov-pstat">
                <span className="ov-pstat-dot" style={{ background: '#2563eb' }}></span>
                <span className="ov-pstat-label">إجمالي الاستثمار</span>
                <strong>{fmtSAR(inv.total)} ر.س</strong>
              </div>
              <div className="ov-pstat">
                <span className="ov-pstat-dot" style={{ background: '#10b981' }}></span>
                <span className="ov-pstat-label">المُستلَم</span>
                <strong style={{ color: '#10b981' }}>{fmtSAR(inv.totalReceived)} ر.س</strong>
              </div>
              <div className="ov-pstat">
                <span className="ov-pstat-dot" style={{ background: '#f59e0b' }}></span>
                <span className="ov-pstat-label">المتبقي</span>
                <strong style={{ color: '#f59e0b' }}>{fmtSAR(inv.totalPending)} ر.س</strong>
              </div>
            </div>
          </div>

          {/* payment progress bar */}
          <div className="ov-pay-bar-wrap">
            <div className="ov-pay-bar-labels">
              <span>الدفعات المكتملة</span>
              <span>{ps.received} / {ps.total}</span>
            </div>
            <div className="ov-pay-bar">
              <div className="ov-pay-bar-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* next payment */}
        <div className="ov-card ov-next-card">
          <h2 className="ov-card-title">
            <i className="fas fa-calendar-check" aria-hidden="true"></i> الدفعة القادمة
          </h2>
          {next ? (
            <div className="ov-next-body">
              <div className={`ov-next-amount${isOverdue ? ' ov-next-amount--overdue' : isUrgent ? ' ov-next-amount--urgent' : ''}`}>
                {fmtSAR(next.amount)} <span className="ov-next-currency">ر.س</span>
              </div>
              <div className="ov-next-date">
                <i className="fas fa-calendar-alt" aria-hidden="true"></i>
                {fmtDate(next.due_date)}
              </div>
              <div className={`ov-next-chip${isOverdue ? ' ov-chip--overdue' : isUrgent ? ' ov-chip--urgent' : ' ov-chip--ok'}`}>
                {isOverdue
                  ? `متأخرة بـ ${Math.abs(daysLeft)} يوم`
                  : daysLeft === 0
                  ? 'اليوم'
                  : `بعد ${daysLeft} يوم`
                }
              </div>
            </div>
          ) : (
            <div className="ov-next-empty">
              <i className="fas fa-circle-check" aria-hidden="true"></i>
              <p>لا توجد دفعات قادمة</p>
            </div>
          )}

          {/* contracts breakdown */}
          <div className="ov-contracts-breakdown">
            <h3 className="ov-breakdown-title">ملخص العقود</h3>
            <div className="ov-breakdown-grid">
              <div className="ov-breakdown-item">
                <span className="ov-breakdown-num">{cs.total ?? 0}</span>
                <span className="ov-breakdown-lbl">الإجمالي</span>
              </div>
              <div className="ov-breakdown-item ov-breakdown-item--green">
                <span className="ov-breakdown-num">{cs.approved ?? 0}</span>
                <span className="ov-breakdown-lbl">معتمدة</span>
              </div>
              <div className="ov-breakdown-item ov-breakdown-item--amber">
                <span className="ov-breakdown-num">{cs.pending ?? 0}</span>
                <span className="ov-breakdown-lbl">قيد المراجعة</span>
              </div>
              <div className="ov-breakdown-item ov-breakdown-item--blue">
                <span className="ov-breakdown-num">{cs.activated ?? 0}</span>
                <span className="ov-breakdown-lbl">مُفعَّلة</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* monthly deposit info */}
      {inv.monthlyDeposit > 0 && (
        <div className="ov-card ov-monthly-card">
          <div className="ov-monthly-inner">
            <div className="ov-monthly-info">
              <i className="fas fa-arrows-rotate ov-monthly-icon" aria-hidden="true"></i>
              <div>
                <p className="ov-monthly-label">الدفعة الشهرية الإجمالية</p>
                <p className="ov-monthly-amount">{fmtSAR(inv.monthlyDeposit)} ر.س / شهر</p>
              </div>
            </div>
            <div className="ov-monthly-months">
              <span className="ov-months-num">{inv.monthsPassed}</span>
              <span className="ov-months-label">شهر مكتمل من 12</span>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <ProfileCompletionModal
          userProfile={user}
          onComplete={() => { setShowProfile(false); load(); }}
          onSkip={() => {
            localStorage.setItem('skip_profile_completion', '1');
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
};

// ── helper ────────────────────────────────────────────────────────────────────

function hasMissingFields(user) {
  const required = ['national_id','first_name','family_name','father_name',
    'grandfather_name','birth_date','region','bank_name','iban','phone'];
  return required.some(f => {
    const v = f === 'phone' ? (user.phone || user.phone_number) : user[f];
    if (!v) return true;
    const s = String(v).trim().toLowerCase();
    return s === '' || s === 'unknown' || s === 'null';
  });
}

export default OverviewPage;
