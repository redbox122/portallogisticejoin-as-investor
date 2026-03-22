# Portal Logistics - Frontend Integration Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [Understanding Contract Types](#understanding-contract-types)
4. [User Management](#user-management)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Contract Management](#contract-management)
7. [Complete API Reference](#complete-api-reference)
8. [Error Handling](#error-handling)
9. [Example Flows](#example-flows)

---

## Overview

This guide provides everything your frontend team needs to integrate with the Portal Logistics system. The system allows:

- **Admins** to create user accounts and manage contracts
- **Users** to login, view their contracts, and create new contracts
- **Multiple contract types** per user (selling, rental, etc.)

### Key Concepts

1. **One User Account = Multiple Contracts**: A user can have multiple contracts of different types (selling, rental) linked by their `national_id`
2. **Contract Types**: Each contract must specify a type (`selling` or `rental`)
3. **Authentication**: Uses Bearer tokens (Laravel Passport) for API access
4. **Account Creation**: Admins create accounts; users then login and can create contracts

---

## Base URL & Authentication

### Base URL
```
https://shellafood.com/api/v1
```

### Authentication Method
All protected endpoints require a **Bearer token** in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_TOKEN_HERE',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### Token Storage
- Store the token securely (localStorage, sessionStorage, or secure cookie)
- Include token in all authenticated requests
- Token expires when user logs out or token is revoked

---

## Understanding Contract Types

### Contract Types Explained

**Important**: Each user can have **multiple contracts** of **different types**. Think of it like this:

- **User Account** (one per `national_id`)
  - Can have **Selling Contract(s)** (`contract_type: "selling"`)
  - Can have **Rental Contract(s)** (`contract_type: "rental"`)
  - Each contract is a separate record with its own ID, status, and signed PDF

### Example Scenario

User with `national_id: "1234567890"` can have:
1. Contract #1: Selling contract for 100,000 SAR
2. Contract #2: Rental contract for 50,000 SAR/month
3. Contract #3: Another selling contract for 200,000 SAR

All three contracts are linked to the same user account via `national_id`.

### Contract Type Values
- `"selling"` - عقد بيع (Sale Contract)
- `"rental"` - عقد إيجار (Rental Contract)

---

## User Management

### Admin Creates User Account

**Before users can login**, an admin must create their account. This sets up:
- Email, phone, national_id
- Password (set by admin or auto-generated)
- Account status (active/inactive)

**Note**: Currently, admin account creation is done through the admin panel. If you need an API endpoint for this, let us know.

### User Account Structure

Each user account has:
- **Authentication fields**: `email`, `phone`, `national_id`, `password`
- **Personal info**: `first_name`, `family_name`, `father_name`, `grandfather_name`, `birth_date`, `region`
- **Banking info**: `bank_name`, `iban`, `national_address_email`
- **Account status**: `is_active` (true/false)
- **Multiple contracts**: Linked by `national_id`

---

## Authentication Endpoints

### 1. User Login

**Endpoint:** `POST /portallogistice/login`

**Description:** Users can login with **email**, **phone**, or **national_id** + password

**Request:**
```json
{
  "login": "user@example.com",  // Can be email, phone, or national_id
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "national_id": "1234567890",
      "email": "user@example.com",
      "phone": "0501234567",
      "full_name": "أحمد محمد علي العلي",
      "is_active": true,
      "last_login_at": "2025-01-16 10:30:00"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "بيانات الدخول غير صحيحة"
}
```

**JavaScript Example:**
```javascript
const loginUser = async (login, password) => {
  const response = await fetch('https://shellafood.com/api/v1/portallogistice/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ login, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token
    localStorage.setItem('portal_logistics_token', data.data.token);
    localStorage.setItem('portal_logistics_user', JSON.stringify(data.data.user));
    return data.data;
  } else {
    throw new Error(data.message);
  }
};
```

---

### 2. Admin Login

**Endpoint:** `POST /portallogistice/admin/login`

**Description:** Admin login for dashboard access

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "Bearer",
    "admin": {
      "id": 1,
      "email": "admin@example.com",
      "name": "مدير النظام",
      "role_id": 1
    }
  }
}
```

---

### 3. User Logout

**Endpoint:** `POST /portallogistice/logout`

**Headers Required:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

**JavaScript Example:**
```javascript
const logoutUser = async () => {
  const token = localStorage.getItem('portal_logistics_token');
  
  await fetch('https://shellafood.com/api/v1/portallogistice/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Clear stored data
  localStorage.removeItem('portal_logistics_token');
  localStorage.removeItem('portal_logistics_user');
};
```

---

### 4. Admin Logout

**Endpoint:** `POST /portallogistice/admin/logout`

**Headers Required:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

### 5. Create Admin Account (اختياري – للباكند)

**Endpoint:** `POST /portallogistice/admin/register`

**Description:** إنشاء حساب مدير جديد. الفرونتند يعرض نموذج "إنشاء حساب مدير (أول مرة)" عند اختيار تسجيل دخول مدير. إذا لم يُفعّل هذا الـ endpoint يرجع خطأ شبكة ويُفضّل إنشاء المدير من الباكند (راجع `ADMIN_ACCOUNT_SETUP.md`).

**Request:**
```json
{
  "email": "info@shellafood.com",
  "password": "كلمة_مرور_قوية",
  "name": "مدير النظام"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إنشاء حساب المدير بنجاح",
  "data": {
    "admin": {
      "id": 1,
      "email": "info@shellafood.com",
      "name": "مدير النظام"
    }
  }
}
```

**Error (4xx):** `success: false` مع `message` أو `errors` (تحقق من البريد/كلمة المرور).

---

## Contract Management

### 1. Get User Profile

**Endpoint:** `GET /portallogistice/profile`

**Headers Required:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
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
      "father_name": "محمد",
      "grandfather_name": "علي",
      "full_name": "أحمد محمد علي العلي",
      "birth_date": "1990-01-01",
      "region": "الرياض",
      "national_address_email": "address@example.com",
      "bank_name": "البنك الأهلي",
      "iban": "SA1234567890123456789012",
      "is_active": true,
      "last_login_at": "2025-01-16 10:30:00",
      "created_at": "2025-01-01 08:00:00"
    }
  }
}
```

---

### 2. Get All User Contracts

**Endpoint:** `GET /portallogistice/contracts`

**Description:** Returns ALL contracts for the authenticated user (linked by `national_id`)

**Headers Required:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 1,
        "contract_type": "selling",
        "contract_type_ar": "عقد بيع",
        "status": "approved",
        "status_ar": "مقبول",
        "amount": "100000",
        "region": "الرياض",
        "contract_signed": true,
        "application_date": "2025-01-15",
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890"
      },
      {
        "id": 2,
        "contract_type": "rental",
        "contract_type_ar": "عقد إيجار",
        "status": "pending",
        "status_ar": "قيد المراجعة",
        "amount": "50000",
        "region": "جدة",
        "contract_signed": false,
        "application_date": "2025-01-16",
        "contract_download_url": null
      }
    ],
    "total_contracts": 2
  }
}
```

**JavaScript Example:**
```javascript
const getUserContracts = async () => {
  const token = localStorage.getItem('portal_logistics_token');
  
  const response = await fetch('https://shellafood.com/api/v1/portallogistice/contracts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.data.contracts;
};
```

---

### 3. Create New Contract

**Endpoint:** `POST /portallogistice/register`

**Description:** Creates a new contract and signs it via Nafath. This endpoint:
1. Validates contract data
2. Initiates Nafath authentication
3. Signs the contract
4. Creates the contract record
5. Returns contract details

**Headers Required:**
```
Authorization: Bearer {token}  // User must be logged in
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "أحمد",
  "family_name": "العلي",
  "father_name": "محمد",
  "grandfather_name": "علي",
  "national_id": "1234567890",
  "birth_date": "1990-01-01",
  "region": "الرياض",
  "national_address_email": "address@example.com",
  "bank_name": "البنك الأهلي",
  "iban": "SA1234567890123456789012",
  "email": "user@example.com",
  "phone": "0501234567",
  "amount": "100000",
  "contract_type": "selling"  // REQUIRED: "selling" or "rental"
}
```

**Field Requirements:**
- `first_name` - Required, max 100 chars
- `family_name` - Required, max 100 chars
- `father_name` - Required, max 100 chars
- `grandfather_name` - Required, max 100 chars
- `national_id` - Required, min 10 chars
- `birth_date` - Required, format: YYYY-MM-DD
- `region` - Required, string
- `national_address_email` - Required, string
- `bank_name` - Required, string
- `iban` - Required, string
- `email` - Required, valid email
- `phone` - Required, format: regex `/^([0-9\s\-\+\(\)]*)$/`, min 10, max 20
- `amount` - Required, numeric
- `contract_type` - **REQUIRED**, must be `"selling"` or `"rental"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم التسجيل بنجاح! Registration successful!",
  "data": {
    "tracking_id": 123,
    "national_id": "1234567890",
    "contract_type": "selling",
    "status": "pending",
    "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/123?national_id=1234567890",
    "signed_contract_available": true,
    "application_date": "2025-01-16"
  }
}
```

**Error Response (422) - Validation Error:**
```json
{
  "errors": [
    {
      "code": "contract_type",
      "message": "نوع العقد مطلوب"
    }
  ]
}
```

**JavaScript Example:**
```javascript
const createContract = async (contractData) => {
  const token = localStorage.getItem('portal_logistics_token');
  
  const response = await fetch('https://shellafood.com/api/v1/portallogistice/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      ...contractData,
      contract_type: 'selling'  // or 'rental'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.message || 'Failed to create contract');
  }
};
```

**Important Notes:**
- User must be authenticated (logged in)
- Contract type (`selling` or `rental`) is **mandatory**
- Same user can create multiple contracts of different types
- Each contract gets its own signed PDF
- Contract is automatically signed via Nafath during creation

---

### 4. Download Contract PDF

**Endpoint:** `GET /portallogistice/download-contract/{id}`

**Description:** Download the signed contract PDF

**Query Parameters:**
- `national_id` (required): User's national ID for verification

**Example URL:**
```
GET /portallogistice/download-contract/123?national_id=1234567890
```

**Success Response:** PDF file download

**Error Response (404):**
```json
{
  "success": false,
  "message": "لم يتم العثور على الطلب"
}
```

**JavaScript Example:**
```javascript
const downloadContract = async (contractId, nationalId) => {
  const url = `https://shellafood.com/api/v1/portallogistice/download-contract/${contractId}?national_id=${nationalId}`;
  
  // Open in new tab or download
  window.open(url, '_blank');
  
  // Or download programmatically:
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `contract_${contractId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
```

---

### 5. Check Contract Status

**Endpoint:** `POST /portallogistice/check-application-status`

**Description:** Check status of a specific contract by tracking ID and national ID

**Request:**
```json
{
  "tracking_id": 123,
  "national_id": "1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tracking_id": 123,
    "contract_type": "selling",
    "status": "pending",
    "status_ar": "قيد المراجعة",
    "applicant_name": "أحمد محمد علي العلي",
    "email": "user@example.com",
    "phone": "0501234567",
    "amount": "100000",
    "region": "الرياض",
    "application_date": "2025-01-16 10:30:00",
    "contract_signed": true,
    "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/123?national_id=1234567890"
  }
}
```

**Status Values:**
- `"pending"` - قيد المراجعة (Under Review)
- `"approved"` - مقبول (Approved)
- `"denied"` - مرفوض (Denied)

---

## Complete API Reference

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/portallogistice/login` | User login |
| POST | `/portallogistice/admin/login` | Admin login |
| POST | `/portallogistice/check-application-status` | Check contract status |
| GET | `/portallogistice/download-contract/{id}` | Download contract PDF |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/portallogistice/logout` | User logout |
| POST | `/portallogistice/admin/logout` | Admin logout |
| GET | `/portallogistice/profile` | Get user profile |
| GET | `/portallogistice/contracts` | Get all user contracts |
| POST | `/portallogistice/register` | Create new contract |

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created (contract created)
- `401` - Unauthorized (invalid credentials or missing token)
- `403` - Forbidden (account inactive)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error message in Arabic/English",
  "errors": [
    {
      "code": "field_name",
      "message": "Error message"
    }
  ]
}
```

### Common Error Scenarios

**1. Invalid Credentials:**
```json
{
  "success": false,
  "message": "بيانات الدخول غير صحيحة"
}
```

**2. Missing Token:**
```json
{
  "error": "Unauthenticated",
  "message": "Authentication token is required"
}
```

**3. Validation Errors:**
```json
{
  "errors": [
    {
      "code": "contract_type",
      "message": "نوع العقد مطلوب"
    },
    {
      "code": "email",
      "message": "البريد الإلكتروني مطلوب"
    }
  ]
}
```

**4. Account Inactive:**
```json
{
  "success": false,
  "message": "حسابك غير نشط"
}
```

---

## Example Flows

### Flow 1: User Creates Selling Contract

```javascript
// Step 1: User logs in
const loginData = await loginUser('user@example.com', 'password123');
// Returns: { token, user }

// Step 2: User creates a selling contract
const contractData = {
  first_name: "أحمد",
  family_name: "العلي",
  father_name: "محمد",
  grandfather_name: "علي",
  national_id: "1234567890",
  birth_date: "1990-01-01",
  region: "الرياض",
  national_address_email: "address@example.com",
  bank_name: "البنك الأهلي",
  iban: "SA1234567890123456789012",
  email: "user@example.com",
  phone: "0501234567",
  amount: "100000",
  contract_type: "selling"  // IMPORTANT: Specify contract type
};

const newContract = await createContract(contractData);
// Returns: { tracking_id, contract_type, status, contract_download_url }

// Step 3: User views all their contracts
const allContracts = await getUserContracts();
// Returns array of all contracts (selling + rental)
```

### Flow 2: User Creates Multiple Contracts

```javascript
// User already logged in, token stored

// Create selling contract
const sellingContract = await createContract({
  ...userData,
  amount: "100000",
  contract_type: "selling"
});

// Create rental contract (same user, different type)
const rentalContract = await createContract({
  ...userData,
  amount: "50000",
  contract_type: "rental"  // Different contract type
});

// Get all contracts - will show both
const allContracts = await getUserContracts();
// Returns: [sellingContract, rentalContract]
```

### Flow 3: Admin Dashboard Flow

```javascript
// Step 1: Admin logs in
const adminData = await adminLogin('admin@example.com', 'adminpass');

