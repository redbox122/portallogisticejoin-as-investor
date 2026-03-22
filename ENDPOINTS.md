# Portal Logistics - All API Endpoints

**Base URL:** `https://shellafood.com/api/v1`

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
- **Method:** `POST`
- **Endpoint:** `/portallogistice/login`
- **Auth Required:** No
- **Description:** User login with email, phone, or national_id + password
- **Used In:**
  - `src/Context/AuthContext.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 2. Admin Login
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/login`
- **Auth Required:** No
- **Description:** Admin login for dashboard access
- **Used In:**
  - `src/Context/AuthContext.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 3. User Logout
- **Method:** `POST`
- **Endpoint:** `/portallogistice/logout`
- **Auth Required:** Yes (Bearer Token)
- **Description:** User logout
- **Used In:**
  - `src/Context/AuthContext.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 4. Admin Logout
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/logout`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Admin logout
- **Used In:**
  - `src/Context/AuthContext.js`
- **Status:** ✅ Active (Documented in APIS.MD)

---

## User Profile Endpoints

### 5. Get User Profile
- **Method:** `GET`
- **Endpoint:** `/portallogistice/profile`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Get authenticated user's profile information
- **Used In:**
  - `src/Pages/UserDashboard.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 6. Update User Profile
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/profile`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Update user profile information
- **Used In:**
  - `src/Pages/UserDashboard.js`
  - `src/Components/ProfileCompletionModal.js`
- **Status:** ✅ Active (Documented in APIS.MD)

---

## Contract Management Endpoints

### 7. Get All User Contracts
- **Method:** `GET`
- **Endpoint:** `/portallogistice/contracts`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Get all contracts for the authenticated user
- **Used In:**
  - `src/Pages/UserDashboard.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 8. Create New Contract (Register)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/register`
- **Auth Required:** Yes (Bearer Token)
- **Description:** Create a new contract and sign it via Nafath
- **Used In:**
  - `src/Components/ContractForm.js`
  - `src/Pages/TsahelPage.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 9. Download Contract PDF
- **Method:** `GET`
- **Endpoint:** `/portallogistice/download-contract/{id}`
- **Query Parameters:** `?national_id={national_id}`
- **Auth Required:** No (Public endpoint)
- **Description:** Download the signed contract PDF
- **Used In:**
  - `src/Pages/UserDashboard.js`
- **Status:** ✅ Active (Documented in APIS.MD)

### 10. Check Application Status (OLD - Not Used)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/check-application-status`
- **Auth Required:** No
- **Description:** Check status of a specific contract by tracking ID and national ID
- **Used In:** 
  - Not currently used in codebase (Documented in APIS.MD but not implemented)
- **Status:** ⚠️ **OLD ENDPOINT** - Documented but not used in codebase
- **Note:** This endpoint appears to be replaced by `/portallogistice/nafath/checkStatus` for checking Nafath authentication status

---

## Nafath Authentication Endpoints

### 11. Initiate Nafath Authentication
- **Method:** `POST`
- **Endpoint:** `/portallogistice/nafath/initiate`
- **Auth Required:** No
- **Description:** Initiate Nafath authentication process
- **Used In:**
  - `src/Components/ContractForm.js`
  - `src/Pages/TsahelPage.js`
- **Status:** ✅ Active

### 12. Check Nafath Status
- **Method:** `GET`
- **Endpoint:** `/portallogistice/nafath/checkStatus`
- **Query Parameters:** `?national_id={national_id}&contract_type={contract_type}`
- **Auth Required:** No
- **Description:** Check the status of Nafath authentication request
- **Used In:**
  - `src/Components/ContractForm.js`
  - `src/Pages/TsahelPage.js`
- **Status:** ✅ Active

---

## Admin Endpoints

### 13. Get Admin Dashboard Statistics
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/dashboard/stats`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get dashboard statistics (total users, contracts, etc.)
- **Used In:**
  - `src/Pages/AdminDashboard.js`
- **Status:** ✅ Active

### 14. Get All Users (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/users`
- **Query Parameters:** `?search={term}&status={status}&per_page={n}&page={n}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get paginated list of all users with filters
- **Used In:**
  - `src/Components/UserManagement.js`
- **Status:** ✅ Active

### 15. Get User by National ID (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/users/{national_id}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get specific user details by national ID
- **Used In:**
  - `src/Components/UserManagement.js`
- **Status:** ✅ Active

### 16. Create User (Admin)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/admin/users`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Create a new user account
- **Used In:**
  - `src/Components/UserManagement.js`
