import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT = {
  '--bg':            '#f0f4fb',
  '--bg-card':       '#ffffff',
  '--bg-card-alt':   '#f8faff',
  '--bg-header':     '#073491',
  '--border':        '#e2e8f4',
  '--border-strong': '#c7d4e8',
  '--text-1':        '#0d1b3e',
  '--text-2':        '#4a5a7a',
  '--text-3':        '#8898b8',
  '--brand':         '#073491',
  '--brand-glow':    'rgba(7,52,145,0.12)',
  '--shadow-sm':     '0 1px 3px rgba(7,52,145,0.08)',
  '--shadow-md':     '0 4px 16px rgba(7,52,145,0.12)',
  '--shadow-modal':  '0 24px 64px rgba(7,52,145,0.22)',
};

const DARK = {
  '--bg':            '#080e1f',
  '--bg-card':       '#0f1829',
  '--bg-card-alt':   '#162035',
  '--bg-header':     '#091540',
  '--border':        '#1a2640',
  '--border-strong': '#243356',
  '--text-1':        '#e8eef8',
  '--text-2':        '#7a93c0',
  '--text-3':        '#3d5070',
  '--brand':         '#4d88ff',
  '--brand-glow':    'rgba(77,136,255,0.15)',
  '--shadow-sm':     '0 1px 3px rgba(0,0,0,0.3)',
  '--shadow-md':     '0 4px 16px rgba(0,0,0,0.4)',
  '--shadow-modal':  '0 24px 64px rgba(0,0,0,0.6)',
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const YEAR_META = {
  1: { label: 'السنة ١', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  2: { label: 'السنة ٢', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  3: { label: 'السنة ٣', color: '#0f766e', bg: 'rgba(15,118,110,0.12)' },
};

const STATUS_META = {
  pending:       { label: 'بانتظار الدفع', icon: 'fa-clock',            pill: 'pill-pending'  },
  admin_pending: { label: 'قيد المراجعة',  icon: 'fa-hourglass-half',   pill: 'pill-review'   },
  approved:      { label: 'مقبول',          icon: 'fa-circle-check',     pill: 'pill-approved' },
  rejected:      { label: 'مرفوض',          icon: 'fa-circle-xmark',     pill: 'pill-rejected' },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (injected once)
// ─────────────────────────────────────────────────────────────────────────────

const
 CSS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

/* ── root ── */
.ainv-root *, .ainv-root *::before, .ainv-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ainv-root {
  font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
  direction: rtl;
  background: var(--bg);
  min-height: 100vh;
  padding: 28px 24px;
  color: var(--text-1);
  transition: background .3s, color .3s;
}

/* ── topbar ── */
.ainv-topbar {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
}
.ainv-title {
  font-size: 21px; font-weight: 700; color: var(--brand);
  display: flex; align-items: center; gap: 10px; line-height: 1.3;
}
.ainv-subtitle { font-size: 13px; color: var(--text-2); margin-top: 5px; }

/* ── dark toggle ── */
.ainv-toggle {
  display: flex; align-items: center; gap: 8px; padding: 6px 14px;
  border-radius: 999px; border: 1px solid var(--border-strong);
  background: var(--bg-card); cursor: pointer; font-size: 13px;
  color: var(--text-2); transition: all .2s; user-select: none;
  box-shadow: var(--shadow-sm); white-space: nowrap;
  font-family: inherit;
}
.ainv-toggle:hover { border-color: var(--brand); color: var(--brand); }
.ainv-toggle-track {
  width: 34px; height: 18px; border-radius: 9px;
  background: var(--border-strong); position: relative;
  transition: background .25s; flex-shrink: 0;
}
.ainv-toggle-track::after {
  content: ''; position: absolute; top: 2px; right: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; transition: transform .25s;
}
.ainv-toggle--on .ainv-toggle-track { background: var(--brand); }
.ainv-toggle--on .ainv-toggle-track::after { transform: translateX(-16px); }

/* ── stat grid ── */
.ainv-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 12px; margin-bottom: 20px;
}
.ainv-stat {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; padding: 16px;
  display: flex; flex-direction: column; gap: 8px;
  box-shadow: var(--shadow-sm); position: relative; overflow: hidden;
  transition: transform .15s, box-shadow .15s;
}
.ainv-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.ainv-stat-stripe {
  position: absolute; top: 0; right: 0;
  width: 4px; height: 100%;
  background: var(--stripe, var(--border));
  border-radius: 0 14px 14px 0;
}
.ainv-stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  background: var(--icon-bg, var(--bg-card-alt));
  color: var(--icon-color, var(--text-2));
}
.ainv-stat-label { font-size: 11px; color: var(--text-3); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.ainv-stat-value { font-size: 22px; font-weight: 800; color: var(--text-1); line-height: 1; }
.ainv-stat-sub   { font-size: 11px; color: var(--text-2); }

/* ── filters bar ── */
.ainv-filters {
  display: flex; align-items: flex-end; flex-wrap: wrap; gap: 12px;
  margin-bottom: 16px; background: var(--bg-card);
  border: 1px solid var(--border); border-radius: 14px;
  padding: 14px 16px; box-shadow: var(--shadow-sm);
}
.ainv-fg { display: flex; flex-direction: column; gap: 4px; }
.ainv-fg-label { font-size: 11px; color: var(--text-3); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.ainv-input, .ainv-select {
  padding: 7px 10px; border: 1px solid var(--border-strong);
  border-radius: 8px; font-size: 13px; color: var(--text-1);
  background: var(--bg); min-width: 150px;
  font-family: inherit; transition: border-color .15s, box-shadow .15s;
}
.ainv-input:focus, .ainv-select:focus {
  outline: none; border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

/* ── table card ── */
.ainv-table-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm);
}
.ainv-table-scroll { overflow-x: auto; }
.ainv-table {
  width: 100%; border-collapse: collapse; font-size: 13px; direction: rtl;
}
.ainv-table thead tr { background: var(--bg-header); }
.ainv-table th {
  padding: 12px 14px; text-align: right; font-weight: 600;
  white-space: nowrap; color: rgba(255,255,255,.88); font-size: 12px;
  letter-spacing: .03em;
}
.ainv-table td {
  padding: 11px 14px; border-bottom: 1px solid var(--border);
  color: var(--text-1); vertical-align: middle;
}
.ainv-table tbody tr:last-child td { border-bottom: none; }
.ainv-table tbody tr { transition: background .1s; }
.ainv-table tbody tr:hover { background: var(--bg-card-alt); }
.ainv-row--review { background: color-mix(in srgb, #f59e0b 5%, var(--bg-card)) !important; }
.ainv-row--review:hover { background: color-mix(in srgb, #f59e0b 9%, var(--bg-card)) !important; }
.ainv-center { text-align: center !important; }
.ainv-amount { font-weight: 700; color: var(--brand); white-space: nowrap; }

/* ── cells ── */
.ainv-user-cell { display: flex; flex-direction: column; gap: 2px; }
.ainv-user-name { font-weight: 600; }
.ainv-user-id   { font-size: 11px; color: var(--text-3); }
.ainv-contract-cell { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.ainv-contract-id    { font-weight: 600; color: var(--text-2); }
.ainv-contract-title { color: var(--text-3); }

/* ── year badge ── */
.ainv-year-badge {
  display: inline-block; padding: 3px 10px;
  border-radius: 20px; font-size: 11px; font-weight: 700;
}

/* ── status pills ── */
.ainv-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; border: 1px solid;
}
.pill-pending  { background:#fef3c7; color:#92400e; border-color:#fde68a; }
.pill-review   { background:#eff6ff; color:#1e40af; border-color:#bfdbfe; }
.pill-approved { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
.pill-rejected { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
.ainv-root[data-dark] .pill-pending  { background:#291700; color:#fcd34d; border-color:#854d0e; }
.ainv-root[data-dark] .pill-review   { background:#0d1f4a; color:#93c5fd; border-color:#1e3a8a; }
.ainv-root[data-dark] .pill-approved { background:#052e16; color:#86efac; border-color:#166534; }
.ainv-root[data-dark] .pill-rejected { background:#1a0505; color:#fca5a5; border-color:#7f1d1d; }

/* ── marks ── */
.ainv-done-mark, .ainv-rej-mark {
  font-size: 12px; display: inline-flex;
  align-items: center; justify-content: center; gap: 4px;
}
.ainv-done-mark { color: #15803d; }
.ainv-rej-mark  { color: #b91c1c; cursor: help; }
.ainv-root[data-dark] .ainv-done-mark { color: #4ade80; }
.ainv-root[data-dark] .ainv-rej-mark  { color: #f87171; }
.ainv-dash { color: var(--text-3); }

/* ── action buttons ── */
.ainv-actions { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.ainv-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px; font-size: 12px;
  font-weight: 600; cursor: pointer; border: 1px solid transparent;
  transition: all .15s; white-space: nowrap; font-family: inherit;
}
.ainv-btn:disabled { opacity: .45; cursor: not-allowed; }
.ainv-btn--approve { background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
.ainv-btn--approve:hover:not(:disabled) { background:#bbf7d0; }
.ainv-btn--reject  { background:#fee2e2; color:#b91c1c; border-color:#fecaca; }
.ainv-btn--reject:hover:not(:disabled)  { background:#fecaca; }
.ainv-btn--danger  { background:#b91c1c; color:#fff; border-color:#b91c1c; }
.ainv-btn--danger:hover:not(:disabled)  { background:#991b1b; }
.ainv-btn--ghost   { background:transparent; color:var(--text-2); border-color:var(--border-strong); }
.ainv-btn--ghost:hover:not(:disabled)   { background:var(--bg-card-alt); color:var(--brand); border-color:var(--brand); }
.ainv-btn--link    { background:transparent; color:var(--brand); border:none; text-decoration:underline; padding:4px 6px; }
.ainv-root[data-dark] .ainv-btn--approve { background:#052e16; color:#86efac; border-color:#166534; }
.ainv-root[data-dark] .ainv-btn--approve:hover:not(:disabled) { background:#065f46; }
.ainv-root[data-dark] .ainv-btn--reject  { background:#1a0505; color:#fca5a5; border-color:#7f1d1d; }
.ainv-root[data-dark] .ainv-btn--reject:hover:not(:disabled)  { background:#3b0f0f; }

/* ── state views ── */
.ainv-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 64px 20px;
  color: var(--text-3);
}
.ainv-state i { font-size: 38px; }
.ainv-state p { font-size: 14px; }
.ainv-spinner {
  width: 36px; height: 36px; border: 3px solid var(--border);
  border-top-color: var(--brand); border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── pagination ── */
.ainv-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 14px; border-top: 1px solid var(--border);
}
.ainv-page-info { font-size: 13px; color: var(--text-3); }

/* ── MOBILE CARDS (< 768px) — replaces table ── */
.ainv-card-list { display: none; flex-direction: column; gap: 10px; padding: 12px; }
.ainv-m-card {
  background: var(--bg-card-alt); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px; display: flex;
  flex-direction: column; gap: 10px;
}
.ainv-m-card--review { border-color: #f59e0b; }
.ainv-root[data-dark] .ainv-m-card--review { border-color: #854d0e; }
.ainv-m-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.ainv-m-label { font-size: 11px; color: var(--text-3); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.ainv-m-val   { font-size: 13px; color: var(--text-1); font-weight: 500; text-align: left; }
.ainv-m-head  { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.ainv-m-user  { display: flex; flex-direction: column; gap: 2px; }
.ainv-m-name  { font-size: 14px; font-weight: 700; color: var(--text-1); }
.ainv-m-id    { font-size: 11px; color: var(--text-3); }
.ainv-m-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.ainv-m-actions .ainv-btn { flex: 1; justify-content: center; }

@media (max-width: 768px) {
  .ainv-root { padding: 16px 12px; }
  .ainv-stats { grid-template-columns: repeat(2, 1fr); }
  .ainv-filters { flex-direction: column; align-items: stretch; }
  .ainv-input, .ainv-select { min-width: unset; width: 100%; }
  .ainv-table-scroll { display: none; }
  .ainv-card-list { display: flex; }
}

/* ── modal ── */
.ainv-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ainv-modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 440px;
  direction: rtl; overflow: hidden;
  box-shadow: var(--shadow-modal);
  animation: modalIn .2s ease;
}
@keyframes modalIn { from { opacity:0; transform: scale(.96) translateY(8px); } }
.ainv-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
}
.ainv-modal-title { font-size: 16px; font-weight: 700; color: var(--text-1); }
.ainv-modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-3); font-size: 18px; padding: 4px;
  border-radius: 6px; transition: background .15s;
}
.ainv-modal-close:hover { background: var(--border); color: var(--text-1); }
.ainv-modal-desc { padding: 12px 24px; font-size: 13px; color: var(--text-2); }
.ainv-modal-field { padding: 0 24px 12px; }
.ainv-field-label { display: block; font-size: 11px; color: var(--text-3); font-weight: 600; letter-spacing: .04em; margin-bottom: 6px; text-transform: uppercase; }
.ainv-textarea {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border-strong); border-radius: 8px;
  font-size: 13px; font-family: inherit; resize: vertical;
  background: var(--bg); color: var(--text-1);
  transition: border-color .15s;
}
.ainv-textarea:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-glow); }
.ainv-modal-error {
  margin: 0 24px 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #b91c1c; font-size: 13px;
  display: flex; align-items: center; gap: 8px;
}
.ainv-root[data-dark] .ainv-modal-error { background:#1a0505; border-color:#7f1d1d; color:#fca5a5; }
.ainv-modal-foot {
  display: flex; gap: 10px; padding: 14px 24px 20px;
  border-top: 1px solid var(--border);
}
`;

function injectCSS() {
  if (document.getElementById('ainv-css')) return;
  const s = document.createElement('style');
  s.id = 'ainv-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function applyTheme(el, dark) {
  const t = dark ? DARK : LIGHT;
  for (const [k, v] of Object.entries(t)) el.style.setProperty(k, v);
  dark ? el.setAttribute('data-dark', '') : el.removeAttribute('data-dark');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtSAR  = n => `${Number(n || 0).toLocaleString('ar-SA')} ر.س`;
const fmtNum  = n => Number(n || 0).toLocaleString('ar-SA');
const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'2-digit', day:'2-digit' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, stripe, iconBg, iconColor }) => (
  <div className="ainv-stat" style={{ '--stripe': stripe, '--icon-bg': iconBg, '--icon-color': iconColor }}>
    <div className="ainv-stat-stripe" />
    <div className="ainv-stat-icon"><i className={`fas ${icon}`} /></div>
    <div className="ainv-stat-label">{label}</div>
    <div className="ainv-stat-value">{value}</div>
    {sub && <div className="ainv-stat-sub">{sub}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

const RejectModal = ({ invoice, onClose, onSuccess, getAuthHeaders }) => {
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/invoices/${invoice.id}/reject`,
        { notes: notes.trim() || 'تم رفض الإيصال. يرجى إعادة الرفع.' },
        { headers: getAuthHeaders() }
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر رفض الفاتورة.');
    } finally { setSaving(false); }
  };

  return (
    <div className="ainv-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="ainv-modal">
        <div className="ainv-modal-head">
          <div className="ainv-modal-title">رفض الفاتورة</div>
          <button type="button" className="ainv-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times" />
          </button>
        </div>
        <p className="ainv-modal-desc">سيتم رفض هذا الإيصال وإنشاء فاتورة جديدة للمستثمر تلقائياً.</p>
        <div className="ainv-modal-field">
          <label className="ainv-field-label">سبب الرفض (اختياري)</label>
          <textarea
            className="ainv-textarea" rows={3}
            placeholder="مثال: الإيصال غير واضح، يرجى إعادة الرفع بصورة أوضح."
            value={notes} onChange={e => setNotes(e.target.value)}
          />
        </div>
        {error && (
          <div className="ainv-modal-error" role="alert">
            <i className="fas fa-triangle-exclamation" /> {error}
          </div>
        )}
        <div className="ainv-modal-foot">
          <button type="button" className="ainv-btn ainv-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="ainv-btn ainv-btn--danger" onClick={submit} disabled={saving}>
            {saving
              ? <><i className="fas fa-spinner fa-spin" /> جاري...</>
              : <><i className="fas fa-circle-xmark" /> تأكيد الرفض</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE ROW (desktop table)
// ─────────────────────────────────────────────────────────────────────────────

const InvoiceRow = React.memo(({ invoice, onApprove, onReject, approving }) => {
  const meta     = STATUS_META[invoice.status] || STATUS_META.pending;
  const yearMeta = YEAR_META[invoice.year]     || YEAR_META[1];
  const canAct   = invoice.status === 'admin_pending';
  const busy     = approving === invoice.id;

  return (
    <tr className={canAct ? 'ainv-row--review' : ''}>
      <td>
        <div className="ainv-user-cell">
          <span className="ainv-user-name">{invoice.user?.name || '—'}</span>
          <span className="ainv-user-id">{invoice.user?.national_id}</span>
        </div>
      </td>
      <td>
        <div className="ainv-contract-cell">
          <span className="ainv-contract-id">#{invoice.contract?.id}</span>
          <span className="ainv-contract-title">{invoice.contract?.title}</span>
        </div>
      </td>
      <td className="ainv-center">
        <span className="ainv-year-badge"
          style={{ background: yearMeta.bg, color: yearMeta.color, border: `1px solid ${yearMeta.color}44` }}>
          {yearMeta.label}
        </span>
      </td>
      <td className="ainv-amount">{fmtSAR(invoice.amount)}</td>
      <td className="ainv-center">{fmtDate(invoice.due_date)}</td>
      <td className="ainv-center">
        <span className={`ainv-pill ${meta.pill}`}>
          <i className={`fas ${meta.icon}`} /> {meta.label}
        </span>
      </td>
      <td className="ainv-center">
        {invoice.receipt_url
          ? <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="ainv-btn ainv-btn--link">
              <i className="fas fa-eye" /> عرض
            </a>
          : <span className="ainv-dash">—</span>}
      </td>
      <td className="ainv-center">
        {canAct ? (
          <div className="ainv-actions">
            <button type="button" className="ainv-btn ainv-btn--approve" onClick={() => onApprove(invoice)} disabled={busy}>
              {busy ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> قبول</>}
            </button>
            <button type="button" className="ainv-btn ainv-btn--reject" onClick={() => onReject(invoice)} disabled={busy}>
              <i className="fas fa-times" /> رفض
            </button>
          </div>
        ) : invoice.status === 'approved' ? (
          <span className="ainv-done-mark"><i className="fas fa-circle-check" /> تم</span>
        ) : invoice.status === 'rejected' ? (
          <span className="ainv-rej-mark" title={invoice.admin_notes || ''}><i className="fas fa-circle-xmark" /> مرفوض</span>
        ) : <span className="ainv-dash">—</span>}
      </td>
    </tr>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE MOBILE CARD
// ─────────────────────────────────────────────────────────────────────────────

const InvoiceMobileCard = React.memo(({ invoice, onApprove, onReject, approving }) => {
  const meta     = STATUS_META[invoice.status] || STATUS_META.pending;
  const yearMeta = YEAR_META[invoice.year]     || YEAR_META[1];
  const canAct   = invoice.status === 'admin_pending';
  const busy     = approving === invoice.id;

  return (
    <div className={`ainv-m-card${canAct ? ' ainv-m-card--review' : ''}`}>
      <div className="ainv-m-head">
        <div className="ainv-m-user">
          <span className="ainv-m-name">{invoice.user?.name || '—'}</span>
          <span className="ainv-m-id">{invoice.user?.national_id}</span>
        </div>
        <span className={`ainv-pill ${meta.pill}`}>
          <i className={`fas ${meta.icon}`} /> {meta.label}
        </span>
      </div>

      <div className="ainv-m-row">
        <span className="ainv-m-label">العقد</span>
        <span className="ainv-m-val">#{invoice.contract?.id} — {invoice.contract?.title}</span>
      </div>
      <div className="ainv-m-row">
        <span className="ainv-m-label">السنة</span>
        <span className="ainv-year-badge"
          style={{ background: yearMeta.bg, color: yearMeta.color, border: `1px solid ${yearMeta.color}44` }}>
          {yearMeta.label}
        </span>
      </div>
      <div className="ainv-m-row">
        <span className="ainv-m-label">المبلغ</span>
        <span className="ainv-amount">{fmtSAR(invoice.amount)}</span>
      </div>
      <div className="ainv-m-row">
        <span className="ainv-m-label">الاستحقاق</span>
        <span className="ainv-m-val">{fmtDate(invoice.due_date)}</span>
      </div>

      <div className="ainv-m-row">
        <span className="ainv-m-label">الإيصال</span>
        {invoice.receipt_url
          ? <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="ainv-btn ainv-btn--link">
              <i className="fas fa-eye" /> عرض
            </a>
          : <span className="ainv-dash">—</span>}
      </div>

      {canAct && (
        <div className="ainv-m-actions">
          <button type="button" className="ainv-btn ainv-btn--approve" onClick={() => onApprove(invoice)} disabled={busy}>
            {busy ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> قبول</>}
          </button>
          <button type="button" className="ainv-btn ainv-btn--reject" onClick={() => onReject(invoice)} disabled={busy}>
            <i className="fas fa-times" /> رفض
          </button>
        </div>
      )}
      {invoice.status === 'approved' && (
        <div className="ainv-done-mark" style={{ justifyContent: 'flex-start' }}>
          <i className="fas fa-circle-check" /> تمت الموافقة
        </div>
      )}
      {invoice.status === 'rejected' && (
        <div className="ainv-rej-mark" style={{ justifyContent: 'flex-start' }} title={invoice.admin_notes || ''}>
          <i className="fas fa-circle-xmark" /> مرفوض {invoice.admin_notes ? `— ${invoice.admin_notes}` : ''}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const AdminInvoicesPage = () => {
  const { getAuthHeaders } = useAuth();
  const rootRef = useRef(null);
  const [dark, setDark] = useState(() => localStorage.getItem('ainv-dark') === '1');

  const [invoices,    setInvoices]    = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [approving,   setApproving]   = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const [filters, setFilters] = useState({
    status: 'admin_pending', year: '', due_from: '', due_to: '', page: 1,
  });
  const setFilter = useCallback((k, v) =>
    setFilters(p => ({ ...p, [k]: v, page: 1 })), []);

  // ── theme ──
  useEffect(() => { injectCSS(); }, []);
  useEffect(() => {
    if (!rootRef.current) return;
    applyTheme(rootRef.current, dark);
    localStorage.setItem('ainv-dark', dark ? '1' : '0');
  }, [dark]);

  // ── fetch ──
  const fetchInvoices = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(filters.page), per_page: '50' });
      if (filters.status)   params.set('status',   filters.status);
      if (filters.year)     params.set('year',      filters.year);
      if (filters.due_from) params.set('due_from',  filters.due_from);
      if (filters.due_to)   params.set('due_to',    filters.due_to);

      const res = await axios.get(
        `${API_BASE_URL}/admin/invoices?${params}`,
        { headers: getAuthHeaders() }
      );
      const d = res.data?.data;
      setInvoices(d?.invoices || []);
      setSummary(d?.summary   || null);
      setPagination(d?.pagination || null);
    } catch {
      setError('تعذر تحميل الفواتير. تحقق من الاتصال وأعد المحاولة.');
    } finally { setLoading(false); }
  }, [getAuthHeaders, filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── approve ──
  const handleApprove = useCallback(async (invoice) => {
    setApproving(invoice.id);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/invoices/${invoice.id}/approve`,
        {},
        { headers: getAuthHeaders() }
      );
      const updated = res.data?.data;
      setInvoices(prev => prev.map(i => i.id === invoice.id ? (updated || { ...i, status: 'approved' }) : i));
    } catch (e) {
      alert(e?.response?.data?.message || 'تعذر قبول الفاتورة.');
    } finally { setApproving(null); }
  }, [getAuthHeaders]);

  // ── reject success ──
  const handleRejectSuccess = useCallback(({ rejected_invoice, new_invoice }) => {
    setRejectModal(null);
    setInvoices(prev => {
      const updated = prev.map(i => i.id === rejected_invoice.id ? rejected_invoice : i);
      if (!filters.status || filters.status === 'pending') return [new_invoice, ...updated];
      return updated;
    });
  }, [filters.status]);

  const resetFilters = useCallback(() =>
    setFilters({ status: 'admin_pending', year: '', due_from: '', due_to: '', page: 1 }), []);

  return (
    <div className="ainv-root" ref={rootRef} dir="rtl">
      {rejectModal && (
        <RejectModal
          invoice={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={handleRejectSuccess}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* ── topbar ── */}
      <div className="ainv-topbar">
        <div>
          <h1 className="ainv-title">
            <i className="fas fa-file-invoice-dollar" />
            إدارة مخصصات الصيانة التشغيلية
          </h1>
          <p className="ainv-subtitle">مراجعة وقبول أو رفض إيصالات تأمين الصيانة للمستثمرين</p>
        </div>
      </div>

      {/* ── stats from API ── */}
      {!loading && summary && (
        <div className="ainv-stats">
          <StatCard label="بانتظار الدفع"   value={fmtNum(summary.count_pending)}
            icon="fa-clock"            stripe="#f59e0b" iconBg="rgba(245,158,11,.12)" iconColor="#b45309" />
          <StatCard label="قيد المراجعة"   value={fmtNum(summary.count_admin_pending)}
            icon="fa-hourglass-half"   stripe="#3b82f6" iconBg="rgba(59,130,246,.12)" iconColor="#1d4ed8" />
          <StatCard label="مقبولة"          value={fmtNum(summary.count_approved)}
            icon="fa-circle-check"     stripe="#22c55e" iconBg="rgba(34,197,94,.12)"  iconColor="#15803d" />
          <StatCard label="مرفوضة"          value={fmtNum(summary.count_rejected)}
            icon="fa-circle-xmark"     stripe="#ef4444" iconBg="rgba(239,68,68,.12)"  iconColor="#b91c1c" />
          <StatCard label="إجمالي المبالغ" value={fmtSAR(summary.total_amount)}
            icon="fa-coins"            stripe="#8b5cf6" iconBg="rgba(139,92,246,.12)" iconColor="#7c3aed" />
          <StatCard label="انتظار (٧ أيام)" value={fmtSAR(summary.pending_last_7_days?.total_amount)}
            sub={`${fmtNum(summary.pending_last_7_days?.count)} فاتورة`}
            icon="fa-calendar-week"    stripe="#f59e0b" iconBg="rgba(245,158,11,.12)" iconColor="#b45309" />
          <StatCard label="مقبولة (٧ أيام)" value={fmtSAR(summary.approved_last_7_days?.total_amount)}
            sub={`${fmtNum(summary.approved_last_7_days?.count)} فاتورة`}
            icon="fa-calendar-check"   stripe="#22c55e" iconBg="rgba(34,197,94,.12)"  iconColor="#15803d" />
        </div>
      )}

      {/* ── filters ── */}
      <div className="ainv-filters">
        <div className="ainv-fg">
          <label className="ainv-fg-label">الحالة</label>
          <select className="ainv-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="admin_pending">قيد المراجعة</option>
            <option value="pending">بانتظار الدفع</option>
            <option value="approved">مقبولة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>
        <div className="ainv-fg">
          <label className="ainv-fg-label">السنة</label>
          <select className="ainv-select" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
            <option value="">جميع السنوات</option>
            <option value="1">السنة الأولى</option>
            <option value="2">السنة الثانية</option>
            <option value="3">السنة الثالثة</option>
          </select>
        </div>
        <div className="ainv-fg">
          <label className="ainv-fg-label">الاستحقاق من</label>
          <input type="date" className="ainv-input" value={filters.due_from} onChange={e => setFilter('due_from', e.target.value)} />
        </div>
        <div className="ainv-fg">
          <label className="ainv-fg-label">إلى</label>
          <input type="date" className="ainv-input" value={filters.due_to} onChange={e => setFilter('due_to', e.target.value)} />
        </div>
        <button type="button" className="ainv-btn ainv-btn--ghost" onClick={resetFilters} style={{ alignSelf: 'flex-end' }}>
          <i className="fas fa-rotate-right" /> إعادة تعيين
        </button>
      </div>

      {/* ── table card ── */}
      <div className="ainv-table-card">
        {loading ? (
          <div className="ainv-state" role="status">
            <div className="ainv-spinner" />
            <p>جاري تحميل الفواتير...</p>
          </div>
        ) : error ? (
          <div className="ainv-state" role="alert" style={{ color: '#ef4444' }}>
            <i className="fas fa-triangle-exclamation" />
            <p>{error}</p>
            <button type="button" className="ainv-btn ainv-btn--ghost" onClick={fetchInvoices}>
              <i className="fas fa-rotate-right" /> إعادة المحاولة
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="ainv-state">
            <i className="fas fa-inbox" />
            <p>لا توجد فواتير تطابق الفلتر المحدد.</p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="ainv-table-scroll">
              <table className="ainv-table">
                <thead>
                  <tr>
                    <th>المستثمر</th><th>العقد</th>
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
                      key={inv.id} invoice={inv}
                      onApprove={handleApprove} onReject={setRejectModal}
                      approving={approving}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="ainv-card-list">
              {invoices.map(inv => (
                <InvoiceMobileCard
                  key={inv.id} invoice={inv}
                  onApprove={handleApprove} onReject={setRejectModal}
                  approving={approving}
                />
              ))}
            </div>
          </>
        )}

        {/* pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="ainv-pagination">
            <button type="button" className="ainv-btn ainv-btn--ghost"
              disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>
              <i className="fas fa-chevron-right" /> السابق
            </button>
            <span className="ainv-page-info">{filters.page} / {pagination.last_page}</span>
            <button type="button" className="ainv-btn ainv-btn--ghost"
              disabled={filters.page >= pagination.last_page}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>
              التالي <i className="fas fa-chevron-left" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInvoicesPage;