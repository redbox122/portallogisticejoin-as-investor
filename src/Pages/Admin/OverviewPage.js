import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';
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
  // Catmull-Rom to Bezier for smooth curve
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
    // Close area: line path + bottom line
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

      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((height - pad * 2) * i) / 3;
        return <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#eef2f7" strokeWidth="1" />;
      })}

      <path d={areaD} fill="url(#areaGrad)" />
      <path d={lineD} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />

      {/* Dots */}
      {pts.map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r="5" fill={stroke} opacity="0.15" />
      ))}
      {pts.map((pt, idx) => (
        <circle key={`dot-${idx}`} cx={pt.x} cy={pt.y} r="3" fill={stroke} />
      ))}
    </svg>
  );
}

function DonutChart({ segments }) {
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

    // thickness is achieved by drawing stroke with round caps, but we use filled donut segments
    // Build as thick stroke by layering outer/inner arcs.
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

      {/* Center */}
      <circle cx={cx} cy={cy} r={innerR - 6} fill="#fff" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">
        {Math.round(total).toLocaleString('ar-SA')}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fontWeight="800" fill="#6b7280">
        عقود
      </text>
    </svg>
  );
}

const AdminOverviewPage = () => {
  const { t } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();

  const mockDashboard = useMemo(() => {
    const stats = {
      totalPortfolio: 12500000,
      profits: 1800000,
      activeContracts: 75,
      urgentAlerts: 3,
      urgentLabel: 'عقود تنتهي خلال 30 يوم',
    };

    const yearly = [120000, 135000, 142000, 165000, 172000, 190000, 204000, 198000, 215000, 230000, 245000, 260000];

    const distribution = [
      { label: 'استثمار', value: 46, color: '#2563eb' },
      { label: 'صيانة', value: 19, color: '#10b981' },
      { label: 'خدمات', value: 10, color: '#f59e0b' },
    ];

    const contracts = [
      { id: 'CL-10024', client: 'شركة اليمامة', asset: 'خدمات لوجستية', endDate: '2026-04-10', status: 'active' },
      { id: 'CL-10025', client: 'مؤسسة المدار', asset: 'صيانة أسطول', endDate: '2026-03-28', status: 'soon' },
      { id: 'CL-10026', client: 'شركة نواة', asset: 'استثمار عقاري', endDate: '2026-05-02', status: 'active' },
      { id: 'CL-10027', client: 'مجموعة ركن', asset: 'خدمات نقل', endDate: '2026-03-31', status: 'soon' },
      { id: 'CL-10028', client: 'مكتب البيان', asset: 'صيانة تجهيزات', endDate: '2026-04-25', status: 'active' },
      { id: 'CL-10029', client: 'شركة تمكين', asset: 'خدمات تشغيل', endDate: '2026-03-22', status: 'soon' },
    ];

    return {
      stats,
      charts: {
        yearly,
        distribution,
      },
      contracts,
      progressUsage: 68,
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [search, setSearch] = useState(() => localStorage.getItem('admin_search_query') || '');

  useEffect(() => {
    const handler = (e) => {
      const q = e?.detail ?? '';
      setSearch(q);
    };
    window.addEventListener('admin-search', handler);
    return () => window.removeEventListener('admin-search', handler);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const headers = getAuthHeaders();

        // Attempt the requested endpoint (may be missing on backend for now)
        const requestedRes = await axios.get(`${API_BASE_URL}/portallogistice/admin/dashboard`, { headers });
        if (requestedRes.data?.success) {
          setDashboard((prev) => ({
            ...prev,
            ...requestedRes.data.data,
          }));
          return;
        }
      } catch (e) {
        // Fall back to existing stats endpoint (if present)
        try {
          const headers = getAuthHeaders();
          const statsRes = await axios.get(`${API_BASE_URL}/portallogistice/admin/dashboard/stats`, {
            headers,
          });

          if (statsRes.data?.success && statsRes.data.data) {
            const d = statsRes.data.data;
            // Map what we can; rest stays mock
            setDashboard((prev) => ({
              ...prev,
              stats: {
                ...prev.stats,
                activeContracts: d.active_contracts ?? d.total_contracts ?? prev.stats.activeContracts,
                urgentAlerts: d.urgent_alerts ?? prev.stats.urgentAlerts,
              },
            }));
            return;
          }
        } catch (fallbackErr) {
          // Keep mock and show error
          setError('فشل تحميل بيانات لوحة الإدارة. سيتم عرض بيانات تجريبية.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [getAuthHeaders]);

  const stats = dashboard.stats;
  const yearly = dashboard.charts.yearly;
  const distribution = dashboard.charts.distribution;
  const contracts = dashboard.contracts;
  const filteredContracts = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const hay = `${c.id} ${c.client} ${c.asset}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contracts, search]);

  const sparkData = useMemo(() => {
    const slice = yearly.slice(Math.max(0, yearly.length - 6));
    return slice.length ? slice : [1, 2, 3, 4, 5, 6];
  }, [yearly]);

  const donutSegs = distribution.map((s) => ({
    label: s.label,
    value: s.value,
    color: s.color,
  }));

  return (
    <div className="admin-saas-dashboard" dir="rtl">
      <div className="admin-saas-page">
        {loading ? (
          <div className="admin-saas-dashboard center-state">
            <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
            <p style={{ margin: 0, color: '#073491', fontWeight: 800 }}>{t('dashboard.loading')}</p>
          </div>
        ) : (
          <>
            {error ? <div className="admin-saas-dashboard center-state" style={{ minHeight: 'auto', padding: 0, marginBottom: 12 }}><div className="error-text">{error}</div></div> : null}

            {/* KPI Cards */}
            <div className="admin-saas-grid kpi-grid">
              <div className="card kpi-card kpi-blue">
                <div className="kpi-row">
                  <div>
                    <p className="kpi-label">إجمالي المحفظة</p>
                    <p className="kpi-value">{formatSAR(stats.totalPortfolio)}</p>
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
                    <p className="kpi-value">{formatSAR(stats.profits)}</p>
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
                    <p className="kpi-label">العقود النشطة</p>
                    <p className="kpi-value">{stats.activeContracts}</p>
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
                    <p className="kpi-label">تنبيهات عاجلة</p>
                    <p className="kpi-value">{stats.urgentAlerts}</p>
                    <div className="kpi-sub">
                      <span className="delta delta-red">عقود تنتهي خلال 30 يوم</span>
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
                  <h3 className="section-title">الأداء السنوي</h3>
                  <p className="chart-hint">يناير → ديسمبر (بيانات تجريبية/محدثة)</p>
                  <LineChart data={yearly} stroke="#2563eb" fill="#2563eb" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -10, gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Jan</span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Dec</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="donut-wrap">
                  <h3 className="section-title" style={{ marginBottom: 6 }}>توزيع العقود</h3>
                  <DonutChart segments={donutSegs} />
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

            {/* Table + Progress (bottom row like the reference) */}
            <div className="admin-saas-grid table-progress-grid" style={{ marginTop: 16 }}>
              <div className="card">
                <h3 className="section-title">تفاصيل العقود المهمة</h3>

                <div className="contracts-table-desktop">
                  <div className="contracts-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>رقم العقد</th>
                          <th>الأصل</th>
                          <th>اسم العميل</th>
                          <th>تاريخ الانتهاء</th>
                          <th>الحالة</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContracts.map((c) => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 900 }}>{c.id}</td>
                            <td>{c.asset}</td>
                            <td>{c.client}</td>
                            <td>{c.endDate}</td>
                            <td>
                              <span className={`status-pill ${c.status === 'active' ? 'status-active' : 'status-soon'}`}>
                                {c.status === 'active' ? 'نشط' : 'ينتهي قريباً'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="action-btn action-btn--icon action-btn--view"
                                  type="button"
                                  title="عرض"
                                  onClick={() => Store.addNotification({ title: 'عرض', message: 'سيتم ربط زر العرض لاحقاً.', type: 'info' })}
                                >
                                  <i className="fas fa-eye" />
                                </button>
                                <button
                                  className="action-btn action-btn--icon action-btn--edit"
                                  type="button"
                                  title="تعديل"
                                  onClick={() => Store.addNotification({ title: 'تعديل', message: 'سيتم ربط زر التعديل لاحقاً.', type: 'info' })}
                                >
                                  <i className="fas fa-pen" />
                                </button>
                                <button
                                  className="action-btn action-btn--icon action-btn--delete"
                                  type="button"
                                  title="حذف"
                                  onClick={() => Store.addNotification({ title: 'حذف', message: 'سيتم ربط زر الحذف لاحقاً.', type: 'danger' })}
                                >
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredContracts.length ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 18, color: '#6b7280', fontWeight: 800 }}>
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
                    <div key={`m-${c.id}`} className="contract-mobile-card" role="listitem">
                      <div className="contract-mobile-card__head">
                        <span className="contract-mobile-card__id">{c.id}</span>
                        <span className={`status-pill ${c.status === 'active' ? 'status-active' : 'status-soon'}`}>
                          {c.status === 'active' ? 'نشط' : 'ينتهي قريباً'}
                        </span>
                      </div>
                      <div className="contract-mobile-card__row">
                        <span className="contract-mobile-card__label">الأصل</span>
                        <span>{c.asset}</span>
                      </div>
                      <div className="contract-mobile-card__row">
                        <span className="contract-mobile-card__label">اسم العميل</span>
                        <span>{c.client}</span>
                      </div>
                      <div className="contract-mobile-card__row">
                        <span className="contract-mobile-card__label">تاريخ الانتهاء</span>
                        <span>{c.endDate}</span>
                      </div>
                      <div className="contract-mobile-card__actions">
                        <button
                          className="action-btn action-btn--icon action-btn--view"
                          type="button"
                          title="عرض"
                          aria-label="عرض"
                          onClick={() => Store.addNotification({ title: 'عرض', message: 'سيتم ربط زر العرض لاحقاً.', type: 'info' })}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          className="action-btn action-btn--icon action-btn--edit"
                          type="button"
                          title="تعديل"
                          aria-label="تعديل"
                          onClick={() => Store.addNotification({ title: 'تعديل', message: 'سيتم ربط زر التعديل لاحقاً.', type: 'info' })}
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          className="action-btn action-btn--icon action-btn--delete"
                          type="button"
                          title="حذف"
                          aria-label="حذف"
                          onClick={() => Store.addNotification({ title: 'حذف', message: 'سيتم ربط زر الحذف لاحقاً.', type: 'danger' })}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!filteredContracts.length ? <div className="contract-mobile-empty">لا توجد عقود</div> : null}
                </div>
              </div>

              <div className="card progress-card">
                <div className="progress-row">
                  <h3 className="section-title" style={{ margin: 0 }}>استخدام العقود</h3>
                </div>

                <div className="progress-meter">
                  <div className="progress-percent-pill">{clamp(dashboard.progressUsage, 0, 100)}%</div>
                  <div className="progress-bar" aria-label="Contract usage progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${clamp(dashboard.progressUsage, 0, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="chart-hint" style={{ marginTop: 10 }}>
                  مثال توضيحي: 68% (جاهز لتبديله ببيانات حقيقية)
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOverviewPage;
