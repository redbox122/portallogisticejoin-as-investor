# Frontend API Endpoints Reference - Portal Logistics

**Base URL:** `https://shellafood.com/api/v1`  
**Last Updated:** January 2025  
**Purpose:** Complete documentation of all endpoints currently used in the frontend application

---

## 📋 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Profile Endpoints](#user-profile-endpoints)
3. [Contract Management Endpoints](#contract-management-endpoints)
4. [Nafath Authentication Endpoints](#nafath-authentication-endpoints)
5. [Admin Endpoints](#admin-endpoints)
6. [OTP Endpoints](#otp-endpoints)
7. [Contract PDF Endpoints](#contract-pdf-endpoints)

---

## Authentication Endpoints

### 1. User Login

**Purpose:** Authenticate user and get access token

**Method:** `POST`  
**Endpoint:** `/portallogistice/login`  
**Auth Required:** No  
**Used In:** `src/Context/AuthContext.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar" // or "en"
}
```

**Request Body:**
```json
{
  "login": "user@example.com",  // Can be email, phone, or national_id
  "password": "password123"
}
```

**Response (Success - 200):**
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
      "first_name": "أحمد",
      "family_name": "العلي",
      "is_active": true,
      "last_login_at": "2025-01-16 10:30:00"
    }
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "بيانات الدخول غير صحيحة"
}
```

**Frontend Usage:**
```javascript
const response = await axios.post(
  `${API_BASE_URL}/portallogistice/login`,
  { login: loginData.login, password: loginData.password },
  { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-LANG': lang } }
);

if (response.data && response.data.success) {
  // Store token and user data
  localStorage.setItem('portal_logistics_token', response.data.data.token);
  localStorage.setItem('portal_logistics_user', JSON.stringify(response.data.data.user));
  localStorage.setItem('portal_logistics_user_type', 'user');
}
```

---

### 2. Admin Login

**Purpose:** Authenticate admin and get access token

**Method:** `POST`  
**Endpoint:** `/portallogistice/admin/login`  
**Auth Required:** No  
**Used In:** `src/Context/AuthContext.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "Bearer",
    "admin": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "is_admin": true
    }
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.post(
  `${API_BASE_URL}/portallogistice/admin/login`,
  { email: loginData.login, password: loginData.password },
  { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-LANG': lang } }
);
```

---

### 3. User Logout

**Purpose:** Logout user and invalidate token

**Method:** `POST`  
**Endpoint:** `/portallogistice/logout`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Context/AuthContext.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:** `{}` (empty)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

**Frontend Usage:**
```javascript
await axios.post(
  `${API_BASE_URL}/portallogistice/logout`,
  {},
  { headers: getAuthHeaders() }
);
// Clear localStorage
localStorage.removeItem('portal_logistics_token');
localStorage.removeItem('portal_logistics_user');
```

---

### 4. Admin Logout

**Purpose:** Logout admin and invalidate token

**Method:** `POST`  
**Endpoint:** `/portallogistice/admin/logout`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Context/AuthContext.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:** `{}` (empty)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

## User Profile Endpoints

### 5. Get User Profile

**Purpose:** Get authenticated user's profile information

**Method:** `GET`  
**Endpoint:** `/portallogistice/profile`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Pages/UserDashboard.js`, `src/Components/ContractForm.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "national_id": "1234567890",
      "email": "user@example.com",
      "phone": "0501234567",
      "phone_number": "0501234567",
      "first_name": "أحمد",
      "family_name": "العلي",
      "father_name": "محمد",
      "grandfather_name": "علي",
      "birth_date": "1990-01-01",
      "region": "الرياض",
      "national_address_email": "address@example.com",
      "bank_name": "البنك الأهلي",
      "iban": "SA1234567890123456789012",
      "is_active": true,
      "created_at": "2025-01-01 10:00:00",
      "updated_at": "2025-01-16 10:00:00"
    }
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.get(
  'https://shellafood.com/api/v1/portallogistice/profile',
  { headers: getAuthHeaders() }
);

if (response.data && response.data.success) {
  const userData = response.data.data.user || response.data.data;
  setProfile(userData);
}
```

---

### 6. Update User Profile

**Purpose:** Update user profile information

**Method:** `PUT`  
**Endpoint:** `/portallogistice/profile`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Pages/UserDashboard.js`, `src/Components/ProfileCompletionModal.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:**
```json
{
  "phone": "0501234567",
  "region": "الرياض"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تحديث الملف الشخصي بنجاح",
  "data": {
    "user": {
      "id": 1,
      "phone": "0501234567",
      "region": "الرياض",
      // ... other user fields
    }
  }
}
```

**Frontend Usage:**
```javascript
const updateData = {
  phone: editFormData.phone.trim()
};

if (editFormData.region && editFormData.region.trim()) {
  updateData.region = editFormData.region.trim();
}

const response = await axios.put(
  'https://shellafood.com/api/v1/portallogistice/profile',
  updateData,
  { headers: getAuthHeaders() }
);
```

---

## Contract Management Endpoints

### 7. Get All User Contracts

**Purpose:** Get all contracts for the authenticated user

**Method:** `GET`  
**Endpoint:** `/portallogistice/contracts`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Pages/UserDashboard.js`, `src/Components/ContractForm.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 1,
        "national_id": "1234567890",
        "contract_type": "selling",
        "amount": 6600,
        "status": 1,
        "status_text": "approved",
        "linked_rental_contract_id": 2,
        "linked_selling_contract_id": null,
        "signed_contract_path": "/storage/contracts/signed_contract_1.pdf",
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890",
        "created_at": "2025-01-01 10:00:00",
        "updated_at": "2025-01-16 10:00:00"
      },
      {
        "id": 2,
        "national_id": "1234567890",
        "contract_type": "rental",
        "amount": 660,
        "status": 1,
        "status_text": "approved",
        "linked_rental_contract_id": null,
        "linked_selling_contract_id": 1,
        "signed_contract_path": "/storage/contracts/signed_contract_2.pdf",
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/2?national_id=1234567890",
        "created_at": "2025-01-01 10:30:00",
        "updated_at": "2025-01-16 10:30:00"
      }
    ]
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.get(
  'https://shellafood.com/api/v1/portallogistice/contracts',
  { headers: getAuthHeaders() }
);

if (response.data && response.data.success) {
  const contractsList = response.data.data.contracts || response.data.data || [];
  setContracts(contractsList);
}
```

---

### 8. Create New Contract (Register)

**Purpose:** Create a new contract (selling or rental) after Nafath authentication

**Method:** `POST`  
**Endpoint:** `/portallogistice/register`  
**Auth Required:** Yes (Bearer Token)  
**Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "national_id": "1234567890",
  "first_name": "أحمد",
  "father_name": "محمد",
  "grandfather_name": "علي",
  "family_name": "العلي",
  "birth_date": "1990-01-01",
  "phone": "0501234567",
  "email": "user@example.com",
  "national_address_email": "address@example.com",
  "bank_name": "البنك الأهلي",
  "iban": "SA1234567890123456789012",
  "region": "الرياض",
  "contract_type": "selling",  // or "rental"
  "amount": 6600  // 6600 for selling, 660 for rental
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم إنشاء العقد بنجاح",
  "data": {
    "tracking_id": "123456",
    "contract_id": 1,
    "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/123456?national_id=1234567890",
    "contract_type": "selling",
    "status": null  // pending
  }
}
```

**Response (Error - Business Rules):**
```json
{
  "success": false,
  "message": "Cannot create rental contract without selling contract",
  "errors": [
    {
      "code": "selling_required_first",
      "message": "يجب إنشاء عقد البيع أولاً"
    }
  ]
}
```

**Other Error Codes:**
- `rental_required_for_previous` - Need to create rental for previous selling
- `contract_limit_reached` - User has reached maximum contracts allowed

**Frontend Usage:**
```javascript
const registrationData = {
  national_id: currentUserProfile.national_id,
  first_name: currentUserProfile.first_name,
  father_name: currentUserProfile.father_name,
  grandfather_name: currentUserProfile.grandfather_name,
  family_name: currentUserProfile.family_name,
  birth_date: currentUserProfile.birth_date,
  phone: currentUserProfile.phone || currentUserProfile.phone_number,
  email: currentUserProfile.email,
  national_address_email: currentUserProfile.national_address_email,
  bank_name: currentUserProfile.bank_name,
  iban: currentUserProfile.iban,
  region: currentUserProfile.region,
  contract_type: contractType,  // "selling" or "rental"
  amount: contractType === 'selling' ? 6600 : 660
};

const response = await axios.post(
  `${API_BASE_URL}/portallogistice/register`,
  registrationData,
  { headers: getAuthHeaders() }
);
```

---

### 9. Download Contract PDF

**Purpose:** Download the signed contract PDF

**Method:** `GET`  
**Endpoint:** `/portallogistice/download-contract/{id}`  
**Query Parameters:** `?national_id={national_id}`  
**Auth Required:** No (Public endpoint)  
**Used In:** `src/Pages/UserDashboard.js`, `src/Components/ContractForm.js`

**Request URL:**
```
https://shellafood.com/api/v1/portallogistice/download-contract/123456?national_id=1234567890
```

**Response:** PDF file download (binary)

**Frontend Usage:**
```javascript
const downloadUrl = `https://shellafood.com/api/v1/portallogistice/download-contract/${contract.id}?national_id=${profile.national_id}`;
window.open(downloadUrl, '_blank');
```

---

## Nafath Authentication Endpoints

### 10. Initiate Nafath Authentication

**Purpose:** Start Nafath authentication process for contract signing

**Method:** `POST`  
**Endpoint:** `/portallogistice/nafath/initiate`  
**Auth Required:** No  
**Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "national_id": "1234567890",
  "contract_type": "selling"  // or "rental"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم بدء عملية التحقق",
  "data": {
    "nfath_code": "123456",
    "transaction_id": "txn_abc123",
    "status": "pending"
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.post(
  `${API_BASE_URL}/portallogistice/nafath/initiate`,
  {
    national_id: profile.national_id,
    contract_type: contractType
  },
  { headers: { 'Content-Type': 'application/json', 'X-LANG': lang } }
);

if (response.data.success) {
  setNafathCode(response.data.data.nfath_code);
  // Start polling for status
}
```

---

### 11. Check Nafath Status

**Purpose:** Check the status of Nafath authentication request

**Method:** `GET`  
**Endpoint:** `/portallogistice/nafath/checkStatus`  
**Query Parameters:** `?national_id={national_id}&contract_type={contract_type}&_t={timestamp}`  
**Auth Required:** No  
**Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

**Request Headers:**
```json
{
  "X-LANG": "ar",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
}
```

**Request URL:**
```
https://shellafood.com/api/v1/portallogistice/nafath/checkStatus?national_id=1234567890&contract_type=selling&_t=1705315200000
```

**Response (Success - 200):**
```json
{
  "success": true,
  "status": "approved",  // or "pending", "rejected", "not_found"
  "data": {
    "status": "approved",
    "signed": true,
    "signed_at": "2025-01-16 10:30:00"
  }
}
```

**Status Values:**
- `"not_found"` - Authentication request not found or expired
- `"pending"` - Still waiting for user approval in Nafath app
- `"approved"` - User approved in Nafath app, contract can be registered
- `"rejected"` - User rejected in Nafath app

**Frontend Usage:**
```javascript
const timestamp = new Date().getTime();
const url = `${API_BASE_URL}/portallogistice/nafath/checkStatus?national_id=${profile.national_id}&contract_type=${contractType}&_t=${timestamp}`;

const response = await axios.get(url, {
  headers: {
    'X-LANG': lang,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

const status = response.data?.status || response.data?.data?.status;

if (status === "approved") {
  // Proceed with contract registration
  setNafathSigned(true);
}
```

---

## Admin Endpoints

### 12. Get Admin Dashboard Statistics

**Purpose:** Get dashboard statistics for admin (total users, contracts, etc.)

**Method:** `GET`  
**Endpoint:** `/portallogistice/admin/dashboard/stats`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Pages/AdminDashboard.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "total_users": 100,
    "total_contracts": 250,
    "pending_contracts": 15,
    "approved_contracts": 200,
    "denied_contracts": 35,
    "total_selling_contracts": 125,
    "total_rental_contracts": 125
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.get(
  'https://shellafood.com/api/v1/portallogistice/admin/dashboard/stats',
  { headers: getAuthHeaders() }
);

if (response.data.success) {
  setStats(response.data.data);
}
```

---

### 13. Get All Users (Admin)

**Purpose:** Get paginated list of all users with filters

**Method:** `GET`  
**Endpoint:** `/portallogistice/admin/users`  
**Query Parameters:** `?search={term}&status={status}&per_page={n}&page={n}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/UserManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Query Parameters:**
- `search` (optional): Search by name, email, or national_id
- `status` (optional): Filter by status (active, inactive, all)
- `per_page` (optional): Items per page (default: 15)
- `page` (optional): Page number (default: 1)

**Request URL:**
```
https://shellafood.com/api/v1/portallogistice/admin/users?search=1234567890&status=active&per_page=15&page=1
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "user": {
          "id": 1,
          "national_id": "1234567890",
          "email": "user@example.com",
          "phone": "0501234567",
          "first_name": "أحمد",
          "family_name": "العلي",
          "is_active": true,
          "created_at": "2025-01-01 10:00:00"
        },
        "contracts_count": 2
      }
    ],
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7
  }
}
```

**Frontend Usage:**
```javascript
const params = new URLSearchParams();
if (searchTerm) params.append('search', searchTerm);
if (filterStatus !== 'all') params.append('status', filterStatus);
params.append('per_page', '15');
params.append('page', currentPage.toString());

const response = await axios.get(
  `https://shellafood.com/api/v1/portallogistice/admin/users?${params.toString()}`,
  { headers: getAuthHeaders() }
);
```

---

### 14. Get User by National ID (Admin)

**Purpose:** Get specific user details by national ID

**Method:** `GET`  
**Endpoint:** `/portallogistice/admin/users/{national_id}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/UserManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
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
      "birth_date": "1990-01-01",
      "region": "الرياض",
      "national_address_email": "address@example.com",
      "bank_name": "البنك الأهلي",
      "iban": "SA1234567890123456789012",
      "is_active": true,
      "max_contracts_allowed": null,
      "contracts": [
        {
          "id": 1,
          "contract_type": "selling",
          "status": 1,
          "amount": 6600
        }
      ]
    }
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.get(
  `https://shellafood.com/api/v1/portallogistice/admin/users/${nationalId}`,
  { headers: getAuthHeaders() }
);

