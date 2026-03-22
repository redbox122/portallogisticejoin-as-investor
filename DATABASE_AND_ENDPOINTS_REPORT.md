# Portal Logistics - Complete Database & Endpoints Report

**Generated:** January 2025  
**Project:** Portal Logistics (بوابة تساهيل)  
**Base API URL:** `https://shellafood.com/api/v1`

---

## 📋 Table of Contents

1. [Database Tables Overview](#database-tables-overview)
2. [Current Database Tables](#current-database-tables)
3. [Proposed/Planned Tables](#proposedplanned-tables)
4. [All API Endpoints](#all-api-endpoints)
5. [Endpoint Status Summary](#endpoint-status-summary)
6. [Database Schema Details](#database-schema-details)

---

## Database Tables Overview

### Current Tables (Implemented)

1. **`portal_logistices`** - Main table for users and contracts
   - **Purpose:** Stores both user accounts AND contracts in a single table
   - **Design Pattern:** Single table inheritance (users have `contract_type = NULL`, contracts have `contract_type = 'selling'` or `'rental'`)
   - **Status:** ✅ Active and in use

### Nafath-Related Tables

**Note:** Based on codebase analysis, Nafath authentication appears to be handled through API integration rather than a separate database table. The Nafath authentication flow uses:
- API endpoints: `/portallogistice/nafath/initiate` and `/portallogistice/nafath/checkStatus`
- No dedicated `nafath` table found in the database schema
- Nafath authentication status is likely stored in the `portal_logistices` table or handled via external API

### Proposed Tables (Not Yet Implemented)

1. **`portal_logistice_payments`** - Payment tracking
2. **`portal_logistice_documents`** - Document management
3. **`portal_logistice_notifications`** - Notifications/tasks system

---

## Current Database Tables

### 1. `portal_logistices` Table

**Purpose:** Dual-purpose table storing both user accounts and contracts.

**Key Design Pattern:**
- **User Accounts:** Records where `contract_type IS NULL`
- **Contracts:** Records where `contract_type IN ('selling', 'rental')`

#### Current Columns (Inferred from Codebase)

```sql
CREATE TABLE portal_logistices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Authentication & Account Info
    email VARCHAR(255) NULL,
    phone VARCHAR(255) NULL,
    phone_number VARCHAR(255) NULL,  -- Alternative phone field
    national_id VARCHAR(191) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP NULL,
    
    -- Personal Information
    first_name VARCHAR(255) NULL,
    family_name VARCHAR(255) NULL,
    father_name VARCHAR(255) NULL,
    grandfather_name VARCHAR(255) NULL,
    birth_date DATE NULL,
    region VARCHAR(255) NULL,
    
    -- Banking Information
    bank_name VARCHAR(255) NULL,
    iban VARCHAR(255) NULL,
    national_address_email VARCHAR(255) NULL,
    
    -- Contract Information
    contract_type ENUM('selling', 'rental') NULL,  -- NULL = user account, 'selling'/'rental' = contract
    amount DECIMAL(10,2) NULL,
    status TINYINT NULL,  -- NULL = pending, 1 = approved, 0 = denied
    signed_contract_path VARCHAR(500) NULL,
    
    -- Contract Linking
    linked_selling_contract_id BIGINT NULL,
    linked_rental_contract_id BIGINT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Table Usage

**User Accounts:**
```sql
-- Get user account
SELECT * FROM portal_logistices 
WHERE national_id = '1234567890' 
AND contract_type IS NULL 
AND is_active = true;
```

**Contracts:**
```sql
-- Get all contracts for a user
SELECT * FROM portal_logistices 
WHERE national_id = '1234567890' 
AND contract_type IS NOT NULL;

-- Get selling contracts
SELECT * FROM portal_logistices 
WHERE national_id = '1234567890' 
AND contract_type = 'selling';

-- Get rental contracts
SELECT * FROM portal_logistices 
WHERE national_id = '1234567890' 
AND contract_type = 'rental';
```

#### Known Issues & Recommendations

1. **Single Table for Users and Contracts**
   - ⚠️ Can lead to confusion and data integrity issues
   - Recommendation: Consider separate tables or document the design clearly

2. **Missing Foreign Key Constraints**
   - `linked_selling_contract_id` and `linked_rental_contract_id` may not have foreign key constraints
   - Recommendation: Add foreign key constraints

3. **No Unique Constraints**
   - No unique constraint on `national_id` for user accounts
   - Issue: Multiple user accounts with same national_id possible
   - Recommendation: Add unique constraint on `national_id` where `contract_type IS NULL`

4. **Missing Indexes**
   - Recommendation: Add composite indexes:
   ```sql
   CREATE INDEX idx_national_id_contract_type ON portal_logistices(national_id, contract_type);
   CREATE INDEX idx_linked_selling ON portal_logistices(linked_selling_contract_id);
   CREATE INDEX idx_linked_rental ON portal_logistices(linked_rental_contract_id);
   CREATE INDEX idx_status ON portal_logistices(status);
   CREATE INDEX idx_contract_type ON portal_logistices(contract_type);
   ```

#### Status Values

- **`status = NULL`** → Pending approval
- **`status = 1`** → Approved
- **`status = 0`** → Denied

---

## Proposed/Planned Tables

### 1. `portal_logistice_payments` (Not Implemented)

**Status:** ❌ **NOT IMPLEMENTED**

**Purpose:** Track monthly payments for rental contracts.

**Proposed Schema:**
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES portal_logistices(id) ON DELETE CASCADE,
    INDEX idx_contract_id (contract_id),
    INDEX idx_national_id (national_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);
```

**Purpose:**
- Track 12 monthly payments (660 SAR each) for rental contracts
- Track payment status (pending, sent, received, reported missing)
- Calculate payment schedules automatically when contract is approved

---

### 2. `portal_logistice_documents` (Not Implemented)

**Status:** ❌ **NOT IMPLEMENTED**

**Purpose:** Store uploaded documents (IBAN, National Address, Receipts).

**Proposed Schema:**
```sql
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
    FOREIGN KEY (contract_id) REFERENCES portal_logistices(id) ON DELETE CASCADE,
    INDEX idx_national_id (national_id),
    INDEX idx_contract_id (contract_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
);
```

**Purpose:**
- Store IBAN documents (one per user)
- Store National Address documents (one per user)
- Store payment receipts (one per contract)
- Track document approval/rejection status

---

### 3. `portal_logistice_notifications` (Not Implemented)

**Status:** ❌ **NOT IMPLEMENTED**

**Purpose:** User notifications and task management.

**Proposed Schema:**
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_national_id (national_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_deadline (deadline)
);
```

**Purpose:**
- Notify users of pending actions (upload receipt, complete profile, etc.)
- Track task completion status
- Set deadlines for urgent tasks

---

### Proposed Columns to Add to `portal_logistices`

**Status:** ❌ **NOT IMPLEMENTED**

```sql
-- Document paths
ALTER TABLE portal_logistices ADD COLUMN iban_document_path VARCHAR(500) NULL;
ALTER TABLE portal_logistices ADD COLUMN national_address_document_path VARCHAR(500) NULL;
ALTER TABLE portal_logistices ADD COLUMN payment_receipt_path VARCHAR(500) NULL;

-- Contract timeline tracking
ALTER TABLE portal_logistices ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_upload_deadline TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_uploaded_at TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN receipt_upload_status ENUM('pending', 'uploaded', 'overdue') NULL;
ALTER TABLE portal_logistices ADD COLUMN contract_starts_at TIMESTAMP NULL;

-- Payment options
ALTER TABLE portal_logistices ADD COLUMN payment_option ENUM('full', 'half_plus_rest') NULL;
ALTER TABLE portal_logistices ADD COLUMN rest_payment_deadline TIMESTAMP NULL;
ALTER TABLE portal_logistices ADD COLUMN payment_schedule JSON NULL;
```

---

## All API Endpoints

### Base URL
```
https://shellafood.com/api/v1
```

### Authentication Method
All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer {token}
```

---

## 1. Authentication Endpoints

### 1.1 User Login
- **Method:** `POST`
- **Endpoint:** `/portallogistice/login`
- **Auth Required:** No
- **Description:** User login with email, phone, or national_id + password
- **Request Body:**
  ```json
  {
    "login": "user@example.com",  // Can be email, phone, or national_id
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "تم تسجيل الدخول بنجاح",
    "data": {
      "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "token_type": "Bearer",
      "user": { ... }
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Context/AuthContext.js`

---

### 1.2 Admin Login
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/login`
- **Auth Required:** No
- **Description:** Admin login for dashboard access
- **Request Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "adminpassword123"
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Context/AuthContext.js`

---

### 1.3 User Logout
- **Method:** `POST`
- **Endpoint:** `/portallogistice/logout`
- **Auth Required:** Yes (Bearer Token)
- **Description:** User logout
- **Status:** ✅ Active
- **Used In:** `src/Context/AuthContext.js`

---

### 1.4 Admin Logout
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/logout`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Admin logout
- **Status:** ✅ Active
- **Used In:** `src/Context/AuthContext.js`

---

## 2. User Profile Endpoints

### 2.1 Get User Profile
- **Method:** `GET`
- **Endpoint:** `/portallogistice/profile`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Get authenticated user's profile information
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "national_id": "1234567890",
        "email": "user@example.com",
        "phone": "0501234567",
        "first_name": "أحمد",
        "family_name": "العلي",
        ...
      }
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Pages/UserDashboard.js`

---

### 2.2 Update User Profile
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/profile`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Update user profile information
- **Request Body:**
  ```json
  {
    "region": "الرياض",
    "phone": "0501234567",
    ...
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Pages/UserDashboard.js`, `src/Components/ProfileCompletionModal.js`

---

## 3. Contract Management Endpoints

### 3.1 Get All User Contracts
- **Method:** `GET`
- **Endpoint:** `/portallogistice/contracts`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Get all contracts for the authenticated user
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "contracts": [
        {
          "id": 1,
          "contract_type": "selling",
          "amount": 100000,
          "status": 1,
          "created_at": "2025-01-01 10:00:00",
          ...
        }
      ]
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Pages/UserDashboard.js`

---

### 3.2 Create New Contract (Register)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/register`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Create a new contract and sign it via Nafath
- **Request Body:**
  ```json
  {
    "contract_type": "selling",  // or "rental"
    "amount": 100000,
    "national_id": "1234567890",
    ...
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`
- **Note:** Automatically links selling ↔ rental contracts

---

### 3.3 Download Contract PDF
- **Method:** `GET`
- **Endpoint:** `/portallogistice/download-contract/{id}`
- **Query Parameters:** `?national_id={national_id}`
- **Auth Required:** No (Public endpoint)
- **Description:** Download the signed contract PDF
- **Status:** ✅ Active
- **Used In:** `src/Pages/UserDashboard.js`

---

## 4. Nafath Authentication Endpoints

### 4.1 Initiate Nafath Authentication
- **Method:** `POST`
- **Endpoint:** `/portallogistice/nafath/initiate`
- **Auth Required:** No
- **Description:** Initiate Nafath authentication process
- **Request Body:**
  ```json
  {
    "national_id": "1234567890",
    "contract_type": "selling"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "nfath_code": "123456",
      "transaction_id": "..."
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

---

### 4.2 Check Nafath Status
- **Method:** `GET`
- **Endpoint:** `/portallogistice/nafath/checkStatus`
- **Query Parameters:** `?national_id={national_id}&contract_type={contract_type}`
- **Auth Required:** No
- **Description:** Check the status of Nafath authentication request
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "approved",  // or "pending", "rejected"
      "signed": true
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

---

## 5. Admin Endpoints

### 5.1 Get Admin Dashboard Statistics
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/dashboard/stats`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get dashboard statistics (total users, contracts, etc.)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "total_users": 100,
      "total_contracts": 250,
      "pending_contracts": 15,
      "approved_contracts": 200,
      "denied_contracts": 35
    }
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Pages/AdminDashboard.js`

---

### 5.2 Get All Users (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/users`
- **Query Parameters:** 
  - `?search={term}` - Search by name, email, national_id
  - `?status={status}` - Filter by status (active/inactive)
  - `?per_page={n}` - Items per page
  - `?page={n}` - Page number
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get paginated list of all users with filters
- **Status:** ✅ Active
- **Used In:** `src/Components/UserManagement.js`

---

### 5.3 Get User by National ID (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/users/{national_id}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get specific user details by national ID
- **Status:** ✅ Active
- **Used In:** `src/Components/UserManagement.js`

---

### 5.4 Create User (Admin)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/users`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Create a new user account
- **Request Body:**
  ```json
  {
    "national_id": "1234567890",
    "email": "user@example.com",
    "phone": "0501234567",
    "password": "password123",
    "first_name": "أحمد",
    "family_name": "العلي",
    ...
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/UserManagement.js`

---

### 5.5 Update User (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/users/{national_id}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Update user information
- **Status:** ✅ Active
- **Used In:** `src/Components/UserManagement.js`

---

### 5.6 Update User Status (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/users/{national_id}/status`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Activate or deactivate a user account
- **Request Body:**
  ```json
  {
    "is_active": true  // or false
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/UserManagement.js`

---

### 5.7 Get All Contracts (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/contracts`
- **Query Parameters:**
  - `?search={term}` - Search by national_id, name
  - `?status={status}` - Filter by status (pending/approved/denied)
  - `?contract_type={type}` - Filter by type (selling/rental)
  - `?per_page={n}` - Items per page
  - `?page={n}` - Page number
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get paginated list of all contracts with filters
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractManagement.js`

---

### 5.8 Get Contract by ID (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get specific contract details
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractManagement.js`

---

### 5.9 Update Contract Status (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}/status`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Approve or deny a contract
- **Request Body:**
  ```json
  {
    "status": 1  // 1 = approve, 0 = deny
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractManagement.js`
- **Note:** Currently only sets status. Should also set `approved_at` and `receipt_upload_deadline` (not implemented)

---

### 5.10 Delete Contract (Admin)
- **Method:** `DELETE`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Delete a contract
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractManagement.js`

---

## 6. OTP Endpoints

### 6.1 Send OTP
- **Method:** `POST`
- **Endpoint:** `/portallogistice/send-otp`
- **Auth Required:** No
- **Description:** Send OTP code to user's phone/email
- **Request Body:**
  ```json
  {
    "national_id": "1234567890"
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Utitlities/Header.js`

---

### 6.2 Verify OTP
- **Method:** `POST`
- **Endpoint:** `/portallogistice/verify-otp`
- **Auth Required:** No
- **Description:** Verify OTP code and get user contracts
- **Request Body:**
  ```json
  {
    "national_id": "1234567890",
    "otp": "123456"
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Utitlities/Header.js`

---

## 7. Contract PDF Endpoints

### 7.1 Generate Contract PDF (HTML)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/contract-pdf`
- **Auth Required:** No
- **Description:** Generate contract PDF as HTML/blob
- **Request Body:**
  ```json
  {
    "contract_type": "selling",
    "national_id": "1234567890",
    ...
  }
  ```
- **Status:** ✅ Active
- **Used In:** `src/Pages/TsahelPage.js`

---

### 7.2 Generate Contract PDF (PDF Format)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/contract-pdf?pdf=1`
- **Auth Required:** No
- **Description:** Generate contract PDF in PDF format
- **Request Body:** Same as above
- **Status:** ✅ Active
- **Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

---

## 8. Missing Endpoints (Not Implemented)

### 8.1 Payment Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/payments` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/payments/{contractId}` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/payments/summary` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/payments/report-missing` | POST | ❌ Missing | 🔴 Critical |
| `/portallogistice/contracts/{id}/payments` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent` | PUT | ❌ Missing | 🔴 Critical |

---

### 8.2 Document Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/documents/upload` | POST | ❌ Missing | 🔴 Critical |
| `/portallogistice/documents` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/documents/{id}` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/documents/{id}` | PUT | ❌ Missing | 🔴 Critical |
| `/portallogistice/documents/{id}` | DELETE | ❌ Missing | 🔴 Critical |
| `/portallogistice/admin/documents` | GET | ❌ Missing | 🟢 Nice to Have |
| `/portallogistice/admin/documents/{id}/approve` | PUT | ❌ Missing | 🟢 Nice to Have |
| `/portallogistice/admin/documents/{id}/reject` | PUT | ❌ Missing | 🟢 Nice to Have |

---

### 8.3 Receipt Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/contracts/{id}/receipt-status` | GET | ❌ Missing | 🔴 Critical |
| `/portallogistice/contracts/{id}/upload-receipt` | POST | ❌ Missing | 🔴 Critical |

---

### 8.4 Contract Validation Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/contracts/validate` | POST | ❌ Missing | 🔴 Critical |

---

### 8.5 Notification Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/notifications` | GET | ❌ Missing | 🟡 Important |
| `/portallogistice/notifications/{id}/read` | PUT | ❌ Missing | 🟡 Important |
| `/portallogistice/notifications/{id}/dismiss` | PUT | ❌ Missing | 🟡 Important |

---

### 8.6 Analytics Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/analytics/summary` | GET | ❌ Missing | 🟡 Important |
| `/portallogistice/analytics/payments` | GET | ❌ Missing | 🟡 Important |

---

### 8.7 Other Missing Endpoints ❌

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/portallogistice/account-details` | GET | ❌ Missing | 🟡 Important |
| `/portallogistice/contracts/{id}/timeline` | GET | ❌ Missing | 🟡 Important |

---

## Endpoint Status Summary

### By Category

| Category | Total | ✅ Active | ❌ Missing |
|----------|-------|-----------|-----------|
| **Authentication** | 4 | 4 | 0 |
| **User Profile** | 2 | 2 | 0 |
| **Contract Management** | 4 | 4 | 0 |
| **Nafath Authentication** | 2 | 2 | 0 |
| **Admin** | 10 | 10 | 0 |
| **OTP** | 2 | 2 | 0 |
| **Contract PDF** | 2 | 2 | 0 |
| **Payments** | 6 | 0 | 6 |
| **Documents** | 8 | 0 | 8 |
| **Receipts** | 2 | 0 | 2 |
| **Contract Validation** | 1 | 0 | 1 |
| **Notifications** | 3 | 0 | 3 |
| **Analytics** | 2 | 0 | 2 |
| **Other** | 2 | 0 | 2 |
| **TOTAL** | **50** | **26** | **24** |

### By Priority

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 **Critical** | 12 | ❌ All Missing |
| 🟡 **Important** | 6 | ❌ All Missing |
| 🟢 **Nice to Have** | 3 | ❌ All Missing |
| ✅ **Implemented** | 26 | ✅ Active |

---

## Database Schema Details

### Current Database Structure

#### `portal_logistices` Table

**Total Columns (Current):** ~20+ columns

**Key Fields:**
- `id` - Primary key
- `national_id` - User/contract identifier
- `contract_type` - NULL (user) or 'selling'/'rental' (contract)
- `status` - NULL (pending), 1 (approved), 0 (denied)
- `linked_selling_contract_id` - Links to selling contract
- `linked_rental_contract_id` - Links to rental contract

**Relationships:**
- Self-referential: Contracts can link to other contracts via `linked_selling_contract_id` and `linked_rental_contract_id`

---

### Proposed Database Changes

#### New Tables Needed: 3
1. `portal_logistice_payments`
2. `portal_logistice_documents`
3. `portal_logistice_notifications`

#### New Columns Needed: 11
Added to `portal_logistices`:
- `iban_document_path`
- `national_address_document_path`
- `payment_receipt_path`
- `approved_at`
- `receipt_upload_deadline`
- `receipt_uploaded_at`
- `receipt_upload_status`
- `contract_starts_at`
- `payment_option`
- `rest_payment_deadline`
- `payment_schedule`

---

## Summary

### What We Have ✅

1. **Database:**
   - ✅ `portal_logistices` table (users + contracts)
   - ✅ Basic user authentication
   - ✅ Contract creation and management
   - ✅ Contract linking (selling ↔ rental)

2. **Endpoints:**
   - ✅ 26 active endpoints
   - ✅ Authentication (user + admin)
   - ✅ User profile management
   - ✅ Contract CRUD operations
   - ✅ Nafath integration
   - ✅ Admin dashboard
   - ✅ OTP verification
   - ✅ PDF generation

### What We Need ❌

1. **Database:**
   - ❌ Payment tracking table
   - ❌ Document management table
   - ❌ Notifications table
   - ❌ Additional columns for timeline tracking

2. **Endpoints:**
   - ❌ 24 missing endpoints
   - ❌ Payment tracking (6 endpoints)
   - ❌ Document upload (8 endpoints)
   - ❌ Receipt management (2 endpoints)
   - ❌ Contract validation (1 endpoint)
   - ❌ Notifications (3 endpoints)
   - ❌ Analytics (2 endpoints)
   - ❌ Other features (2 endpoints)

---

## Next Steps

1. **Database Migrations:**
   - Create `portal_logistice_payments` table
   - Create `portal_logistice_documents` table
   - Create `portal_logistice_notifications` table
   - Add new columns to `portal_logistices`

2. **Backend Implementation:**
   - Implement Priority 1 endpoints (12 endpoints)
   - Implement Priority 2 endpoints (6 endpoints)
   - Implement Priority 3 endpoints (3 endpoints)

3. **Database Optimization:**
   - Add indexes for performance
   - Add foreign key constraints
   - Add unique constraints where needed

---

**Report Generated:** January 2025  
**Last Updated:** January 2025  
**Status:** Comprehensive documentation of current state and requirements
