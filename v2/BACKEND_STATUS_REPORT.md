# Backend Status Report - Portal Logistics Dashboard

**Date:** January 8, 2025  
**Status:** Comprehensive Analysis & Implementation Plan  
**Location:** This document summarizes the backend team's response to our requirements

---

## 📊 Executive Summary

**Current Status:** Most requested features are **NOT IMPLEMENTED**. The backend has basic CRUD operations for users and contracts, but lacks:
- ❌ Payment tracking system
- ❌ Document upload system  
- ❌ Notifications/Tasks system
- ❌ Receipt upload with deadline tracking
- ❌ Contract validation business rules
- ❌ Analytics endpoints
- ❌ Account details endpoint

**What Exists:**
- ✅ Basic authentication (login/logout)
- ✅ User profile (GET/PUT)
- ✅ Contract listing (GET)
- ✅ Contract creation (POST)
- ✅ Admin contract approval (PUT status)
- ✅ Contract download

---

## 📋 Detailed Question-by-Question Answers

### 1. Payment Tracking & History

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No payment tracking table exists
- No payment endpoints exist
- No payment schedule system
- Contracts only have `amount` field (one-time value)

**What Needs to Be Built:**
- New table: `portal_logistice_payments`
- Endpoints:
  - `GET /portallogistice/payments` ❌
  - `GET /portallogistice/payments/{contractId}` ❌
  - `GET /portallogistice/payments/summary` ❌
  - `POST /portallogistice/payments/report-missing` ❌

**Database Schema Needed:**
```sql
CREATE TABLE portal_logistice_payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_id BIGINT NOT NULL,
    national_id VARCHAR(191) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'sent', 'received', 'reported_missing') DEFAULT 'pending',
    month_number INT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES portal_logistices(id)
);
```

**Implementation Priority:** 🔴 **CRITICAL (Priority 1)**

---

### 2. Document Upload System

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No document upload endpoints exist
- No document storage system
- Database has no document-related columns (except `signed_contract_path` for contracts)
- No document review/approval system

**What Needs to Be Built:**
- New table: `portal_logistice_documents`
- Endpoints:
  - `POST /portallogistice/documents/upload` ❌
  - `GET /portallogistice/documents` ❌
  - `GET /portallogistice/documents/{id}` ❌
  - `PUT /portallogistice/documents/{id}` ❌
  - `DELETE /portallogistice/documents/{id}` ❌

**Database Schema Needed:**
```sql
CREATE TABLE portal_logistice_documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    national_id VARCHAR(191) NOT NULL,
    contract_id BIGINT NULL,
    type ENUM('iban_doc', 'national_address_doc', 'receipt') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewer_id BIGINT NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES portal_logistices(id)
);
```

**Also Need to Add to `portal_logistices` table:**
- `iban_document_path` VARCHAR(500) NULL
- `national_address_document_path` VARCHAR(500) NULL
- `payment_receipt_path` VARCHAR(500) NULL

**Implementation Priority:** 🔴 **CRITICAL (Priority 1)**

---

### 3. Receipt Upload & 48-Hour Window

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No receipt upload endpoint
- No deadline tracking
- Contract approval doesn't set any receipt-related fields
- No validation for receipt upload window

**What Needs to Be Built:**
- Add columns to `portal_logistices`:
  - `approved_at` TIMESTAMP NULL
  - `receipt_upload_deadline` TIMESTAMP NULL
  - `receipt_uploaded_at` TIMESTAMP NULL
  - `receipt_upload_status` ENUM('pending', 'uploaded', 'overdue') NULL

- Endpoints:
  - `GET /portallogistice/contracts/{id}/receipt-status` ❌
  - `POST /portallogistice/contracts/{id}/upload-receipt` ❌

- Business Logic:
  - When admin approves contract → Set `approved_at` = now(), `receipt_upload_deadline` = now() + 48 hours
  - Validate upload window in endpoint
  - Allow late uploads with warning

**Implementation Priority:** 🔴 **CRITICAL (Priority 1)**

---

### 4. Contract Creation Business Rules

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Current State:**
- Contract linking exists (`linked_rental_contract_id`, `linked_selling_contract_id`)
- No validation endpoint exists
- No business rule enforcement in contract creation
- No receipt validation before 3rd contract

**What Exists:**
- ✅ Contract linking mechanism (selling ↔ rental)
- ❌ No validation that rental requires selling
- ❌ No validation that new selling requires completed rental
- ❌ No validation for receipt requirements

