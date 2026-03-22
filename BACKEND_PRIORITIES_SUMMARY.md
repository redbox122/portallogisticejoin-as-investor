# Backend Team Priorities - Portal Logistics

**Date:** January 2025  
**Urgency:** CRITICAL - Frontend team waiting to start  
**Focus:** Document Upload System (IBAN, National ID, Receipts)

---

## 🎯 Priority 1: Document Upload System (Week 1) - START HERE

### Database Changes

```sql
-- 1. Create documents table
CREATE TABLE portal_logistice_documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    national_id VARCHAR(191) NOT NULL,
    contract_id BIGINT NULL,
    type ENUM('iban_doc', 'national_address_doc', 'receipt') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NULL,
    mime_type VARCHAR(100) NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewer_id BIGINT NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_national_id (national_id),
    INDEX idx_contract_id (contract_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
);

-- 2. Add optional columns to portal_logistices (for backward compatibility)
ALTER TABLE portal_logistices 
ADD COLUMN iban_document_path VARCHAR(500) NULL,
ADD COLUMN national_address_document_path VARCHAR(500) NULL,
ADD COLUMN payment_receipt_path VARCHAR(500) NULL;
```

### Endpoints to Build (4 endpoints)

#### 1. POST `/portallogistice/documents/upload`
- **Purpose:** Upload IBAN, National Address, or Receipt document
- **Auth:** Bearer Token (User)
- **Body (FormData):**
  - `type`: "iban_doc" | "national_address_doc" | "receipt"
  - `contract_id`: number (required for receipt, null for IBAN/National Address)
  - `file`: File (PDF, JPG, PNG, max 5MB)
- **Validation:**
  - Only one IBAN doc per user (national_id)
  - Only one National Address doc per user (national_id)
  - Only one receipt per contract
- **Response:**
```json
{
  "success": true,
  "message": "تم رفع المستند بنجاح",
  "data": {
    "document": {
      "id": 1,
      "type": "iban_doc",
      "status": "pending",
      "file_path": "/storage/documents/iban_1234567890.pdf",
      "uploaded_at": "2025-01-16 10:00:00"
    }
  }
}
```

#### 2. GET `/portallogistice/documents`
- **Purpose:** Get all user documents
- **Auth:** Bearer Token (User)
- **Query Params:** `type` (optional), `status` (optional)
- **Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "type": "iban_doc",
        "status": "pending",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "file_name": "iban_document.pdf",
        "file_size": 245678,
        "uploaded_at": "2025-01-16 10:00:00",
        "reviewed_at": null,
        "rejection_reason": null
      }
    ]
  }
}
```

#### 3. GET `/portallogistice/documents/{id}`
- **Purpose:** Get specific document details
- **Auth:** Bearer Token (User)

#### 4. GET `/portallogistice/documents/{id}/download`
- **Purpose:** Download document file
- **Auth:** Bearer Token (User)
- **Response:** File download

---

## 🎯 Priority 2: Receipt Upload with 48-Hour Deadline (Week 1-2)

### Database Changes

```sql
ALTER TABLE portal_logistices 
ADD COLUMN approved_at TIMESTAMP NULL,
ADD COLUMN receipt_upload_deadline TIMESTAMP NULL,
ADD COLUMN receipt_uploaded_at TIMESTAMP NULL,
ADD COLUMN receipt_upload_status ENUM('pending', 'uploaded', 'overdue') NULL;
```

### Endpoints to Build (2 endpoints)

#### 5. GET `/portallogistice/contracts/{id}/receipt-status`
- **Purpose:** Get receipt upload status and deadline
- **Auth:** Bearer Token (User)
- **Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": 123,
    "can_upload": true,
    "status": "pending",
    "deadline": "2025-01-18 10:00:00",
    "hours_remaining": 24,
    "is_overdue": false,
    "receipt_document_id": null
  }
}
```

#### 6. POST `/portallogistice/contracts/{id}/upload-receipt`
- **Purpose:** Upload receipt (within 48 hours or late)
- **Auth:** Bearer Token (User)
- **Body (FormData):**
  - `file`: File (PDF, JPG, PNG, max 5MB)
- **Validation:**
  - Contract must be approved
  - Only one receipt per contract
  - Allow late uploads but flag as `is_late`
