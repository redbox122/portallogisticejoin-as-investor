import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../Css/dashboard-footer.css';

const LOGO_STEMS = ['image_1', 'image_2', 'image_3', 'image_4'];
const EXT_FALLBACK = ['jpeg', 'jpg', 'png', 'webp'];
const ALT_KEYS = [
  'dashboard.footer.logo_alt_1',
  'dashboard.footer.logo_alt_2',
  'dashboard.footer.logo_alt_3',
  'dashboard.footer.logo_alt_4',
];

function DashboardFooterLogo({ base, stem, alt }) {
  const [extIndex, setExtIndex] = useState(0);
  const [givenUp, setGivenUp] = useState(false);
  const src = `${base}/assets/images/${stem}.${EXT_FALLBACK[extIndex]}`;

  const onError = useCallback(() => {
    setExtIndex((i) => {
      if (i + 1 < EXT_FALLBACK.length) return i + 1;
      setGivenUp(true);
      return i;
    });
  }, []);

  if (givenUp) {
    return (
      <span className="dashboard-footer__logo-missing" role="img" aria-label={alt}>
        <span className="visually-hidden">{alt}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="dashboard-footer__logo-img"
      loading="lazy"
      decoding="async"
      onError={onError}
    />
  );
}

/**
 * User dashboard footer: partner / national platform logos.
 * Place files under public/assets/images/ as image_1.(jpeg|jpg|png|webp) … image_4.* — first existing extension is used.
 */
const DashboardFooter = () => {
  const { t, i18n } = useTranslation(['common']);
  const base = useMemo(() => (process.env.PUBLIC_URL || '').replace(/\/$/, ''), []);

  return (
    <footer className="dashboard-footer" role="contentinfo" aria-label={t('dashboard.footer.partners_line')}>
      <div className="dashboard-footer__glow" aria-hidden="true" />
      <div className="dashboard-footer__inner">
        <div className="dashboard-footer__head">
          <span className="dashboard-footer__eyebrow" aria-hidden="true" />
          <p className="dashboard-footer__label">{t('dashboard.footer.partners_line')}</p>
        </div>

        <ul className="dashboard-footer__logos">
          {LOGO_STEMS.map((stem, i) => (
            <li key={`${i18n.language}-${stem}`} className="dashboard-footer__logo-item">
              <div className="dashboard-footer__logo-card">
                <DashboardFooterLogo base={base} stem={stem} alt={t(ALT_KEYS[i])} />
              </div>
            </li>
          ))}
        </ul>

        <p className="dashboard-footer__tagline">{t('dashboard.footer.tagline')}</p>
      </div>
    </footer>
  );
};

export default DashboardFooter;
