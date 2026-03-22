# Backend Priority 1: Core Contract & Document Workflow

**Date:** January 9, 2026  
**Project:** Portal Logistics - Core User Workflow  
**Purpose:** Essential endpoints needed for users to create contracts, upload documents, and receive admin feedback

---

## 🎯 Core Workflow

```
1. User creates contract (selling) ✅ EXISTS
2. User uploads IBAN document ❌ NEEDED
3. User uploads National Address document ❌ NEEDED
4. Admin approves contract ✅ EXISTS (but needs enhancement)
5. User uploads wire receipt (within 48 hours) ❌ NEEDED
6. Admin reviews documents and approves/rejects ❌ NEEDED
7. User receives notification about document status ❌ NEEDED
```

---

## 🔴 Priority 1 Endpoints (Must Have - Week 1)

### 1. Document Upload System (3 endpoints)

#### **POST /portallogistice/documents/upload** ⭐ CRITICAL
- **Purpose:** Upload IBAN, National Address, or Receipt documents
- **Request:** Multipart form data
  - `type`: `iban_doc` | `national_address_doc` | `receipt`
  - `contract_id`: (required for receipts, null for IBAN/National Address)
  - `file`: Binary file (PDF or image)
- **Validation:**
  - File type: PDF, JPEG, PNG only
  - File size: Max 5MB
  - For IBAN/National Address: Check if already exists (can re-upload if rejected)
  - For Receipt: Check if contract is approved and within 48 hours
- **Database:**
  - Insert into `portal_logistice_documents` table
  - If IBAN doc: Update `portal_logistice_users.iban_document_path`
  - If National Address doc: Update `portal_logistice_users.national_address_document_path`
  - If Receipt: Update `portal_logistices.payment_receipt_path` and `receipt_uploaded_at`
- **File Storage:**
  - Save to: `storage/app/public/documents/{type}_{user_id}_{timestamp}.{ext}`
  - Generate public URL: `/storage/documents/{filename}`
- **Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": 1,
      "type": "iban_doc",
      "file_path": "/storage/documents/iban_doc_24_1234567890.pdf",
      "file_name": "iban_document.pdf",
      "file_size": 245760,
      "status": "pending",
      "uploaded_at": "2026-01-09 12:00:00",
      "file_url": "https://shellafood.com/storage/documents/iban_doc_24_1234567890.pdf"
    }
  },
  "message": "تم رفع المستند بنجاح. سيتم مراجعته قريباً."
}
```

#### **GET /portallogistice/documents** ⭐ CRITICAL
- **Purpose:** Get all user documents with status
- **Query Params:** 
  - `type` (optional): Filter by type
  - `status` (optional): Filter by status
- **Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "type": "iban_doc",
        "file_name": "iban_document.pdf",
        "status": "approved",
        "uploaded_at": "2026-01-09 10:00:00",
        "reviewed_at": "2026-01-09 11:00:00",
        "rejection_reason": null,
        "file_url": "https://shellafood.com/storage/documents/iban_doc_24_1234567890.pdf"
      },
      {
        "id": 2,
        "type": "national_address_doc",
        "file_name": "address_document.pdf",
        "status": "pending",
        "uploaded_at": "2026-01-09 12:00:00",
        "reviewed_at": null,
        "rejection_reason": null,
        "file_url": "https://shellafood.com/storage/documents/address_doc_24_1234567890.pdf"
      },
      {
        "id": 3,
        "type": "receipt",
        "contract_id": 1,
        "file_name": "receipt_contract_1.pdf",
        "status": "pending",
        "uploaded_at": "2026-01-09 13:00:00",
        "reviewed_at": null,
        "rejection_reason": null,
        "file_url": "https://shellafood.com/storage/documents/receipt_1_24_1234567890.pdf",
        "contract": {
          "id": 1,
          "contract_type": "selling",
          "amount": "6600",
          "status": 1
        }
      }
    ],
    "summary": {
      "iban_doc": {
        "exists": true,
        "status": "approved"
      },
      "national_address_doc": {
        "exists": true,
        "status": "pending"
      },
      "receipts_count": 1,
      "pending_receipts": 1
    }
  }
}
```