- **Status:** ✅ Active

### 17. Update User (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/users/{national_id}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Update user information
- **Used In:**
  - `src/Components/UserManagement.js`
- **Status:** ✅ Active

### 18. Update User Status (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/users/{national_id}/status`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Activate or deactivate a user account
- **Used In:**
  - `src/Components/UserManagement.js`
- **Status:** ✅ Active

### 19. Get All Contracts (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/contracts`
- **Query Parameters:** `?search={term}&status={status}&contract_type={type}&per_page={n}&page={n}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get paginated list of all contracts with filters
- **Used In:**
  - `src/Components/ContractManagement.js`
- **Status:** ✅ Active

### 20. Get Contract by ID (Admin)
- **Method:** `GET`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Get specific contract details
- **Used In:**
  - `src/Components/ContractManagement.js`
- **Status:** ✅ Active

### 21. Update Contract Status (Admin)
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}/status`
- **Body:** `{ status: 1 }` (approve) or `{ status: 0 }` (deny)
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Approve or deny a contract
- **Used In:**
  - `src/Components/ContractManagement.js`
- **Status:** ✅ Active

### 22. Delete Contract (Admin)
- **Method:** `DELETE`
- **Endpoint:** `/portallogistice/admin/contracts/{contractId}`
- **Auth Required:** Yes (Bearer Token - Admin)
- **Description:** Delete a contract
- **Used In:**
  - `src/Components/ContractManagement.js`
- **Status:** ✅ Active

---

## OTP Endpoints

### 23. Send OTP
- **Method:** `POST`
- **Endpoint:** `/portallogistice/send-otp`
- **Body:** `{ national_id: "..." }`
- **Auth Required:** No
- **Description:** Send OTP code to user's phone/email
- **Used In:**
  - `src/Utitlities/Header.js`
- **Status:** ✅ Active

### 24. Verify OTP
- **Method:** `POST`
- **Endpoint:** `/portallogistice/verify-otp`
- **Body:** `{ national_id: "...", otp: "..." }`
- **Auth Required:** No
- **Description:** Verify OTP code and get user contracts
- **Used In:**
  - `src/Utitlities/Header.js`
- **Status:** ✅ Active

---

## Contract PDF Endpoints

### 25. Generate Contract PDF (HTML)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/contract-pdf`
- **Auth Required:** No
- **Description:** Generate contract PDF as HTML/blob
- **Used In:**
  - `src/Pages/TsahelPage.js`
- **Status:** ✅ Active

### 26. Generate Contract PDF (PDF Format)
- **Method:** `POST`
- **Endpoint:** `/portallogistice/contract-pdf?pdf=1`
- **Auth Required:** No
- **Description:** Generate contract PDF in PDF format
- **Used In:**
  - `src/Components/ContractForm.js`
  - `src/Pages/TsahelPage.js`
- **Status:** ✅ Active

---

## Summary

### Total Endpoints: 26

### By Category:
- **Authentication:** 4 endpoints
- **User Profile:** 2 endpoints
- **Contract Management:** 4 endpoints
- **Nafath Authentication:** 2 endpoints
- **Admin:** 10 endpoints
- **OTP:** 2 endpoints
- **Contract PDF:** 2 endpoints

### By Status:
- ✅ **Active (Currently Used):** 25 endpoints
- ⚠️ **OLD/Documented but Not Used:** 1 endpoint (`/portallogistice/check-application-status`)

### Old vs New Endpoints:
1. **OLD:** `/portallogistice/check-application-status` (POST) - Documented but not used
   - **NEW/REPLACEMENT:** `/portallogistice/nafath/checkStatus` (GET) - Currently used for checking Nafath authentication status
   - The old endpoint was for checking contract status by tracking_id + national_id
   - The new endpoint checks Nafath authentication status by national_id + contract_type

### Notes:
1. All endpoints use the base URL: `https://shellafood.com/api/v1`
2. Protected endpoints require Bearer token authentication
3. Most endpoints are documented in `APIS.MD`
4. The `/portallogistice/check-application-status` endpoint is documented but not currently used in the codebase
5. Contract PDF endpoints have two variants: one for HTML preview and one for PDF download (`?pdf=1`)
6. Admin endpoints require admin-level authentication
7. Nafath endpoints are used for digital signature authentication

---

**Last Updated:** January 2025
**API Version:** v1

