import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import LanguageSwitcher from '../CustomComponents/LanguageSwitcher';
import { API_BASE_URL } from '../config';
import '../Css/login.css';

const LoginPage = () => {
  const [loginData, setLoginData] = useState({ login: '', password: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({ email: '', password: '', name: '' });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetForm, setResetForm] = useState({ password: '', password_confirmation: '' });
  const { t, i18n } = useTranslation(['common']);
  const { login, isAuthenticated, userType, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (userType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, userType, navigate]);

  // Set RTL/LTR based on language
  useEffect(() => {
    const lang = i18n.language || 'ar';
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!loginData.login || !loginData.password) {
      setError(t('login.error.required_fields'));
      setLoading(false);
      return;
    }

    const result = await login(loginData, isAdmin);

    // 🔥 OTP flow: first login requires verification
    if (result.success && result.requiresOTP) {
      setTempUser(result.user);
      setShowOTP(true);
      setLoading(false);
      return;
    }

    if (result.success) {
      Store.addNotification({
        title: t('login.success.title'),
        message: t('login.success.message'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: {
          duration: 3000,
          onScreen: true
        }
      });
      // Force full page reload to bypass cache and ensure latest version loads
      if (result.redirectPath) {
        // Mark that we just logged in (for stale cache detection)
        sessionStorage.setItem('just_logged_in', 'true');
        // Add cache-busting parameter and use window.location to force hard reload
        const separator = result.redirectPath.includes('?') ? '&' : '?';
        window.location.href = `${result.redirectPath}${separator}_t=${Date.now()}`;
      }
    } else {
      setError(result.error || t('login.error.invalid_credentials'));
      Store.addNotification({
        title: t('login.error.title'),
        message: result.error || t('login.error.invalid_credentials'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: {
          duration: 5000,
          onScreen: true
        }
      });
    }

    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otpCode) {
      setError('الرجاء إدخال رمز OTP');
      return;
    }
    if (!tempUser) {
      setError('بيانات المستخدم غير متوفرة');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/portallogistice/verify-otp`,
        { phone: tempUser.phone, otp: otpCode },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-LANG': localStorage.getItem('i18nextLng') || 'ar' } }
      );
      setShowOTP(false);
      setShowResetPassword(true);
      setOtpCode('');
    } catch (e) {
      const d = e.response?.data;
      if (e.response?.status === 422 && d?.errors) {
        const first = Object.values(d.errors)[0];
        setError(Array.isArray(first) ? first[0] : first);
      } else {
        setError(d?.message || d?.error || 'رمز التحقق غير صحيح أو منتهي');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordChange = (e) => {
    const { name, value } = e.target;
    setResetForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!tempUser?.phone) {
      setError('بيانات المستخدم غير متوفرة');
      return;
    }
    if (!resetForm.password || !resetForm.password_confirmation) {
      setError('أدخل كلمة المرور وتأكيدها');
      return;
    }
    if (resetForm.password !== resetForm.password_confirmation) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (resetForm.password.length < 6) {
      setError('كلمة المرور 6 أحرف على الأقل');
      return;
    }
    try {
      setLoading(true);
      const result = await resetPassword(tempUser.phone, resetForm.password, resetForm.password_confirmation);
      if (result.success) {
        Store.addNotification({
          title: 'تم',
          message: result.message || 'تم تغيير كلمة المرور. سجّل الدخول الآن.',
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 4000, onScreen: true }
        });
        setShowResetPassword(false);
        setTempUser(null);
        setResetForm({ password: '', password_confirmation: '' });
      } else {
        setError(result.error || 'فشل تغيير كلمة المرور');
      }
    } catch (err) {
      setError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdminChange = (e) => {
    const { name, value } = e.target;
    setCreateAdminForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    if (!createAdminForm.email || !createAdminForm.password || !createAdminForm.name) {
      setError('الرجاء تعبئة البريد وكلمة المرور والاسم');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/portallogistice/admin/register`,
        {
          email: createAdminForm.email,
          password: createAdminForm.password,
          name: createAdminForm.name
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-LANG': localStorage.getItem('i18nextLng') || 'ar'
          }
        }
      );
      if (res.data && res.data.success) {
        const createdEmail = createAdminForm.email;
        Store.addNotification({
          title: 'تم',
          message: res.data.message || 'تم إنشاء حساب المدير. يمكنك تسجيل الدخول الآن.',
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 4000, onScreen: true }
        });
        setShowCreateAdmin(false);
        setCreateAdminForm({ email: '', password: '', name: '' });
        setLoginData(prev => ({ ...prev, login: createdEmail }));
      } else {
        setError(res.data?.message || 'فشل إنشاء الحساب');
      }
    } catch (err) {
      const d = err.response?.data;
      let msg = err.message || 'خطأ في الشبكة أو الـ API غير مفعّل';
      if (err.response?.status === 422 && d?.errors) {
        const first = Object.values(d.errors)[0];
        msg = Array.isArray(first) ? first[0] : first;
      } else if (d?.message) msg = d.message;
      else if (d?.error) msg = d.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const lang = i18n.language || 'ar';
  const isRTL = lang === 'ar';

  return (
    <div className="login-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="login-container">
        <div className="login-header">
          <img src="/assets/images/logo.png" alt="Logo" className="login-logo" />
          <h1 className="login-title">{t('login.title')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>
        </div>

        <div className="login-toggle">
          <button
            type="button"
            className={`toggle-btn ${!isAdmin ? 'active' : ''}`}
            onClick={() => setIsAdmin(false)}
          >
            {t('login.user_login')}
          </button>
          <button
            type="button"
            className={`toggle-btn ${isAdmin ? 'active' : ''}`}
            onClick={() => setIsAdmin(true)}
          >
            {t('login.admin_login')}
          </button>
        </div>

        {!showOTP && !showResetPassword && (
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login">
              {isAdmin ? t('login.email') : t('login.email_phone_national_id')}
            </label>
            <input
              type="text"
              id="login"
              name="login"
              value={loginData.login}
              onChange={handleInputChange}
              placeholder={isAdmin ? t('login.email_placeholder') : t('login.email_phone_national_id_placeholder')}
              className="form-control"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={loginData.password}
              onChange={handleInputChange}
              placeholder={t('login.password_placeholder')}
              className="form-control"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn primary-btn"
            disabled={loading}
          >
            {loading ? (
              <div className="btn-loader">
                <Watch
                  height="20"
                  width="20"
                  radius="9"
                  color="#ffffff"
                  ariaLabel="loading"
                />
                <span style={{ marginLeft: '8px' }}>{t('login.loading')}</span>
              </div>
            ) : (
              t('login.login_button')
            )}
          </button>
        </form>
        )}

        {showOTP && (
          <div style={{ marginTop: '20px' }}>
            <h3>رمز التحقق</h3>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="أدخل رمز OTP"
              className="form-control"
              disabled={loading}
            />
            <button
              onClick={handleVerifyOTP}
              className="login-btn primary-btn"
              disabled={loading}
              style={{ marginTop: 10 }}
              type="button"
            >
              تحقق
            </button>
            {error && <div className="error-message" style={{ marginTop: 8 }}>{error}</div>}
          </div>
        )}

        {showResetPassword && (
          <form onSubmit={handleResetPassword} className="login-form" style={{ marginTop: 20 }}>
            <h3>تعيين كلمة مرور جديدة</h3>
            <div className="form-group">
              <label>كلمة المرور الجديدة</label>
              <input
                type="password"
                name="password"
                value={resetForm.password}
                onChange={handleResetPasswordChange}
                placeholder="6 أحرف على الأقل"
                className="form-control"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>تأكيد كلمة المرور</label>
              <input
                type="password"
                name="password_confirmation"
                value={resetForm.password_confirmation}
                onChange={handleResetPasswordChange}
                placeholder="أعد إدخال كلمة المرور"
                className="form-control"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="login-btn primary-btn" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? 'جاري الحفظ...' : 'حفظ والذهاب لتسجيل الدخول'}
            </button>
          </form>
        )}

        {isAdmin && !showCreateAdmin && !showOTP && !showResetPassword && (
          <p style={{ marginTop: 12, fontSize: 14 }}>
            <button
              type="button"
              onClick={() => setShowCreateAdmin(true)}
              style={{ background: 'none', border: 'none', color: '#073491', cursor: 'pointer', textDecoration: 'underline' }}
            >
              إنشاء حساب مدير (أول مرة)
            </button>
          </p>
        )}

        {showCreateAdmin && (
          <form onSubmit={handleCreateAdmin} className="login-form" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
            <h3 style={{ marginBottom: 16 }}>إنشاء حساب مدير</h3>
            <div className="form-group">
              <label>الاسم</label>
              <input
                type="text"
                name="name"
                value={createAdminForm.name}
                onChange={handleCreateAdminChange}
                placeholder="مدير النظام"
                className="form-control"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={createAdminForm.email}
                onChange={handleCreateAdminChange}
                placeholder="info@shellafood.com"
                className="form-control"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={createAdminForm.password}
                onChange={handleCreateAdminChange}
                placeholder="••••••••"
                className="form-control"
                disabled={loading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="login-btn primary-btn" disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </button>
              <button
                type="button"
                className="toggle-btn"
                onClick={() => { setShowCreateAdmin(false); setError(''); }}
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

