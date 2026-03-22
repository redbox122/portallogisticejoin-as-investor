import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContractEligibility } from '../hooks/useContractEligibility';
import { Watch } from 'react-loader-spinner';
import { useTranslation } from 'react-i18next';
import { getLang, pickText } from '../Utitlities/uxText';

const PaymentsRouteGuard = ({ children }) => {
  const { canAccessPayments, loading, eligibilityReason, eligibilityStatus } = useContractEligibility();
  const { t, i18n } = useTranslation(['common']);
  const lang = getLang(i18n);

  if (loading) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (!canAccessPayments) {
    // Get reason message
    const reasonMessage = eligibilityReason 
      ? pickText(lang, eligibilityReason.ar, eligibilityReason.en, '')
      : t('dashboard.payments.access_denied_default');

    return (
      <Navigate 
        to="/dashboard/contracts" 
        replace 
        state={{ 
          message: 'payments_access_denied',
          reason: reasonMessage,
          eligibilityStatus 
        }} 
      />
    );
  }

  return children;
};

export default PaymentsRouteGuard;