**What Needs to Be Built:**
- Endpoint: `POST /portallogistice/contracts/validate` ❌
- Business logic in `register()` method:
  - Check if rental can be created (selling must exist and be approved)
  - Check if new selling can be created (previous rental must exist)
  - Check receipt status before allowing 3rd contract
  - Enforce max 2 pending receipts

**Implementation Priority:** 🔴 **CRITICAL (Priority 1)**

---

### 5. Account Details for Wire Transfer

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No account details endpoint exists
- No configuration table for company account details
- No wire transfer information stored anywhere

**What Needs to Be Built:**
- Option 1: Add to `business_settings` table (recommended)
- Option 2: Create new `portal_logistice_account_details` table

- Endpoint: `GET /portallogistice/account-details` ❌

**Response Format:**
```json
{
  "success": true,
  "data": {
    "account_name": "Company Name",
    "account_number": "1234567890",
    "bank_name": "Bank Name",
    "iban": "SA1234567890123456789012",
    "swift_code": "SWIFTCODE",
    "beneficiary_name": "Beneficiary Name"
  }
}
```

**Implementation Priority:** 🟡 **IMPORTANT (Priority 2)**

---

### 6. Notifications & Tasks System

**Status:** ⚠️ **PARTIALLY EXISTS (but not for PortalLogistice)**

**Current State:**
- `user_notifications` table exists (for general app)
- `notification_messages` table exists
- No PortalLogistice-specific notification system
- No task/notification endpoints for PortalLogistice

**What Exists:**
- ✅ General notification infrastructure
- ❌ No PortalLogistice notification endpoints
- ❌ No task generation logic
- ❌ No notification types for PortalLogistice

**What Needs to Be Built:**
- New table: `portal_logistice_notifications` (or use existing with type filter)
- Endpoints:
  - `GET /portallogistice/notifications` ❌
  - `PUT /portallogistice/notifications/{id}/read` ❌
  - `PUT /portallogistice/notifications/{id}/dismiss` ❌

- Task Generation Logic:
  - When contract approved → Create "Upload Receipt" task
  - When profile incomplete → Create "Complete Profile" task
  - When documents missing → Create "Upload Documents" task
  - When orphan selling exists → Create "Create Rental" task

**Database Schema:**
```sql
CREATE TABLE portal_logistice_notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    national_id VARCHAR(191) NOT NULL,
    type ENUM('upload_receipt', 'complete_profile', 'upload_doc', 'create_rental', 'contract_pending') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('urgent', 'normal') DEFAULT 'normal',
    deadline TIMESTAMP NULL,
    status ENUM('pending', 'completed', 'dismissed') DEFAULT 'pending',
    action_url VARCHAR(500) NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Implementation Priority:** 🟡 **IMPORTANT (Priority 2)**

---

### 7. Contract Timeline & Status Tracking

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- Contracts only have `status` (pending/approved/denied)
- No timeline tracking
- No payment schedule
- No contract start date calculation
- No payment option tracking

**What Needs to Be Built:**
- Add columns to `portal_logistices`:
  - `approved_at` TIMESTAMP NULL
  - `receipt_uploaded_at` TIMESTAMP NULL
  - `contract_starts_at` TIMESTAMP NULL (calculated: approved_at + 65 days)
  - `payment_option` ENUM('full', 'half_plus_rest') NULL
  - `rest_payment_deadline` TIMESTAMP NULL
  - `payment_schedule` JSON NULL (store array of payment objects)

- Endpoint: `GET /portallogistice/contracts/{id}/timeline` ❌

**Payment Schedule Structure:**
```json
[
  {
    "month": 1,
    "amount": 660,
    "due_date": "2025-02-01",
    "paid_date": null,
    "status": "pending"
  },
  ...
]
```

**Implementation Priority:** 🟡 **IMPORTANT (Priority 2)**

---

### 8. Payment Schedule & Monthly Payments

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No payment schedule system
- No monthly payment tracking
- No admin endpoint to mark payments as sent

**What Needs to Be Built:**
- Use `portal_logistice_payments` table (from Question 1)
- Endpoints:
  - `GET /portallogistice/contracts/{id}/payments` ❌
  - `PUT /portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent` ❌

- Payment Schedule Generation Logic:
  - When contract approved → Generate 12 monthly payments (660 SAR each)
  - Calculate due dates (monthly from contract start date)
  - Store in `portal_logistice_payments` table

**Implementation Priority:** 🔴 **CRITICAL (Priority 1)**

---

### 9. User Analytics & Statistics

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No analytics endpoints exist
- No summary calculations
- No payment analytics

**What Needs to Be Built:**
- Endpoints:
  - `GET /portallogistice/analytics/summary` ❌
  - `GET /portallogistice/analytics/payments` ❌

**Analytics Calculations:**
- Total contracts: Count where `national_id` = user's national_id AND `contract_type` IS NOT NULL
- Active contracts: Count where status = approved
- Total invested: Sum of `amount` for approved contracts
- Total received: Sum of payments with status = 'received'
- Pending payments: Sum of payments with status = 'pending'
- Next payment: First pending payment ordered by due_date

**Implementation Priority:** 🟡 **IMPORTANT (Priority 2)**

---

### 10. Document Status & Review

**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- No admin document review endpoints
- No document approval/rejection system
- No document status tracking

**What Needs to Be Built:**
- Admin Endpoints:
  - `GET /portallogistice/admin/documents` ❌
  - `PUT /portallogistice/admin/documents/{id}/approve` ❌
  - `PUT /portallogistice/admin/documents/{id}/reject` ❌

- When document approved/rejected:
  - Update document status
  - Update user's document path in `portal_logistices` table (for IBAN/national address)
  - Create notification for user

**Implementation Priority:** 🟢 **NICE TO HAVE (Priority 3)**

---

## 🗄️ Database Schema Changes Required

### New Tables Needed:

1. **portal_logistice_payments**
2. **portal_logistice_documents**
3. **portal_logistice_notifications**

### Columns to Add to `portal_logistices`:

```sql
ALTER TABLE portal_logistices ADD COLUMN iban_document_path VARCHAR(500) NULL;
ALTER TABLE portal_logistices ADD COLUMN national_address_document_path VARCHAR(500) NULL;
ALTER TABLE portal_logistices ADD COLUMN payment_receipt_path VARCHAR(500) NULL;
ALTER TABLE portal_logistices ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_upload_deadline TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_uploaded_at TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_upload_status ENUM('pending', 'uploaded', 'overdue') NULL;
ALTER TABLE portal_logistices ADD COLUMN contract_starts_at TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN payment_option ENUM('full', 'half_plus_rest') NULL;
ALTER TABLE portal_logistices ADD COLUMN rest_payment_deadline TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN payment_schedule JSON NULL;
```

---

## 📍 API Endpoint Status Summary

### Priority 1 (Critical for MVP) - ❌ ALL MISSING

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /portallogistice/payments` | ❌ | Need to create |
| `GET /portallogistice/payments/{contractId}` | ❌ | Need to create |
| `GET /portallogistice/payments/summary` | ❌ | Need to create |
| `POST /portallogistice/payments/report-missing` | ❌ | Need to create |
| `POST /portallogistice/documents/upload` | ❌ | Need to create |
| `GET /portallogistice/documents` | ❌ | Need to create |
| `GET /portallogistice/contracts/{id}/receipt-status` | ❌ | Need to create |
| `POST /portallogistice/contracts/{id}/upload-receipt` | ❌ | Need to create |
| `POST /portallogistice/contracts/validate` | ❌ | Need to create |
| `GET /portallogistice/account-details` | ❌ | Need to create |
| `GET /portallogistice/contracts/{id}/payments` | ❌ | Need to create |
| `PUT /portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent` | ❌ | Need to create |

### Priority 2 (Important) - ❌ ALL MISSING

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /portallogistice/notifications` | ❌ | Need to create |
| `PUT /portallogistice/notifications/{id}/read` | ❌ | Need to create |
| `PUT /portallogistice/notifications/{id}/dismiss` | ❌ | Need to create |
| `GET /portallogistice/analytics/summary` | ❌ | Need to create |
| `GET /portallogistice/analytics/payments` | ❌ | Need to create |
| `GET /portallogistice/contracts/{id}/timeline` | ❌ | Need to create |

### Priority 3 (Nice to Have) - ❌ ALL MISSING

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /portallogistice/admin/documents` | ❌ | Need to create |
| `PUT /portallogistice/admin/documents/{id}/approve` | ❌ | Need to create |
| `PUT /portallogistice/admin/documents/{id}/reject` | ❌ | Need to create |

---

## 🔧 Business Logic Validation Status

### Contract Creation Rules:

| Rule | Status | Implementation |
|------|--------|----------------|
| ❌ Block rental if no approved selling | ❌ NOT ENFORCED | Need to add validation |
| ❌ Block new selling if previous rental not created | ❌ NOT ENFORCED | Need to add validation |
| ❌ Block 3rd contract if no receipts uploaded | ❌ NOT ENFORCED | Need to add validation |
| ❌ Max 2 pending receipts simultaneously | ❌ NOT ENFORCED | Need to add validation |

### Receipt Upload Rules:

