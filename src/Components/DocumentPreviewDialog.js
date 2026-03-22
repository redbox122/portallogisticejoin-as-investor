import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../Css/components/document-preview-dialog.css';

const DocumentPreviewDialog = ({ 
  file, 
  docType, 
  onAccept, 
  onCancel,
  isUploading = false 
}) => {
  const { t, i18n } = useTranslation(['common']);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const getDocLabel = () => {
    if (docType === 'iban_doc') {
      return i18n.language === 'ar' 
        ? t('dashboard.profile_completion.iban_doc', { defaultValue: 'مستند IBAN' })
        : t('dashboard.profile_completion.iban_doc', { defaultValue: 'IBAN Document' });
    }
    return i18n.language === 'ar'
      ? t('dashboard.profile_completion.national_address_doc', { defaultValue: 'مستند العنوان الوطني' })
      : t('dashboard.profile_completion.national_address_doc', { defaultValue: 'National Address Document' });
  };

  const isImage = file && file.type.startsWith('image/');
  const isPDF = file && file.type === 'application/pdf';

  return (
    <div className="document-preview-overlay" onClick={onCancel}>
      <div className="document-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="document-preview-header">
          <h3>{getDocLabel()}</h3>
          <button className="document-preview-close" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="document-preview-body">
          <div className="document-preview-content">
            {previewUrl && isImage && (
              <img src={previewUrl} alt="Document preview" className="document-preview-image" />
            )}
            {previewUrl && isPDF && (
              <div className="document-preview-pdf">
                <iframe 
                  src={previewUrl} 
                  className="document-preview-iframe"
                  title="PDF preview"
                />
              </div>
            )}
            {!previewUrl && (
              <div className="document-preview-placeholder">
                <i className="fas fa-file-alt"></i>
                <p>{t('dashboard.documents.loading_preview', { defaultValue: 'Loading preview...' })}</p>
              </div>
            )}
          </div>
          <div className="document-preview-info">
            <div className="document-preview-file-info">
              <i className="fas fa-file"></i>
              <div>
                <p className="file-name">{file?.name}</p>
                <p className="file-size">
                  {(file?.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="document-preview-actions">
          <button 
            className="document-preview-btn change-btn" 
            onClick={onCancel}
            disabled={isUploading}
          >
            <i className="fas fa-exchange-alt"></i>
            {t('dashboard.documents.change_file', { defaultValue: 'Change File' })}
          </button>
          <button 
            className="document-preview-btn accept-btn" 
            onClick={onAccept}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {t('dashboard.uploading', { defaultValue: 'Uploading...' })}
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                {t('dashboard.documents.accept_upload', { defaultValue: 'Accept & Upload' })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewDialog;