- **Response:**
```json
{
  "success": true,
  "message": "تم رفع الإيصال بنجاح",
  "data": {
    "document": {
      "id": 3,
      "type": "receipt",
      "contract_id": 123,
      "status": "pending",
      "uploaded_at": "2025-01-17 10:00:00",
      "is_late": false
    }
  }
}
```

### Endpoint to Update

#### 7. PUT `/portallogistice/admin/contracts/{id}/status` (UPDATE EXISTING)
- **Current:** Only sets status
- **Required:** When approving (status = 1), also set:
  - `approved_at` = now()
  - `receipt_upload_deadline` = approved_at + 48 hours
  - `receipt_upload_status` = 'pending'

**Code Example:**
```php
if ($request->status == 1) {
    $contract->approved_at = now();
    $contract->receipt_upload_deadline = now()->addHours(48);
    $contract->receipt_upload_status = 'pending';
}
```

---

## 🎯 Priority 3: Admin Document Review (Week 2)

### Endpoints to Build (3 endpoints)

#### 8. GET `/portallogistice/admin/documents`
- **Purpose:** Get all documents for admin review
- **Auth:** Bearer Token (Admin)
- **Query Params:** `type`, `status` (default: pending), `search`, `per_page`, `page`
- **Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "national_id": "1234567890",
        "user_name": "أحمد محمد علي العلي",
        "type": "iban_doc",
        "status": "pending",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "uploaded_at": "2025-01-16 10:00:00",
        "contract_id": null
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 50
    }
  }
}
```

#### 9. PUT `/portallogistice/admin/documents/{id}/approve`
- **Purpose:** Approve document
- **Auth:** Bearer Token (Admin)
- **Response:**
```json
{
  "success": true,
  "message": "تم قبول المستند بنجاح",
  "data": {
    "document": {
      "id": 1,
      "status": "approved",
      "reviewed_at": "2025-01-16 15:00:00",
      "reviewer_id": 1
    }
  }
}
```
- **Logic:**
  - Update document status to 'approved'
  - Set reviewed_at and reviewer_id
  - If IBAN/National Address: Update portal_logistices document paths

#### 10. PUT `/portallogistice/admin/documents/{id}/reject`
- **Purpose:** Reject document with reason
- **Auth:** Bearer Token (Admin)
- **Body:**
```json
{
  "reason": "المستند غير واضح، يرجى إعادة الرفع"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "تم رفض المستند",
  "data": {
    "document": {
      "id": 1,
      "status": "rejected",
      "rejection_reason": "المستند غير واضح، يرجى إعادة الرفع",
      "reviewed_at": "2025-01-16 15:00:00",
      "reviewer_id": 1
    }
  }
}
```

---

## 📋 Summary

### Database Changes:
- ✅ 1 new table: `portal_logistice_documents`
- ✅ 4 new columns: `approved_at`, `receipt_upload_deadline`, `receipt_uploaded_at`, `receipt_upload_status`
- ✅ 3 optional columns: `iban_document_path`, `national_address_document_path`, `payment_receipt_path`

### Endpoints to Build:
- ✅ **Priority 1:** 4 endpoints (document upload/list/download)
- ✅ **Priority 2:** 2 endpoints (receipt status/upload) + 1 endpoint update
- ✅ **Priority 3:** 3 endpoints (admin document review)

**Total:** 10 new endpoints + 1 endpoint update

### File Storage Requirements:
- Set up: `storage/app/public/documents/`
- Configure public access
- Validate: PDF, JPG, PNG (max 5MB)

### Business Rules:
- Only one IBAN document per user
- Only one National Address document per user
- Only one receipt per contract
- 48-hour deadline for receipt upload after contract approval
- Allow late uploads with warning flag

---

## ⏰ Timeline

- **Week 1:** Priority 1 (Document Upload System) - 4 endpoints
- **Week 1-2:** Priority 2 (Receipt Upload) - 2 endpoints + 1 update
- **Week 2:** Priority 3 (Admin Review) - 3 endpoints

**Estimated Time:** 1-2 weeks for all priorities

---

## 🔗 Full Documentation

See `DEVELOPMENT_PRIORITIES.md` for complete specifications and frontend requirements.

---

**Status:** 🔴 URGENT - Frontend team ready to start  
**Last Updated:** January 2025
