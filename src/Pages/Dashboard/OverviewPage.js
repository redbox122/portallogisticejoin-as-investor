import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProfileCompletionModal from '../../Components/ProfileCompletionModal';
import { getDashboardData } from '../../api/dashboardApi';
import { Watch } from 'react-loader-spinner';
import '../../Css/pages/admin-saas-dashboard.css';

function formatSAR(n) {
  const num = Number(n || 0);
  return `SAR ${num.toLocaleString('en-US')}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (Math.PI / 180) * angleDeg;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Sparkline({ data, stroke }) {
  const width = 120;
  const height = 36;
  const padX = 6;
  const padY = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const scaleX = (i) => padX + (i * (width - padX * 2)) / (data.length - 1);
  const scaleY = (v) => {
    if (max === min) return height / 2;
    const t = (v - min) / (max - min);
    return height - padY - t * (height - padY * 2);
  };

  const points = data.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function smoothLinePath(points) {
  if (points.length < 2) return '';
  const [p0, p1, ...rest] = points;
  const p = [p0, p1, ...rest];

  const d = [];
  d.push(`M ${p[0].x} ${p[0].y}`);
  for (let i = 0; i < p.length - 1; i++) {
    const pA = p[i - 1] || p[i];
    const pB = p[i];
    const pC = p[i + 1];
    const pD = p[i + 2] || pC;

    const cp1x = pB.x + (pC.x - pA.x) / 6;
    const cp1y = pB.y + (pC.y - pA.y) / 6;
    const cp2x = pC.x - (pD.x - pB.x) / 6;
    const cp2y = pC.y - (pD.y - pB.y) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pC.x} ${pC.y}`);
  }
  return d.join(' ');
}

function LineChart({ data, stroke, fill }) {
  const width = 700;
  const height = 220;
  const pad = 24;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const scaleX = (i) => pad + (i * (width - pad * 2)) / (data.length - 1);
  const scaleY = (v) => {
    if (max === min) return height / 2;
    const t = (v - min) / (max - min);
    return height - pad - t * (height - pad * 2);
  };

  const pts = data.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));
  const lineD = smoothLinePath(pts);

  const areaD = (() => {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const baseY = height - pad;
    return `${lineD} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  })();

  return (
    <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.32" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.00" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((height - pad * 2) * i) / 3;
        return <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#eef2f7" strokeWidth="1" />;
      })}

      <path d={areaD} fill="url(#areaGrad)" />
      <path d={lineD} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />

      {pts.map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r="5" fill={stroke} opacity="0.15" />
      ))}
      {pts.map((pt, idx) => (
        <circle key={`dot-${idx}`} cx={pt.x} cy={pt.y} r="3" fill={stroke} />
      ))}
    </svg>
  );
}

function DonutChart({ segments, centerSecondLabel = 'استثمارات' }) {
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 74;
  const innerR = 42;

  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  let acc = 0;

  const segPaths = segments.map((s) => {
    const start = (acc / total) * 360 - 90;
    acc += s.value;
    const end = (acc / total) * 360 - 90;

    const startOuter = polarToCartesian(cx, cy, outerR, end);
    const endOuter = polarToCartesian(cx, cy, outerR, start);
    const startInner = polarToCartesian(cx, cy, innerR, end);
    const endInner = polarToCartesian(cx, cy, innerR, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';

    const thickD =
      `M ${startOuter.x} ${startOuter.y} ` +
      `A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y} ` +
      `L ${endInner.x} ${endInner.y} ` +
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y} Z`;

    return { ...s, thickD };
  });

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
      <defs>
        <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.08" />
        </filter>
      </defs>

      <g filter="url(#donutShadow)">
        {segPaths.map((p, idx) => (
          <path key={idx} d={p.thickD} fill={p.color} opacity="0.95" />
        ))}
      </g>

      <circle cx={cx} cy={cy} r={innerR - 6} fill="#fff" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">
        {Math.round(total).toLocaleString('ar-SA')}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fontWeight="800" fill="#6b7280">
        {centerSecondLabel}
      </text>
    </svg>
  );
}

