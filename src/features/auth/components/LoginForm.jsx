// src/features/auth/components/LoginForm.jsx
import { FieldError } from './FieldError';
import { PasswordInput } from './PasswordInput';
import { Spinner } from './Spinner';

export function LoginForm({ state, onChange, onSubmit, onForgot }) {
    const { login, password, isAdmin, loading, error } = state;

    return (
        <form className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="login" className="text-[13px] font-semibold text-gray-700">
                    {isAdmin ? 'البريد الإلكتروني' : 'البريد / الجوال / الهوية'}
                </label>
                <input
                    id="login"
                    type="text"
                    autoComplete="username"
                    value={login}
                    disabled={loading}
                    placeholder={isAdmin ? 'admin@example.com' : 'ادخل بريدك أو جوالك أو هويتك'}
                    onChange={(e) => onChange({ login: e.target.value, error: '' })}
                    className="w-full rounded-[10px] border-[1.5px] border-gray-200 bg-[#fafafa] px-3.5 py-[11px] text-sm text-gray-900 outline-none transition
                     focus:border-[#073491] focus:bg-white focus:ring-4 focus:ring-[rgba(7,52,145,0.08)]
                     disabled:cursor-not-allowed disabled:opacity-55"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold text-gray-700">
                    كلمة المرور
                </label>
                <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => onChange({ password: e.target.value, error: '' })}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                />
            </div>

            <FieldError message={error} />

            <button
                type="button"
                disabled={loading}
                onClick={onSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[#073491] bg-[#073491] px-5 py-[11px]
                   text-sm font-bold text-white transition hover:bg-[#0a3fa3]
                   disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Spinner size={18} />
                        <span>جاري تسجيل الدخول...</span>
                    </>
                ) : (
                    'تسجيل الدخول'
                )}
            </button>

            {!isAdmin && (
                <button
                    type="button"
                    onClick={onForgot}
                    className="w-full text-center text-[13px] text-[#073491] underline underline-offset-[3px] transition-colors hover:text-[#0a3fa3]"
                >
                    نسيت كلمة المرور؟
                </button>
            )}
        </form>
    );
}