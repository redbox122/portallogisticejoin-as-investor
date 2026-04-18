import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../config';
import DashboardFooter from '../Components/DashboardFooter';
import '../Css/login.css';

// ── view constants ────────────────────────────────────────────────────────────

const VIEW = {
  LOGIN:          'login',
  OTP:            'otp',
  FORGOT:         'forgot',
  RESET:          'reset',
  CREATE_ADMIN:   'create_admin',
};

// ── reducer: one source of truth for all form state ──────────────────────────

const INIT = {
  view:        VIEW.LOGIN,
  isAdmin:     false,
  loading:     false,
  error:       '',
  showPass:    false,
  // login
  login:       '',
  password:    '',
  // otp
  otp:         '',
  tempPhone:   '',
  // forgot
  forgotPhone: '',
  // reset
  newPass:     '',
  newPassConf: '',
  // create admin
  adminName:   '',
  adminEmail:  '',
  adminPass:   '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET':        return { ...state, [action.key]: action.value };
    case 'MERGE':      return { ...state, ...action.payload };
    case 'SET_VIEW':   return { ...state, view: action.view, error: '', loading: false };
    case 'SET_ERROR':  return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':return { ...state, loading: action.loading };
    case 'RESET_PASS_FIELDS': return { ...state, newPass: '', newPassConf: '', error: '' };
    default: return state;
  }
}

// ── tiny helpers ──────────────────────────────────────────────────────────────

function notify(title, message, type = 'success') {
  Store.addNotification({
    title, message, type,
    insert: 'top', container: 'top-right',
    dismiss: { duration: type === 'danger' ? 5000 : 3000, onScreen: true },
  });
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="lp-error" role="alert">
      <i className="fas fa-circle-exclamation" aria-hidden="true"></i>
      {msg}
    </div>
  );
}

function Spinner({ size = 20 }) {
  return <Watch height={size} width={size} radius="9" color="#ffffff" ariaLabel="loading" />;
}

// ── sub-views (each is a pure presentational slice) ───────────────────────────

