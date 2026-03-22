# Migration Readiness Checklist - Backend & Frontend

**Date:** January 2025  
**Status:** Database Migration Completed ✅  
**Purpose:** Verify migration coverage and define backend/frontend responsibilities

---

## 📋 Table of Contents

1. [Database Migration Verification](#database-migration-verification)
2. [Backend Team Checklist](#backend-team-checklist)
3. [Frontend Team Checklist](#frontend-team-checklist)
4. [Important Considerations](#important-considerations)
5. [What Can Start Now](#what-can-start-now)

---

## Database Migration Verification

### ✅ Migration Coverage Check

**Tables Created:**
- ✅ `portal_logistice_users` - User accounts (separated from contracts)
- ✅ `portal_logistices` - Contracts only (users migrated out)
- ✅ `portal_logistice_payments` - Payment tracking (12 × 660 SAR)
- ✅ `portal_logistice_documents` - Document management (IBAN, National Address, Receipts)
- ✅ `portal_logistice_notifications` - Notifications/tasks system

**Columns Added to `portal_logistices`:**
- ✅ `user_id` - Foreign key to `portal_logistice_users`
- ✅ `approved_at` - When contract approved
- ✅ `denied_at` - When contract denied
- ✅ `denial_reason` - Reason for denial
- ✅ `receipt_upload_deadline` - 48-hour deadline
- ✅ `receipt_uploaded_at` - When receipt uploaded
- ✅ `receipt_upload_status` - Status (pending, uploaded, overdue)
- ✅ `payment_receipt_path` - Receipt file path
- ✅ `contract_starts_at` - Contract start (approved + 65 days)
- ✅ `payment_option` - Full or half_plus_rest
- ✅ `rest_payment_deadline` - Rest payment deadline
- ✅ `payment_schedule` - JSON payment schedule cache

**Foreign Keys:**
- ✅ `portal_logistices.user_id` → `portal_logistice_users.id` (RESTRICT)
- ✅ `portal_logistice_payments.user_id` → `portal_logistice_users.id` (RESTRICT)
- ✅ `portal_logistice_payments.contract_id` → `portal_logistices.id` (CASCADE)
- ✅ `portal_logistice_documents.user_id` → `portal_logistice_users.id` (CASCADE)
- ✅ `portal_logistice_documents.contract_id` → `portal_logistices.id` (CASCADE)
- ✅ `portal_logistice_documents.reviewer_id` → `admins.id` (SET NULL)
- ✅ `portal_logistice_notifications.user_id` → `portal_logistice_users.id` (CASCADE)
- ✅ `portal_logistice_notifications.related_contract_id` → `portal_logistices.id` (CASCADE)
- ✅ `portal_logistice_notifications.related_document_id` → `portal_logistice_documents.id` (CASCADE)

**Result:** ✅ **Database migration is COMPLETE and covers all requirements**

---

## Backend Team Checklist

### ✅ Database Setup (DONE)

- [x] Run migration script
- [x] Verify all tables created
- [x] Verify all foreign keys work
- [x] Verify indexes are created
- [x] Test data migration (users migrated correctly)
- [x] Verify contracts linked to users via `user_id`

### 🔴 Priority 1: Update Existing Endpoints (Week 1)

**Critical:** Backend needs to update existing endpoints to work with new structure

#### 1.1 Authentication Endpoints (UPDATE REQUIRED)

**Current:** User login returns user from `portal_logistices` (where `contract_type IS NULL`)  
**New:** User login must return user from `portal_logistice_users` table

**Endpoints to Update:**
- ✅ `POST /portallogistice/login` - Now queries `portal_logistice_users`
- ✅ `POST /portallogistice/admin/login` - No change needed (admins table unchanged)
- ✅ `POST /portallogistice/logout` - No change needed
- ✅ `POST /portallogistice/admin/logout` - No change needed

**Code Changes Needed:**
```php
// OLD:
$user = PortalLogistice::whereNull('contract_type')
    ->where(function($query) use ($login) {
        $query->where('email', $login)
              ->orWhere('phone', $login)
              ->orWhere('national_id', $login);
    })
    ->first();

// NEW:
$user = PortalLogisticeUser::where(function($query) use ($login) {
        $query->where('email', $login)
              ->orWhere('phone', $login)
              ->orWhere('national_id', $login);
    })
    ->first();
```

---

#### 1.2 Profile Endpoints (UPDATE REQUIRED)

**Endpoints to Update:**
- ✅ `GET /portallogistice/profile` - Now queries `portal_logistice_users` table
- ✅ `PUT /portallogistice/profile` - Now updates `portal_logistice_users` table

**Code Changes Needed:**
```php
// OLD:
$user = PortalLogistice::where('national_id', auth()->user()->national_id)
    ->whereNull('contract_type')
    ->first();

// NEW:
$user = PortalLogisticeUser::where('national_id', auth()->user()->national_id)
    ->first();
```

---

#### 1.3 Contract Endpoints (UPDATE REQUIRED)

**Endpoints to Update:**
- ✅ `GET /portallogistice/contracts` - Must filter by `user_id` instead of `national_id`
- ✅ `POST /portallogistice/register` - Must set `user_id` when creating contract

**Code Changes Needed:**
```php
// OLD:
$contracts = PortalLogistice::where('national_id', auth()->user()->national_id)
    ->whereNotNull('contract_type')
    ->get();

// NEW:
$contracts = PortalLogistice::where('user_id', auth()->user()->id)
    ->whereNotNull('contract_type')
    ->get();
```

**Contract Creation:**
```php
// OLD:
$contract = PortalLogistice::create([
    'national_id' => $request->national_id,
    'contract_type' => $request->contract_type,
    // ... other fields
]);

// NEW:
$contract = PortalLogistice::create([
    'user_id' => auth()->user()->id,  // CRITICAL: Use user_id, not national_id
    'national_id' => $request->national_id,  // Keep for denormalized queries
    'contract_type' => $request->contract_type,
    // ... other fields
]);
```

---

#### 1.4 Admin Endpoints (UPDATE REQUIRED)

**Endpoints to Update:**
- ✅ `GET /portallogistice/admin/users` - Now queries `portal_logistice_users` table
- ✅ `GET /portallogistice/admin/users/{national_id}` - Now queries `portal_logistice_users` table
- ✅ `POST /portallogistice/admin/users` - Now creates in `portal_logistice_users` table
- ✅ `PUT /portallogistice/admin/users/{national_id}` - Now updates `portal_logistice_users` table
- ✅ `PUT /portallogistice/admin/users/{national_id}/status` - Now updates `portal_logistice_users` table
- ✅ `GET /portallogistice/admin/contracts` - Must use `user_id` for joins
- ✅ `GET /portallogistice/admin/contracts/{id}` - Must join with `portal_logistice_users`
- ✅ `PUT /portallogistice/admin/contracts/{id}/status` - **CRITICAL: Must set deadline when approving**

**Contract Approval Update (CRITICAL):**
```php
// When approving contract (status = 1):
if ($request->status == 1) {
    $contract->approved_at = now();
    $contract->receipt_upload_deadline = now()->addHours(48);  // CRITICAL: Set deadline
    $contract->receipt_upload_status = 'pending';
    $contract->contract_starts_at = now()->addDays(65);  // For rental contracts
    
    // If rental contract, generate payment schedule
    if ($contract->contract_type === 'rental') {
        // Generate 12 monthly payments (660 SAR each)
        // Store in portal_logistice_payments table
    }
}
```

---

### 🔴 Priority 2: Build New Endpoints (Week 1-2)

#### 2.1 Document Upload System (4 endpoints)

- [ ] `POST /portallogistice/documents/upload` - Upload document (IBAN, National Address, Receipt)
  - **Validation:** Only one IBAN doc per user, one National Address per user, one receipt per contract
  - **File Storage:** Save to `storage/app/public/documents/`
  - **File Types:** PDF, JPG, PNG (max 5MB)
  - **Response:** Document object with status 'pending'

- [ ] `GET /portallogistice/documents` - List user documents
  - **Query Params:** `type`, `status` (optional filters)
  - **Response:** Array of documents with status

- [ ] `GET /portallogistice/documents/{id}` - Get specific document
  - **Response:** Document object with all details

- [ ] `GET /portallogistice/documents/{id}/download` - Download document file
  - **Response:** File download (PDF/Image)

**Important Considerations:**
- Store files in `storage/app/public/documents/` or `public/documents/`
- Ensure public access is configured (Laravel storage link)
- Validate file types and size
- Hash files for duplicate detection (optional but recommended)

---

#### 2.2 Receipt Upload System (2 endpoints)

- [ ] `GET /portallogistice/contracts/{id}/receipt-status` - Get receipt upload status
  - **Response:** Status, deadline, hours_remaining, is_overdue
  - **Logic:** Calculate hours_remaining from deadline
  - **Note:** Only for SELLING contracts

- [ ] `POST /portallogistice/contracts/{id}/upload-receipt` - Upload receipt
  - **Validation:** Contract must be approved, only one receipt per contract
  - **File Storage:** Save to `storage/app/public/documents/`
  - **Business Logic:**
    - Create document record in `portal_logistice_documents` (type='receipt')
    - Update `portal_logistices.payment_receipt_path`
    - Update `portal_logistices.receipt_uploaded_at`
    - Update `portal_logistices.receipt_upload_status` to 'uploaded'
    - Flag as `is_late` if past deadline (but allow upload)

---

#### 2.3 Admin Document Review (3 endpoints)

- [ ] `GET /portallogistice/admin/documents` - List all documents for admin review
  - **Query Params:** `type`, `status` (default: pending), `search`, `per_page`, `page`
  - **Response:** Paginated list with user information
  - **Join:** Must join with `portal_logistice_users` to get user name

- [ ] `PUT /portallogistice/admin/documents/{id}/approve` - Approve document
  - **Business Logic:**
    - Update document status to 'approved'
    - Set `reviewed_at` and `reviewer_id`
    - If IBAN/National Address: Update `portal_logistice_users` document paths
    - If Receipt: Already linked to contract (no update needed)
    - Create notification for user (document approved)

- [ ] `PUT /portallogistice/admin/documents/{id}/reject` - Reject document
  - **Request Body:** `{ reason: string }`
  - **Business Logic:**
    - Update document status to 'rejected'
    - Set `rejection_reason`, `reviewed_at`, and `reviewer_id`
    - Create notification for user (document rejected with reason)

---

### 🟡 Priority 3: Additional Features (Week 2-3)

#### 3.1 Payment Tracking Endpoints

- [ ] `GET /portallogistice/payments` - Get all user payments
- [ ] `GET /portallogistice/payments/{contractId}` - Get payments for contract
- [ ] `GET /portallogistice/payments/summary` - Get payment summary
- [ ] `POST /portallogistice/payments/report-missing` - Report missing payment
- [ ] `PUT /portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent` - Mark payment as sent

#### 3.2 Notifications System

- [ ] `GET /portallogistice/notifications` - Get user notifications
- [ ] `PUT /portallogistice/notifications/{id}/read` - Mark as read
- [ ] `PUT /portallogistice/notifications/{id}/dismiss` - Dismiss notification
- [ ] Auto-generate notifications:
  - When contract approved → "Upload Receipt" task
  - When profile incomplete → "Complete Profile" task
  - When documents missing → "Upload Documents" task
  - When orphan selling exists → "Create Rental" task

#### 3.3 Analytics Endpoints

- [ ] `GET /portallogistice/analytics/summary` - User analytics summary
- [ ] `GET /portallogistice/analytics/payments` - Payment analytics

---

## Frontend Team Checklist

### ✅ What We Can Start NOW (No Backend Required)

**Foundation & UI Components:**
- [x] Sidebar navigation component
- [x] Dashboard layout restructure
- [x] UI components (buttons, cards, modals)
- [x] CSS/styling for document upload sections
- [x] Countdown timer component (for 48-hour deadline)
- [x] File upload component (generic)
- [x] Document status badges

**Pages (With Mock Data):**
- [ ] Profile page layout (mock data)
- [ ] Documents list page (mock data)
- [ ] Contract details page (mock data)
- [ ] Admin documents page (mock data)
- [ ] Document review modal (mock data)

---

### ⏳ What Needs Backend First

**Document Upload:**
- [ ] IBAN document upload (needs: `POST /portallogistice/documents/upload`)
- [ ] National Address upload (needs: `POST /portallogistice/documents/upload`)
- [ ] Documents list display (needs: `GET /portallogistice/documents`)
- [ ] Document status display (needs: `GET /portallogistice/documents`)

**Receipt Upload:**
- [ ] Receipt upload component (needs: `GET /portallogistice/contracts/{id}/receipt-status`, `POST /portallogistice/contracts/{id}/upload-receipt`)
- [ ] Receipt status display (needs: `GET /portallogistice/contracts/{id}/receipt-status`)
- [ ] Deadline countdown (needs: `GET /portallogistice/contracts/{id}/receipt-status`)

**Admin Features:**
- [ ] Admin documents page (needs: `GET /portallogistice/admin/documents`)
- [ ] Document review modal (needs: `PUT /portallogistice/admin/documents/{id}/approve`, `PUT /portallogistice/admin/documents/{id}/reject`)

---

## Important Considerations

### 🔴 Critical: Backend Team MUST Know

#### 1. User Authentication Changed

**OLD Structure:**
- Users stored in `portal_logistices` (where `contract_type IS NULL`)
- Contracts stored in `portal_logistices` (where `contract_type IS NOT NULL`)

**NEW Structure:**
- Users stored in `portal_logistice_users` (separate table)
- Contracts stored in `portal_logistices` (with `user_id` foreign key)

**Impact:**
- All queries for users must use `PortalLogisticeUser` model
- All queries for contracts must use `user_id` instead of `national_id` for filtering
- Authentication endpoints must query `portal_logistice_users` table

---

#### 2. Contract Creation Must Set user_id

**Critical:** When creating contracts, backend MUST:
```php
$contract = PortalLogistice::create([
    'user_id' => auth()->user()->id,  // REQUIRED: Foreign key
    'national_id' => auth()->user()->national_id,  // Keep for denormalized queries
    'contract_type' => $request->contract_type,
    // ... other fields
]);
```

**Why:** Foreign key constraint requires `user_id` to exist in `portal_logistice_users` table.

---

#### 3. Contract Approval Must Set Deadline

**Critical:** When admin approves contract (`status = 1`), backend MUST:
```php
if ($request->status == 1) {
    $contract->approved_at = now();
    $contract->receipt_upload_deadline = now()->addHours(48);  // REQUIRED
    $contract->receipt_upload_status = 'pending';  // REQUIRED
    
    // For rental contracts:
    if ($contract->contract_type === 'rental') {
        $contract->contract_starts_at = now()->addDays(65);
        // Generate payment schedule in portal_logistice_payments table
    }
}
```

**Why:** Frontend needs deadline to show countdown timer and allow receipt upload.

---

#### 4. File Storage Configuration

**Required Setup:**
- Create storage directory: `storage/app/public/documents/`
- Configure Laravel storage link: `php artisan storage:link`
- Ensure public access is working
- Validate file types (PDF, JPG, PNG)
- Validate file size (max 5MB)

**File Naming Convention:**
- IBAN: `iban_{national_id}_{timestamp}.pdf`
- National Address: `national_address_{national_id}_{timestamp}.pdf`
- Receipt: `receipt_{contract_id}_{national_id}_{timestamp}.pdf`

---

#### 5. Join Queries Changed

**OLD:**
```php
$contracts = PortalLogistice::where('national_id', $nationalId)
    ->whereNotNull('contract_type')
    ->get();
```

**NEW:**
```php
$contracts = PortalLogistice::where('user_id', $userId)
    ->whereNotNull('contract_type')
    ->get();
```

**For Admin (with user info):**
```php
$contracts = PortalLogistice::with('user')
    ->whereNotNull('contract_type')
    ->get();
```

**Model Relationship (Required):**
```php
// PortalLogistice model (contracts)
public function user() {
    return $this->belongsTo(PortalLogisticeUser::class, 'user_id');
}

// PortalLogisticeUser model (users)
public function contracts() {
    return $this->hasMany(PortalLogistice::class, 'user_id');
}
```

---

## What Can Start Now

### ✅ Frontend: Start Building UI (No Backend Required)

**Week 1: Foundation**
1. ✅ Sidebar navigation component
2. ✅ Dashboard layout restructure
3. ✅ Profile page layout (mock data)
4. ✅ Documents list page layout (mock data)
5. ✅ File upload component
6. ✅ Document status badges
7. ✅ Countdown timer component

**Week 2: Connect to Backend (Once APIs Ready)**
1. ⏳ IBAN document upload (waiting for: `POST /portallogistice/documents/upload`)
2. ⏳ National Address upload (waiting for: `POST /portallogistice/documents/upload`)
3. ⏳ Documents list (waiting for: `GET /portallogistice/documents`)
4. ⏳ Receipt upload (waiting for: receipt endpoints)
5. ⏳ Admin document review (waiting for: admin document endpoints)

---

### ✅ Backend: Start Building APIs (Database Ready)

**Week 1: Update Existing + Priority 1**
1. ✅ Update authentication endpoints (use `portal_logistice_users`)
2. ✅ Update profile endpoints (use `portal_logistice_users`)
3. ✅ Update contract endpoints (use `user_id`)
4. ✅ Update admin endpoints (use `portal_logistice_users`)
5. ✅ Build document upload endpoints (Priority 1)
6. ✅ Update contract approval (set deadline)

**Week 2: Priority 2 + 3**
1. ✅ Build receipt upload endpoints
2. ✅ Build admin document review endpoints
3. ✅ Build payment tracking endpoints
4. ✅ Build notifications system

---

## Summary

### ✅ Database Migration: **COMPLETE**
- All tables created
- All foreign keys set
- All indexes added
- Data migrated correctly

### ✅ Backend Team: **FOCUS ON APIs**

**Must Do First (Week 1):**
1. ✅ Update existing endpoints to use new table structure
2. ✅ Build document upload endpoints (4 endpoints)
3. ✅ Update contract approval to set deadline

**Then Do (Week 2):**
1. ✅ Build receipt upload endpoints (2 endpoints)
2. ✅ Build admin document review endpoints (3 endpoints)

**Total: 10 new endpoints + update 15 existing endpoints**

### ✅ Frontend Team: **CAN START NOW**

**Start Building (No Backend Required):**
- ✅ UI components and layouts
- ✅ Pages with mock data
- ✅ Navigation and routing
- ✅ Styling and animations

**Wait For Backend:**
- ⏳ Document upload (needs 4 endpoints)
- ⏳ Receipt upload (needs 2 endpoints)
- ⏳ Admin document review (needs 3 endpoints)

---

## Answer to Your Question

### **Q: Will migration give you all you need? Backend team just focus on APIs?**

**A: YES ✅**

The migration is **COMPLETE** and covers everything. Backend team needs to:

1. **Update existing endpoints** to use new table structure (15 endpoints)
2. **Build new endpoints** for document/receipt system (10 endpoints)

That's it! Database is ready. Just focus on APIs.

---

### **Q: We're set to work on users and admins dashboard once backend finishes or they need to put other things in mind?**

**A: You can START NOW, but need backend for integration**

**What You Can Do NOW:**
- ✅ Build UI components
- ✅ Build page layouts
- ✅ Build navigation/sidebar
- ✅ Style everything
- ✅ Use mock data for testing

**What You Need Backend For:**
- ⏳ Actual document uploads (waiting for upload endpoint)
- ⏳ Real data display (waiting for GET endpoints)
- ⏳ Receipt upload functionality (waiting for receipt endpoints)
- ⏳ Admin document review (waiting for admin endpoints)

**Recommendation:**
- **Frontend:** Build UI/UX now with mock data. Once backend APIs are ready (Week 1-2), connect them. This way you're ready and just need to swap mock data for real API calls.

---

**Status:** ✅ Database Ready | 🔴 Backend: Update Existing + Build New APIs | 🟢 Frontend: Can Start Building UI

**Last Updated:** January 2025
