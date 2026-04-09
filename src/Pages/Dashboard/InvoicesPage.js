import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../../Context/AuthContext";
import { API_BASE_URL } from "../../config";
import "../../Css/pages/invoices-page.css";

// ── constants ─────────────────────────────────────────────────────────────────

const YEAR_META = {
  1: { label: "السنة الأولى", amount: 1500, monthly: 125, color: "#2563eb" },
  2: { label: "السنة الثانية", amount: 2700, monthly: 225, color: "#7c3aed" },
  3: { label: "السنة الثالثة", amount: 3300, monthly: 325, color: "#0f766e" },
};

const STATUS_META = {
  pending: {
    label: "بانتظار الدفع",
    cls: "inv-pill--pending",
    icon: "fa-clock",
  },
  admin_pending: {
    label: "قيد المراجعة",
    cls: "inv-pill--review",
    icon: "fa-hourglass-half",
  },
  approved: {
    label: "مقبول",
    cls: "inv-pill--approved",
    icon: "fa-circle-check",
  },
  rejected: {
    label: "مرفوض",
    cls: "inv-pill--rejected",
    icon: "fa-circle-xmark",
  },
};

function fmtSAR(n) {
  return Number(n || 0).toLocaleString("ar-En");
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-En", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 864e5);
}


// ── ReceiptModal ──────────────────────────────────────────────────────────────