if (response.data.success) {
  setSelectedUser(response.data.data);
  setShowUserModal(true);
}
```

---

### 15. Create User (Admin)

**Purpose:** Create a new user account

**Method:** `POST`  
**Endpoint:** `/portallogistice/admin/users`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/UserManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:**
```json
{
  "national_id": "1234567890",
  "email": "user@example.com",
  "phone": "0501234567",
  "password": "password123",
  "first_name": "أحمد",
  "family_name": "العلي",
  "father_name": "محمد",
  "grandfather_name": "علي",
  "birth_date": "1990-01-01",
  "region": "الرياض",
  "national_address_email": "address@example.com",
  "bank_name": "البنك الأهلي",
  "iban": "SA1234567890123456789012",
  "is_active": true,
  "max_contracts_allowed": 2
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم إنشاء المستخدم بنجاح",
  "data": {
    "user": {
      // User object with all fields
    }
  }
}
```

---

### 16. Update User (Admin)

**Purpose:** Update user information

**Method:** `PUT`  
**Endpoint:** `/portallogistice/admin/users/{national_id}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/UserManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:**
```json
{
  "first_name": "أحمد",
  "family_name": "العلي",
  "email": "user@example.com",
  "phone": "0501234567",
  "region": "الرياض",
  "iban": "SA1234567890123456789012",
  "max_contracts_allowed": 2,
  "is_active": true
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تحديث المستخدم بنجاح",
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

---

### 17. Update User Status (Admin)

**Purpose:** Activate or deactivate a user account

**Method:** `PUT`  
**Endpoint:** `/portallogistice/admin/users/{national_id}/status`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/UserManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:**
```json
{
  "is_active": true  // or false
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تحديث حالة المستخدم بنجاح",
  "data": {
    "user": {
      "is_active": true
    }
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.put(
  `https://shellafood.com/api/v1/portallogistice/admin/users/${nationalId}/status`,
  { is_active: !user.is_active },
  { headers: getAuthHeaders() }
);
```

---

### 18. Get All Contracts (Admin)

**Purpose:** Get paginated list of all contracts with filters

**Method:** `GET`  
**Endpoint:** `/portallogistice/admin/contracts`  
**Query Parameters:** `?search={term}&status={status}&contract_type={type}&per_page={n}&page={n}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/ContractManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Query Parameters:**
- `search` (optional): Search by national_id or user name
- `status` (optional): Filter by status (pending, approved, denied, all)
- `contract_type` (optional): Filter by type (selling, rental, all)
- `per_page` (optional): Items per page (default: 15)
- `page` (optional): Page number (default: 1)

**Request URL:**
```
https://shellafood.com/api/v1/portallogistice/admin/contracts?search=1234567890&status=pending&contract_type=selling&per_page=15&page=1
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "national_id": "1234567890",
        "user_name": "أحمد محمد علي العلي",
        "contract_type": "selling",
        "amount": 6600,
        "status": null,
        "status_text": "pending",
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890",
        "created_at": "2025-01-16 10:00:00",
        "updated_at": "2025-01-16 10:00:00"
      }
    ],
    "total": 250,
    "per_page": 15,
    "current_page": 1,
    "last_page": 17
  }
}
```

---

### 19. Get Contract by ID (Admin)

**Purpose:** Get specific contract details

**Method:** `GET`  
**Endpoint:** `/portallogistice/admin/contracts/{contractId}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/ContractManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "contract": {
      "id": 1,
      "national_id": "1234567890",
      "user_name": "أحمد محمد علي العلي",
      "contract_type": "selling",
      "amount": 6600,
      "status": 1,
      "status_text": "approved",
      "linked_rental_contract_id": 2,
      "linked_selling_contract_id": null,
      "signed_contract_path": "/storage/contracts/signed_contract_1.pdf",
      "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890",
      "created_at": "2025-01-16 10:00:00",
      "updated_at": "2025-01-16 15:00:00"
    },
    "user": {
      // User information
    }
  }
}
```

---

### 20. Update Contract Status (Admin)

**Purpose:** Approve or deny a contract

**Method:** `PUT`  
**Endpoint:** `/portallogistice/admin/contracts/{contractId}/status`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/ContractManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Request Body:**
```json
{
  "status": 1  // 1 = approve, 0 = deny
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم قبول العقد بنجاح",  // or "تم رفض العقد"
  "data": {
    "contract": {
      "id": 1,
      "status": 1,  // or 0
      "status_text": "approved"  // or "denied"
    }
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.put(
  `https://shellafood.com/api/v1/portallogistice/admin/contracts/${contractId}/status`,
  { status: approve ? 1 : 0 },
  { headers: getAuthHeaders() }
);
```

---

### 21. Delete Contract (Admin)

**Purpose:** Delete a contract

**Method:** `DELETE`  
**Endpoint:** `/portallogistice/admin/contracts/{contractId}`  
**Auth Required:** Yes (Bearer Token - Admin)  
**Used In:** `src/Components/ContractManagement.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "Accept": "application/json"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم حذف العقد بنجاح"
}
```

**Frontend Usage:**
```javascript
const response = await axios.delete(
  `https://shellafood.com/api/v1/portallogistice/admin/contracts/${contractId}`,
  { headers: getAuthHeaders() }
);
```

---

## OTP Endpoints

### 22. Send OTP

**Purpose:** Send OTP code to user's phone/email for quick access

**Method:** `POST`  
**Endpoint:** `/portallogistice/send-otp`  
**Auth Required:** No  
**Used In:** `src/Utitlities/Header.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "national_id": "1234567890"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق بنجاح"
}
```

**Frontend Usage:**
```javascript
const response = await axios.post(
  'https://shellafood.com/api/v1/portallogistice/send-otp',
  { national_id: nationalId },
  { headers: { 'Content-Type': 'application/json', 'X-LANG': 'ar' } }
);
```

---

### 23. Verify OTP

**Purpose:** Verify OTP code and get user contracts (quick access without login)

**Method:** `POST`  
**Endpoint:** `/portallogistice/verify-otp`  
**Auth Required:** No  
**Used In:** `src/Utitlities/Header.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "national_id": "1234567890",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "data": {
    "contracts": [
      {
        "id": 1,
        "contract_type": "selling",
        "status": 1,
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890"
      }
    ]
  }
}
```

**Frontend Usage:**
```javascript
const response = await axios.post(
  'https://shellafood.com/api/v1/portallogistice/verify-otp',
  { national_id: nationalId, otp: code },
  { headers: { 'Content-Type': 'application/json', 'X-LANG': 'ar' } }
);

