import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Watch } from 'react-loader-spinner';
import '../Css/components/document-processing-dialog.css';

const DocumentProcessingDialog = ({ 
  isOpen, 
  onCancel,
  fileName 
}) => {
  const { t, i18n } = useTranslation(['common']);
  const lang = i18n.language;
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = [
    {
      key: 'uploading',
      labelAr: 'رفع الملف...',
      labelEn: 'Uploading file...',
      progress: 30
    },
    {
      key: 'extracting',
      labelAr: 'استخراج البيانات...',
      labelEn: 'Extracting data...',
      progress: 70
    },
    {
      key: 'comparing',
      labelAr: 'مقارنة مع الملف الشخصي...',
      labelEn: 'Comparing with profile...',
      progress: 90
    },
    {
      key: 'finalizing',
      labelAr: 'الإنهاء...',
      labelEn: 'Finalizing...',
      progress: 100
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStage(0);
      setProgress(0);
      return;
    }

    // Simulate progress through stages
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev >= stages.length - 1) {
          clearInterval(stageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000); // Move to next stage every 2 seconds

    // Simulate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const targetProgress = stages[currentStage]?.progress || 100;
        if (prev >= targetProgress) {
          return prev;
        }
        // Increment by 2% every 100ms
        return Math.min(prev + 2, targetProgress);
      });
    }, 100);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen, currentStage]);

  if (!isOpen) return null;

  return (
    <div className="document-processing-overlay">
      <div className="document-processing-modal">
        <div className="processing-header">
          <h3>
            {lang === 'ar' ? 'معالجة المستند' : 'Processing Document'}
          </h3>
        </div>
        
        <div className="processing-body">
          <div className="processing-icon">
            <Watch
              height="60"
              width="60"
              radius="48"
              color="#073491"
              ariaLabel="processing"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
          </div>

          {fileName && (
            <div className="processing-file-name">
              <i className="fas fa-file"></i>
              <span>{fileName}</span>
            </div>
          )}

          <div className="processing-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-percentage">{Math.round(progress)}%</div>
          </div>

          <div className="processing-stages">
            {stages.map((stage, index) => {
              const isActive = index === currentStage;
              const isCompleted = index < currentStage;
              
              return (
                <div 
                  key={stage.key}
                  className={`processing-stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="stage-icon">
                    {isCompleted ? (
                      <i className="fas fa-check-circle"></i>
                    ) : isActive ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-circle"></i>
                    )}
                  </div>
                  <div className="stage-label">
                    {lang === 'ar' ? stage.labelAr : stage.labelEn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onCancel && (
          <div className="processing-footer">
            <button 
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProcessingDialog;