const OverviewPage = () => {
  const { t, i18n } = useTranslation(['common']);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [skipProfileCompletion, setSkipProfileCompletion] = useState(
    () => localStorage.getItem('skip_profile_completion') === '1'
  );
  const [fullProfile, setFullProfile] = useState(null);

  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('user_search_query') || '');

  const checkMissingFields = useCallback((userData) => {
    if (!userData) return false;

    const requiredFields = [
      'national_id',
      'first_name',
      'family_name',
      'father_name',
      'grandfather_name',
      'birth_date',
      'region',
      'bank_name',
      'iban',
      'phone',
    ];

    const missingFields = [];
    requiredFields.forEach((field) => {
      let value;
      if (field === 'phone') {
        value = userData[field] || userData.phone_number || null;
      } else {
        value = field in userData ? userData[field] : undefined;
      }

      let isMissing = false;
      if (value === undefined || value === null) {
        isMissing = true;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        isMissing = trimmed === '' || trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'null';
      } else if (typeof value === 'number' && isNaN(value)) {
        isMissing = true;
      }

      if (isMissing) missingFields.push(field);
    });

    return missingFields.length > 0;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setSearchQuery(e?.detail ?? '');
    };
    window.addEventListener('user-search', handler);
    return () => window.removeEventListener('user-search', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('portal_logistics_token');
      if (!token) {
        setLoading(false);
        setError(i18n.language === 'ar' ? 'تعذر تحميل البيانات' : 'Failed to load data');
        return;
      }

      try {
        const res = await getDashboardData(token);
        const ok = res?.data?.success;
        const data = res?.data?.data;
        if (ok && data) {
          if (cancelled) return;
          setDashboardData(data);

          const user = data?.user;
          if (!skipProfileCompletion && user && checkMissingFields(user)) {
            setFullProfile(user);
            setShowProfileCompletion(true);
          }
        } else {
          setError(i18n.language === 'ar' ? 'تعذر تحميل البيانات' : 'Failed to load data');
        }
      } catch (e) {
        if (!cancelled) setError(i18n.language === 'ar' ? 'تعذر تحميل البيانات' : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [checkMissingFields, i18n.language, skipProfileCompletion]);

  const handleProfileCompleted = async () => {
    setFullProfile(null);
    setShowProfileCompletion(false);
    // Let user refresh dashboard normally
    try {
      setLoading(true);
      const token = localStorage.getItem('portal_logistics_token');
      if (!token) return;
      const res = await getDashboardData(token);
      if (res?.data?.success && res?.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProfileCompletion = () => {
    localStorage.setItem('skip_profile_completion', '1');
    setSkipProfileCompletion(true);
    setFullProfile(null);
    setShowProfileCompletion(false);
  };

  const inv = dashboardData?.investment || {};
  const cs = dashboardData?.contracts || dashboardData?.contractsSystem || {};
  const user = dashboardData?.user || {};

  const monthsPassed = clamp(Number(inv.monthsPassed ?? inv.months_passed ?? 0), 0, 12);
  const payoutCycle = Math.max(1, Number(inv.payoutCycle ?? inv.payout_cycle ?? 3));
  const monthlyDeposit = Math.max(0, Number(inv.monthlyDeposit ?? inv.monthlyIncome ?? 0));
  const quarterlyPayout = monthlyDeposit * payoutCycle;
  const yearlyEarningsByMonth = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return payoutCycle > 0 && month % payoutCycle === 0 ? quarterlyPayout : 0;
    });
    // cumulative to look like an "performance" curve
    const cumulative = [];
    let running = 0;
    for (let i = 0; i < arr.length; i++) {
      running += arr[i];
      cumulative.push(running);
    }
    return cumulative;
  }, [payoutCycle, quarterlyPayout]);

  const totalInvestment = Number(inv.total ?? 0);
  const profitsReceived = useMemo(() => {
    if (monthsPassed <= 0) return 0;
    const idx = clamp(monthsPassed, 1, 12) - 1;
    return yearlyEarningsByMonth[idx] ?? 0;
  }, [monthsPassed, yearlyEarningsByMonth]);

  const contractCount = Number(cs.total ?? cs.used ?? inv.contractStartMonths?.length ?? 0);
  const urgentAlerts =
    Number(dashboardData?.alerts?.urgent ?? dashboardData?.urgentAlerts ?? dashboardData?.alerts?.urgentAlerts ?? 0) || 0;

  const contractStartMonths = Array.isArray(inv.contractStartMonths) ? inv.contractStartMonths : [];

  const donutSegs = useMemo(() => {
    const contractsVal = Math.max(1, contractCount);
    const maintenanceMonthly = Math.max(0, Number(inv.monthlyMaintenance ?? inv.monthly_maintenance ?? 0));
    const maintenanceVal = maintenanceMonthly * 12;
    const profitsVal = Math.max(1, Number(profitsReceived));
    const safeTotal = contractsVal + maintenanceVal + profitsVal;

    // If API returns zeros, keep a consistent ratio visually.
    if (!safeTotal) {
      return [
        { label: 'عقود', value: 1, color: '#2563eb' },
        { label: 'صيانة', value: 1, color: '#10b981' },
        { label: 'أرباح', value: 1, color: '#f59e0b' },
      ];
    }

    return [
      { label: 'عقود', value: contractsVal, color: '#2563eb' },
      { label: 'صيانة', value: maintenanceVal || 1, color: '#10b981' },
      { label: 'أرباح', value: profitsVal, color: '#f59e0b' },
    ];
  }, [contractCount, inv.monthlyMaintenance, profitsReceived]);

  const filteredContracts = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    const year = new Date().getFullYear();

    const rows = contractStartMonths
      .slice()
      .sort((a, b) => a - b)
      .map((startMonth, idx) => {
        const start = new Date(year, startMonth - 1, 1);
        const end = new Date(year, startMonth - 1, 1);
        end.setMonth(end.getMonth() + 12);

        const elapsed = clamp(monthsPassed - startMonth + 1, 0, 12);
        let statusText = isNaN(elapsed) ? 'نشط' : 'نشط';
        let statusClass = 'status-active';

        if (elapsed <= 0) {
          statusText = i18n.language === 'ar' ? 'قادم' : 'Upcoming';
          statusClass = 'status-finished';
        } else if (elapsed < 11) {
          statusText = i18n.language === 'ar' ? 'نشط' : 'Active';
          statusClass = 'status-active';
        } else if (elapsed === 11) {
          statusText = i18n.language === 'ar' ? 'ينتهي قريباً' : 'Nearing end';
          statusClass = 'status-soon';
        } else {
          statusText = i18n.language === 'ar' ? 'منتهي' : 'Finished';
          statusClass = 'status-finished';
        }

        const contractNumber = idx + 1;
        const assetLabel = inv.assetName || inv.asset || 'استثمار';

        return {
          contractNumber,
          assetLabel,
          startDate: start.toLocaleDateString('ar-SA'),
          endDate: end.toLocaleDateString('ar-SA'),
          statusText,
          statusClass,
        };
      });

    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.contractNumber} ${r.assetLabel} ${r.startDate} ${r.endDate} ${r.statusText}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contractStartMonths, i18n.language, inv.asset, inv.assetName, monthsPassed, searchQuery]);

  const progressPercent = clamp(Math.round((monthsPassed / 12) * 100), 0, 100);

  const sparkData = useMemo(() => {
    const slice = yearlyEarningsByMonth.slice(-6);
    return slice.length ? slice : [1, 2, 3, 4, 5, 6];
  }, [yearlyEarningsByMonth]);

  if (loading) {
    return (
      <div className="admin-saas-dashboard center-state" style={{ minHeight: 'auto' }}>
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p style={{ margin: 0, color: '#073491', fontWeight: 800 }}>{t('dashboard.loading') || 'جاري التحميل...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-saas-dashboard center-state" style={{ minHeight: 'auto', padding: 0, marginBottom: 12 }}>
        <div className="error-text" style={{ color: '#dc2626', fontWeight: 900 }}>
          {error || 'تعذر تحميل البيانات'}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-saas-dashboard" dir="rtl">
      <div className="admin-saas-page">
        {/* KPI Cards */}
        <div className="admin-saas-grid kpi-grid">
          <div className="card kpi-card kpi-blue">
            <div className="kpi-row">
              <div>
                <p className="kpi-label">إجمالي الاستثمار</p>
                <p className="kpi-value">{formatSAR(totalInvestment)}</p>
                <div className="kpi-sub">
                  <span className="delta">+4.1%</span>
                </div>
              </div>
              <div className="kpi-icon">
                <i className="fas fa-wallet" />
              </div>
            </div>
          </div>

          <div className="card kpi-card kpi-green">
            <div className="kpi-row">
              <div>
                <p className="kpi-label">الأرباح</p>
                <p className="kpi-value">{formatSAR(profitsReceived)}</p>
                <div className="kpi-sub">
                  <div style={{ marginTop: 2 }}>
                    <Sparkline data={sparkData.map((x) => x / 1000)} stroke="#10b981" />
                  </div>
                </div>
              </div>
              <div className="kpi-icon">
                <i className="fas fa-chart-line" />
              </div>
            </div>
          </div>

          <div className="card kpi-card kpi-teal">
            <div className="kpi-row">
              <div>
                <p className="kpi-label">عدد العقود</p>
                <p className="kpi-value">{contractCount}</p>
                <div className="kpi-sub">
                  <span className="delta delta-green">+0.8%</span>
                </div>
              </div>
              <div className="kpi-icon">
                <i className="fas fa-file-contract" />
              </div>
            </div>
          </div>

          <div className="card kpi-card kpi-red">
            <div className="kpi-row">
              <div>
                <p className="kpi-label">تنبيهات</p>
                <p className="kpi-value">{urgentAlerts}</p>
                <div className="kpi-sub">
                  <span className="delta delta-red">عند وجود تنبيهات</span>
                </div>
              </div>
              <div className="kpi-icon">
                <i className="fas fa-bell" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="admin-saas-grid charts-grid" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="chart-wrap">
              <h3 className="section-title">أداء الاستثمار</h3>
              <p className="chart-hint">يناير → ديسمبر (مبني على أرباحك)</p>
              <LineChart data={yearlyEarningsByMonth} stroke="#2563eb" fill="#2563eb" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -10, gap: 10 }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Jan</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Dec</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="donut-wrap">
              <h3 className="section-title" style={{ marginBottom: 6 }}>
                توزيع استثماراتي
              </h3>
              <DonutChart segments={donutSegs} centerSecondLabel="استثمارات" />
              <div className="donut-legend">
                {donutSegs.map((s, idx) => (
                  <div key={idx} className="legend-item">
                    <div className="legend-left">
                      <span className="legend-dot" style={{ background: s.color }} />
                      <span>{s.label}</span>
                    </div>
                    <span>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table + Progress */}
        <div className="admin-saas-grid table-progress-grid" style={{ marginTop: 16 }}>
          <div className="card">
            <h3 className="section-title">عقودي</h3>

            <div className="contracts-table-desktop">
              <div className="contracts-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>رقم العقد</th>
                      <th>الأصل</th>
                      <th>تاريخ البداية</th>
                      <th>تاريخ الانتهاء</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((c) => (
                      <tr key={`${c.contractNumber}-${c.startDate}`}>
                        <td style={{ fontWeight: 900 }}>{c.contractNumber}</td>
                        <td>{c.assetLabel}</td>
                        <td>{c.startDate}</td>
                        <td>{c.endDate}</td>
                        <td>
                          <span className={`status-pill ${c.statusClass}`}>{c.statusText}</span>
                        </td>
                      </tr>
                    ))}
                    {!filteredContracts.length ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 18, color: '#6b7280', fontWeight: 800 }}>
                          لا توجد عقود
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="contracts-cards-mobile" role="list" aria-label="قائمة العقود">
              {filteredContracts.map((c) => (
                <div
                  key={`m-${c.contractNumber}-${c.startDate}`}
                  className="contract-mobile-card"
                  role="listitem"
                >
                  <div className="contract-mobile-card__head">
                    <span className="contract-mobile-card__id">{c.contractNumber}</span>
                    <span className={`status-pill ${c.statusClass}`}>{c.statusText}</span>
                  </div>
                  <div className="contract-mobile-card__row">
                    <span className="contract-mobile-card__label">الأصل</span>
                    <span>{c.assetLabel}</span>
                  </div>
                  <div className="contract-mobile-card__row">
                    <span className="contract-mobile-card__label">تاريخ البداية</span>
                    <span>{c.startDate}</span>
                  </div>
                  <div className="contract-mobile-card__row">
                    <span className="contract-mobile-card__label">تاريخ الانتهاء</span>
                    <span>{c.endDate}</span>
                  </div>
                </div>
              ))}
              {!filteredContracts.length ? <div className="contract-mobile-empty">لا توجد عقود</div> : null}
            </div>
          </div>

          <div className="card progress-card">
            <div className="progress-row">
              <h3 className="section-title" style={{ margin: 0 }}>
                تقدم الاستثمار
              </h3>
            </div>

            <div className="progress-meter">
              <div className="progress-percent-pill">{progressPercent}%</div>
              <div className="progress-bar" aria-label="Contract investment progress">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <p className="chart-hint" style={{ marginTop: 10 }}>
              {monthsPassed} / 12
            </p>
          </div>
        </div>
      </div>

      {showProfileCompletion && !skipProfileCompletion && (fullProfile || user) && (
        <ProfileCompletionModal
          userProfile={fullProfile || user}
          onComplete={handleProfileCompleted}
          onSkip={handleSkipProfileCompletion}
        />
      )}
    </div>
  );
};

export default OverviewPage;
