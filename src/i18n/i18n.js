import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function getInitialLanguage() {
  try {
    const fromLs = localStorage.getItem('lang');
    if (fromLs === 'ar' || fromLs === 'en') return fromLs;
  } catch (e) {
    /* ignore */
  }
  return getQueryParam('lang') ?? 'ar';
}

const initialLng = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
      },
      ar: {
        common: arCommon,
      }
    },
    lng: initialLng,
    fallbackLng: initialLng,
    interpolation: {
      escapeValue: false
    },
    ns: ['common'],
    defaultNS: 'common',
  });

export default i18n;
