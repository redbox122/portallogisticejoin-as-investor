# Complete UX Flow Documentation
## Admin User Creation → Contract Start → Monthly Payments

**Project:** Portal Logistics Dashboard  
**Date:** January 2025  
**Purpose:** Complete step-by-step documentation of the entire user journey from account creation to receiving monthly payments

---

## Table of Contents

1. [Phase 1: Admin Creates User Account](#phase-1-admin-creates-user-account)
2. [Phase 2: User First Login & Profile Setup](#phase-2-user-first-login--profile-setup)
3. [Phase 3: User Creates Contracts](#phase-3-user-creates-contracts)
4. [Phase 4: Admin Reviews & Approves Contracts](#phase-4-admin-reviews--approves-contracts)
5. [Phase 5: User Uploads Receipt](#phase-5-user-uploads-receipt)
6. [Phase 6: Contract Start & Payment Schedule](#phase-6-contract-start--payment-schedule)
7. [Phase 7: Monthly Payment Processing](#phase-7-monthly-payment-processing)
8. [Flow Diagrams](#flow-diagrams)
9. [Technical Details](#technical-details)

---

## Phase 1: Admin Creates User Account

### Step 1.1: Admin Navigates to User Management
- **Location:** Admin Dashboard → Users Tab
- **Component:** `src/Pages/AdminDashboard.js` → `src/Components/UserManagement.js`
- **UI:** Admin clicks "Users" in sidebar navigation
- **Endpoint:** `GET /portallogistice/admin/users` (loads existing users list)

### Step 1.2: Admin Opens Create User Modal
- **Action:** Admin clicks "Create New User" button
- **UI Component:** Create User Modal opens
- **Form Fields:**
  - First Name (optional)
  - Family Name (optional)
  - Login Type (required): Email, Phone, or National ID
  - Login Value (required): Based on selected type
  - Password (required)
  - IBAN (optional)
  - Max Contracts Allowed (optional, null = unlimited)
  - Account Status: Active/Inactive (default: Active)
  - Checkbox: "Send email with login credentials" (only if email login type)

### Step 1.3: Admin Submits User Creation
- **Validation:**
  - Login value is required
  - Password is required
  - If email type: Valid email format
  - If phone type: Valid phone number format
  - If national_id type: Valid national ID format
- **API Call:** `POST /portallogistice/admin/users`
- **Request Body:**
  ```json
  {
    "first_name": "أحمد",
    "family_name": "العلي",
    "email": "user@example.com",  // OR phone OR national_id
    "password": "password123",
    "iban": "SA1234567890123456789012",
    "max_contracts_allowed": 2,
    "is_active": true,
    "send_email": true  // Optional, only if email provided
  }
  ```
- **Backend Actions:**
  - Creates user record in `portal_logistice_users` table
  - If `send_email: true`, sends email with login credentials
  - Sets account status (active/inactive)
  - Stores IBAN if provided
  - Sets contract limit if provided

### Step 1.4: Success Confirmation
- **UI:** Success notification appears
- **Message:** "User created successfully" (or "User created and email sent" if email was sent)
- **Action:** Modal closes, users list refreshes
- **New User Status:** Account created, `is_active: true`, ready for login

---

## Phase 2: User First Login & Profile Setup

### Step 2.1: User Receives Login Credentials
- **Method 1:** Email sent by admin (if `send_email: true`)
- **Method 2:** Admin provides credentials manually
- **Credentials:** Login (email/phone/national_id) + Password

### Step 2.2: User Logs In
- **Location:** Login Page
- **Component:** `src/Pages/Login.js`
- **Form Fields:**
  - Login (email, phone, or national_id)
  - Password
- **API Call:** `POST /portallogistice/login`
- **Request Body:**
  ```json
  {
    "login": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "user": {
        "id": 24,
        "national_id": "1234567890",
        "email": "user@example.com",
        "phone": "0501234567",
        "first_name": "أحمد",
        "family_name": "العلي",
        "is_active": true
      }
    }
  }
  ```
- **Action:** User redirected to Dashboard

### Step 2.3: Profile Completion Check
- **Component:** `src/Pages/UserDashboard.js`
- **On Dashboard Load:**
  - API Call: `GET /portallogistice/profile`
  - Checks for missing required fields:
    - `father_name`
    - `grandfather_name`
    - `birth_date`
    - `region`
    - `national_address_email`
    - `bank_name`
    - `iban`
    - `iban_document_path` (IBAN document)
    - `national_address_document_path` (National Address document)
- **If Missing Fields:** Profile Completion Modal opens automatically

### Step 2.4: User Completes Profile (If Required)
- **Component:** `src/Components/ProfileCompletionModal.js`
- **Form Fields:**
  - Father Name
  - Grandfather Name
  - Birth Date
  - Region
  - National Address Email
  - Bank Name
  - IBAN
  - IBAN Document Upload
  - National Address Document Upload
- **API Call:** `PUT /portallogistice/profile`
- **Document Upload:** `POST /portallogistice/documents/upload`
  - Type: `iban_doc` or `national_address_doc`
  - File: PDF or image (max 5MB)
- **After Completion:** Modal closes, profile data refreshed

### Step 2.5: User Dashboard Loads
- **Component:** `src/Pages/UserDashboard.js`
- **Data Loaded:**
  - User Profile: `GET /portallogistice/profile`
  - User Contracts: `GET /portallogistice/contracts`
  - Notifications: `GET /portallogistice/notifications`
- **UI Elements:**
  - Profile summary card
  - Contracts list
  - "Add Contract" button
  - Notifications/tasks list

---

## Phase 3: User Creates Contracts

### Step 3.1: User Clicks "Add Contract"
- **Location:** User Dashboard
- **Component:** `src/Pages/UserDashboard.js`
- **Validation Checks:**
  - Contract limit check: If `max_contracts_allowed` is set, counts existing selling contracts
  - Orphan selling check: If user has selling contract without linked rental, shows warning modal
- **If Orphan Selling Exists:**
  - Warning modal appears: "You have an unlinked selling contract. Please create rental contract first."
  - User can proceed to create rental for orphan selling

### Step 3.2: Contract Creation Form Opens
- **Component:** `src/Components/ContractForm.js`
- **Contract Validation:** `POST /portallogistice/contracts/validate`
  - Checks business rules:
    - Can create selling? (no pending receipts, etc.)
    - Can create rental? (must have approved selling)
    - Contract limit reached?
- **Form Steps:**

#### Step 3.2.1: Confirm Contract Type
- **Options:**
  - Selling Contract (6,600 SAR)
  - Rental Contract (660 SAR/month for 12 months)
- **If Rental:** Must link to existing approved selling contract
- **User Action:** Selects contract type, clicks "Continue"

#### Step 3.2.2: Nafath Verification (Selling Contract)
- **For Selling Contracts:**
  - User clicks "Start Verification"
  - API Call: `POST /portallogistice/register`
    - Request: `{ "contract_type": "selling" }`
  - Response includes `nafath_code`
  - User enters Nafath code in mobile app
  - Frontend polls: `GET /portallogistice/contracts/{id}/status`
  - When signed: PDF contract generated
  - User downloads contract PDF
  - Status: Contract created, status = `null` (pending admin approval)

#### Step 3.2.3: Create Rental Contract (After Selling Approved)
- **For Rental Contracts:**
  - Must have approved selling contract
  - User selects which selling contract to link
  - API Call: `POST /portallogistice/register`
    - Request: `{ "contract_type": "rental", "linked_selling_contract_id": 1 }`
  - Nafath verification (same process as selling)
  - Contract created, status = `null` (pending admin approval)

### Step 3.3: Contract Status
- **After Creation:**
  - Contract status: `null` (pending)
  - Contract appears in user's contracts list
  - User can download unsigned contract PDF
  - Notification created: "Contract pending approval"

---

## Phase 4: Admin Reviews & Approves Contracts

### Step 4.1: Admin Views Pending Contracts
- **Location:** Admin Dashboard → Contracts Tab
- **Component:** `src/Components/ContractManagement.js`
- **API Call:** `GET /portallogistice/admin/contracts?status=pending`
- **UI:** Table showing:
  - Contract ID
  - User (national_id, name)
  - Contract Type (selling/rental)
  - Amount
  - Created Date
  - Actions (Approve/Deny buttons)

### Step 4.2: Admin Reviews Contract Details
- **Action:** Admin clicks on contract row or "View Details"
- **Modal Opens:** Shows full contract details:
  - User information
  - Contract type and amount
  - Signed contract PDF (downloadable)
  - Linked contracts (if rental, shows selling contract)
  - Created date
  - Status

### Step 4.3: Admin Approves Contract
- **Action:** Admin clicks "Approve" button
- **API Call:** `PUT /portallogistice/admin/contracts/{id}/status`
- **Request Body:**
  ```json
  {
    "status": 1
  }
  ```
- **Backend Actions (CRITICAL):**
  ```php
  if ($request->status == 1) {
      // Approve contract
      $contract->status = 1;
      $contract->approved_at = now();
      
      // For SELLING contracts:
      $contract->receipt_upload_deadline = now()->addHours(48);
      $contract->receipt_upload_status = 'pending';
      
      // For RENTAL contracts:
      $contract->contract_starts_at = now()->addDays(65);
      
      // Generate payment schedule (for rental contracts)
      if ($contract->contract_type === 'rental') {
          // Create 12 payment records in portal_logistice_payments
          // Each payment: 660 SAR, monthly from contract_starts_at
          for ($month = 1; $month <= 12; $month++) {
              Payment::create([
                  'contract_id' => $contract->id,
                  'national_id' => $contract->national_id,
                  'amount' => 660.00,
                  'month_number' => $month,
                  'due_date' => $contract->contract_starts_at->addMonths($month - 1),
                  'status' => 'pending'
              ]);
          }
          
          // Cache payment schedule in contract
          $contract->payment_schedule = [...]; // JSON array
      }
      
      $contract->save();
      
      // Create notification for user
      Notification::create([
          'national_id' => $contract->national_id,
          'type' => $contract->contract_type === 'selling' ? 'upload_receipt' : 'contract_approved',
          'title' => 'Contract Approved',
          'priority' => $contract->contract_type === 'selling' ? 'urgent' : 'normal',
          'deadline' => $contract->receipt_upload_deadline, // For selling
          'action_url' => '/dashboard/tasks?action=upload_receipt&contract_id=' . $contract->id
      ]);
  }
  ```
- **Success:** Notification shown, contract list refreshes

### Step 4.4: Admin Denies Contract (Alternative)
- **Action:** Admin clicks "Deny" button
- **Rejection Dialog Opens:**
  - Required: Denial reason (text field)
  - Optional: "Send email notification" checkbox
- **API Call:** `PUT /portallogistice/admin/contracts/{id}/status`
- **Request Body:**
  ```json
  {
    "status": 0,
    "denial_reason": "Reason for denial",
    "send_email": true
  }
  ```
- **Backend Actions:**
  - Contract status = 0 (denied)
  - `denied_at` = now()
  - Notification created for user
  - Email sent (if requested)

---

## Phase 5: User Uploads Receipt (Selling Contracts Only)

### Step 5.1: User Receives Notification
- **Trigger:** After selling contract approval
- **Notification Type:** `upload_receipt`
- **Priority:** `urgent`
- **Deadline:** 48 hours from approval
- **Location:** User Dashboard → Tasks/Notifications
- **Component:** `src/Pages/Dashboard/TasksPage.js`

### Step 5.2: User Views Receipt Upload Task
- **UI:** Task card shows:
  - Title: "Upload Payment Receipt"
  - Description: "Please upload payment receipt for contract #X within 48 hours"
  - Deadline countdown (hours remaining)
  - Status: Pending
  - Action button: "Upload Receipt"

### Step 5.3: User Clicks "Upload Receipt"
- **Action:** Opens receipt upload modal/form
- **Component:** Receipt upload form
- **Form Fields:**
  - Contract ID (pre-filled)
  - File upload (PDF or image, max 5MB)
  - Notes (optional)

### Step 5.4: User Uploads Receipt
- **API Call:** `POST /portallogistice/documents/upload`
- **Request (Form Data):**
  ```
  type: receipt
  contract_id: 1
  file: [binary file]
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "document": {
        "id": 3,
        "type": "receipt",
        "status": "pending",
        "file_path": "/storage/documents/receipt_1_1234567890.pdf",
        "uploaded_at": "2026-01-11 10:00:00"
      }
    }
  }
  ```
- **Backend Actions:**
  - Document record created in `portal_logistice_documents`
  - File saved to storage
  - Contract `receipt_uploaded_at` = now()
  - Contract `receipt_upload_status` = 'uploaded' (if within deadline) or 'overdue' (if past deadline)
  - Notification status updated to "completed"

### Step 5.5: Admin Reviews Receipt (Optional)
- **Location:** Admin Dashboard → Documents Tab
- **Action:** Admin can approve/reject receipt
- **If Approved:** Receipt linked to contract permanently
- **If Rejected:** User notified, can re-upload

---

## Phase 6: Contract Start & Payment Schedule

### Step 6.1: Contract Start Date Calculation
- **For Rental Contracts:**
  - `contract_starts_at` = `approved_at` + 65 days
  - Calculated automatically when contract is approved
  - Stored in contract record

### Step 6.2: Payment Schedule Generation
- **Trigger:** When rental contract is approved
- **Backend Process:**
  - Creates 12 payment records in `portal_logistice_payments` table
  - Each payment:
    - Amount: 660 SAR
    - Month number: 1-12
    - Due date: Monthly from `contract_starts_at`
    - Status: `pending`
  - Payment schedule cached in contract `payment_schedule` JSON field

### Step 6.3: User Views Payment Schedule
- **Location:** User Dashboard → Payments Tab
- **Component:** `src/Pages/Dashboard/PaymentsPage.js`
- **API Call:** `GET /portallogistice/payments`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "payments": [
        {
          "id": 1,
          "contract_id": 2,
          "amount": 660.00,
          "month_number": 1,
          "due_date": "2026-03-16",
          "status": "pending",
          "contract": {
            "id": 2,
            "contract_type": "rental",
            "contract_starts_at": "2026-03-16 10:00:00"
          }
        },
        // ... 11 more payments
      ]
    }
  }
  ```
- **UI:** Table showing:
  - Payment number (month)
  - Amount
  - Due date
  - Status (pending/sent/received)
  - Contract reference

### Step 6.4: Payment Summary Display
- **API Call:** `GET /portallogistice/payments/summary`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "total_received": 0.00,
      "this_month": 0.00,
      "pending": 7920.00,
      "next_payment": {
        "contract_id": 2,
        "amount": 660.00,
        "due_date": "2026-03-16",
        "days_remaining": 65
      }
    }
  }
  ```
- **UI:** Summary cards showing:
  - Total received
  - This month's payment
  - Pending amount
  - Next payment date

---

## Phase 7: Monthly Payment Processing

### Step 7.1: Payment Due Date Approaches
- **Timeline:** Each month, on the due date (e.g., 16th of each month)
- **Status:** Payment status = `pending`
- **User View:** Payment appears in payments list with "pending" status

### Step 7.2: Admin Processes Payment
- **Location:** Admin Dashboard → Payments Tab
- **Component:** `src/Pages/Admin/PaymentsPage.js`
- **API Call:** `GET /portallogistice/admin/payments`
  - Query params: `status=pending`, `date_from`, `date_to`
- **UI:** Table showing:
  - Contract ID
  - User (national_id)
  - Amount
  - Due date
  - Status
  - Actions

### Step 7.3: Admin Marks Payment as Sent
- **Action:** Admin clicks "Mark as Sent" button
- **API Call:** `PUT /portallogistice/admin/payments/{paymentId}/status`
- **Request Body:**
  ```json
  {
    "status": "sent"
  }
  ```
- **Backend Actions:**
  ```php
  $payment->status = 'sent';
  $payment->sent_at = now();
  $payment->payment_date = now();
  $payment->save();
  
  // Update payment schedule cache in contract
  $contract = $payment->contract;
  $schedule = json_decode($contract->payment_schedule, true);
  // Update corresponding payment in schedule
  $schedule[$payment->month_number - 1]['status'] = 'sent';
  $schedule[$payment->month_number - 1]['paid_date'] = now();
  $contract->payment_schedule = json_encode($schedule);
  $contract->save();
  
  // Create notification for user
  Notification::create([
      'national_id' => $payment->national_id,
      'type' => 'payment_received',
      'title' => 'Payment Sent',
      'description' => "Payment of {$payment->amount} SAR has been sent for contract #{$payment->contract_id}",
      'priority' => 'normal',
      'action_url' => '/dashboard/payments'
  ]);
  ```
- **Success:** Notification shown, payment list refreshes

### Step 7.4: User Receives Payment
- **Real-World:** User receives payment in their bank account (IBAN)
- **User Action:** User can mark payment as received (optional)
- **API Call:** `PUT /portallogistice/payments/{paymentId}/mark-received` (if implemented)
- **Or:** Admin marks as received after verification

### Step 7.5: Admin Marks Payment as Received
- **Action:** Admin clicks "Mark as Received" button (after payment.status = 'sent')
- **API Call:** `PUT /portallogistice/admin/payments/{paymentId}/status`
- **Request Body:**
  ```json
  {
    "status": "received"
  }
  ```
- **Backend Actions:**
  ```php
  $payment->status = 'received';
  $payment->received_at = now();
  $payment->save();
  
  // Update payment schedule cache
  // Update analytics
  ```
- **User View:** Payment status updates to "received" in user's payments list

### Step 7.6: User Reports Missing Payment (If Payment Not Received)
- **Location:** User Dashboard → Payments Tab
- **Action:** User clicks "Report Missing" button on pending payment
- **API Call:** `POST /portallogistice/payments/report-missing`
- **Request Body:**
  ```json
  {
    "payment_id": 1,
    "contract_id": 2,
    "expected_date": "2026-03-16",
    "amount": 660.00,
    "notes": "Payment not received in my account"
  }
  ```
- **Backend Actions:**
  - Payment status = `reported_missing`
  - `reported_at` = now()
  - Notification created for admin
  - Admin can investigate and resolve

### Step 7.7: Monthly Cycle Repeats
- **Frequency:** Every month for 12 months
- **Process:** Steps 7.1-7.6 repeat for each monthly payment
- **Completion:** After 12 payments, contract is fully paid

---

## Flow Diagrams

### Complete Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: ADMIN CREATES USER                                     │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    Admin Dashboard → Users Tab → Create User Form
                    │
                    ▼
    POST /admin/users → User Created → Email Sent (optional)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: USER LOGIN & PROFILE SETUP                             │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    User Receives Credentials → Login → Dashboard Loads
                    │
                    ▼
    Profile Check → Missing Fields? → Profile Completion Modal
                    │
                    ▼
    Profile Complete → Dashboard Ready
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: USER CREATES CONTRACTS                                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    Click "Add Contract" → Validate → Select Type (Selling/Rental)
                    │
                    ▼
    Selling: Nafath Verification → Contract Created (pending)
    Rental: Link to Selling → Nafath → Contract Created (pending)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: ADMIN APPROVES CONTRACT                                │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    Admin Dashboard → Contracts Tab → View Pending
                    │
                    ▼
    Review Contract → Approve/Deny
                    │
                    ▼
    If Approved:
    - approved_at = now()
    - Selling: receipt_upload_deadline = now() + 48h
    - Rental: contract_starts_at = now() + 65 days
    - Rental: Generate 12 payment records
    - Create notification for user
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: USER UPLOADS RECEIPT (Selling Only)                    │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    User Receives Notification → Tasks Page → Upload Receipt
                    │
                    ▼
    POST /documents/upload → Receipt Uploaded → Status: uploaded
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: CONTRACT STARTS & PAYMENT SCHEDULE                      │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    contract_starts_at Date Arrives → Payment Schedule Active
                    │
                    ▼
    User Views Payments Page → Sees 12 Monthly Payments (pending)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 7: MONTHLY PAYMENT PROCESSING (Repeats 12x)                │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    Payment Due Date → Admin Payments Page → Mark as Sent
                    │
                    ▼
    PUT /admin/payments/{id}/status → status = "sent"
                    │
                    ▼
    User Receives Payment (Bank Transfer) → Admin Marks as Received
                    │
                    ▼
    PUT /admin/payments/{id}/status → status = "received"
                    │
                    ▼
    Next Month → Repeat for Payment #2, #3, ... #12
                    │
                    ▼
    All 12 Payments Complete → Contract Fully Paid
```

### Contract Approval Flow (Detailed)

```
Admin Approves Contract
        │
        ├─→ Selling Contract
        │       │
        │       ├─→ Set approved_at = now()
        │       ├─→ Set receipt_upload_deadline = now() + 48 hours
        │       ├─→ Set receipt_upload_status = 'pending'
        │       └─→ Create notification: "Upload Receipt" (urgent, 48h deadline)
        │
        └─→ Rental Contract
                │
                ├─→ Set approved_at = now()
                ├─→ Set contract_starts_at = now() + 65 days
                ├─→ Generate 12 payment records:
                │       ├─→ Payment 1: 660 SAR, due_date = contract_starts_at
                │       ├─→ Payment 2: 660 SAR, due_date = contract_starts_at + 1 month
                │       ├─→ Payment 3: 660 SAR, due_date = contract_starts_at + 2 months
                │       └─→ ... (12 payments total)
                ├─→ Cache payment_schedule in contract JSON field
                └─→ Create notification: "Contract Approved" (normal)
```

### Payment Processing Flow (Monthly)

```
Month N Payment Due
        │
        ├─→ Payment Status: pending
        │
        ├─→ Admin Views Payments Page
        │       ├─→ Filter: status=pending, date=due_date
        │       └─→ Sees payment in list
        │
        ├─→ Admin Clicks "Mark as Sent"
        │       ├─→ PUT /admin/payments/{id}/status {status: "sent"}
        │       ├─→ Backend: payment.status = "sent", sent_at = now()
        │       ├─→ Update payment_schedule cache
        │       └─→ Create notification for user: "Payment Sent"
        │
        ├─→ User Receives Payment (Bank Transfer)
        │
        ├─→ Admin Clicks "Mark as Received"
        │       ├─→ PUT /admin/payments/{id}/status {status: "received"}
        │       ├─→ Backend: payment.status = "received", received_at = now()
        │       └─→ Update analytics
        │
        └─→ Next Month → Payment N+1 Due
```

---

## Technical Details

### Key API Endpoints Used

#### User Management
- `POST /portallogistice/admin/users` - Create user
- `GET /portallogistice/admin/users` - List users
- `PUT /portallogistice/admin/users/{national_id}` - Update user
- `PUT /portallogistice/admin/users/{national_id}/status` - Activate/deactivate

#### Authentication
- `POST /portallogistice/login` - User login
- `POST /portallogistice/logout` - User logout

#### Profile
- `GET /portallogistice/profile` - Get user profile
- `PUT /portallogistice/profile` - Update profile

#### Contracts
- `POST /portallogistice/contracts/validate` - Validate contract creation
- `POST /portallogistice/register` - Create contract
- `GET /portallogistice/contracts` - List user contracts
- `GET /portallogistice/contracts/{id}/timeline` - Get contract timeline
- `GET /portallogistice/contracts/{id}/receipt-status` - Get receipt status
- `GET /portallogistice/download-contract/{id}` - Download contract PDF

#### Admin Contracts
- `GET /portallogistice/admin/contracts` - List all contracts (with filters)
- `GET /portallogistice/admin/contracts/{id}` - Get contract details
- `PUT /portallogistice/admin/contracts/{id}/status` - Approve/deny contract

#### Documents
- `POST /portallogistice/documents/upload` - Upload document
- `GET /portallogistice/documents` - List user documents
- `GET /portallogistice/documents/{id}` - Get document details

#### Payments
- `GET /portallogistice/payments` - List user payments
- `GET /portallogistice/payments/{contractId}` - Get payments by contract
- `GET /portallogistice/payments/summary` - Get payment summary
- `POST /portallogistice/payments/report-missing` - Report missing payment

#### Admin Payments
- `GET /portallogistice/admin/payments` - List all payments (with filters)
- `GET /portallogistice/admin/payments/summary` - Admin payment summary
- `PUT /portallogistice/admin/payments/{id}/status` - Update payment status

#### Notifications
- `GET /portallogistice/notifications` - List user notifications
- `GET /portallogistice/notifications/count` - Get unread count
- `PUT /portallogistice/notifications/{id}/read` - Mark as read
- `PUT /portallogistice/notifications/{id}/complete` - Mark as completed

### Database Tables

#### portal_logistice_users
- User account information
- Authentication fields (email, phone, national_id, password)
- Profile fields (name, birth_date, region, etc.)
- Banking info (iban, bank_name)
- Document paths (iban_document_path, national_address_document_path)
- Account status (is_active)
- Contract limit (max_contracts_allowed)

#### portal_logistices
- Contract records
- Contract type (selling/rental)
- Amount
- Status (null/pending, 1/approved, 0/denied)
- Timestamps (approved_at, denied_at, contract_starts_at)
- Receipt tracking (receipt_upload_deadline, receipt_uploaded_at, receipt_upload_status)
- Payment schedule (payment_schedule JSON field)
- Linked contracts (linked_rental_contract_id, linked_selling_contract_id)
- Signed contract PDF path

#### portal_logistice_payments
- Monthly payment records
- Contract reference (contract_id)
- User reference (national_id)
- Amount
- Month number (1-12)
- Due date
- Payment date
- Status (pending, sent, received, reported_missing)
- Timestamps (sent_at, received_at, reported_at)

#### portal_logistice_documents
- Document uploads
- Document type (iban_doc, national_address_doc, receipt)
- File path
- Status (pending, approved, rejected)
- Contract reference (for receipts)
- Review information (reviewed_at, reviewer_id, rejection_reason)

#### portal_logistice_notifications
- User notifications/tasks
- Notification type (upload_receipt, complete_profile, contract_approved, payment_received, etc.)
- Title and description
- Priority (urgent, normal, low)
- Deadline
- Status (pending, completed, dismissed)
- Action URL
- Read status (read_at)

### Key Business Rules

1. **Contract Creation Rules:**
   - User must have complete profile before creating contracts
   - Selling contract must be created before rental contract
   - Rental contract must link to approved selling contract
   - User cannot create new selling contract if they have orphan selling (selling without rental)
   - Contract limit: If `max_contracts_allowed` is set, user cannot exceed this limit

2. **Contract Approval Rules:**
   - Only pending contracts can be approved/denied
   - When selling contract approved:
     - Receipt upload deadline = approval + 48 hours
     - Notification created with urgent priority
   - When rental contract approved:
     - Contract start date = approval + 65 days
     - 12 payment records generated automatically
     - Payment schedule cached in contract

3. **Receipt Upload Rules:**
   - Only approved selling contracts require receipt
   - Receipt must be uploaded within 48 hours (deadline)
   - Receipt can be uploaded after deadline (with warning)
   - One receipt per selling contract

4. **Payment Processing Rules:**
   - Payments generated only for approved rental contracts
   - 12 monthly payments, 660 SAR each
   - Payment due date = contract_starts_at + (month_number - 1) months
   - Payment status flow: pending → sent → received
   - User can report missing payment if not received

5. **Notification Rules:**
   - Auto-generated when contract approved
   - Auto-generated when payment sent
   - Auto-completed when receipt uploaded
   - Urgent priority for time-sensitive tasks (receipt upload)

### Status Values

#### Contract Status
- `null` or `"pending"` - Awaiting admin approval
- `1` or `"approved"` - Approved by admin
- `0` or `"denied"` - Rejected by admin

#### Payment Status
- `"pending"` - Payment not yet sent
- `"sent"` - Payment sent by admin
- `"received"` - Payment received by user
- `"reported_missing"` - User reported payment not received

#### Receipt Upload Status
- `"pending"` - Receipt not uploaded, deadline not passed
- `"uploaded"` - Receipt uploaded
- `"overdue"` - Deadline passed, receipt not uploaded

#### Document Status
- `"pending"` - Awaiting admin review
- `"approved"` - Approved by admin
- `"rejected"` - Rejected by admin

#### Notification Status
- `"pending"` - Task not completed
- `"completed"` - Task completed
- `"dismissed"` - User dismissed notification

---

## Summary Timeline

### Complete User Journey (Example Dates)

**Day 0:**
- Admin creates user account
- User receives login credentials

**Day 1:**
- User logs in
- User completes profile (if needed)
- User creates selling contract
- Contract status: pending

**Day 2:**
- Admin approves selling contract
- Receipt upload deadline: Day 4 (48 hours)
- User receives notification: "Upload Receipt"

**Day 3:**
- User uploads receipt
- Receipt status: uploaded

**Day 4:**
- Receipt deadline passes (if not uploaded, status becomes overdue)

**Day 67 (65 days after approval):**
- Rental contract starts (if rental contract was created and approved)
- First payment due date
- Payment status: pending

**Day 68:**
- Admin marks first payment as sent
- Payment status: sent
- User receives notification: "Payment Sent"

**Day 69:**
- User receives payment in bank account
- Admin marks payment as received
- Payment status: received

**Month 2-12:**
- Monthly payments continue (same process)
- Payment 2 due: Day 98
- Payment 3 due: Day 129
- ... (12 payments total)

**Day 430 (approximately):**
- 12th payment sent and received
- Contract fully paid
- User journey complete

---

## Notes & Considerations

### Current Implementation Status

✅ **Implemented:**
- User account creation by admin
- User login and authentication
- Profile completion
- Contract creation (selling and rental)
- Contract approval/denial by admin
- Receipt upload
- Payment schedule generation
- Payment status tracking
- Admin payment management

❓ **May Need Backend Implementation:**
- Payment schedule generation on contract approval (verify backend does this)
- Automatic notification creation on contract approval
- Payment status updates affecting user view in real-time
- Receipt deadline tracking and overdue status

### Edge Cases

1. **User doesn't upload receipt within 48 hours:**
   - Status becomes "overdue"
   - User can still upload (with warning)
   - Contract may be delayed

2. **User reports missing payment:**
   - Payment status = "reported_missing"
   - Admin must investigate
   - Admin can mark as sent again or resolve issue

3. **User has multiple contracts:**
   - Each contract has independent payment schedule
   - User sees all payments in payments list
   - Payments grouped by contract

4. **Contract limit reached:**
   - User cannot create new contracts
   - Must complete existing contracts first
   - Admin can increase limit if needed

5. **Orphan selling contract:**
   - User has selling contract without rental
   - User cannot create new selling contract
   - User must create rental for existing selling first

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Complete  
**Next Review:** After backend implementation verification