// Step 2: Admin can view users/contracts (if endpoints exist)
// Note: Admin management endpoints may need to be added

// Step 3: Admin logs out
await adminLogout();
```

### Flow 4: User Views Dashboard

```javascript
// User is logged in, token in localStorage

// Get user profile
const profile = await fetch('https://shellafood.com/api/v1/portallogistice/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('portal_logistics_token')}`
  }
}).then(r => r.json());

// Get all contracts
const contracts = await getUserContracts();

// Display in dashboard:
// - User info from profile
// - List of contracts (selling + rental)
// - Download buttons for signed contracts
// - Create new contract button
```

---

## Important Notes for Frontend Team

### 1. Contract Type Selection
- **Always require** user to select contract type (`selling` or `rental`) when creating contract
- Display contract type clearly in UI
- Filter contracts by type if needed

### 2. Multiple Contracts Per User
- Users can have multiple contracts
- All contracts are linked by `national_id`
- Display all contracts in user dashboard
- Group by type if needed (selling vs rental)

### 3. Authentication
- Store token securely
- Include token in all protected requests
- Handle token expiration (401 errors)
- Redirect to login on 401

### 4. Contract Status
- `pending` - Show as "Under Review" / "قيد المراجعة"
- `approved` - Show as "Approved" / "مقبول"
- `denied` - Show as "Denied" / "مرفوض"

### 5. Contract Download
- Only show download button if `contract_signed: true`
- Use the `contract_download_url` from API response
- Open PDF in new tab or download directly

### 6. Form Validation
- Validate all required fields before submission
- Show Arabic error messages from API
- Handle validation errors gracefully

### 7. User Experience
- Show loading states during API calls
- Display success/error messages
- Handle network errors
- Provide clear feedback for all actions

---

## Support & Questions

If you have questions or need additional endpoints:
- Contact the backend team
- Check API responses for error details
- Review this documentation

---

## Quick Reference

### Login Credentials Format
```javascript
// User login - can use email, phone, or national_id
{ login: "user@example.com", password: "pass123" }
{ login: "0501234567", password: "pass123" }
{ login: "1234567890", password: "pass123" }

// Admin login - email only
{ email: "admin@example.com", password: "adminpass" }
```

### Contract Types
```javascript
contract_type: "selling"  // عقد بيع
contract_type: "rental"  // عقد إيجار
```

### Status Values
```javascript
status: "pending"   // قيد المراجعة
status: "approved"  // مقبول
status: "denied"    // مرفوض
```

---

**Last Updated:** January 2025
**API Version:** v1