const ReceiptModal = ({ invoice, onClose, onSuccess }) => {
  const { getAuthHeaders } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError("");
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const submit = async () => {
    if (!file) {
      setError("يرجى اختيار ملف الإيصال أولاً.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("receipt", file);
      const headers = getAuthHeaders();
      delete headers["Content-Type"];
      const res = await axios.post(
        `${API_BASE_URL}/portallogistice/invoices/${invoice.id}/receipt`,
        form,
        { headers },
      );
      onSuccess(res.data?.data);
    } catch (e) {
      setError(
        e?.response?.data?.message || "تعذر رفع الإيصال. حاول مرة أخرى.",
      );
    } finally {
      setSaving(false);
    }
  };

  const yearMeta = YEAR_META[invoice.year] || YEAR_META[1];

  return (
    <div
      className="inv-overlay"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="inv-modal">
        <div className="inv-modal-head">
          <div>
            <h3 className="inv-modal-title">رفع إيصال الدفع</h3>
            <p className="inv-modal-sub">
              {yearMeta.label} — {fmtSAR(invoice.amount)} ر.س
            </p>
          </div>
          <button
            type="button"
            className="inv-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        {/* Info strip */}
        <div className="inv-modal-info">
          <div className="inv-info-item">
            <span className="inv-info-label">المبلغ السنوي</span>
            <strong>{fmtSAR(invoice.amount)} ر.س</strong>
          </div>
          <div className="inv-info-item">
            <span className="inv-info-label">الشهري</span>
            <strong>{fmtSAR(invoice.monthly_amount)} ر.س</strong>
          </div>
          <div className="inv-info-item">
            <span className="inv-info-label">تاريخ الاستحقاق</span>
            <strong>{fmtDate(invoice.due_date)}</strong>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`inv-dropzone${file ? " inv-dropzone--has-file" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {preview ? (
            <img src={preview} alt="معاينة" className="inv-dropzone-preview" />
          ) : (
            <>
              <i
                className={`fas ${file ? "fa-file-check" : "fa-cloud-arrow-up"} inv-dropzone-icon`}
                aria-hidden="true"
              ></i>
              <p className="inv-dropzone-label">
                {file ? file.name : "اسحب الملف هنا أو انقر للاختيار"}
              </p>
              <p className="inv-dropzone-hint">
                PDF، JPG، PNG، WEBP — حتى 10MB
              </p>
            </>
          )}
        </div>

        {file && !preview && (
          <div className="inv-file-chip">
            <i className="fas fa-file-pdf" aria-hidden="true"></i>
            <span>{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="inv-chip-remove"
              aria-label="إزالة"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="inv-modal-error" role="alert">
            <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>{" "}
            {error}
          </div>
        )}

        <div className="inv-modal-foot">
          <button
            type="button"
            className="inv-btn inv-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={submit}
            disabled={saving || !file}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>{" "}
                جاري الرفع...
              </>
            ) : (
              <>
                <i className="fas fa-cloud-arrow-up" aria-hidden="true"></i> رفع
                الإيصال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── InvoiceCard ───────────────────────────────────────────────────────────────

const InvoiceCard = ({
  invoice,
  contractActivated,
  onUpload,
  onViewReceipt,
}) => {
  const meta = STATUS_META[invoice.status] || STATUS_META.pending;
  const yearMeta = YEAR_META[invoice.year] || YEAR_META[1];
  const days = daysUntil(invoice.due_date);
  const isOverdue = days !== null && days < 0 && invoice.status === "pending";
  const canUpload = invoice.status === "pending" && contractActivated;

  return (
    <div
      className={`inv-card${invoice.status === "approved" ? " inv-card--approved" : ""}${isOverdue ? " inv-card--overdue" : ""}`}
    >
      {/* year badge */}
      <div
        className="inv-card-year-badge"
        style={{ background: yearMeta.color }}
      >
        {yearMeta.label}
      </div>

      <div className="inv-card-body">
        {/* amounts */}
        <div className="inv-card-amounts">
          <div>
            <span className="inv-amount-label">المبلغ السنوي</span>
            <span className="inv-amount-value">
              {fmtSAR(invoice.amount)} <small>ر.س</small>
            </span>
          </div>
          <div className="inv-monthly">
            <span className="inv-amount-label">شهرياً</span>
            <span className="inv-monthly-value">
              {fmtSAR(invoice.monthly_amount)} ر.س
            </span>
          </div>
        </div>

        {/* due date */}
        <div
          className={`inv-due-row${isOverdue ? " inv-due-row--overdue" : ""}`}
        >
          <i className="fas fa-calendar-alt" aria-hidden="true"></i>
          <span>{fmtDate(invoice.due_date)}</span>
          {days !== null && invoice.status === "pending" && (
            <span
              className={`inv-days-chip${isOverdue ? " inv-days-chip--overdue" : days <= 30 ? " inv-days-chip--soon" : ""}`}
            >
              {isOverdue
                ? `متأخر ${Math.abs(days)} يوم`
                : days === 0
                  ? "اليوم"
                  : `بعد ${days} يوم`}
            </span>
          )}
        </div>

        {/* status */}
        <div className="inv-card-status-row">
          <span className={`inv-pill ${meta.cls}`}>
            <i className={`fas ${meta.icon}`} aria-hidden="true"></i>
            {meta.label}
          </span>
          {invoice.status === "rejected" && invoice.admin_notes && (
            <span className="inv-reject-note">
              <i className="fas fa-circle-info" aria-hidden="true"></i>
              {invoice.admin_notes}
            </span>
          )}
        </div>

        {/* not activated yet message */}
        {!contractActivated && invoice.status === "pending" && (
          <div className="inv-not-active-hint">
            <i className="fas fa-lock" aria-hidden="true"></i>
            سيتم تفعيل هذه الفاتورة بعد تفعيل العقد
          </div>
        )}

        {/* actions */}
        <div className="inv-card-actions">
          {invoice.receipt_url && (
            <a
              href={invoice.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="inv-btn inv-btn--link"
            >
              <i className="fas fa-eye" aria-hidden="true"></i> عرض الإيصال
            </a>
          )}
          {canUpload && (
            <button
              type="button"
              className="inv-btn inv-btn--upload"
              onClick={() => onUpload(invoice)}
            >
              <i className="fas fa-cloud-arrow-up" aria-hidden="true"></i>
              رفع إيصال الدفع
            </button>
          )}
          {invoice.status === "admin_pending" && (
            <span className="inv-waiting-badge">
              <i className="fas fa-hourglass-half" aria-hidden="true"></i>
              بانتظار موافقة الإدارة
            </span>
          )}
          {invoice.status === "approved" && (
            <span className="inv-approved-badge">
              <i className="fas fa-circle-check" aria-hidden="true"></i>
              تم القبول
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ContractSection ───────────────────────────────────────────────────────────

const ContractSection = ({ group, onUpload }) => {
  const [open, setOpen] = useState(true);
  const { is_activated, activation_date, invoices } = group;

  const approvedCount = invoices.filter((i) => i.status === "approved").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;

  return (
    <div className="inv-section">
      <button
        type="button"
        className="inv-section-head"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <div className="inv-section-title-wrap">
          <i
            className={`fas fa-chevron-${open ? "down" : "left"} inv-chevron`}
            aria-hidden="true"
          ></i>
          <div>
            <h2 className="inv-section-title">{group.contract_title}</h2>
            <p className="inv-section-sub">
              <span
                className={`inv-type-badge inv-type-badge--${group.contract_type}`}
              >
                {group.contract_type === "rental"
                  ? "عقد استئجار"
                  : "عقد مبايعة"}
              </span>
              {is_activated ? (
                <span className="inv-activated-badge">
                  <i className="fas fa-circle-check"></i> مُفعَّل
                </span>
              ) : (
                <span className="inv-pending-badge">
                  <i className="fas fa-clock"></i> في انتظار التفعيل —{" "}
                  {new Date(activation_date).toLocaleDateString("ar-SA")}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="inv-section-stats">
          <span className="inv-stat-pill inv-stat-pill--green">
            {approvedCount} مقبول
          </span>
          <span className="inv-stat-pill inv-stat-pill--amber">
            {pendingCount} معلق
          </span>
        </div>
      </button>

      {open && (
        <div className="inv-section-cards">
          {invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              contractActivated={is_activated}
              onUpload={onUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── InvoicesPage ──────────────────────────────────────────────────────────────

const InvoicesPage = () => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalInvoice, setModalInvoice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/portallogistice/invoices`, {
        headers: getAuthHeaders(),
      });
      setData(res.data?.data || null);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  // Update a single invoice in state without full reload
  const handleUploadSuccess = (updated) => {
    setModalInvoice(null);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contracts: prev.contracts.map((group) => ({
          ...group,
          invoices: group.invoices.map((inv) =>
            inv.id === updated.id ? updated : inv,
          ),
        })),
        summary: {
          ...prev.summary,
          pending: prev.summary.pending - 1,
          admin_pending: prev.summary.admin_pending + 1,
        },
      };
    });
  };

  const s = data?.summary || {};
  const groups = data?.contracts || [];

  return (
    <div className="inv-page" dir="rtl">
      {modalInvoice && (
        <ReceiptModal
          invoice={modalInvoice}
          onClose={() => setModalInvoice(null)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* header */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title">
            <i className="fas fa-file-invoice-dollar" aria-hidden="true"></i>
            فواتير الصيانة
          </h1>
          <p className="inv-subtitle">
            فواتير تأمين الصيانة السنوية لعقود الاستئجار
          </p>
        </div>
      </div>

      {/* summary strip */}
      {!loading && data && (
        <div className="inv-summary-strip">
          <div className="inv-summary-item">
            <span className="inv-summary-num">{groups.length}</span>
            <span className="inv-summary-lbl">عقود</span>
          </div>
          <div className="inv-summary-item inv-summary-item--amber">
            <span className="inv-summary-num">{s.pending || 0}</span>
            <span className="inv-summary-lbl">بانتظار الدفع</span>
          </div>
          <div className="inv-summary-item inv-summary-item--blue">
            <span className="inv-summary-num">{s.admin_pending || 0}</span>
            <span className="inv-summary-lbl">قيد المراجعة</span>
          </div>
          <div className="inv-summary-item inv-summary-item--green">
            <span className="inv-summary-num">{s.approved || 0}</span>
            <span className="inv-summary-lbl">مقبول</span>
          </div>
          {s.rejected > 0 && (
            <div className="inv-summary-item inv-summary-item--red">
              <span className="inv-summary-num">{s.rejected}</span>
              <span className="inv-summary-lbl">مرفوض</span>
            </div>
          )}
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="inv-loading" role="status">
          <div className="inv-spinner" aria-hidden="true"></div>
          <span>جاري تحميل الفواتير...</span>
        </div>
      )}

      {/* empty */}
      {!loading && groups.length === 0 && (
        <div className="inv-empty">
          <i className="fas fa-file-invoice" aria-hidden="true"></i>
          <h2>لا توجد فواتير</h2>
          <p>ستظهر فواتير تأمين الصيانة هنا بعد اعتماد عقد الاستئجار.</p>
        </div>
      )}

      {/* contract groups */}
      {!loading &&
        groups.map((group) => (
          <ContractSection
            key={group.contract_id}
            group={group}
            onUpload={setModalInvoice}
          />
        ))}

      {/* info box */}
      {!loading && groups.length > 0 && (
        <div className="inv-info-box">
          <h3>
            <i className="fas fa-circle-info" aria-hidden="true"></i> معلومات
            تأمين الصيانة
          </h3>
          <div className="inv-info-years">
            {Object.entries(YEAR_META).map(([y, m]) => (
              <div
                key={y}
                className="inv-info-year-row"
                style={{ borderRightColor: m.color }}
              >
                <strong>{m.label}</strong>
                <span>{fmtSAR(m.amount)} ر.س سنوياً</span>
                <span className="inv-info-monthly">
                  ({fmtSAR(m.monthly)} ر.س / شهر)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
