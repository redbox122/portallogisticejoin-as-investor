import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';

// ── theme tokens ──────────────────────────────────────────────────────────────

const LIGHT = {
  '--bg-page':        '#f0f2f7',
  '--bg-card':        '#ffffff',
  '--bg-card-hover':  '#f8faff',
  '--bg-header':      '#073491',
  '--bg-stat':        '#ffffff',
  '--border':         '#e2e8f0',
  '--border-strong':  '#cbd5e1',
  '--text-primary':   '#0f172a',
  '--text-secondary': '#64748b',
  '--text-muted':     '#94a3b8',
  '--text-on-brand':  '#ffffff',
  '--brand':          '#073491',
  '--brand-light':    '#eff4ff',
  '--brand-mid':      '#bfdbfe',
  '--overdue-bg':     '#fff5f5',
  '--overdue-border': '#fecaca',
  '--today-bg':       '#fffbeb',
  '--today-border':   '#fde68a',
  '--tomorrow-bg':    '#f0fdf4',
  '--tomorrow-border':'#86efac',
  '--shadow-card':    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  '--shadow-modal':   '0 20px 60px rgba(0,0,0,0.18)',
};

const DARK = {
  '--bg-page':        '#0b0f1a',
  '--bg-card':        '#111827',
  '--bg-card-hover':  '#1a2236',
  '--bg-header':      '#0c1f54',
  '--bg-stat':        '#111827',
  '--border':         '#1e2d45',
  '--border-strong':  '#2a3f5f',
  '--text-primary':   '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--text-muted':     '#475569',
  '--text-on-brand':  '#ffffff',
  '--brand':          '#3b82f6',
  '--brand-light':    '#172554',
  '--brand-mid':      '#1e3a5f',
  '--overdue-bg':     '#1a0a0a',
  '--overdue-border': '#7f1d1d',
  '--today-bg':       '#1c1500',
  '--today-border':   '#854d0e',
  '--tomorrow-bg':    '#052e16',
  '--tomorrow-border':'#166534',
  '--shadow-card':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  '--shadow-modal':   '0 20px 60px rgba(0,0,0,0.6)',
};

// ── helpers ───────────────────────────────────────────────────────────────────

const today    = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getDateTag(dueDateStr) {
  if (!dueDateStr) return null;
  const ds = dueDateStr.slice(0, 10);
  if (ds === today())    return 'today';
  if (ds === tomorrow()) return 'tomorrow';
  if (ds < today())      return 'overdue';
  return null;
}

const STATUS_META = {
  pending:          { label: 'قيد الانتظار',      cls: 'pill--pending'  },
  sent:             { label: 'مُرسل',             cls: 'pill--sent'     },
  received:         { label: 'مستلم',             cls: 'pill--received' },
  reported_missing: { label: 'مُبلَّغ عن غيابه', cls: 'pill--missing'  },
};

// ── CSS (injected once) ───────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

.aip-root *, .aip-root *::before, .aip-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.aip-root {
  font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
  direction: rtl;
  background: var(--bg-page);
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
  padding: 28px 24px;
  color: var(--text-primary);
}

/* ── header ── */
.aip-topbar {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
}
.aip-title { font-size: 22px; font-weight: 700; color: var(--brand); display: flex; align-items: center; gap: 10px; }
.aip-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

/* ── dark mode toggle ── */
.aip-toggle {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 999px; padding: 6px 14px;
  cursor: pointer; font-size: 13px; color: var(--text-secondary);
  transition: all 0.2s; user-select: none; white-space: nowrap;
  box-shadow: var(--shadow-card);
}
.aip-toggle:hover { border-color: var(--brand); color: var(--brand); }
.aip-toggle-dot {
  width: 34px; height: 18px; border-radius: 9px;
  background: var(--border-strong); position: relative;
  transition: background 0.25s; flex-shrink: 0;
}
.aip-toggle-dot::after {
  content: ''; position: absolute; top: 2px; right: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; transition: transform 0.25s;
}
.aip-toggle--active .aip-toggle-dot { background: var(--brand); }
.aip-toggle--active .aip-toggle-dot::after { transform: translateX(-16px); }

