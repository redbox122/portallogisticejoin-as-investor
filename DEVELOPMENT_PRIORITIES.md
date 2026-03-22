# Development Priorities - Portal Logistics

**Project:** Portal Logistics - Document & Receipt Management  
**Date:** January 2025  
**Focus:** IBAN, National ID, and Contract Receipt Upload System

---

## 📋 Table of Contents

1. [Frontend Development Priorities](#frontend-development-priorities)
2. [Backend Development Priorities](#backend-development-priorities)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Backend Requirements for Backend Team](#backend-requirements-for-backend-team)

---

## Frontend Development Priorities

### Phase 1: Foundation & Navigation (Week 1) 🔴 CRITICAL

**Priority:** Start here - Foundation for everything

#### 1.1 Sidebar Navigation Component
- **Status:** ⏳ To Build
- **Purpose:** Main navigation for user dashboard
- **Components:**
  - Dashboard overview icon/link
  - Profile icon/link (with document badge if docs pending)
  - Contracts icon/link
  - Documents section (IBAN, National Address, Receipts)
  - Logout button
- **Requirements:**
  - Responsive (mobile/desktop)
  - Active route highlighting
  - Badge indicators for pending actions
  - RTL/LTR support
- **Files to Create:**
  - `src/Components/Sidebar.js`
  - `src/Css/sidebar.css`

---

#### 1.2 Dashboard Layout Update
- **Status:** ⏳ To Refactor
- **Purpose:** Update UserDashboard to use sidebar layout
- **Current:** Single page with header
- **New:** Sidebar + main content area
- **Files to Update:**
  - `src/Pages/UserDashboard.js` - Restructure layout
  - `src/Css/dashboard.css` - Update styles

---

### Phase 2: Document Upload System (Week 1-2) 🔴 CRITICAL

**Priority:** Most important feature - IBAN & National ID uploads

#### 2.1 Profile Page Enhancement
- **Status:** ⏳ To Build
- **Purpose:** Show user profile with document upload sections
- **Location:** `/dashboard/profile`
- **Features:**
  - Display user information
  - IBAN Document upload section
  - National Address Document upload section
  - Document status indicators (pending/approved/rejected)
  - View/download uploaded documents
- **Components:**
  - `src/Pages/ProfilePage.js`
  - `src/Components/DocumentUploadCard.js`
  - `src/Components/DocumentStatusBadge.js`
- **Dependencies:**
  - Backend: Document upload endpoints
  - Backend: Document listing endpoint

---

#### 2.2 IBAN Document Upload Component
- **Status:** ⏳ To Build
- **Purpose:** Upload IBAN document (one per user)
- **Features:**
  - File upload (PDF/Image)
  - File preview
  - Upload progress
  - Success/error messages
  - Status display (pending/approved/rejected)
  - Rejection reason display (if rejected)
- **Components:**
  - `src/Components/DocumentUpload.js`
  - `src/Components/FileUploadInput.js`
  - `src/Components/FilePreview.js`
- **Files to Create:**
  - `src/Components/IbanDocumentUpload.js`
  - `src/Css/document-upload.css`
- **Dependencies:**
  - Backend: `POST /portallogistice/documents/upload` (type: 'iban_doc')

---

#### 2.3 National Address Document Upload Component
- **Status:** ⏳ To Build
- **Purpose:** Upload National Address document (one per user)
- **Features:**
  - Same as IBAN upload
  - One per user validation
  - Display current document if exists
- **Components:**
  - `src/Components/NationalAddressDocumentUpload.js`
- **Dependencies:**
  - Backend: `POST /portallogistice/documents/upload` (type: 'national_address_doc')

---

#### 2.4 Documents List Page
- **Status:** ⏳ To Build
- **Purpose:** View all user documents in one place
- **Location:** `/dashboard/documents`
- **Features:**
  - List all documents (IBAN, National Address, Receipts)
  - Filter by type
  - Status badges
  - View/download buttons
  - Upload new if missing/rejected
- **Components:**
  - `src/Pages/DocumentsPage.js`
  - `src/Components/DocumentsList.js`
  - `src/Components/DocumentCard.js`
- **Dependencies:**
  - Backend: `GET /portallogistice/documents`

---

### Phase 3: Receipt Upload System (Week 2) 🔴 CRITICAL

**Priority:** Contract receipt upload with 48-hour deadline

#### 3.1 Contract Receipt Upload Component
- **Status:** ⏳ To Build
- **Purpose:** Upload receipt after contract approval (48-hour window)
- **Features:**
  - Display contract information
  - Upload receipt (PDF/Image)
  - Countdown timer (48 hours remaining)
  - Deadline warning
  - Late upload warning (if past deadline)
  - Upload progress
  - Status display
- **Components:**
  - `src/Components/ReceiptUpload.js`
  - `src/Components/CountdownTimer.js`
  - `src/Components/DeadlineWarning.js`
- **Files to Create:**
  - `src/Components/ContractReceiptUpload.js`
  - `src/Css/receipt-upload.css`
- **Dependencies:**
  - Backend: `GET /portallogistice/contracts/{id}/receipt-status`
  - Backend: `POST /portallogistice/contracts/{id}/upload-receipt`

---

#### 3.2 Contract Details Page Enhancement
- **Status:** ⏳ To Update
- **Purpose:** Show contract details with receipt upload section
- **Features:**
  - Contract information
  - Receipt upload section (if approved)
  - Receipt status and deadline
  - Download signed contract PDF
  - View uploaded receipt
- **Components:**
  - `src/Components/ContractDetails.js`
  - `src/Components/ReceiptSection.js`
- **Dependencies:**
  - Backend: Receipt status endpoint

---

#### 3.3 Receipt Status Badge
- **Status:** ⏳ To Build
- **Purpose:** Show receipt upload status on contract cards
- **Features:**
  - "Pending" badge (with countdown)
  - "Uploaded" badge
  - "Overdue" badge (if past deadline)
  - "Not Required" badge (if not approved yet)
- **Components:**
  - `src/Components/ReceiptStatusBadge.js`
- **Files to Create:**
  - `src/Components/ReceiptStatusBadge.js`

---

### Phase 4: Admin Document Review (Week 2-3) 🔴 CRITICAL

**Priority:** Admin can view and approve/reject documents

#### 4.1 Admin Documents Page
- **Status:** ⏳ To Build
- **Purpose:** Admin view all pending documents
- **Location:** `/admin/documents`
- **Features:**
  - Filter by type (IBAN, National Address, Receipt)
  - Filter by status (pending, approved, rejected)
  - Search by user national_id or name
  - Pagination
  - Document preview
  - Approve/Reject buttons
- **Components:**
  - `src/Pages/AdminDocumentsPage.js`
  - `src/Components/AdminDocumentsList.js`
  - `src/Components/AdminDocumentCard.js`
  - `src/Components/DocumentReviewModal.js`
- **Files to Create:**
  - `src/Pages/AdminDocumentsPage.js`
  - `src/Css/admin-documents.css`
- **Dependencies:**
  - Backend: `GET /portallogistice/admin/documents`

---

#### 4.2 Document Review Modal
- **Status:** ⏳ To Build
- **Purpose:** Admin review and approve/reject documents
- **Features:**
  - Document preview (PDF viewer or image)
  - User information display
  - Approve button
  - Reject button with reason textarea
  - Loading states
  - Success/error messages
- **Components:**
  - `src/Components/DocumentReviewModal.js`
  - `src/Components/DocumentPreview.js`
- **Dependencies:**
  - Backend: `PUT /portallogistice/admin/documents/{id}/approve`
  - Backend: `PUT /portallogistice/admin/documents/{id}/reject`

---

#### 4.3 Admin Sidebar Update
- **Status:** ⏳ To Update
- **Purpose:** Add Documents link to admin sidebar
- **Features:**
  - "Documents" tab with pending count badge
  - Active state highlighting
- **Files to Update:**
  - `src/Pages/AdminDashboard.js`
  - Add Documents navigation tab

---

### Phase 5: UI/UX Polish & Notifications (Week 3) 🟡 IMPORTANT

#### 5.1 Notification Bell Component
- **Status:** ⏳ To Build
- **Purpose:** Show pending tasks/notifications
- **Features:**
  - Badge with count
  - Dropdown list of notifications
  - Mark as read
  - Click to navigate to action
- **Components:**
  - `src/Components/NotificationBell.js`
  - `src/Components/NotificationDropdown.js`
- **Dependencies:**
  - Backend: `GET /portallogistice/notifications`

---

#### 5.2 Document Upload Success/Error Handling
- **Status:** ⏳ To Build
- **Purpose:** Better user feedback
- **Features:**
  - Toast notifications
  - Loading spinners
  - Error messages
  - Success confirmations
- **Dependencies:**
  - Already using `react-notifications-component`

---

## Backend Development Priorities

### 🔴 PRIORITY 1: Document Upload System (Week 1) - CRITICAL

**Start here:** Most important for frontend development

#### Database Changes Required:

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

-- 2. Add document path columns to portal_logistices (optional, for backward compatibility)
ALTER TABLE portal_logistices 
ADD COLUMN iban_document_path VARCHAR(500) NULL,
ADD COLUMN national_address_document_path VARCHAR(500) NULL,
ADD COLUMN payment_receipt_path VARCHAR(500) NULL;
```

#### Endpoints Required (Priority 1):

1. **POST `/portallogistice/documents/upload`** 🔴 CRITICAL
   - **Purpose:** Upload document (IBAN, National Address, or Receipt)
   - **Method:** POST
   - **Auth:** Yes (Bearer Token)
   - **Body:**
     ```json
     {
       "type": "iban_doc" | "national_address_doc" | "receipt",
       "contract_id": 123,  // Required for receipt, null for IBAN/National Address
       "file": File  // FormData with file
     }
     ```
   - **Validation:**
     - Only one IBAN doc per user (national_id)
     - Only one National Address doc per user (national_id)
     - Only one receipt per contract
     - File type: PDF, JPG, PNG
     - File size: Max 5MB
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
   - **Storage:** Save file to `storage/app/public/documents/` or similar

---

2. **GET `/portallogistice/documents`** 🔴 CRITICAL
   - **Purpose:** Get all user documents
   - **Method:** GET
   - **Auth:** Yes (Bearer Token)
   - **Query Params:**
     - `type` (optional): Filter by type (iban_doc, national_address_doc, receipt)
     - `status` (optional): Filter by status (pending, approved, rejected)
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
           },
           {
             "id": 2,
             "type": "national_address_doc",
             "status": "approved",
             "file_path": "/storage/documents/national_address_1234567890.pdf",
             "file_name": "national_address.pdf",
             "file_size": 189234,
             "uploaded_at": "2025-01-15 14:30:00",
             "reviewed_at": "2025-01-15 16:00:00",
             "rejection_reason": null
           }
         ]
       }
     }
     ```

---

3. **GET `/portallogistice/documents/{id}`** 🔴 CRITICAL
   - **Purpose:** Get specific document details
   - **Method:** GET
   - **Auth:** Yes (Bearer Token)
   - **Response:** Same as document object in list endpoint

---

4. **GET `/portallogistice/documents/{id}/download`** 🔴 CRITICAL
   - **Purpose:** Download document file
   - **Method:** GET
   - **Auth:** Yes (Bearer Token)
   - **Response:** File download (PDF/Image)

---

### 🔴 PRIORITY 2: Receipt Upload with Deadline (Week 1-2) - CRITICAL

#### Database Changes Required:

```sql
-- Add receipt tracking columns to portal_logistices
ALTER TABLE portal_logistices 
ADD COLUMN approved_at TIMESTAMP NULL,
ADD COLUMN receipt_upload_deadline TIMESTAMP NULL,
ADD COLUMN receipt_uploaded_at TIMESTAMP NULL,
ADD COLUMN receipt_upload_status ENUM('pending', 'uploaded', 'overdue') NULL;
```

#### Endpoints Required (Priority 2):

5. **GET `/portallogistice/contracts/{id}/receipt-status`** 🔴 CRITICAL
   - **Purpose:** Get receipt upload status for a contract
   - **Method:** GET
   - **Auth:** Yes (Bearer Token)
   - **Response:**
     ```json
     {
       "success": true,
       "data": {
         "contract_id": 123,
         "can_upload": true,
         "status": "pending",  // pending, uploaded, overdue
         "deadline": "2025-01-18 10:00:00",
         "hours_remaining": 24,
         "is_overdue": false,
         "receipt_document_id": null  // If uploaded, document ID
       }
     }
     ```
   - **Logic:**
     - Only if contract is approved (status = 1)
     - Calculate hours_remaining from deadline
     - Mark as overdue if past deadline

---

6. **POST `/portallogistice/contracts/{id}/upload-receipt`** 🔴 CRITICAL
   - **Purpose:** Upload receipt for a contract (within 48 hours or late)
   - **Method:** POST
   - **Auth:** Yes (Bearer Token)
   - **Body:**
     ```json
     {
       "file": File  // FormData with file
     }
     ```
   - **Validation:**
     - Contract must be approved
     - Only one receipt per contract
     - File type: PDF, JPG, PNG
     - File size: Max 5MB
     - Allow late upload but warn user
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
           "file_path": "/storage/documents/receipt_123_1234567890.pdf",
           "uploaded_at": "2025-01-17 10:00:00",
           "is_late": false  // true if uploaded after deadline
         }
       }
     }
     ```
   - **Logic:**
     - Create document with type='receipt'
     - Link to contract_id
     - Update contract receipt_uploaded_at and receipt_upload_status
     - Set is_late flag if past deadline

---

#### Update Existing Endpoint:

7. **PUT `/portallogistice/admin/contracts/{id}/status`** 🔴 CRITICAL (UPDATE)
   - **Current:** Only sets status to 1 (approved) or 0 (denied)
   - **Required:** When approving (status = 1), also:
     - Set `approved_at` = current timestamp
     - Set `receipt_upload_deadline` = approved_at + 48 hours
     - Set `receipt_upload_status` = 'pending'
   - **Code Example:**
     ```php
     if ($request->status == 1) {
         $contract->approved_at = now();
         $contract->receipt_upload_deadline = now()->addHours(48);
         $contract->receipt_upload_status = 'pending';
     }
     ```

---

### 🔴 PRIORITY 3: Admin Document Review (Week 2) - CRITICAL

#### Endpoints Required (Priority 3):

8. **GET `/portallogistice/admin/documents`** 🔴 CRITICAL
   - **Purpose:** Get all documents for admin review
   - **Method:** GET
   - **Auth:** Yes (Bearer Token - Admin)
   - **Query Params:**
     - `type` (optional): Filter by type
     - `status` (optional): Filter by status (default: pending)
     - `search` (optional): Search by national_id or user name
     - `per_page` (optional): Default 20
     - `page` (optional): Default 1
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
             "file_name": "iban_document.pdf",
             "uploaded_at": "2025-01-16 10:00:00",
             "contract_id": null,
             "contract_type": null
           },
           {
             "id": 3,
             "national_id": "1234567890",
             "user_name": "أحمد محمد علي العلي",
             "type": "receipt",
             "status": "pending",
             "file_path": "/storage/documents/receipt_123_1234567890.pdf",
             "file_name": "receipt.pdf",
             "uploaded_at": "2025-01-17 10:00:00",
             "contract_id": 123,
             "contract_type": "rental"
           }
         ],
         "pagination": {
           "current_page": 1,
           "per_page": 20,
           "total": 50,
           "last_page": 3
         }
       }
     }
     ```