| Rule | Status | Implementation |
|------|--------|----------------|
| ❌ Track 48-hour deadline from approval | ❌ NOT IMPLEMENTED | Need to add deadline tracking |
| ❌ Allow upload after deadline (with warning) | ❌ NOT IMPLEMENTED | Need to add validation |
| ❌ Validate receipt belongs to correct contract | ❌ NOT IMPLEMENTED | Need to add validation |

### Payment Rules:

| Rule | Status | Implementation |
|------|--------|----------------|
| ❌ Calculate payment schedule (12 months × 660 SAR) | ❌ NOT IMPLEMENTED | Need to add calculation |
| ❌ Track payment status | ❌ NOT IMPLEMENTED | Need payment table |
| ❌ Handle payment reporting | ❌ NOT IMPLEMENTED | Need reporting endpoint |

### Document Rules:

| Rule | Status | Implementation |
|------|--------|----------------|
| ❌ IBAN doc: One per user | ❌ NOT ENFORCED | Need validation |
| ❌ National Address doc: One per user | ❌ NOT ENFORCED | Need validation |
| ❌ Receipt: One per contract | ❌ NOT ENFORCED | Need validation |

---

## 📝 Implementation Plan

### Phase 1: Critical Features (Week 1-2)

1. **Database Migrations**
   - Create `portal_logistice_payments` table
   - Create `portal_logistice_documents` table
   - Create `portal_logistice_notifications` table
   - Add columns to `portal_logistices` table

2. **Document Upload System**
   - Implement document upload endpoints
   - Add file storage logic
   - Add validation (PDF/image, one per type)

3. **Receipt Upload System**
   - Add receipt upload endpoint
   - Add 48-hour deadline tracking
   - Update contract approval to set deadline

4. **Contract Validation**
   - Add validation endpoint
   - Enforce business rules in contract creation
   - Add receipt requirement checks

### Phase 2: Payment System (Week 2-3)

1. **Payment Tracking**
   - Implement payment endpoints
   - Add payment schedule generation
   - Add payment status tracking

2. **Payment Reporting**
   - Add report missing payment endpoint
   - Add admin mark payment as sent

### Phase 3: Notifications & Analytics (Week 3-4)

1. **Notifications System**
   - Implement notification endpoints
   - Add task generation logic
   - Add notification triggers

2. **Analytics**
   - Implement analytics endpoints
   - Add summary calculations
   - Add payment analytics

### Phase 4: Admin Features (Week 4)

1. **Document Review**
   - Add admin document review endpoints
   - Add approval/rejection logic

2. **Account Details**
   - Add account details endpoint
   - Add configuration management

---

## 🚨 Critical Issues to Address

1. **Contract Approval Doesn't Set Receipt Deadline**
   - Current: `updateContractStatus()` only sets status
   - Needed: Set `approved_at`, `receipt_upload_deadline`, generate payment schedule

2. **No File Upload Infrastructure**
   - Need to set up storage directories
   - Need file validation middleware
   - Need file serving endpoints

3. **No Business Rule Enforcement**
   - Contract creation doesn't validate rules
   - Need validation middleware or service

4. **No Payment System**
   - Payments are not tracked at all
   - Need complete payment lifecycle management

---

## ✅ Action Items for Backend Team

1. ✅ **Review this document** - DONE
2. ⏳ **Create database migrations** - TODO
3. ⏳ **Implement document upload system** - TODO
4. ⏳ **Implement receipt upload with deadline** - TODO
5. ⏳ **Implement payment tracking system** - TODO
6. ⏳ **Add contract validation endpoint** - TODO
7. ⏳ **Implement notifications system** - TODO
8. ⏳ **Implement analytics endpoints** - TODO
9. ⏳ **Add account details endpoint** - TODO
10. ⏳ **Update contract approval to set deadlines** - TODO

---

## 📞 Next Steps

1. **Backend Team:** Review and confirm this analysis
2. **Backend Team:** Provide implementation timeline
3. **Backend Team:** Set up test environment
4. **Frontend Team:** Wait for Priority 1 endpoints before starting Payments page
5. **Frontend Team:** Can start Profile page with document upload (once endpoints ready)

---

## 📊 Summary Statistics

- **Total Endpoints Needed:** 18
- **New Tables Needed:** 3
- **Columns to Add:** 11
- **Priority 1 Endpoints:** 12
- **Priority 2 Endpoints:** 6
- **Priority 3 Endpoints:** 3
- **Estimated Implementation Time:** 3-4 weeks

---

**Report Generated:** January 8, 2025  
**Status:** Ready for Backend Team Review