#### **GET /portallogistice/contracts/{id}/receipt-status** ⭐ CRITICAL
- **Purpose:** Check if user can upload receipt and get deadline info
- **Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": 1,
    "contract_type": "selling",
    "can_upload": true,
    "receipt_upload_status": "pending",
    "receipt_uploaded_at": null,
    "approved_at": "2026-01-10 10:00:00",
    "receipt_upload_deadline": "2026-01-12 10:00:00",
    "hours_remaining": 23,
    "is_overdue": false,
    "warning_message": null
  }
}
```

---

### 2. Admin Document Review System (3 endpoints)

#### **GET /portallogistice/admin/documents** ⭐ CRITICAL
- **Purpose:** Get all pending documents for admin review
- **Query Params:**
  - `status`: `pending` | `approved` | `rejected` (default: pending)
  - `type`: Filter by type
  - `page`: Page number
  - `per_page`: Items per page
- **Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "user_id": 24,
        "national_id": "1234567890",
        "type": "iban_doc",
        "file_name": "iban_document.pdf",
        "file_size": 245760,
        "status": "pending",
        "uploaded_at": "2026-01-09 10:00:00",
        "file_url": "https://shellafood.com/storage/documents/iban_doc_24_1234567890.pdf",
        "user": {
          "id": 24,
          "national_id": "1234567890",
          "first_name": "أحمد",
          "family_name": "العلي",
          "email": "user@example.com",
          "phone": "0501234567"
        },
        "contract": null
      },
      {
        "id": 3,
        "user_id": 24,
        "national_id": "1234567890",
        "type": "receipt",
        "contract_id": 1,
        "file_name": "receipt_contract_1.pdf",
        "status": "pending",
        "uploaded_at": "2026-01-09 13:00:00",
        "file_url": "https://shellafood.com/storage/documents/receipt_1_24_1234567890.pdf",
        "user": {
          "id": 24,
          "national_id": "1234567890",
          "first_name": "أحمد",
          "family_name": "العلي"
        },
        "contract": {
          "id": 1,
          "contract_type": "selling",
          "amount": "6600",
          "status": 1,
          "approved_at": "2026-01-10 10:00:00"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 5,
      "total_pages": 1
    },
    "summary": {
      "pending_count": 5,
      "approved_count": 10,
      "rejected_count": 2
    }
  }
}
```

#### **PUT /portallogistice/admin/documents/{id}/approve** ⭐ CRITICAL
- **Purpose:** Admin approves document
- **Request Body:** None (or optional notes)
- **Database Logic:**
  - Update `portal_logistice_documents`:
    - `status` = `approved`
    - `reviewed_at` = NOW()
    - `reviewer_id` = admin_id (from auth)
  - If IBAN doc: Update `portal_logistice_users.iban_document_path`
  - If National Address doc: Update `portal_logistice_users.national_address_document_path`
  - If Receipt: Update `portal_logistices.payment_receipt_path` and `receipt_uploaded_at` and `receipt_upload_status = 'uploaded'`
  - **Create notification for user:**
    - Type: `document_approved`
    - Title: "تم اعتماد المستند"
    - Description: "تم اعتماد {document_type} بنجاح"
- **Response:**
```json
{
  "success": true,
  "data": {
    "document_id": 1,
    "status": "approved",
    "reviewed_at": "2026-01-09 14:00:00",
    "reviewer_id": 1
  },
  "message": "تم اعتماد المستند بنجاح"
}
```