---

9. **PUT `/portallogistice/admin/documents/{id}/approve`** 🔴 CRITICAL
   - **Purpose:** Approve a document
   - **Method:** PUT
   - **Auth:** Yes (Bearer Token - Admin)
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
     - Set reviewed_at = now()
     - Set reviewer_id = admin user id
     - If IBAN/National Address: Update portal_logistices table document path
     - If Receipt: Already linked to contract

---

10. **PUT `/portallogistice/admin/documents/{id}/reject`** 🔴 CRITICAL
    - **Purpose:** Reject a document
    - **Method:** PUT
    - **Auth:** Yes (Bearer Token - Admin)
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
    - **Logic:**
      - Update document status to 'rejected'
      - Set rejection_reason
      - Set reviewed_at = now()
      - Set reviewer_id = admin user id

---

## Implementation Roadmap

### Week 1: Foundation + Document Upload

**Frontend:**
- Day 1-2: Sidebar navigation component
- Day 2-3: Profile page with document sections
- Day 3-4: IBAN document upload component
- Day 4-5: National Address document upload component

**Backend:**
- Day 1-2: Database migration (documents table)
- Day 2-3: Document upload endpoint
- Day 3-4: Document listing endpoint
- Day 4-5: Document download endpoint

### Week 2: Receipt Upload + Admin Review