if (response.data.success) {
  const contracts = response.data.data.contracts || [];
  // Display contracts for user to download
}
```

---

## Contract PDF Endpoints

### 24. Generate Contract PDF (HTML)

**Purpose:** Generate contract PDF preview as HTML/blob

**Method:** `POST`  
**Endpoint:** `/portallogistice/contract-pdf`  
**Auth Required:** No  
**Used In:** `src/Pages/TsahelPage.js`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"
}
```

**Request Body:**
```json
{
  "contract_type": "selling",  // or "rental"
  "national_id": "1234567890",
  "first_name": "أحمد",
  "family_name": "العلي",
  // ... all contract fields
}
```

**Response:** HTML/blob for preview

**Frontend Usage:**
```javascript
const response = await fetch(
  'https://shellafood.com/api/v1/portallogistice/contract-pdf',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-LANG': lang },
    body: JSON.stringify(formData)
  }
);
```

---

### 25. Generate Contract PDF (PDF Format)

**Purpose:** Generate contract PDF in PDF format for download

**Method:** `POST`  
**Endpoint:** `/portallogistice/contract-pdf?pdf=1`  
**Auth Required:** Yes (Bearer Token) - For authenticated requests  
**Used In:** `src/Components/ContractForm.js`, `src/Pages/TsahelPage.js`

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",  // If authenticated
  "Content-Type": "application/json",
  "X-LANG": "ar"
}
```

**Request Body (FormData):**
```
contract_type: "selling"
```

**Response:** PDF file (blob)

**Frontend Usage:**
```javascript
const formData = new FormData();
formData.append('contract_type', contractType);