#### **PUT /portallogistice/admin/documents/{id}/reject** ⭐ CRITICAL
- **Purpose:** Admin rejects document with reason
- **Request Body:**
```json
{
  "rejection_reason": "الصورة غير واضحة. يرجى رفع صورة أوضح."
}
```
- **Database Logic:**
  - Update `portal_logistice_documents`:
    - `status` = `rejected`
    - `reviewed_at` = NOW()
    - `reviewer_id` = admin_id
    - `rejection_reason` = request body reason
  - **Create notification for user:**
    - Type: `document_rejected`
    - Title: "تم رفض المستند"
    - Description: rejection_reason
    - Priority: `normal`
    - Action URL: `/dashboard/profile` (for IBAN/Address) or `/dashboard/tasks` (for receipt)
- **Response:**
```json
{
  "success": true,
  "data": {
    "document_id": 1,
    "status": "rejected",
    "reviewed_at": "2026-01-09 14:00:00",
    "reviewer_id": 1,
    "rejection_reason": "الصورة غير واضحة. يرجى رفع صورة أوضح."
  },
  "message": "تم رفض المستند"
}
```

---

### 3. Notification System (2 endpoints)

#### **GET /portallogistice/notifications** ⭐ CRITICAL
- **Purpose:** Get user notifications (document approvals/rejections, contract status)
- **Query Params:**
  - `status`: `pending` | `completed` | `dismissed`
  - `type`: Filter by type
  - `read`: `true` | `false` (filter by read status)