**Frontend:**
- Day 1-2: Receipt upload component with countdown
- Day 2-3: Contract details page enhancement
- Day 3-4: Admin documents page
- Day 4-5: Document review modal

**Backend:**
- Day 1-2: Receipt status endpoint
- Day 2-3: Receipt upload endpoint
- Day 3-4: Update contract approval to set deadline
- Day 4-5: Admin document review endpoints

### Week 3: Polish & Integration

**Frontend:**
- Day 1-2: Notification bell component
- Day 2-3: UI/UX polish
- Day 3-4: Error handling improvements
- Day 4-5: Testing and bug fixes

**Backend:**
- Day 1-2: Testing and bug fixes
- Day 3-4: Performance optimization
- Day 5: Documentation

---

## Backend Requirements for Backend Team

### 🔴 START HERE: Priority 1 (Critical - Week 1)

**Database Changes:**
1. ✅ Create `portal_logistice_documents` table
2. ✅ Add document path columns to `portal_logistices` (optional)

**Endpoints to Build:**
1. ✅ `POST /portallogistice/documents/upload` - Upload document
2. ✅ `GET /portallogistice/documents` - List user documents
3. ✅ `GET /portallogistice/documents/{id}` - Get document details
4. ✅ `GET /portallogistice/documents/{id}/download` - Download document

