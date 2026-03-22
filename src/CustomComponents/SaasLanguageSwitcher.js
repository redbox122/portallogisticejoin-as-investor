import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANG_KEY = 'lang';

const SaasLanguageSwitcher = () => {
  const { i18n } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = i18n.language?.startsWith('en') ? 'en' : 'ar';

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ar' || saved === 'en') {
      i18n.changeLanguage(saved);
      document.documentElement.setAttribute('dir', saved === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply stored lang once on mount
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selectLang = (code) => {
    localStorage.setItem(LANG_KEY, code);
    i18n.changeLanguage(code);
    document.documentElement.setAttribute('dir', code === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', code);
    setOpen(false);
  };

  const label = current === 'ar' ? 'العربية' : 'English';
  const flag = current === 'ar' ? '🇸🇦' : '🇺🇸';

  return (
    <div className="saas-lang-switcher" ref={wrapRef}>
      <button
        type="button"
        className="saas-lang-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Language"
      >
        <span className="saas-lang-trigger-flag" aria-hidden>
          {flag}
        </span>
        <span className="saas-lang-trigger-text">{label}</span>
        <i className={`fas fa-chevron-down saas-lang-chevron ${open ? 'saas-lang-chevron--open' : ''}`} aria-hidden />
      </button>

      <div className={`saas-lang-dropdown ${open ? 'saas-lang-dropdown--open' : ''}`} role="listbox">
        <button
          type="button"
          role="option"
          aria-selected={current === 'ar'}
          className={`saas-lang-option ${current === 'ar' ? 'saas-lang-option--active' : ''}`}
          onClick={() => selectLang('ar')}
        >
          <span className="saas-lang-option-flag" aria-hidden>
            🇸🇦
          </span>
          <span>العربية</span>
          {current === 'ar' && <i className="fas fa-check saas-lang-check" aria-hidden />}
        </button>
        <button
          type="button"
          role="option"
          aria-selected={current === 'en'}
          className={`saas-lang-option ${current === 'en' ? 'saas-lang-option--active' : ''}`}
          onClick={() => selectLang('en')}
        >
          <span className="saas-lang-option-flag" aria-hidden>
            🇺🇸
          </span>
          <span>English</span>
          {current === 'en' && <i className="fas fa-check saas-lang-check" aria-hidden />}
        </button>
      </div>
    </div>
  );
};

export default SaasLanguageSwitcher;