- **Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "document_approved",
        "title": "تم اعتماد المستند",
        "title_en": "Document Approved",
        "description": "تم اعتماد مستند الآيبان بنجاح",
        "description_en": "IBAN document has been approved",
        "priority": "normal",
        "status": "pending",
        "read_at": null,
        "created_at": "2026-01-09 14:00:00",
        "action_url": "/dashboard/profile"
      },
      {
        "id": 2,
        "type": "document_rejected",
        "title": "تم رفض المستند",
        "title_en": "Document Rejected",
        "description": "الصورة غير واضحة. يرجى رفع صورة أوضح.",
        "description_en": "Image is not clear. Please upload a clearer image.",
        "priority": "normal",
        "status": "pending",
        "read_at": null,
        "created_at": "2026-01-09 15:00:00",
        "action_url": "/dashboard/profile"
      },
      {
        "id": 3,
        "type": "upload_receipt",
        "title": "رفع إيصال السداد",
        "title_en": "Upload Payment Receipt",
        "description": "يرجى رفع إيصال السداد للعقد رقم 1 خلال 48 ساعة",
        "description_en": "Please upload payment receipt for contract #1 within 48 hours",
        "priority": "urgent",
        "deadline": "2026-01-12 10:00:00",
        "deadline_remaining_hours": 23,
        "status": "pending",
        "read_at": null,
        "created_at": "2026-01-10 10:00:00",
        "action_url": "/dashboard/tasks?action=upload_receipt&contract_id=1",
        "related_contract": {
          "id": 1,
          "contract_type": "selling",
          "amount": "6600"
        }
      }
    ],
    "summary": {
      "unread_count": 3,
      "urgent_count": 1,
      "pending_count": 3
    }
  }
}
```

#### **GET /portallogistice/notifications/count** ⭐ CRITICAL
- **Purpose:** Get unread notifications count (for badge in header)
- **Response:**
```json
{
  "success": true,
  "data": {
    "unread_count": 3,
    "urgent_count": 1,
    "pending_count": 3
  }
}
```

---

### 4. Contract Approval Enhancement (Update Existing)

#### **PUT /portallogistice/admin/contracts/{id}/status** ✅ EXISTS (needs enhancement)

**Current:** Only updates status

**Required Enhancement:**
- When approving SELLING contract:
  - Set `approved_at` = NOW()
  - Set `receipt_upload_deadline` = NOW() + 48 hours
  - Set `receipt_upload_status` = `pending`
  - **Create notification:**
    - Type: `upload_receipt`
    - Priority: `urgent`
    - Deadline: `receipt_upload_deadline`
    - Action URL: `/dashboard/tasks?action=upload_receipt&contract_id={id}`

- When approving RENTAL contract:
  - Set `contract_starts_at` = `approved_at` + 65 days
  - Generate 12 payment records in `portal_logistice_payments` table
  - Cache payment schedule in `payment_schedule` JSON field

- When rejecting contract:
  - Set `denied_at` = NOW()
  - Set `denial_reason` = reason from request
  - **Create notification:**
    - Type: `contract_denied`
    - Description: denial_reason

---

## 📋 Implementation Checklist

### Week 1: Core Document Workflow

#### Day 1-2: Document Upload
- [ ] Create `PortalLogisticeDocumentController`
- [ ] Implement `uploadDocument()` method
- [ ] Add file validation (type, size)
- [ ] Set up file storage path
- [ ] Insert into `portal_logistice_documents` table
- [ ] Update user/contract paths when uploaded
- [ ] Test with PDF and image files

#### Day 3: Document Listing
- [ ] Implement `getAllDocuments()` method
- [ ] Add filtering by type and status
- [ ] Include user summary (IBAN status, Address status, receipts count)
- [ ] Test with multiple document types

#### Day 4: Receipt Status Check
- [ ] Implement `getReceiptStatus()` in ContractController
- [ ] Calculate hours remaining
- [ ] Check if overdue
- [ ] Return warning messages

#### Day 5: Admin Document Review
- [ ] Create `PortalLogisticeDocumentAdminController`
- [ ] Implement `listDocuments()` for admin
- [ ] Implement `approveDocument()` method
- [ ] Implement `rejectDocument()` method
- [ ] Update user/contract paths on approval
- [ ] Test approval/rejection workflow

### Week 2: Notifications & Contract Enhancement

#### Day 1-2: Notification System
- [ ] Create `PortalLogisticeNotificationController`
- [ ] Implement `getAllNotifications()` method
- [ ] Implement `getNotificationCount()` method
- [ ] Auto-generate notifications on document approval/rejection
- [ ] Auto-generate notification on contract approval
- [ ] Test notification creation

#### Day 3-4: Contract Approval Enhancement
- [ ] Update `updateContractStatus()` method
- [ ] Add receipt deadline logic for SELLING contracts
- [ ] Add payment schedule generation for RENTAL contracts
- [ ] Create notifications on approval/rejection
- [ ] Test contract approval workflow

#### Day 5: Testing & Bug Fixes
- [ ] Test complete workflow:
  1. User uploads IBAN doc
  2. Admin approves IBAN doc
  3. User uploads National Address doc
  4. Admin approves National Address doc
  5. User creates contract
  6. Admin approves contract
  7. User uploads receipt
  8. Admin approves receipt
  9. User receives notifications
- [ ] Fix any bugs
- [ ] Document API endpoints

---

## 🔧 Database Updates Required

### Already Done ✅
- ✅ `portal_logistice_documents` table created
- ✅ `portal_logistice_notifications` table created
- ✅ `portal_logistices` table has new fields

### Need to Verify
- [ ] File storage directory exists: `storage/app/public/documents/`
- [ ] Storage link created: `php artisan storage:link`
- [ ] File permissions set correctly (755 for directories, 644 for files)

---

## 📝 Route Registration

Add to `routes/api/v1/api.php`:

```php
// User routes (inside PortalLogisticsAuth middleware)
Route::middleware([\App\Http\Middleware\PortalLogisticsAuth::class])->group(function () {
    // ... existing routes ...
    
    // Documents
    Route::post('documents/upload', [PortalLogisticeDocumentController::class, 'uploadDocument']);
    Route::get('documents', [PortalLogisticeDocumentController::class, 'getAllDocuments']);
    Route::get('contracts/{id}/receipt-status', [PortalLogisticeAuthController::class, 'getReceiptStatus']);
    
    // Notifications
    Route::get('notifications', [PortalLogisticeNotificationController::class, 'getAllNotifications']);
    Route::get('notifications/count', [PortalLogisticeNotificationController::class, 'getNotificationCount']);
});