**File Storage:**
- Set up file storage directory: `storage/app/public/documents/`
- Configure public access for document files
- Validate file types (PDF, JPG, PNG) and size (max 5MB)

**Business Rules:**
- Only one IBAN document per user (national_id)
- Only one National Address document per user (national_id)
- Only one receipt per contract
- Reject duplicate uploads with clear error message

---

### 🔴 Priority 2 (Critical - Week 1-2)

**Database Changes:**
1. ✅ Add receipt tracking columns to `portal_logistices`:
   - `approved_at` TIMESTAMP NULL
   - `receipt_upload_deadline` TIMESTAMP NULL
   - `receipt_uploaded_at` TIMESTAMP NULL
   - `receipt_upload_status` ENUM('pending', 'uploaded', 'overdue') NULL

**Endpoints to Build:**
5. ✅ `GET /portallogistice/contracts/{id}/receipt-status` - Get receipt status
6. ✅ `POST /portallogistice/contracts/{id}/upload-receipt` - Upload receipt

**Endpoint to Update:**
7. ✅ `PUT /portallogistice/admin/contracts/{id}/status` - Set deadline when approving

**Business Rules:**
- When contract approved: Set deadline = approved_at + 48 hours
- Allow late uploads but flag as `is_late`
- Calculate hours_remaining in status endpoint

