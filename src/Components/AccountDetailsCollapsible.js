import React from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'react-notifications-component';
import '../Css/components/account-details-collapsible.css';

/**
 * AccountDetailsCollapsible - Collapsible section showing bank account details
 * Used in wire receipt card for users to copy account details
 */
const AccountDetailsCollapsible = ({ accountDetails, isOpen, onToggle }) => {
  const { t, i18n } = useTranslation(['common']);

  if (!accountDetails) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    Store.addNotification({
      title: t('dashboard.success.title'),
      message: t('dashboard.copied', { defaultValue: 'Copied to clipboard' }),
      type: 'success',
      insert: 'top',
      container: 'top-right',
      dismiss: { duration: 2000 }
    });
  };

  const copyAllDetails = () => {
    const details = [
      i18n.language === 'ar' ? accountDetails.account_name : accountDetails.account_name_en,
      accountDetails.account_number,
      accountDetails.iban,
      i18n.language === 'ar' ? accountDetails.bank_name : accountDetails.bank_name_en,
      accountDetails.swift_code || '',
      i18n.language === 'ar' ? accountDetails.beneficiary_name : accountDetails.beneficiary_name_en
    ].filter(Boolean).join('\n');

    copyToClipboard(details);
  };

  return (
    <div className="account-details-collapsible">
      <button 
        className="toggle-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <i className={`fas ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        <span>{t('dashboard.wire_receipt.show_account_details', { defaultValue: 'Show Account Details' })}</span>
      </button>

      {isOpen && (
        <div className="account-details-content">
          <div className="account-details-header">
            <h4>{t('dashboard.wire_receipt.bank_account_details', { defaultValue: 'Bank Account Details' })}</h4>
            <button className="copy-all-btn" onClick={copyAllDetails}>
              <i className="fas fa-copy"></i>
              {t('dashboard.wire_receipt.copy_all', { defaultValue: 'Copy All' })}
            </button>
          </div>

          <div className="account-details-grid">
            <div className="account-detail-item">
              <label>{t('dashboard.profile.account_name', { defaultValue: 'Account Name' })}</label>
              <div className="detail-value-with-copy">
                <span>{i18n.language === 'ar' ? accountDetails.account_name : accountDetails.account_name_en}</span>
                <button 
                  className="copy-btn" 
                  onClick={() => copyToClipboard(i18n.language === 'ar' ? accountDetails.account_name : accountDetails.account_name_en)}
                  title={t('dashboard.copy', { defaultValue: 'Copy' })}
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>

            {accountDetails.account_number && (
              <div className="account-detail-item">
                <label>{t('dashboard.profile.account_number', { defaultValue: 'Account Number' })}</label>
                <div className="detail-value-with-copy">
                  <span>{accountDetails.account_number}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(accountDetails.account_number)}
                    title={t('dashboard.copy', { defaultValue: 'Copy' })}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            )}

            {accountDetails.iban && (
              <div className="account-detail-item">
                <label>IBAN</label>
                <div className="detail-value-with-copy">
                  <span>{accountDetails.iban}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(accountDetails.iban)}
                    title={t('dashboard.copy', { defaultValue: 'Copy' })}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            )}

            {accountDetails.bank_name && (
              <div className="account-detail-item">
                <label>{t('dashboard.profile.bank_name', { defaultValue: 'Bank Name' })}</label>
                <div className="detail-value-with-copy">
                  <span>{i18n.language === 'ar' ? accountDetails.bank_name : accountDetails.bank_name_en}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(i18n.language === 'ar' ? accountDetails.bank_name : accountDetails.bank_name_en)}
                    title={t('dashboard.copy', { defaultValue: 'Copy' })}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            )}

            {accountDetails.swift_code && (
              <div className="account-detail-item">
                <label>{t('dashboard.profile.swift_code', { defaultValue: 'SWIFT Code' })}</label>
                <div className="detail-value-with-copy">
                  <span>{accountDetails.swift_code}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(accountDetails.swift_code)}
                    title={t('dashboard.copy', { defaultValue: 'Copy' })}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            )}

            {accountDetails.beneficiary_name && (
              <div className="account-detail-item">
                <label>{t('dashboard.profile.beneficiary_name', { defaultValue: 'Beneficiary Name' })}</label>
                <div className="detail-value-with-copy">
                  <span>{i18n.language === 'ar' ? accountDetails.beneficiary_name : accountDetails.beneficiary_name_en}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => copyToClipboard(i18n.language === 'ar' ? accountDetails.beneficiary_name : accountDetails.beneficiary_name_en)}
                    title={t('dashboard.copy', { defaultValue: 'Copy' })}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetailsCollapsible;