// Admin routes (inside PortalLogisticsAdminAuth middleware)
Route::middleware([\App\Http\Middleware\PortalLogisticsAdminAuth::class])->group(function () {
    Route::prefix('admin')->group(function () {
        // ... existing routes ...
        
        // Documents (admin)
        Route::get('documents', [PortalLogisticeDocumentAdminController::class, 'listDocuments']);
        Route::put('documents/{id}/approve', [PortalLogisticeDocumentAdminController::class, 'approveDocument']);
        Route::put('documents/{id}/reject', [PortalLogisticeDocumentAdminController::class, 'rejectDocument']);
    });
});
```

---

## 🎯 Success Criteria

### User Can:
1. ✅ Upload IBAN document
2. ✅ Upload National Address document
3. ✅ See document status (pending/approved/rejected)
4. ✅ Upload receipt for approved selling contract
5. ✅ See receipt upload deadline and remaining time
6. ✅ Receive notification when document is approved/rejected
7. ✅ See notification count in dashboard header

### Admin Can:
1. ✅ See all pending documents
2. ✅ View document file
3. ✅ Approve document
4. ✅ Reject document with reason
5. ✅ See user info for each document
6. ✅ See contract info for receipts

### System Automatically:
1. ✅ Creates notification when document is approved/rejected
2. ✅ Creates notification when contract is approved (for receipt upload)
3. ✅ Sets receipt deadline when selling contract is approved
4. ✅ Updates user/contract paths when documents are approved

---

## ⚠️ Important Notes

1. **File Upload Security:**
   - Validate file type (only PDF, JPEG, PNG)
   - Validate file size (max 5MB)
   - Scan for viruses (optional but recommended)
   - Store files outside web root if possible

2. **Document Re-upload:**
   - If document is rejected, user can upload again
   - Delete old file when new one is uploaded
   - Keep rejection reason visible to user

3. **Receipt Upload Window:**
   - User can upload receipt within 48 hours of contract approval
   - After 48 hours, still allow upload but show warning
   - Update `receipt_upload_status` to `uploaded` when uploaded

4. **Notification Types:**
   - `document_approved` - When admin approves document
   - `document_rejected` - When admin rejects document
   - `upload_receipt` - When contract is approved (selling)
   - `contract_approved` - When contract is approved
   - `contract_denied` - When contract is rejected

5. **Business Rules:**
   - Max 2 pending receipts at any time
   - User must have approved IBAN and National Address docs before creating contract
   - Receipt can only be uploaded for approved selling contracts

---

## 📊 Priority Summary

### 🔴 Must Have (Week 1-2)
1. POST /documents/upload
2. GET /documents
3. GET /contracts/{id}/receipt-status
4. GET /admin/documents
5. PUT /admin/documents/{id}/approve
6. PUT /admin/documents/{id}/reject
7. GET /notifications
8. GET /notifications/count
9. Update PUT /admin/contracts/{id}/status (enhancement)

**Total: 9 endpoints (8 new + 1 enhancement)**

---

## ✅ Next Steps

1. **Backend Team:**
   - Review this document
   - Start with document upload endpoint
   - Test file upload functionality
   - Implement admin review endpoints
   - Add notification auto-generation

2. **Frontend Team:**
   - Build document upload UI
   - Build admin document review page
   - Build notifications component
   - Integrate with APIs as they become available

3. **Testing:**
   - Test complete workflow end-to-end
   - Test file upload with different file types
   - Test admin approval/rejection
   - Test notification creation

---

**Document Version:** 1.0  
**Last Updated:** January 9, 2026  
**Status:** Ready for Backend Team Implementation  
**Timeline:** 2 weeks for Priority 1 endpoints