---

### 🔴 Priority 3 (Critical - Week 2)

**Endpoints to Build:**
8. ✅ `GET /portallogistice/admin/documents` - List all documents for admin
9. ✅ `PUT /portallogistice/admin/documents/{id}/approve` - Approve document
10. ✅ `PUT /portallogistice/admin/documents/{id}/reject` - Reject document

**Business Rules:**
- Admin can view all documents with filters
- Admin can approve/reject documents
- When approved: Update portal_logistices document paths if IBAN/National Address
- When rejected: Set rejection_reason for user to see

---

## Summary

### Frontend Will Start With:
1. ✅ Sidebar navigation
2. ✅ Profile page with document sections
3. ✅ IBAN document upload
4. ✅ National Address document upload
5. ✅ Receipt upload with countdown
6. ✅ Admin document review page

### Backend Needs to Build First:
1. ✅ Document upload endpoints (4 endpoints)
2. ✅ Receipt status/upload endpoints (2 endpoints)
3. ✅ Update contract approval endpoint
4. ✅ Admin document review endpoints (3 endpoints)

**Total Backend Endpoints Needed:** 10 endpoints

**Total Database Tables:** 1 new table (`portal_logistice_documents`)

**Total Database Columns:** 4 columns added to `portal_logistices`

---

**Status:** Ready for backend team to start implementation  
**Priority Order:** Priority 1 → Priority 2 → Priority 3  
**Estimated Backend Time:** 1-2 weeks for Priority 1-3  
**Estimated Frontend Time:** 2-3 weeks for complete implementation

---

**Last Updated:** January 2025