/* ── summary stat cards ── */
.aip-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 12px; margin-bottom: 20px;
}
.aip-stat {
  background: var(--bg-stat); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: var(--shadow-card);
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative; overflow: hidden;
}
.aip-stat::before {
  content: ''; position: absolute; top: 0; right: 0;
  width: 4px; height: 100%;
  background: var(--stat-accent, var(--border));
  border-radius: 0 12px 12px 0;
}
.aip-stat:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.aip-stat--brand  { --stat-accent: var(--brand); }
.aip-stat--warn   { --stat-accent: #f59e0b; }
.aip-stat--danger { --stat-accent: #ef4444; }
.aip-stat--ok     { --stat-accent: #22c55e; }
.aip-stat--today  { --stat-accent: #f59e0b; }
.aip-stat--tmrw   { --stat-accent: #22c55e; }
.aip-stat--week   { --stat-accent: #8b5cf6; }

.aip-stat-icon { font-size: 18px; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--brand-light); color: var(--brand); }
.aip-stat--warn .aip-stat-icon   { background: #fffbeb; color: #b45309; }
.aip-stat--danger .aip-stat-icon { background: #fef2f2; color: #b91c1c; }
.aip-stat--ok .aip-stat-icon     { background: #f0fdf4; color: #15803d; }
.aip-stat--today .aip-stat-icon  { background: #fffbeb; color: #92400e; }
.aip-stat--tmrw .aip-stat-icon   { background: #f0fdf4; color: #166534; }
.aip-stat--week .aip-stat-icon   { background: #f5f3ff; color: #6d28d9; }
.aip-root[data-dark] .aip-stat--warn .aip-stat-icon   { background: #291700; color: #fbbf24; }
.aip-root[data-dark] .aip-stat--danger .aip-stat-icon { background: #1a0505; color: #f87171; }
.aip-root[data-dark] .aip-stat--ok .aip-stat-icon     { background: #052e16; color: #4ade80; }
.aip-root[data-dark] .aip-stat--today .aip-stat-icon  { background: #1c1500; color: #fbbf24; }
.aip-root[data-dark] .aip-stat--tmrw .aip-stat-icon   { background: #052e16; color: #4ade80; }
.aip-root[data-dark] .aip-stat--week .aip-stat-icon   { background: #1e1b4b; color: #a78bfa; }

.aip-stat-label { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.02em; }
.aip-stat-value { font-size: 21px; font-weight: 700; color: var(--text-primary); line-height: 1; }
.aip-stat-sub   { font-size: 11px; color: var(--text-secondary); }

/* ── filters ── */
.aip-filters {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 16px;
  display: flex; align-items: flex-end; flex-wrap: wrap;
  gap: 12px; margin-bottom: 16px;
  box-shadow: var(--shadow-card);
}
.aip-filter-group { display: flex; flex-direction: column; gap: 4px; }
.aip-filter-label { font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.aip-input, .aip-select {
  padding: 7px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 8px; font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-page);
  min-width: 150px;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.aip-input:focus, .aip-select:focus {
  outline: none; border-color: var(--brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent);
}
.aip-filter-group--user-search .aip-input { min-width: 180px; }
.aip-filter-group--user .aip-select { min-width: 220px; max-width: 300px; }

/* ── buttons ── */
.aip-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent;
  transition: all 0.15s; white-space: nowrap;
  font-family: inherit;
}
.aip-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.aip-btn--primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.aip-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
.aip-btn--ghost   { background: transparent; color: var(--text-secondary); border-color: var(--border-strong); }
.aip-btn--ghost:hover:not(:disabled) { background: var(--brand-light); color: var(--brand); border-color: var(--brand); }
.aip-btn--upload  { background: var(--brand-light); color: var(--brand); border-color: var(--brand-mid); }
.aip-btn--upload:hover:not(:disabled) { background: var(--brand-mid); }
.aip-btn--link    { background: transparent; color: var(--brand); border: none; text-decoration: underline; padding: 4px 6px; }
.aip-btn--reset   { align-self: flex-end; }

/* ── table card ── */
.aip-table-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; overflow: hidden;
  box-shadow: var(--shadow-card);
}
.aip-table-wrap { overflow-x: auto; }
.aip-table {
  width: 100%; border-collapse: collapse;
  font-size: 13px; direction: rtl;
}
.aip-table thead tr { background: var(--bg-header); }
.aip-table th {
  padding: 12px 14px; text-align: right;
  font-weight: 600; white-space: nowrap;
  color: rgba(255,255,255,0.9); font-size: 12px;
  letter-spacing: 0.03em;
}
.aip-table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary); vertical-align: middle;
}
.aip-table tbody tr:last-child td { border-bottom: none; }
.aip-table tbody tr { transition: background 0.12s; }
.aip-table tbody tr:hover { background: var(--bg-card-hover); }

/* ── row highlight variants ── */
.aip-row--today    { background: var(--today-bg) !important; }
.aip-row--tomorrow { background: var(--tomorrow-bg) !important; }
.aip-row--overdue  { background: var(--overdue-bg) !important; }
.aip-row--today:hover    { filter: brightness(0.97); }
.aip-row--tomorrow:hover { filter: brightness(0.97); }
.aip-row--overdue:hover  { filter: brightness(0.97); }

.aip-center { text-align: center !important; }
.aip-amount { font-weight: 700; color: var(--brand); white-space: nowrap; }

/* ── user / contract cells ── */
.aip-user-cell    { display: flex; flex-direction: column; gap: 2px; }
.aip-user-name    { font-weight: 600; }
.aip-user-id      { font-size: 11px; color: var(--text-muted); }
.aip-contract-cell { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.aip-contract-id  { font-weight: 600; color: var(--text-secondary); }
.aip-contract-title { color: var(--text-muted); }

/* ── date tags ── */
.aip-date-cell  { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.aip-date-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
  border: 1px solid;
}
.aip-date-tag--today    { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.aip-date-tag--tomorrow { background: #dcfce7; color: #166534; border-color: #86efac; }
.aip-date-tag--overdue  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.aip-root[data-dark] .aip-date-tag--today    { background: #291700; color: #fcd34d; border-color: #854d0e; }
.aip-root[data-dark] .aip-date-tag--tomorrow { background: #052e16; color: #86efac; border-color: #166534; }
.aip-root[data-dark] .aip-date-tag--overdue  { background: #1a0505; color: #fca5a5; border-color: #7f1d1d; }

/* ── status pills ── */
.aip-pill {
  display: inline-block; padding: 3px 10px;
  border-radius: 20px; font-size: 11px; font-weight: 600;
  white-space: nowrap; border: 1px solid;
}
.pill--pending  { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.pill--sent     { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
.pill--received { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.pill--missing  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.aip-root[data-dark] .pill--pending  { background: #291700; color: #fcd34d; border-color: #854d0e; }
.aip-root[data-dark] .pill--sent     { background: #172554; color: #93c5fd; border-color: #1e3a5f; }
.aip-root[data-dark] .pill--received { background: #052e16; color: #86efac; border-color: #166534; }
.aip-root[data-dark] .pill--missing  { background: #1a0505; color: #fca5a5; border-color: #7f1d1d; }

.aip-received-mark {
  font-size: 12px; color: #15803d;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}
.aip-root[data-dark] .aip-received-mark { color: #4ade80; }

/* ── loading / empty / error ── */
.aip-state-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 64px 20px;
  color: var(--text-muted);
}
.aip-state-box i { font-size: 36px; }
.aip-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── pagination ── */
.aip-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 14px; border-top: 1px solid var(--border);
}
.aip-page-info { font-size: 13px; color: var(--text-muted); }

/* ── modal overlay ── */
.aip-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1000; display: flex;
  align-items: center; justify-content: center; padding: 20px;
}
.aip-modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 480px;
  direction: rtl; overflow: hidden;
  box-shadow: var(--shadow-modal);
  animation: modalIn 0.2s ease;
}
@keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } }
.aip-modal-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
}
.aip-modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.aip-modal-sub   { font-size: 13px; color: var(--text-secondary); }
.aip-modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 18px; padding: 4px;
  line-height: 1; border-radius: 6px; transition: background 0.15s;
}
.aip-modal-close:hover { background: var(--border); color: var(--text-primary); }

/* drop zone */
.aip-dropzone {
  margin: 16px 24px;
  border: 2px dashed var(--border-strong);
  border-radius: 12px; padding: 28px 20px;
  text-align: center; cursor: pointer;
  transition: all 0.15s;
  min-height: 130px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.aip-dropzone:hover, .aip-dropzone--active { border-color: var(--brand); background: var(--brand-light); }
.aip-dropzone-icon  { font-size: 32px; color: var(--text-muted); }
.aip-dropzone--active .aip-dropzone-icon { color: var(--brand); }
.aip-dropzone-label { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
.aip-dropzone-hint  { font-size: 12px; color: var(--text-muted); }
.aip-dropzone-preview { max-height: 160px; max-width: 100%; border-radius: 8px; object-fit: contain; }

.aip-file-chip {
  display: flex; align-items: center; gap: 8px;
  margin: 0 24px 12px; padding: 8px 12px;
  background: var(--brand-light); border-radius: 8px;
  font-size: 13px; color: var(--brand);
  border: 1px solid var(--brand-mid);
}
.aip-file-chip-remove {
  margin-right: auto; background: none; border: none;
  cursor: pointer; color: var(--text-muted); font-size: 18px; line-height: 1;
}

.aip-modal-error {
  margin: 0 24px 12px; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #b91c1c;
  font-size: 13px; display: flex; align-items: center; gap: 8px;
}
.aip-root[data-dark] .aip-modal-error { background: #1a0505; border-color: #7f1d1d; color: #fca5a5; }

.aip-modal-foot {
  display: flex; justify-content: flex-start; gap: 10px;
  padding: 14px 24px 20px; border-top: 1px solid var(--border);
}

/* ── responsive ── */
@media (max-width: 768px) {
  .aip-root { padding: 16px 12px; }
  .aip-stats { grid-template-columns: repeat(2, 1fr); }
  .aip-filters { flex-direction: column; align-items: stretch; }
  .aip-input, .aip-select { min-width: unset; width: 100%; }
}
`;

function injectStyles() {
  if (document.getElementById('aip-styles')) return;
  const s = document.createElement('style');
  s.id = 'aip-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ── applyTheme ────────────────────────────────────────────────────────────────

function applyTheme(root, dark) {
  const tokens = dark ? DARK : LIGHT;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  if (dark) root.setAttribute('data-dark', '');
  else root.removeAttribute('data-dark');
}

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, mod }) => (
  <div className={`aip-stat aip-stat--${mod}`}>
    <div className="aip-stat-icon"><i className={`fas ${icon}`} aria-hidden="true" /></div>
    <div className="aip-stat-label">{label}</div>
    <div className="aip-stat-value">{value}</div>
    {sub && <div className="aip-stat-sub">{sub}</div>}
  </div>
);

// ── ReceiptModal ──────────────────────────────────────────────────────────────

const ReceiptModal = ({ payment, onClose, onSuccess, getAuthHeaders }) => {
  const inputRef = useRef(null);
  const [file,    setFile]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [preview, setPreview] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setError('');
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const submit = async () => {
    if (!file) { setError('يرجى اختيار ملف الإيصال أولاً.'); return; }
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.append('receipt', file);
      const headers = { ...getAuthHeaders() };
      delete headers['Content-Type'];
      const res = await axios.post(
        `${API_BASE_URL}/admin/payments/${payment.id}/receipt`,
        form, { headers }
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        (e?.response?.status === 422 ? 'تأكد من نوع الملف وحجمه (PDF أو صورة حتى 10MB).' : null) ||
        'تعذر رفع الإيصال. حاول مرة أخرى.'
      );
    } finally { setSaving(false); }
  };

  return (
    <div
      className="aip-overlay" role="dialog" aria-modal="true" aria-label="رفع إيصال الدفع"
      onClick={e => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="aip-modal">
        <div className="aip-modal-head">
          <div>
            <div className="aip-modal-title">رفع إيصال الدفع</div>
            <div className="aip-modal-sub">
              {payment.contract?.title} — الشهر {payment.month_number} — {(payment.amount || 0).toLocaleString('ar-SA')} ر.س
            </div>
          </div>
          <button type="button" className="aip-modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        <div
          className={`aip-dropzone${file ? ' aip-dropzone--active' : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
          {preview
            ? <img src={preview} alt="معاينة الإيصال" className="aip-dropzone-preview" />
            : <>
                <i className={`fas ${file ? 'fa-file-check' : 'fa-cloud-arrow-up'} aip-dropzone-icon`} aria-hidden="true" />
                <p className="aip-dropzone-label">{file ? file.name : 'اسحب الملف هنا أو انقر للاختيار'}</p>
                <p className="aip-dropzone-hint">PDF، JPG، PNG، WEBP — حتى 10MB</p>
              </>
          }
        </div>

        {file && !preview && (
          <div className="aip-file-chip">
            <i className="fas fa-file-pdf" aria-hidden="true" />
            <span>{file.name}</span>
            <button type="button" className="aip-file-chip-remove"
              onClick={() => { setFile(null); setPreview(null); }} aria-label="إزالة">×</button>
          </div>
        )}

        {error && (
          <div className="aip-modal-error" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" /> {error}
          </div>
        )}

        <div className="aip-modal-foot">
          <button type="button" className="aip-btn aip-btn--ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="aip-btn aip-btn--primary" onClick={submit} disabled={saving || !file}>
            {saving
              ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> جاري الرفع...</>
              : <><i className="fas fa-cloud-arrow-up" aria-hidden="true" /> رفع الإيصال</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── DateCell ──────────────────────────────────────────────────────────────────

const DATE_TAG_META = {
  today:    { label: 'اليوم',   icon: 'fa-sun',            cls: 'aip-date-tag--today'    },
  tomorrow: { label: 'غداً',    icon: 'fa-calendar-day',   cls: 'aip-date-tag--tomorrow' },
  overdue:  { label: 'متأخر',   icon: 'fa-circle-exclamation', cls: 'aip-date-tag--overdue' },
};

const DateCell = ({ dateStr, isReceived }) => {
  const tag  = !isReceived ? getDateTag(dateStr) : null;
  const meta = tag ? DATE_TAG_META[tag] : null;
  return (
    <div className="aip-date-cell">
      <span>{formatDate(dateStr)}</span>
      {meta && (
        <span className={`aip-date-tag ${meta.cls}`}>
          <i className={`fas ${meta.icon}`} aria-hidden="true" />
          {meta.label}
        </span>
      )}
    </div>
  );
};

// ── PaymentRow ────────────────────────────────────────────────────────────────

const PaymentRow = React.memo(({ payment, onUpload }) => {
  const meta    = STATUS_META[payment.status] || STATUS_META.pending;
  const tag     = payment.status !== 'received' ? getDateTag(payment.due_date) : null;
  const rowCls  = tag ? `aip-row--${tag}` : '';

  return (
    <tr className={rowCls}>
      <td>
        <div className="aip-user-cell">
          <span className="aip-user-name">{payment.user?.name || '—'}</span>
          <span className="aip-user-id">{payment.user?.national_id || ''}</span>
        </div>
      </td>
      <td>
        <div className="aip-contract-cell">
          <span className="aip-contract-id">#{payment.contract?.id}</span>
          <span className="aip-contract-title">{payment.contract?.title}</span>
        </div>
      </td>
      <td className="aip-center">{payment.month_number}</td>
      <td className="aip-amount">{(payment.amount || 0).toLocaleString('ar-SA')} ر.س</td>
      <td className="aip-center">
        <DateCell dateStr={payment.due_date} isReceived={payment.status === 'received'} />
      </td>
      <td className="aip-center">{formatDate(payment.payment_date)}</td>
      <td className="aip-center">
        <span className={`aip-pill ${meta.cls}`}>{meta.label}</span>
      </td>
      <td className="aip-center">
        {payment.receipt_url
          ? <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="aip-btn aip-btn--link">
              <i className="fas fa-eye" aria-hidden="true" /> عرض
            </a>
          : '—'}
      </td>
      <td className="aip-center">
        {payment.status !== 'received'
          ? <button type="button" className="aip-btn aip-btn--upload" onClick={() => onUpload(payment)}>
              <i className="fas fa-cloud-arrow-up" aria-hidden="true" /> رفع إيصال
            </button>
          : <span className="aip-received-mark">
              <i className="fas fa-circle-check" aria-hidden="true" /> مستلم
            </span>}
      </td>
    </tr>
  );
});

// ── AdminInvestmentsPage ──────────────────────────────────────────────────────

const AdminInvestmentsPage = () => {
  const { getAuthHeaders } = useAuth();

  const rootRef = useRef(null);
  const [dark, setDark] = useState(() => localStorage.getItem('aip-dark') === '1');

  // state
  const [payments,    setPayments]    = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [modalPayment, setModalPayment] = useState(null);

  const [users,        setUsers]        = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch,   setUserSearch]   = useState('');

  const [filters, setFilters] = useState({
    user_id: '', status: '', due_from: '', due_to: '', page: 1,
  });
  const setFilter = useCallback((k, v) =>
    setFilters(p => ({ ...p, [k]: v, page: 1 })), []);

  // ── inject styles + theme ──
  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    if (!rootRef.current) return;
    applyTheme(rootRef.current, dark);
    localStorage.setItem('aip-dark', dark ? '1' : '0');
  }, [dark]);

  // ── fetch users ──
  const fetchUsers = useCallback(async (term = '') => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '100' });
      if (term.trim()) params.set('search', term.trim());
      const res = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/users?${params}`,
        { headers: getAuthHeaders() }
      );
      setUsers(res.data?.data?.data || []);
    } catch { setUsers([]); }
    finally { setUsersLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { fetchUsers(userSearch); }, [fetchUsers, userSearch]);

  // ── fetch payments ──
  const fetchPayments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(filters.page), per_page: '50' });
      if (filters.user_id) params.set('user_id', String(filters.user_id));
      if (filters.status)  params.set('status',  filters.status);
      if (filters.due_from) params.set('due_from', filters.due_from);
      if (filters.due_to)   params.set('due_to',   filters.due_to);

      const res = await axios.get(
        `${API_BASE_URL}/admin/payments?${params}`,
        { headers: getAuthHeaders() }
      );
      const d = res.data?.data;
      setPayments(d?.payments || []);
      setSummary(d?.summary   || null);
      setPagination(d?.pagination || null);
    } catch (e) {
      setError('تعذر تحميل الدفعات. تحقق من الاتصال وأعد المحاولة.');
      console.error('Failed to load payments', e);
    } finally { setLoading(false); }
  }, [getAuthHeaders, filters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── receipt upload success — update row in-place ──
  const handleUploadSuccess = useCallback((updated) => {
    setModalPayment(null);
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const resetFilters = useCallback(() => {
    setUserSearch('');
    setFilters({ user_id: '', status: '', due_from: '', due_to: '', page: 1 });
  }, []);

  const fmt  = n => Number(n || 0).toLocaleString('ar-SA');
  const fmtR = n => `${fmt(n)} ر.س`;

  return (
    <div className="aip-root" ref={rootRef} dir="rtl">
      {modalPayment && (
        <ReceiptModal
          payment={modalPayment}
          onClose={() => setModalPayment(null)}
          onSuccess={handleUploadSuccess}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* ── top bar ── */}
      <div className="aip-topbar">
        <div>
          <h1 className="aip-title">
            <i className="fas fa-chart-line" aria-hidden="true" /> جدولة المستحقات الإيجارية
          </h1>
          <p className="aip-subtitle">رفع إيصالات الدفع وتتبع حالة الدفعات الشهرية لجميع عقود الاستثمار.</p>
        </div>
       
      </div>

      {/* ── stat cards (from API summary) ── */}
      {!loading && summary && (
        <div className="aip-stats">
          <StatCard mod="brand"  icon="fa-receipt"         label="إجمالي المبالغ"         value={fmtR(summary.total_amount)} />
          <StatCard mod="warn"   icon="fa-hourglass-half"  label="قيد الانتظار"            value={summary.pending_count} />
          <StatCard mod="danger" icon="fa-circle-exclamation" label="متأخرة"              value={summary.overdue_count} />
          <StatCard mod="ok"     icon="fa-circle-check"    label="مستلمة"                  value={summary.received_count} />
          <StatCard mod="today"  icon="fa-sun"             label="مستحق اليوم"
            value={fmtR(summary.today?.total_amount)}
            sub={`${summary.today?.contracts_count ?? 0} عقد`} />
          <StatCard mod="tmrw"   icon="fa-calendar-day"    label="مستحق غداً"
            value={fmtR(summary.tomorrow?.total_amount)}
            sub={`${summary.tomorrow?.contracts_count ?? 0} عقد`} />
          <StatCard mod="week"   icon="fa-calendar-week"   label="هذا الأسبوع"
            value={fmtR(summary.this_week?.total_amount)}
            sub={`${summary.this_week?.contracts_count ?? 0} عقد`} />
        </div>
      )}

      {/* ── filters ── */}
      <div className="aip-filters">
        <div className="aip-filter-group aip-filter-group--user-search">
          <label className="aip-filter-label" htmlFor="aip-user-search">بحث عن المستثمر</label>
          <input id="aip-user-search" type="text" className="aip-input"
            placeholder="ابحث بالاسم أو الهوية"
            value={userSearch} onChange={e => setUserSearch(e.target.value)} autoComplete="off" />
        </div>

        <div className="aip-filter-group aip-filter-group--user">
          <label className="aip-filter-label" htmlFor="aip-user-id">المستثمر</label>
          <select id="aip-user-id" className="aip-select"
            value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}>
            <option value="">{usersLoading ? 'جاري التحميل...' : 'جميع المستثمرين'}</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || `#${u.id}`} — {u.national_id || 'بدون هوية'}
              </option>
            ))}
          </select>
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">الحالة</label>
          <select className="aip-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="sent">مُرسل</option>
            <option value="received">مستلم</option>
            <option value="reported_missing">مُبلَّغ عن غيابه</option>
          </select>
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">الاستحقاق من</label>
          <input type="date" className="aip-input"
            value={filters.due_from} onChange={e => setFilter('due_from', e.target.value)} />
        </div>

        <div className="aip-filter-group">
          <label className="aip-filter-label">إلى</label>
          <input type="date" className="aip-input"
            value={filters.due_to} onChange={e => setFilter('due_to', e.target.value)} />
        </div>

        <button type="button" className="aip-btn aip-btn--ghost aip-btn--reset" onClick={resetFilters}>
          <i className="fas fa-rotate-right" aria-hidden="true" /> إعادة تعيين
        </button>
      </div>

      {/* ── table card ── */}
      <div className="aip-table-card">
        {loading ? (
          <div className="aip-state-box" role="status" aria-live="polite">
            <div className="aip-spinner" aria-hidden="true" />
            <span>جاري تحميل الدفعات...</span>
          </div>
        ) : error ? (
          <div className="aip-state-box" role="alert" style={{ color: '#ef4444' }}>
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" className="aip-btn aip-btn--ghost" onClick={fetchPayments}>
              <i className="fas fa-rotate-right" aria-hidden="true" /> إعادة المحاولة
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="aip-state-box">
            <i className="fas fa-inbox" aria-hidden="true" />
            <p>لا توجد دفعات تطابق الفلتر المحدد.</p>
          </div>
        ) : (
          <div className="aip-table-wrap">
            <table className="aip-table">
              <thead>
                <tr>
                  <th>المستثمر</th>
                  <th>العقد</th>
                  <th className="aip-center">الشهر</th>
                  <th>المبلغ</th>
                  <th className="aip-center">تاريخ الاستحقاق</th>
                  <th className="aip-center">تاريخ الدفع</th>
                  <th className="aip-center">الحالة</th>
                  <th className="aip-center">الإيصال</th>
                  <th className="aip-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <PaymentRow key={p.id} payment={p} onUpload={setModalPayment} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.last_page > 1 && (
          <div className="aip-pagination">
            <button type="button" className="aip-btn aip-btn--ghost"
              disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>
              <i className="fas fa-chevron-right" aria-hidden="true" /> السابق
            </button>
            <span className="aip-page-info">{filters.page} / {pagination.last_page}</span>
            <button type="button" className="aip-btn aip-btn--ghost"
              disabled={filters.page >= pagination.last_page}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>
              التالي <i className="fas fa-chevron-left" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInvestmentsPage;