import { useCallback, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { AUTH_VIEWS, VIEW_TITLES } from '../constants/views';
import { useLogin } from '../hooks/useLogin';
import { useVerifyOtp } from '../hooks/useVerifyOtp';
import { useResetPassword } from '../hooks/useResetPassword';
import { useCreateAdmin } from '../hooks/useCreateAdmin';
import { notify } from '../utils/notify';

import { AuthToggle } from '../components/AuthToggle';
import { LoginForm } from '../components/LoginForm';
import { OtpForm } from '../components/OtpForm';
import { ForgotForm } from '../components/ForgotForm';
import { ResetForm } from '../components/ResetForm';
import { CreateAdminForm } from '../components/CreateAdminForm';
import DashboardFooter from '../../../Components/DashboardFooter';

const INIT = {
  view: AUTH_VIEWS.LOGIN,
  isAdmin: false,
  loading: false,
  error: '',
  login: '',
  password: '',
  otp: '',
  tempPhone: '',
  forgotPhone: '',
  newPass: '',
  newPassConf: '',
  adminName: '',
  adminEmail: '',
  adminPass: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'MERGE':
      return { ...state, ...action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.view, error: '', loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export default function LoginPage() {
  const { i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const [s, dispatch] = useReducer(reducer, INIT);
  const { isAuthenticated, userType, checkAuth } = useAuthStore();

  const loginMutation = useLogin();
  const verifyMutation = useVerifyOtp();
  const resetMutation = useResetPassword();
  const createAdminMutation = useCreateAdmin();

  useEffect(() => {
    checkAuth();
    // if (isAuthenticated) {
    //   navigate(userType === 'admin' ? '/admin' : '/dashboard', { replace: true });
    // }
  }, [isAuthenticated, userType]);

  useEffect(() => {
    const lang = i18n.language || 'ar';
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language]);

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!s.login || !s.password) {
        dispatch({ type: 'SET_ERROR', error: 'يرجى ملء جميع الحقول المطلوبة.' });
        return;
      }
      dispatch({ type: 'SET_LOADING', loading: true });

      try {
        const result = await loginMutation.mutateAsync({
          credentials: { login: s.login, password: s.password },
          isAdmin: s.isAdmin,
        });

        if (result?.requiresOTP) {
          dispatch({
            type: 'MERGE',
            payload: {
              view: AUTH_VIEWS.OTP,
              tempPhone: result.phone || '',
              loading: false,
            },
          });
          return;
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: 'بيانات الدخول غير صحيحة.' });
      }
    },
    [s.login, s.password, s.isAdmin, loginMutation]
  );

  const handleVerifyOtp = useCallback(async () => {
    if (!s.otp) {
      dispatch({ type: 'SET_ERROR', error: 'يرجى إدخال رمز التحقق.' });
      return;
    }
    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      await verifyMutation.mutateAsync({ phone: s.tempPhone, otp: s.otp });
      dispatch({ type: 'MERGE', payload: { view: AUTH_VIEWS.RESET, otp: '', error: '', loading: false } });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message || 'رمز التحقق غير صحيح.' });
    }
  }, [s.otp, s.tempPhone, verifyMutation]);

  const handleForgot = useCallback(
    async (e) => {
      e.preventDefault();
      if (!s.forgotPhone) {
        dispatch({ type: 'SET_ERROR', error: 'يرجى إدخال رقم الهاتف أو البريد.' });
        return;
      }
      dispatch({ type: 'MERGE', payload: { view: AUTH_VIEWS.RESET, tempPhone: s.forgotPhone, error: '' } });
    },
    [s.forgotPhone]
  );

  const handleReset = useCallback(
    async (e) => {
      e.preventDefault();
      if (!s.newPass || !s.newPassConf) {
        dispatch({ type: 'SET_ERROR', error: 'أدخل كلمة المرور وتأكيدها.' });
        return;
      }
      if (s.newPass !== s.newPassConf) {
        dispatch({ type: 'SET_ERROR', error: 'كلمتا المرور غير متطابقتين.' });
        return;
      }
      if (s.newPass.length < 6) {
        dispatch({ type: 'SET_ERROR', error: 'كلمة المرور 6 أحرف على الأقل.' });
        return;
      }
      dispatch({ type: 'SET_LOADING', loading: true });

      try {
        await resetMutation.mutateAsync({
          phone: s.tempPhone,
          password: s.newPass,
          password_confirmation: s.newPassConf,
        });

        notify('تم', 'تم تغيير كلمة المرور. سجّل الدخول الآن.');
        dispatch({
          type: 'MERGE',
          payload: {
            view: AUTH_VIEWS.LOGIN,
            newPass: '',
            newPassConf: '',
            tempPhone: '',
            error: '',
            loading: false,
          },
        });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: err.message || 'فشل تغيير كلمة المرور.' });
      }
    },
    [s.newPass, s.newPassConf, s.tempPhone, resetMutation]
  );

  const handleCreateAdmin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!s.adminName || !s.adminEmail || !s.adminPass) {
        dispatch({ type: 'SET_ERROR', error: 'يرجى تعبئة جميع الحقول.' });
        return;
      }
      dispatch({ type: 'SET_LOADING', loading: true });

      try {
        await createAdminMutation.mutateAsync({
          name: s.adminName,
          email: s.adminEmail,
          password: s.adminPass,
        });

        dispatch({
          type: 'MERGE',
          payload: {
            view: AUTH_VIEWS.LOGIN,
            login: s.adminEmail,
            adminName: '',
            adminEmail: '',
            adminPass: '',
            error: '',
            loading: false,
          },
        });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: err.message || 'فشل إنشاء الحساب.' });
      }
    },
    [s.adminName, s.adminEmail, s.adminPass, createAdminMutation]
  );

  const viewTitle = VIEW_TITLES[s.view];
  const showToggle = s.view === AUTH_VIEWS.LOGIN;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f0f4ff_0%,#e8f0fe_60%,#f5f7ff_100%)] px-4 py-6 font-['Cairo','Tajawal','sans-serif'] sm:px-4 sm:py-8">
      <div className="w-full max-w-[420px] rounded-[20px] bg-white px-8 pb-6 pt-9 shadow-[0_8px_40px_rgba(7,52,145,0.10),0_1px_6px_rgba(0,0,0,0.04)] sm:px-5 sm:pb-5 sm:pt-7">
        <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
          <img src="/assets/images/logo.png" alt="شعار البوابة" className="h-[60px] w-auto object-contain sm:h-[50px]" />
          <h1 className="m-0 text-[20px] font-extrabold tracking-[-0.3px] text-[#073491]">بوابة المستثمر</h1>
          <p className="m-0 text-center text-xs text-gray-400">منصة إدارة عقود التسهيل اللوجستي</p>
        </div>

        {showToggle && (
          <AuthToggle
            isAdmin={s.isAdmin}
            onChange={(isAdmin) => dispatch({ type: 'MERGE', payload: { isAdmin, error: '' } })}
          />
        )}

        {viewTitle && (
          <div className="mb-[18px] border-b border-gray-100 pb-3.5">
            <h2 className="m-0 text-center text-[17px] font-bold text-gray-900">{viewTitle}</h2>
          </div>
        )}

        {s.view === AUTH_VIEWS.LOGIN && (
          <LoginForm
            state={s}
            onChange={(payload) => dispatch({ type: 'MERGE', payload })}
            onSubmit={handleLogin}
            onForgot={() => dispatch({ type: 'SET_VIEW', view: AUTH_VIEWS.FORGOT })}
          />
        )}

        {s.view === AUTH_VIEWS.OTP && (
          <OtpForm
            state={s}
            onChange={(payload) => dispatch({ type: 'MERGE', payload })}
            onVerify={handleVerifyOtp}
            onBack={() => dispatch({ type: 'MERGE', payload: { view: AUTH_VIEWS.LOGIN, otp: '', error: '' } })}
          />
        )}

        {s.view === AUTH_VIEWS.FORGOT && (
          <ForgotForm
            state={s}
            onChange={(payload) => dispatch({ type: 'MERGE', payload })}
            onSubmit={handleForgot}
            onCancel={() => dispatch({ type: 'SET_VIEW', view: AUTH_VIEWS.LOGIN })}
          />
        )}

        {s.view === AUTH_VIEWS.RESET && (
          <ResetForm
            state={s}
            onChange={(payload) => dispatch({ type: 'MERGE', payload })}
            onSubmit={handleReset}
          />
        )}

        {s.view === AUTH_VIEWS.CREATE_ADMIN && (
          <CreateAdminForm
            state={s}
            onChange={(payload) => dispatch({ type: 'MERGE', payload })}
            onSubmit={handleCreateAdmin}
            onCancel={() => dispatch({ type: 'SET_VIEW', view: AUTH_VIEWS.LOGIN })}
          />
        )}

        {s.view === AUTH_VIEWS.LOGIN && s.isAdmin && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', view: AUTH_VIEWS.CREATE_ADMIN })}
            className="mt-1 w-full text-center text-xs text-gray-400 underline decoration-transparent underline-offset-2 transition-colors hover:text-gray-500"
          >
            إنشاء حساب مدير (لأول مرة)
          </button>
        )}

        <DashboardFooter />
      </div>
    </div>
  );
}