const headers = getAuthHeaders();
headers['X-LANG'] = i18n.language;

const response = await axios.post(
  `${API_BASE_URL}/portallogistice/contract-pdf?pdf=1`,
  formData,
  { 
    headers,
    responseType: 'blob'
  }
);

const blob = new Blob([response.data], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
setSellingPdfUrl(url);
```

---

## Summary

### Total Endpoints: 25

### By Category:
- **Authentication:** 4 endpoints
- **User Profile:** 2 endpoints
- **Contract Management:** 3 endpoints
- **Nafath Authentication:** 2 endpoints
- **Admin:** 10 endpoints
- **OTP:** 2 endpoints
- **Contract PDF:** 2 endpoints

### By Auth Requirement:
- **Public (No Auth):** 6 endpoints
  - User Login
  - Admin Login
  - Download Contract PDF
  - Initiate Nafath
  - Check Nafath Status
  - Send OTP
  - Verify OTP
  - Generate Contract PDF (public access)

- **Protected (Bearer Token):** 19 endpoints
  - All user profile endpoints
  - All contract management endpoints (except download)
  - All admin endpoints
  - Logout endpoints
  - Generate Contract PDF (authenticated)

### Common Request Headers:

**For Authenticated Requests:**
```javascript
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"  // or "en"
}
```

**For Public Requests:**
```javascript
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-LANG": "ar"
}
```

### Common Response Format:

**Success Response:**
```json
{
  "success": true,
  "message": "Success message in Arabic",
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message in Arabic",
  "errors": [
    {
      "code": "error_code",
      "message": "Error message"
    }
  ]
}
```

### Error Status Codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

**Last Updated:** January 2025  
**Status:** All endpoints are actively used in the frontend application
