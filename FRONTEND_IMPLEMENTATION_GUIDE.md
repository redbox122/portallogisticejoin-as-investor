# Frontend Implementation Guide
## Contractor Info PDF & Data Validation Integration

**Date:** January 16, 2026  
**Status:** 📋 Implementation Plan  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2-3 weeks

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backend Requirements Summary](#backend-requirements-summary)
3. [Implementation Phases](#implementation-phases)
4. [Phase 1: Document Upload Response Handling](#phase-1-document-upload-response-handling)
5. [Phase 2: Data Comparison Modal](#phase-2-data-comparison-modal)
6. [Phase 3: Contractor Info PDF Display](#phase-3-contractor-info-pdf-display)
7. [Phase 4: Notification Type Handling](#phase-4-notification-type-handling)
8. [Phase 5: Translation Keys](#phase-5-translation-keys)
9. [Testing Checklist](#testing-checklist)
10. [File Changes Summary](#file-changes-summary)

---

## Overview

This guide implements the backend features for:
1. **Document Data Validation** - National ID verification and data comparison
2. **Contractor Info PDF** - Auto-generated PDF with bank details
3. **Enhanced Notifications** - New notification types for mismatches

### Key Features to Implement

✅ **National ID Mismatch Handling** - Critical rejection with clear messaging  
✅ **Data Mismatch Warnings** - Non-critical differences with comparison UI  
✅ **Contractor Info PDF Display** - View and download bank details PDF  
✅ **New Notification Types** - Handle `national_id_mismatch` and `data_mismatch`  
✅ **Data Comparison Modal** - Visual comparison of extracted vs existing data

---

## Backend Requirements Summary

### API Response Structure

**Document Upload Success (No Issues):**
```json
{
  "success": true,
  "data": {
    "document": { ... },
    "message": "تم رفع المستند بنجاح"
  }
}
```

**National ID Mismatch (Critical Rejection):**
```json
{
  "success": false,
  "data": {
    "document": {
      "status": "rejected",
      "rejection_reason": "..."
    },
    "comparison": {
      "has_mismatches": true,
      "has_critical_mismatch": true,
      "mismatches": [
        {
          "field": "national_id",
          "current": "1234567890",
          "extracted": "1089163818",
          "critical": true
        }
      ]
    }
  }
}
```

**Data Mismatches (Non-Critical):**
```json
{
  "success": true,
  "data": {
    "document": { "status": "pending" },
    "comparison": {
      "has_mismatches": true,
      "has_critical_mismatch": false,
      "mismatches": [
        {
          "field": "iban",
          "current": "SA7610000095900001439009",
          "extracted": "SA1980000181608010194653",
          "critical": false
        }
      ],
      "matches": ["national_id"]
    }
  }
}
```

**Profile Response (Includes PDF Path):**
```json
{
  "success": true,
  "data": {
    "user": {
      "contractor_info_pdf_path": "contractor-info-pdfs/contractor_info_60_20260116120000.pdf",
      ...
    }
  }
}
```

---

## Implementation Phases

### Timeline Overview

```
Week 1:
├─ Phase 1: Document Upload Response Handling (Days 1-2)
├─ Phase 2: Data Comparison Modal (Days 3-4)
└─ Phase 3: Contractor Info PDF Display (Day 5)

Week 2:
├─ Phase 4: Notification Type Handling (Days 1-2)
├─ Phase 5: Translation Keys (Day 3)
└─ Testing & Polish (Days 4-5)
```

---

## Phase 1: Document Upload Response Handling

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2 days  
**Files to Modify:** 4 files

### Files to Update

1. `src/Pages/Dashboard/ProfilePage.js` (line 198-239)
2. `src/Components/ActionRequiredCard.js` (line 89-133)
3. `src/Pages/Dashboard/ContractsPage.js` (line 144-206)
4. `src/Pages/Dashboard/TasksPage.js` (line 275-367)

### Implementation Steps

#### Step 1.1: Update ProfilePage.js

**Location:** `src/Pages/Dashboard/ProfilePage.js`

**Changes:**
1. Add state for comparison modal
2. Update `handleDocumentUpload` function
3. Add comparison data state

**Code Changes:**

```javascript
// Add to state declarations (around line 25)
const [showComparisonModal, setShowComparisonModal] = useState(false);
const [comparisonData, setComparisonData] = useState(null);
const [documentRejected, setDocumentRejected] = useState(false);

// Replace handleDocumentUpload function (line 198-239)
const handleDocumentUpload = async (type, file, contractId = null) => {
  setUploadingDoc(type);
  setShowPreviewDialog(false);
  try {
    const headers = getAuthHeaders();
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    if (contractId) formData.append('contract_id', contractId);

    const response = await axios.post(
      'https://shellafood.com/api/v1/portallogistice/documents/upload',
      formData,
      { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
    );

    // Handle National ID mismatch (critical rejection)
    if (!response.data?.success && response.data?.data?.comparison?.has_critical_mismatch) {
      const comparison = response.data.data.comparison;
      
      Store.addNotification({
        title: t('dashboard.error.document_rejected'),
        message: response.data.data.message || response.data.data.message_en || 
                 t('dashboard.error.national_id_mismatch'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 10000 }
      });

      // Show comparison modal with rejection
      setShowComparisonModal(true);
      setComparisonData(comparison);
      setDocumentRejected(true);
      return;
    }

    // Handle data mismatches (non-critical warnings)
    if (response.data?.success && response.data?.data?.comparison?.has_mismatches && 
        !response.data?.data?.comparison?.has_critical_mismatch) {
      const comparison = response.data.data.comparison;
      
      Store.addNotification({
        title: t('dashboard.warning.data_mismatches'),
        message: response.data.data.message || response.data.data.message_en || 
                 t('dashboard.warning.data_mismatches_detected'),
        type: 'warning',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 8000 }
      });

      // Show comparison modal for user review
      setShowComparisonModal(true);
      setComparisonData(comparison);
      setDocumentRejected(false);
      
      // Still refresh data (document is pending, not rejected)
      await fetchProfileData();
      return;
    }

    // Success case (no mismatches)
    if (response.data?.success) {
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: response.data.data.message || response.data.message || 
                 t('dashboard.success.document_uploaded'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 }
      });

      // If auto-updated, show additional notification
      if (response.data.data?.comparison?.should_update) {
        Store.addNotification({
          title: t('dashboard.info.profile_updated'),
          message: t('dashboard.info.profile_updated_from_document'),
          type: 'info',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 5000 }
        });
      }

      await fetchProfileData();
      setPreviewFile(null);
      setPreviewDocType(null);
    }
  } catch (error) {
    // Handle network errors or other exceptions
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.data?.message ||
                        error.response?.data?.data?.message_en ||
                        t('dashboard.error.upload_failed');
    
    Store.addNotification({
      title: t('dashboard.error.title'),
      message: errorMessage,
      type: 'danger',
      insert: 'top',
      container: 'top-right',
      dismiss: { duration: 5000 }
    });
  } finally {
    setUploadingDoc(null);
  }
};

// Add handler functions for comparison modal
const handleUpdateProfileFromComparison = async () => {
  // This will be handled by the comparison modal component
  // For now, just close modal and refresh
  setShowComparisonModal(false);
  setComparisonData(null);
  await fetchProfileData();
};

const handleKeepCurrentData = () => {
  setShowComparisonModal(false);
  setComparisonData(null);
  setDocumentRejected(false);
};
```

**Add to JSX (before closing component):**

```javascript
// Add after DocumentPreviewDialog, before closing return
{showComparisonModal && comparisonData && (
  <DataComparisonModal
    isOpen={showComparisonModal}
    onClose={() => {
      setShowComparisonModal(false);
      setComparisonData(null);
      setDocumentRejected(false);
    }}
    comparison={comparisonData}
    isRejected={documentRejected}
    onUpdateProfile={handleUpdateProfileFromComparison}
    onKeepCurrent={handleKeepCurrentData}
    documentType={previewDocType}
  />
)}
```

#### Step 1.2: Update ActionRequiredCard.js

**Location:** `src/Components/ActionRequiredCard.js`

**Changes:**
- Same pattern as ProfilePage.js
- Add comparison modal state
- Update `handleDocumentUpload` function

**Code Changes:**

```javascript
// Add imports at top
import DataComparisonModal from './DataComparisonModal';

// Add to state (around line 16)
const [showComparisonModal, setShowComparisonModal] = useState(false);
const [comparisonData, setComparisonData] = useState(null);
const [documentRejected, setDocumentRejected] = useState(false);

// Replace handleDocumentUpload function (line 89-133) with same logic as ProfilePage.js
// (Copy the entire function from Step 1.1)

// Add modal to JSX (before closing return)
{showComparisonModal && comparisonData && (
  <DataComparisonModal
    isOpen={showComparisonModal}
    onClose={() => {
      setShowComparisonModal(false);
      setComparisonData(null);
      setDocumentRejected(false);
    }}
    comparison={comparisonData}
    isRejected={documentRejected}
    onUpdateProfile={async () => {
      setShowComparisonModal(false);
      setComparisonData(null);
      if (onRefresh) await onRefresh();
    }}
    onKeepCurrent={() => {
      setShowComparisonModal(false);
      setComparisonData(null);
      setDocumentRejected(false);
    }}
    documentType={previewDocType}
  />
)}
```

#### Step 1.3: Update ContractsPage.js

**Location:** `src/Pages/Dashboard/ContractsPage.js`

**Changes:**
- Update `handleReceiptUpload` function
- Add comparison modal for receipt uploads

**Code Changes:**

```javascript
// Add imports
import DataComparisonModal from '../../Components/DataComparisonModal';

// Add state
const [showComparisonModal, setShowComparisonModal] = useState(false);
const [comparisonData, setComparisonData] = useState(null);
const [documentRejected, setDocumentRejected] = useState(false);

// Update handleReceiptUpload (line 144-206)
const handleReceiptUpload = async (contractId) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,image/jpeg,image/png,image/jpg';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: t('dashboard.error.file_too_large', { defaultValue: 'File size must be less than 5MB' }),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
      return;
    }

    setUploadingReceipt(contractId);
    try {
      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('type', 'receipt');
      formData.append('contract_id', contractId);
      formData.append('file', file);

      const response = await axios.post(
        'https://shellafood.com/api/v1/portallogistice/documents/upload',
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );

      // Handle National ID mismatch (critical rejection)
      if (!response.data?.success && response.data?.data?.comparison?.has_critical_mismatch) {
        const comparison = response.data.data.comparison;
        
        Store.addNotification({
          title: t('dashboard.error.document_rejected'),
          message: response.data.data.message || response.data.data.message_en || 
                   t('dashboard.error.national_id_mismatch'),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 10000 }
        });

        setShowComparisonModal(true);
        setComparisonData(comparison);
        setDocumentRejected(true);
        return;
      }

      // Handle data mismatches (non-critical)
      if (response.data?.success && response.data?.data?.comparison?.has_mismatches && 
          !response.data?.data?.comparison?.has_critical_mismatch) {
        const comparison = response.data.data.comparison;
        
        Store.addNotification({
          title: t('dashboard.warning.data_mismatches'),
          message: response.data.data.message || response.data.data.message_en || 
                   t('dashboard.warning.data_mismatches_detected'),
          type: 'warning',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 8000 }
        });

        setShowComparisonModal(true);
        setComparisonData(comparison);
        setDocumentRejected(false);
        await fetchData();
        return;
      }

      // Success case
      if (response.data?.success) {
        Store.addNotification({
          title: t('dashboard.success.title'),
          message: response.data.data.message || response.data.message || 
                   t('dashboard.success.receipt_uploaded', { defaultValue: 'Receipt uploaded successfully' }),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000 }
        });

        await fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.data?.message ||
                          error.response?.data?.data?.message_en ||
                          t('dashboard.error.upload_failed');
      
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    } finally {
      setUploadingReceipt(null);
    }
  };
  input.click();
};

// Add modal to JSX (before closing return)
{showComparisonModal && comparisonData && (
  <DataComparisonModal
    isOpen={showComparisonModal}
    onClose={() => {
      setShowComparisonModal(false);
      setComparisonData(null);
      setDocumentRejected(false);
    }}
    comparison={comparisonData}
    isRejected={documentRejected}
    onUpdateProfile={async () => {
      setShowComparisonModal(false);
      setComparisonData(null);
      await fetchData();
    }}
    onKeepCurrent={() => {
      setShowComparisonModal(false);
      setComparisonData(null);
      setDocumentRejected(false);
    }}
    documentType="receipt"
  />
)}
```

#### Step 1.4: Update TasksPage.js

**Location:** `src/Pages/Dashboard/TasksPage.js`

**Changes:**
- Update `handleReceiptUpload` function (same pattern as ContractsPage.js)
- Add comparison modal state and handlers

**Implementation:** Same as Step 1.3, but in TasksPage.js context

---

## Phase 2: Data Comparison Modal

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2 days  
**Files to Create:** 1 new file

### Step 2.1: Create DataComparisonModal Component

**New File:** `src/Components/DataComparisonModal.js`

**Complete Component Code:**

```javascript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'react-notifications-component';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import '../Css/components/data-comparison-modal.css';

const DataComparisonModal = ({ 
  isOpen, 
  onClose, 
  comparison, 
  isRejected,
  onUpdateProfile,
  onKeepCurrent,
  documentType
}) => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const lang = i18n.language;

  if (!isOpen || !comparison) return null;

  const getFieldName = (field) => {
    const fieldNames = {
      ar: {
        national_id: 'رقم الهوية الوطنية',
        iban: 'رقم الآيبان',
        bank_name: 'اسم البنك',
        account_number: 'رقم الحساب',
        full_name: 'الاسم الكامل',
        city: 'المدينة',
        postal_code: 'الرمز البريدي',
        street: 'الشارع',
        building_number: 'رقم المبنى',
        secondary_number: 'الرقم الثانوي',
        district: 'الحي',
        email: 'البريد الإلكتروني',
        national_address_email: 'بريد العنوان الوطني'
      },
      en: {
        national_id: 'National ID',
        iban: 'IBAN',
        bank_name: 'Bank Name',
        account_number: 'Account Number',
        full_name: 'Full Name',
        city: 'City',
        postal_code: 'Postal Code',
        street: 'Street',
        building_number: 'Building Number',
        secondary_number: 'Secondary Number',
        district: 'District',
        email: 'Email',
        national_address_email: 'National Address Email'
      }
    };
    return fieldNames[lang]?.[field] || field;
  };

  const handleUpdateProfile = async () => {
    try {
      // If there are non-critical mismatches, we can update profile
      // This would typically call an API endpoint to update profile with extracted data
      // For now, we'll just close and refresh
      if (onUpdateProfile) {
        await onUpdateProfile();
      }
      
      Store.addNotification({
        title: t('dashboard.success.title'),
        message: t('dashboard.success.profile_updated'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 3000 }
      });
    } catch (error) {
      Store.addNotification({
        title: t('dashboard.error.title'),
        message: error.response?.data?.message || t('dashboard.error.update_failed'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
    }
  };

  const handleReupload = () => {
    onClose();
    // Trigger file input for re-upload
    // This will be handled by parent component
  };

  return (
    <div className="modal-overlay data-comparison-overlay" onClick={onClose}>
      <div className="modal-content data-comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {isRejected 
              ? (lang === 'ar' ? 'رفض المستند' : 'Document Rejected')
              : (lang === 'ar' ? 'مقارنة البيانات' : 'Data Comparison')
            }
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {isRejected && (
            <div className="alert alert-danger comparison-alert">
              <i className="fas fa-exclamation-triangle"></i>
              <div>
                <strong>
                  {lang === 'ar' 
                    ? 'تم رفض المستند بسبب عدم تطابق رقم الهوية الوطنية'
                    : 'Document rejected due to National ID mismatch'
                  }
                </strong>
                <p>
                  {lang === 'ar'
                    ? 'رقم الهوية الوطنية في المستند لا يطابق رقم الهوية المسجل في حسابك. يرجى رفع مستند صحيح.'
                    : 'The National ID in the document does not match your registered National ID. Please upload a correct document.'
                  }
                </p>
              </div>
            </div>
          )}

          {!isRejected && comparison.has_mismatches && (
            <div className="alert alert-warning comparison-alert">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>
                  {lang === 'ar' 
                    ? 'تم اكتشاف اختلافات في البيانات'
                    : 'Data mismatches detected'
                  }
                </strong>
                <p>
                  {lang === 'ar'
                    ? 'بعض البيانات المستخرجة من المستند تختلف عن البيانات المسجلة في ملفك الشخصي. يمكنك مراجعة الاختلافات أدناه وتحديث ملفك الشخصي.'
                    : 'Some data extracted from the document differs from your registered profile data. You can review the differences below and update your profile.'
                  }
                </p>
              </div>
            </div>
          )}

          {comparison.mismatches && comparison.mismatches.length > 0 && (
            <div className="comparison-section">
              <h4>
                <i className="fas fa-exclamation-circle"></i>
                {lang === 'ar' ? 'الاختلافات المكتشفة' : 'Detected Mismatches'}
              </h4>
              <div className="comparison-table-container">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>{lang === 'ar' ? 'الحقل' : 'Field'}</th>
                      <th>{lang === 'ar' ? 'القيمة الحالية' : 'Current Value'}</th>
                      <th>{lang === 'ar' ? 'القيمة المستخرجة' : 'Extracted Value'}</th>
                      <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.mismatches.map((mismatch, index) => (
                      <tr key={index} className={mismatch.critical ? 'critical-row' : 'warning-row'}>
                        <td className="field-name">
                          <strong>{getFieldName(mismatch.field)}</strong>
                        </td>
                        <td className="current-value">
                          {mismatch.current || <span className="empty-value">-</span>}
                        </td>
                        <td className="extracted-value">
                          {mismatch.extracted || <span className="empty-value">-</span>}
                        </td>
                        <td className="status-cell">
                          {mismatch.critical ? (
                            <span className="badge badge-danger">
                              <i className="fas fa-times-circle"></i>
                              {lang === 'ar' ? 'حرج' : 'Critical'}
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              <i className="fas fa-exclamation-triangle"></i>
                              {lang === 'ar' ? 'تحذير' : 'Warning'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {comparison.matches && comparison.matches.length > 0 && (
            <div className="comparison-section">
              <h4>
                <i className="fas fa-check-circle"></i>
                {lang === 'ar' ? 'الحقول المتطابقة' : 'Matching Fields'}
              </h4>
              <div className="matches-list">
                {comparison.matches.map((field, index) => (
                  <div key={index} className="match-item">
                    <i className="fas fa-check-circle text-success"></i>
                    <span>{getFieldName(field)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isRejected ? (
            <button className="btn btn-primary" onClick={handleReupload}>
              <i className="fas fa-upload"></i>
              {lang === 'ar' ? 'إعادة رفع المستند' : 'Re-upload Document'}
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onKeepCurrent}>
                <i className="fas fa-times"></i>
                {lang === 'ar' ? 'الاحتفاظ بالبيانات الحالية' : 'Keep Current Data'}
              </button>
              {comparison.has_mismatches && !comparison.has_critical_mismatch && (
                <button className="btn btn-primary" onClick={handleUpdateProfile}>
                  <i className="fas fa-sync-alt"></i>
                  {lang === 'ar' ? 'تحديث الملف الشخصي' : 'Update Profile'}
                </button>
              )}
            </>
          )}
          <button className="btn btn-outline" onClick={onClose}>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataComparisonModal;
```

### Step 2.2: Create CSS File

**New File:** `src/Css/components/data-comparison-modal.css`

```css
.data-comparison-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.data-comparison-modal {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.data-comparison-modal .modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
}

.data-comparison-modal .modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.data-comparison-modal .modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.data-comparison-modal .modal-close:hover {
  background: #e5e7eb;
  color: #111827;
}

.data-comparison-modal .modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.comparison-alert {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.comparison-alert.alert-danger {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.comparison-alert.alert-warning {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.comparison-alert i {
  font-size: 20px;
  margin-top: 2px;
}

.comparison-alert strong {
  display: block;
  margin-bottom: 4px;
}

.comparison-section {
  margin-bottom: 24px;
}

.comparison-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comparison-table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.comparison-table thead {
  background: #f9fafb;
}

.comparison-table th {
  padding: 12px 16px;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.comparison-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.comparison-table tr:last-child td {
  border-bottom: none;
}

.comparison-table .critical-row {
  background: #fee2e2;
}

.comparison-table .warning-row {
  background: #fef3c7;
}

.comparison-table .field-name {
  font-weight: 500;
  color: #111827;
}

.comparison-table .current-value,
.comparison-table .extracted-value {
  color: #374151;
  word-break: break-word;
}

.comparison-table .empty-value {
  color: #9ca3af;
  font-style: italic;
}

.comparison-table .status-cell {
  text-align: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.matches-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 6px;
  color: #166534;
  font-size: 14px;
}

.match-item i {
  color: #22c55e;
}

.text-success {
  color: #22c55e;
}

.data-comparison-modal .modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f9fafb;
}

.data-comparison-modal .btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.data-comparison-modal .btn-primary {
  background: #073491;
  color: white;
}

.data-comparison-modal .btn-primary:hover {
  background: #052a6e;
}

.data-comparison-modal .btn-secondary {
  background: #6b7280;
  color: white;
}

.data-comparison-modal .btn-secondary:hover {
  background: #4b5563;
}

.data-comparison-modal .btn-outline {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.data-comparison-modal .btn-outline:hover {
  background: #f9fafb;
}

/* RTL Support */
[dir="rtl"] .comparison-table th,
[dir="rtl"] .comparison-table td {
  text-align: right;
}

[dir="ltr"] .comparison-table th,
[dir="ltr"] .comparison-table td {
  text-align: left;
}
```

---

## Phase 3: Contractor Info PDF Display

**Priority:** 🟡 HIGH  
**Estimated Time:** 1 day  
**Files to Modify:** 2 files

### Step 3.1: Update ContractsPage.js

**Location:** `src/Pages/Dashboard/ContractsPage.js`

**Changes:**
1. Add PDF viewer state
2. Add PDF display section in contract details
3. Add PDF download/view functionality

**Code Changes:**

```javascript
// Add state (around line 20)
const [showPDFModal, setShowPDFModal] = useState(false);
const [pdfUrl, setPdfUrl] = useState(null);

// Add function to get PDF URL
const getPDFUrl = (pdfPath) => {
  if (!pdfPath) return null;
  // Remove 'storage/' prefix if present, backend returns full path
  const cleanPath = pdfPath.startsWith('storage/') ? pdfPath : `storage/${pdfPath}`;
  return `https://shellafood.com/${cleanPath}`;
};

// Add PDF viewer component in JSX (in contract details section)
{contract.approved && profile?.contractor_info_pdf_path && (
  <div className="contractor-info-pdf-section" style={{
    marginTop: '24px',
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <i className="fas fa-file-pdf" style={{ fontSize: '24px', color: '#ef4444' }}></i>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
        {t('dashboard.contracts.bank_details')}
      </h3>
    </div>
    
    <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
      {t('dashboard.contracts.bank_details_description')}
    </p>
    
    <div className="pdf-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button 
        className="btn btn-primary"
        onClick={() => {
          const url = getPDFUrl(profile.contractor_info_pdf_path);
          window.open(url, '_blank');
        }}
        style={{
          padding: '10px 20px',
          background: '#073491',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        <i className="fas fa-download"></i>
        {t('dashboard.contracts.download_pdf')}
      </button>
      
      <button 
        className="btn btn-secondary"
        onClick={() => {
          setPdfUrl(getPDFUrl(profile.contractor_info_pdf_path));
          setShowPDFModal(true);
        }}
        style={{
          padding: '10px 20px',
          background: 'white',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        <i className="fas fa-eye"></i>
        {t('dashboard.contracts.view_pdf')}
      </button>
    </div>
  </div>
)}

// Add PDF viewer modal (before closing return)
{showPDFModal && pdfUrl && (
  <div className="modal-overlay" onClick={() => setShowPDFModal(false)}>
    <div className="modal-content pdf-viewer-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{t('dashboard.contracts.bank_details')}</h3>
        <button className="modal-close" onClick={() => setShowPDFModal(false)}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="modal-body" style={{ padding: 0, height: '80vh' }}>
        <iframe 
          src={pdfUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Contractor Info PDF"
        />
      </div>
      <div className="modal-footer">
        <button 
          className="btn btn-primary"
          onClick={() => window.open(pdfUrl, '_blank')}
        >
          <i className="fas fa-download"></i>
          {t('dashboard.contracts.download_pdf')}
        </button>
        <button 
          className="btn btn-outline"
          onClick={() => setShowPDFModal(false)}
        >
          {t('dashboard.contracts.close')}
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 3.2: Update ProfilePage.js

**Location:** `src/Pages/Dashboard/ProfilePage.js`

**Changes:**
- Add PDF display section if PDF exists
- Show notification badge when PDF is ready

**Code Changes:**

```javascript
// Add to profile display section (after account details)
{profile?.contractor_info_pdf_path && (
  <div className="contractor-info-pdf-section" style={{
    marginTop: '24px',
    padding: '20px',
    background: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <i className="fas fa-file-pdf" style={{ fontSize: '24px', color: '#ef4444' }}></i>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
        {t('dashboard.profile.contractor_info_pdf')}
      </h3>
    </div>
    
    <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
      {t('dashboard.profile.contractor_info_pdf_description')}
    </p>
    
    <button 
      className="btn btn-primary"
      onClick={() => {
        const url = `https://shellafood.com/storage/${profile.contractor_info_pdf_path}`;
        window.open(url, '_blank');
      }}
    >
      <i className="fas fa-download"></i>
      {t('dashboard.profile.download_pdf')}
    </button>
  </div>
)}
```

---

## Phase 4: Notification Type Handling

**Priority:** 🟡 HIGH  
**Estimated Time:** 2 days  
**Files to Modify:** 1 file

### Step 4.1: Update TasksPage.js

**Location:** `src/Pages/Dashboard/TasksPage.js`

**Changes:**
- Add handlers for `national_id_mismatch` and `data_mismatch` notification types
- Add UI components for these notification types

**Code Changes:**

```javascript
// Add to notification type icons (around line 27)
const getNotificationIcon = (type) => {
  const icons = {
    // ... existing icons ...
    national_id_mismatch: 'fa-id-card',
    data_mismatch: 'fa-exclamation-triangle',
    // ... rest of icons ...
  };
  return icons[type] || 'fa-bell';
};

// Add to notification rendering (in urgent tasks section, around line 726)
{task.type === 'national_id_mismatch' && (
  <div className="alert alert-danger" style={{
    marginTop: '12px',
    padding: '12px',
    background: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '6px'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '2px' }}></i>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '4px', color: '#991b1b' }}>
          {getLocalizedText(task, 'title')}
        </strong>
        <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
          {getLocalizedText(task, 'description')}
        </p>
        {task.rejection_reason && (
          <p style={{ margin: '8px 0 0 0', color: '#991b1b', fontSize: '13px', fontStyle: 'italic' }}>
            {task.rejection_reason}
          </p>
        )}
        <button 
          className="btn btn-primary"
          onClick={() => handleDocumentReupload(task.doc_type)}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <i className="fas fa-upload"></i>
          {t('dashboard.tasks.reupload_document')}
        </button>
      </div>
    </div>
  </div>
)}

{task.type === 'data_mismatch' && (
  <div className="alert alert-warning" style={{
    marginTop: '12px',
    padding: '12px',
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <i className="fas fa-info-circle" style={{ color: '#f59e0b', marginTop: '2px' }}></i>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '4px', color: '#92400e' }}>
          {getLocalizedText(task, 'title')}
        </strong>
        <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
          {getLocalizedText(task, 'description')}
        </p>
        <button 
          className="btn btn-secondary"
          onClick={() => handleReviewDataMismatch(task)}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <i className="fas fa-eye"></i>
          {t('dashboard.tasks.review_data')}
        </button>
      </div>
    </div>
  </div>
)}

// Add handler functions
const handleDocumentReupload = (docType) => {
  // Navigate to profile page and trigger document upload
  window.location.href = '/dashboard/profile';
  // Or trigger file input programmatically
  setTimeout(() => {
    const input = document.getElementById(`${docType}-doc`);
    if (input) input.click();
  }, 500);
};

const handleReviewDataMismatch = (task) => {
  // Navigate to profile page to review data
  window.location.href = '/dashboard/profile';
  // Could also open comparison modal if we have the comparison data
};
```

---

## Phase 5: Translation Keys

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 1 day  
**Files to Modify:** 2 files

### Step 5.1: Update Arabic Translations

**File:** `src/i18n/locales/ar/common.json`

**Add to `dashboard` section:**

```json
{
  "dashboard": {
    "error": {
      "document_rejected": "تم رفض المستند",
      "national_id_mismatch": "عدم تطابق رقم الهوية الوطنية",
      "upload_failed": "فشل رفع المستند",
      "update_failed": "فشل تحديث الملف الشخصي"
    },
    "warning": {
      "data_mismatches": "تم اكتشاف اختلافات في البيانات",
      "data_mismatches_detected": "تم اكتشاف اختلافات في البيانات - يرجى المراجعة"
    },
    "info": {
      "profile_updated": "تم تحديث الملف الشخصي",
      "profile_updated_from_document": "تم تحديث ملفك الشخصي بناءً على البيانات المستخرجة من المستند"
    },
    "contracts": {
      "bank_details": "تفاصيل البنك للتحويل",
      "bank_details_description": "استخدم التفاصيل أدناه لإرسال تحويلك البنكي. قم بتحميل ملف PDF للحصول على المعلومات الكاملة.",
      "download_pdf": "تحميل PDF",
      "view_pdf": "عرض PDF",
      "close": "إغلاق"
    },
    "profile": {
      "contractor_info_pdf": "معلومات المتعاقد",
      "contractor_info_pdf_description": "ملف PDF يحتوي على تفاصيل البنك والتحويلات المطلوبة",
      "download_pdf": "تحميل PDF"
    },
    "tasks": {
      "reupload_document": "إعادة رفع المستند",
      "review_data": "مراجعة البيانات"
    }
  }
}
```

### Step 5.2: Update English Translations

**File:** `src/i18n/locales/en/common.json`

**Add same structure with English translations:**

```json
{
  "dashboard": {
    "error": {
      "document_rejected": "Document Rejected",
      "national_id_mismatch": "National ID Mismatch",
      "upload_failed": "Upload Failed",
      "update_failed": "Update Failed"
    },
    "warning": {
      "data_mismatches": "Data Mismatches Detected",
      "data_mismatches_detected": "Data mismatches detected - please review"
    },
    "info": {
      "profile_updated": "Profile Updated",
      "profile_updated_from_document": "Your profile has been updated based on data extracted from the document"
    },
    "contracts": {
      "bank_details": "Bank Details for Wire Transfer",
      "bank_details_description": "Use the details below to send your wire transfer. Download the PDF for complete information.",
      "download_pdf": "Download PDF",
      "view_pdf": "View PDF",
      "close": "Close"
    },
    "profile": {
      "contractor_info_pdf": "Contractor Information",
      "contractor_info_pdf_description": "PDF file containing bank and transfer details",
      "download_pdf": "Download PDF"
    },
    "tasks": {
      "reupload_document": "Re-upload Document",
      "review_data": "Review Data"
    }
  }
}
```

---

## Testing Checklist

### Phase 1 Testing: Document Upload

- [ ] **Test National ID Mismatch (Critical)**
  - [ ] Upload IBAN document with different National ID
  - [ ] Verify error notification appears
  - [ ] Verify comparison modal shows with rejection
  - [ ] Verify document status is "rejected"
  - [ ] Verify user can re-upload

- [ ] **Test Data Mismatches (Non-Critical)**
  - [ ] Upload IBAN document with different IBAN but same National ID
  - [ ] Verify warning notification appears
  - [ ] Verify comparison modal shows mismatches
  - [ ] Verify document status is "pending"
  - [ ] Test "Keep Current Data" button
  - [ ] Test "Update Profile" button

- [ ] **Test Perfect Match**
  - [ ] Upload document with matching data
  - [ ] Verify success notification
  - [ ] Verify profile auto-updates (if applicable)
  - [ ] Verify no comparison modal appears

### Phase 2 Testing: Comparison Modal

- [ ] **Modal Display**
  - [ ] Modal opens on National ID mismatch
  - [ ] Modal opens on data mismatches
  - [ ] Modal shows correct field names (Arabic/English)
  - [ ] Modal shows current vs extracted values
  - [ ] Modal shows match list (if applicable)
  - [ ] Modal closes on overlay click
  - [ ] Modal closes on close button

- [ ] **Modal Actions**
  - [ ] "Re-upload Document" button works (rejected case)
  - [ ] "Keep Current Data" button works
  - [ ] "Update Profile" button works
  - [ ] All buttons have proper styling

### Phase 3 Testing: Contractor Info PDF

- [ ] **PDF Display**
  - [ ] PDF section appears when `contractor_info_pdf_path` exists
  - [ ] PDF section shows correct title and description
  - [ ] Download button works
  - [ ] View button opens PDF in modal
  - [ ] PDF modal displays correctly
  - [ ] PDF modal closes properly

- [ ] **PDF in Profile Page**
  - [ ] PDF section appears in profile (if applicable)
  - [ ] Download button works

### Phase 4 Testing: Notifications

- [ ] **Notification Types**
  - [ ] `national_id_mismatch` notification displays correctly
  - [ ] `data_mismatch` notification displays correctly
  - [ ] Notification icons are correct
  - [ ] Notification colors are correct (red for critical, yellow for warning)
  - [ ] Action buttons work

- [ ] **Notification Actions**
  - [ ] "Re-upload Document" navigates correctly
  - [ ] "Review Data" navigates correctly

### Integration Testing

- [ ] **End-to-End Flow**
  - [ ] Upload document → See comparison → Update profile → Verify changes
  - [ ] Upload document → National ID mismatch → Re-upload → Success
  - [ ] Contract approved → PDF generated → PDF visible in contract details
  - [ ] Notification received → Click action → Correct page opens

### Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Responsive Testing

- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)

---

## File Changes Summary

### New Files (2)
1. `src/Components/DataComparisonModal.js` - Comparison modal component
2. `src/Css/components/data-comparison-modal.css` - Modal styles

### Modified Files (6)
1. `src/Pages/Dashboard/ProfilePage.js` - Document upload handling
2. `src/Components/ActionRequiredCard.js` - Document upload handling
3. `src/Pages/Dashboard/ContractsPage.js` - Receipt upload + PDF display
4. `src/Pages/Dashboard/TasksPage.js` - Receipt upload + notification types
5. `src/i18n/locales/ar/common.json` - Arabic translations
6. `src/i18n/locales/en/common.json` - English translations

### Total Lines of Code
- **New Code:** ~800 lines
- **Modified Code:** ~400 lines
- **Total:** ~1200 lines

---

## Implementation Timeline

### Week 1

**Day 1-2: Phase 1 (Document Upload Response Handling)**
- Morning: Update ProfilePage.js
- Afternoon: Update ActionRequiredCard.js
- Next Day: Update ContractsPage.js and TasksPage.js

**Day 3-4: Phase 2 (Data Comparison Modal)**
- Morning: Create DataComparisonModal.js component
- Afternoon: Create CSS file
- Next Day: Test and refine

**Day 5: Phase 3 (Contractor Info PDF)**
- Morning: Add PDF display to ContractsPage.js
- Afternoon: Add PDF display to ProfilePage.js
- Test PDF viewing and downloading

### Week 2

**Day 1-2: Phase 4 (Notification Type Handling)**
- Update TasksPage.js with new notification types
- Add handlers and UI components
- Test notification display

**Day 3: Phase 5 (Translation Keys)**
- Add all translation keys
- Test Arabic and English translations

**Day 4-5: Testing & Polish**
- Run through all test cases
- Fix bugs and edge cases
- Polish UI/UX
- Code review

---

## Risk Assessment

### High Risk
- **API Response Structure Changes** - Backend might change response format
  - **Mitigation:** Test with actual backend responses early

### Medium Risk
- **PDF Path Format** - Backend might return different path format
  - **Mitigation:** Add path normalization function

### Low Risk
- **Translation Keys** - Easy to add/update
- **CSS Styling** - Can be adjusted easily

---

## Success Criteria

✅ **All document upload scenarios handled correctly**  
✅ **Comparison modal displays and functions properly**  
✅ **Contractor Info PDF displays and downloads correctly**  
✅ **New notification types display correctly**  
✅ **All translations work in Arabic and English**  
✅ **No console errors or warnings**  
✅ **Responsive design works on all devices**  
✅ **All test cases pass**

---

## Post-Implementation

### Documentation Updates
- [ ] Update COMPLETE_UX_FLOW_DOCUMENTATION.md
- [ ] Update API_REQUIREMENTS_FOR_FRONTEND.md
- [ ] Create user guide for new features

### Monitoring
- [ ] Monitor error logs for document upload issues
- [ ] Track PDF download/view metrics
- [ ] Monitor notification interaction rates

---

**Status:** 📋 Ready for Implementation  
**Last Updated:** January 16, 2026  
**Next Review:** After Phase 1 completion