const LoginForm = ({ s, dispatch, onSubmit }) => (
  <form onSubmit={onSubmit} className="lp-form" noValidate>
    <div className="lp-field">
      <label htmlFor="lp-login">
        {s.isAdmin ? 'البريد الإلكتروني' : 'البريد / الجوال / الهوية'}
      </label>
      <input
        id="lp-login" type="text" autoComplete="username"
        value={s.login} disabled={s.loading}
        placeholder={s.isAdmin ? 'admin@example.com' : 'ادخل بريدك أو جوالك أو هويتك'}
        onChange={e => dispatch({ type: 'MERGE', payload: { login: e.target.value, error: '' } })}
      />
    </div>

    <div className="lp-field">
      <label htmlFor="lp-password">كلمة المرور</label>
      <div className="lp-pass-wrap">
        <input
          id="lp-password" autoComplete="current-password"
          type={s.showPass ? 'text' : 'password'}
          value={s.password} disabled={s.loading}
          placeholder="••••••••"
          onChange={e => dispatch({ type: 'MERGE', payload: { password: e.target.value, error: '' } })}
        />
        <button type="button" className="lp-pass-toggle"
          onClick={() => dispatch({ type: 'SET', key: 'showPass', value: !s.showPass })}
          aria-label={s.showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
          <i className={`fas ${s.showPass ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <FieldError msg={s.error} />

    <button type="submit" className="lp-btn lp-btn--primary" disabled={s.loading}>
      {s.loading ? <><Spinner /> <span>جاري تسجيل الدخول...</span></> : 'تسجيل الدخول'}
    </button>

    {!s.isAdmin && (
      <button type="button" className="lp-link-btn"
        onClick={() => dispatch({ type: 'SET_VIEW', view: VIEW.FORGOT })}>
        نسيت كلمة المرور؟
      </button>
    )}
  </form>
);

const OtpView = ({ s, dispatch, onVerify }) => (
  <div className="lp-form">
    <div className="lp-otp-intro">
      <i className="fas fa-mobile-screen-button lp-otp-icon" aria-hidden="true"></i>
      <p>تم إرسال رمز التحقق إلى جوالك</p>
    </div>
    <div className="lp-field">
      <label htmlFor="lp-otp">رمز التحقق (OTP)</label>
      <input id="lp-otp" type="text" inputMode="numeric" maxLength={6}
        value={s.otp} disabled={s.loading} placeholder="أدخل الرمز المكون من 6 أرقام" dir="ltr"
        onChange={e => dispatch({ type: 'MERGE', payload: { otp: e.target.value, error: '' } })} />
    </div>
    <FieldError msg={s.error} />
    <button type="button" className="lp-btn lp-btn--primary" disabled={s.loading || !s.otp} onClick={onVerify}>
      {s.loading ? <><Spinner /> <span>جاري التحقق...</span></> : 'تحقق'}
    </button>
    <button type="button" className="lp-link-btn"
      onClick={() => dispatch({ type: 'MERGE', payload: { view: VIEW.LOGIN, otp: '', error: '' } })}>
      العودة لتسجيل الدخول
    </button>
  </div>
);

const ForgotView = ({ s, dispatch, onSubmit }) => (
  <form onSubmit={onSubmit} className="lp-form" noValidate>
    <p className="lp-form-desc">أدخل رقم الهاتف المسجل لديك</p>
    <div className="lp-field">
      <label htmlFor="lp-forgot-phone">رقم الهاتف   </label>
      <input id="lp-forgot-phone" type="text" value={s.forgotPhone} disabled={s.loading}
        placeholder="أدخل رقم الهاتف   "
        onChange={e => dispatch({ type: 'MERGE', payload: { forgotPhone: e.target.value, error: '' } })} />
    </div>
    <FieldError msg={s.error} />
    <div className="lp-btn-row">
      <button type="submit" className="lp-btn lp-btn--primary" disabled={s.loading}>
        {s.loading ? <><Spinner /> <span>...</span></> : 'التالي'}
      </button>
      <button type="button" className="lp-btn lp-btn--ghost"
        onClick={() => dispatch({ type: 'SET_VIEW', view: VIEW.LOGIN })}>إلغاء</button>
    </div>
  </form>
);

const ResetView = ({ s, dispatch, onSubmit }) => (
  <form onSubmit={onSubmit} className="lp-form" noValidate>
    <p className="lp-form-desc">اختر كلمة مرور جديدة لحسابك</p>
    <div className="lp-field">
      <label htmlFor="lp-new-pass">كلمة المرور الجديدة</label>
      <input id="lp-new-pass" type="password" autoComplete="new-password"
        value={s.newPass} disabled={s.loading} placeholder="6 أحرف على الأقل"
        onChange={e => dispatch({ type: 'MERGE', payload: { newPass: e.target.value, error: '' } })} />
    </div>
    <div className="lp-field">
      <label htmlFor="lp-new-pass-conf">تأكيد كلمة المرور</label>
      <input id="lp-new-pass-conf" type="password" autoComplete="new-password"
        value={s.newPassConf} disabled={s.loading} placeholder="أعد إدخال كلمة المرور"
        onChange={e => dispatch({ type: 'MERGE', payload: { newPassConf: e.target.value, error: '' } })} />
    </div>
    <FieldError msg={s.error} />
    <button type="submit" className="lp-btn lp-btn--primary" disabled={s.loading}>
      {s.loading ? <><Spinner /> <span>جاري الحفظ...</span></> : 'حفظ والدخول'}
    </button>
  </form>
);

const CreateAdminView = ({ s, dispatch, onSubmit }) => (
  <form onSubmit={onSubmit} className="lp-form" noValidate>
    <p className="lp-form-desc">إنشاء حساب مدير النظام (لأول مرة فقط)</p>
    <div className="lp-field">
      <label htmlFor="lp-admin-name">الاسم</label>
      <input id="lp-admin-name" type="text" value={s.adminName} disabled={s.loading}
        placeholder="مدير النظام"
        onChange={e => dispatch({ type: 'MERGE', payload: { adminName: e.target.value, error: '' } })} />
    </div>
    <div className="lp-field">
      <label htmlFor="lp-admin-email">البريد الإلكتروني</label>
      <input id="lp-admin-email" type="email" value={s.adminEmail} disabled={s.loading}
        placeholder="admin@example.com"
        onChange={e => dispatch({ type: 'MERGE', payload: { adminEmail: e.target.value, error: '' } })} />
    </div>
    <div className="lp-field">
      <label htmlFor="lp-admin-pass">كلمة المرور</label>
      <input id="lp-admin-pass" type="password" value={s.adminPass} disabled={s.loading}
        placeholder="••••••••"
        onChange={e => dispatch({ type: 'MERGE', payload: { adminPass: e.target.value, error: '' } })} />
    </div>
    <FieldError msg={s.error} />
    <div className="lp-btn-row">
      <button type="submit" className="lp-btn lp-btn--primary" disabled={s.loading}>
        {s.loading ? <><Spinner /> <span>جاري الإنشاء...</span></> : 'إنشاء الحساب'}
      </button>
      <button type="button" className="lp-btn lp-btn--ghost"
        onClick={() => dispatch({ type: 'SET_VIEW', view: VIEW.LOGIN })}>إلغاء</button>
    </div>
  </form>
);

// ── view titles ───────────────────────────────────────────────────────────────

const VIEW_META = {
  [VIEW.LOGIN]:        { title: null },
  [VIEW.OTP]:          { title: 'التحقق من الهوية' },
  [VIEW.FORGOT]:       { title: 'استعادة كلمة المرور' },
  [VIEW.RESET]:        { title: 'تعيين كلمة مرور جديدة' },
  [VIEW.CREATE_ADMIN]: { title: 'إنشاء حساب مدير' },
};

// ── main component ────────────────────────────────────────────────────────────

const LoginPage = () => {
  const { i18n }                          = useTranslation(['common']);
  const { login, isAuthenticated, userType, resetPassword } = useAuth();
  const navigate                          = useNavigate();
  const [s, dispatch]                     = useReducer(reducer, INIT);

  // ── redirect if already authenticated ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(userType === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
  }, [isAuthenticated, userType, navigate]);

  // ── RTL / LTR ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const lang = i18n.language || 'ar';
    document.documentElement.setAttribute('dir',  lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!s.login || !s.password) {
      dispatch({ type: 'SET_ERROR', error: 'يرجى ملء جميع الحقول المطلوبة.' });
      return;
    }
    dispatch({ type: 'SET_LOADING', loading: true });

    const result = await login({ login: s.login, password: s.password }, s.isAdmin);

    if (result.success && result.requiresOTP) {
      dispatch({ type: 'MERGE', payload: { view: VIEW.OTP, tempPhone: result.user?.phone || '', loading: false } });
      return;
    }

    if (result.success) {
      notify('مرحباً بك!', 'تم تسجيل الدخول بنجاح.');
      if (result.redirectPath) {
        sessionStorage.setItem('just_logged_in', 'true');
        const sep = result.redirectPath.includes('?') ? '&' : '?';
        window.location.href = `${result.redirectPath}${sep}_t=${Date.now()}`;
      }
    } else {
      dispatch({ type: 'SET_ERROR', error: result.error || 'بيانات الدخول غير صحيحة.' });
    }
  }, [s.login, s.password, s.isAdmin, login]);

  const handleVerifyOtp = useCallback(async () => {
    if (!s.otp) { dispatch({ type: 'SET_ERROR', error: 'يرجى إدخال رمز التحقق.' }); return; }
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await axios.post(`${API_BASE_URL}/portallogistice/verify-otp`,
        { phone: s.tempPhone, otp: s.otp },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-LANG': localStorage.getItem('i18nextLng') || 'ar' } }
      );
      dispatch({ type: 'MERGE', payload: { view: VIEW.RESET, otp: '', error: '', loading: false } });
    } catch (err) {
      const d    = err.response?.data;
      const first = d?.errors ? Object.values(d.errors)[0] : null;
      dispatch({ type: 'SET_ERROR', error: (Array.isArray(first) ? first[0] : first) || d?.message || 'رمز التحقق غير صحيح.' });
    }
  }, [s.otp, s.tempPhone]);

  const handleForgot = useCallback(async (e) => {
    e.preventDefault();
    if (!s.forgotPhone) { dispatch({ type: 'SET_ERROR', error: 'يرجى إدخال رقم الهاتف أو البريد.' }); return; }
    dispatch({ type: 'MERGE', payload: { view: VIEW.RESET, tempPhone: s.forgotPhone, error: '' } });
  }, [s.forgotPhone]);

  const handleReset = useCallback(async (e) => {
    e.preventDefault();
    if (!s.newPass || !s.newPassConf)     { dispatch({ type: 'SET_ERROR', error: 'أدخل كلمة المرور وتأكيدها.' }); return; }
    if (s.newPass !== s.newPassConf)      { dispatch({ type: 'SET_ERROR', error: 'كلمتا المرور غير متطابقتين.' }); return; }
    if (s.newPass.length < 6)            { dispatch({ type: 'SET_ERROR', error: 'كلمة المرور 6 أحرف على الأقل.' }); return; }
    dispatch({ type: 'SET_LOADING', loading: true });
    const result = await resetPassword(s.tempPhone, s.newPass, s.newPassConf);
    if (result.success) {
      notify('تم',  'تم تغيير كلمة المرور. سجّل الدخول الآن.');
      dispatch({ type: 'MERGE', payload: { view: VIEW.LOGIN, newPass: '', newPassConf: '', tempPhone: '', error: '', loading: false } });
    } else {
      dispatch({ type: 'SET_ERROR', error: result.error || 'فشل تغيير كلمة المرور.' });
    }
  }, [s.newPass, s.newPassConf, s.tempPhone, resetPassword]);

  const handleCreateAdmin = useCallback(async (e) => {
    e.preventDefault();
    if (!s.adminName || !s.adminEmail || !s.adminPass) {
      dispatch({ type: 'SET_ERROR', error: 'يرجى تعبئة جميع الحقول.' }); return;
    }
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const res = await axios.post(`${API_BASE_URL}/portallogistice/admin/register`,
        { name: s.adminName, email: s.adminEmail, password: s.adminPass },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-LANG': localStorage.getItem('i18nextLng') || 'ar' } }
      );
      if (res.data?.success) {
        notify('تم', res.data.message || 'تم إنشاء حساب المدير. يمكنك تسجيل الدخول الآن.');
        dispatch({ type: 'MERGE', payload: { view: VIEW.LOGIN, login: s.adminEmail, adminName: '', adminEmail: '', adminPass: '', error: '', loading: false } });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.data?.message || 'فشل إنشاء الحساب.' });
      }
    } catch (err) {
      const d     = err.response?.data;
      const first = d?.errors ? Object.values(d.errors)[0] : null;
      dispatch({ type: 'SET_ERROR', error: (Array.isArray(first) ? first[0] : first) || d?.message || 'خطأ في الشبكة.' });
    }
  }, [s.adminName, s.adminEmail, s.adminPass]);

  // ── render ────────────────────────────────────────────────────────────────

  const viewMeta  = VIEW_META[s.view] || {};
  const showToggle = s.view === VIEW.LOGIN;

  return (
    <div className="lp-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="lp-card">

        {/* logo + branding */}
        <div className="lp-brand">
          <img src="/assets/images/logo.png" alt="شعار البوابة" className="lp-logo" />
          <h1 className="lp-app-name">بوابة المستثمر</h1>
          <p className="lp-app-sub">منصة إدارة عقود التسهيل اللوجستي</p>
        </div>

        {/* user / admin toggle */}
        {showToggle && (
          <div className="lp-toggle" role="tablist" aria-label="نوع الحساب">
            <button
              role="tab"
              aria-selected={!s.isAdmin}
              className={`lp-toggle-btn${!s.isAdmin ? ' lp-toggle-btn--active' : ''}`}
              onClick={() => dispatch({ type: 'MERGE', payload: { isAdmin: false, error: '' } })}
              type="button"
            >
              <i className="fas fa-user" aria-hidden="true"></i>
              مستثمر
            </button>
            <button
              role="tab"
              aria-selected={s.isAdmin}
              className={`lp-toggle-btn${s.isAdmin ? ' lp-toggle-btn--active' : ''}`}
              onClick={() => dispatch({ type: 'MERGE', payload: { isAdmin: true, error: '' } })}
              type="button"
            >
              <i className="fas fa-shield-halved" aria-hidden="true"></i>
              مدير النظام
            </button>
          </div>
        )}

        {/* view sub-title */}
        {viewMeta.title && (
          <div className="lp-view-header">
            <h2 className="lp-view-title">{viewMeta.title}</h2>
          </div>
        )}

        {/* view router */}
        {s.view === VIEW.LOGIN        && <LoginForm       s={s} dispatch={dispatch} onSubmit={handleLogin} />}
        {s.view === VIEW.OTP          && <OtpView         s={s} dispatch={dispatch} onVerify={handleVerifyOtp} />}
        {s.view === VIEW.FORGOT       && <ForgotView      s={s} dispatch={dispatch} onSubmit={handleForgot} />}
        {s.view === VIEW.RESET        && <ResetView       s={s} dispatch={dispatch} onSubmit={handleReset} />}
        {s.view === VIEW.CREATE_ADMIN && <CreateAdminView s={s} dispatch={dispatch} onSubmit={handleCreateAdmin} />}

        {/* create admin link — only on admin login, main view */}
        {s.view === VIEW.LOGIN && s.isAdmin && (
          <button type="button" className="lp-link-btn lp-link-btn--muted"
            onClick={() => dispatch({ type: 'SET_VIEW', view: VIEW.CREATE_ADMIN })}>
            إنشاء حساب مدير (لأول مرة)
          </button>
        )}

        <DashboardFooter />
      </div>
    </div>
  );
};

export default LoginPage;