# 🔧 Backend Requirements: Admin Contracts Tabbed Interface

**Date:** January 2025  
**Priority:** 🔴 High  
**Requested By:** Frontend Team  
**Purpose:** Enable tabbed interface for admin contracts page with receipt status tracking

---

## 📋 EXECUTIVE SUMMARY

We need to enhance the admin contracts endpoint to support filtering by receipt status and include receipt-related fields in the contract response. This will enable admins to easily view contracts by their receipt upload status (pending, uploaded, overdue).

---

## 🎯 WHAT WE NEED

### 1. Receipt Status Fields in Contract Response ✅ CRITICAL

**Current State:** Unknown if these fields exist in contract response  
**Required:** Contract object must include receipt tracking fields

**Required Fields:**
```json
{
  "id": 123,
  "status": "approved",
  "status_ar": "مقبول",
  // ... existing fields ...
  
  // NEW FIELDS REQUIRED:
  "approved_at": "2025-01-16 10:00:00",           // Timestamp when contract was approved
  "receipt_upload_deadline": "2025-01-18 10:00:00", // Deadline for receipt upload (approved_at + 48 hours)
  "receipt_uploaded_at": "2025-01-17 14:30:00",    // Timestamp when receipt was uploaded (null if not uploaded)
  "receipt_upload_status": "pending"               // Values: "pending", "uploaded", "overdue", or null
}
```

**Field Specifications:**
- `approved_at`: TIMESTAMP NULL - Set when contract status changes to "approved"
- `receipt_upload_deadline`: TIMESTAMP NULL - Calculated as `approved_at + 48 hours`
- `receipt_uploaded_at`: TIMESTAMP NULL - Set when receipt document is uploaded
- `receipt_upload_status`: ENUM('pending', 'uploaded', 'overdue') NULL
  - `pending`: Contract approved, receipt not uploaded yet, deadline not passed
  - `uploaded`: Receipt has been uploaded
  - `overdue`: Deadline passed, receipt not uploaded
  - `null`: Contract not approved yet (no receipt requirement)

**Business Logic:**
- When contract is approved (`status = 1`):
  - Set `approved_at` = current timestamp
  - Set `receipt_upload_deadline` = `approved_at + 48 hours`
  - Set `receipt_upload_status` = `'pending'`
- When receipt is uploaded:
  - Set `receipt_uploaded_at` = current timestamp
  - Set `receipt_upload_status` = `'uploaded'`
- Calculate `receipt_upload_status` = `'overdue'` if:
  - `receipt_upload_status` = `'pending'` AND
  - Current time > `receipt_upload_deadline` AND
  - `receipt_uploaded_at` is NULL

---

### 2. Filter by Receipt Status ✅ CRITICAL

**Current Endpoint:** `GET /portallogistice/admin/contracts`

**Required:** Add `receipt_status` query parameter

**Query Parameter:**
- `receipt_status`: Filter by receipt upload status
  - Values: `pending`, `uploaded`, `overdue`
  - Optional parameter (if not provided, return all)

**Examples:**
```
GET /portallogistice/admin/contracts?receipt_status=pending
GET /portallogistice/admin/contracts?receipt_status=uploaded
GET /portallogistice/admin/contracts?receipt_status=overdue
```

**Response:** Same format as current endpoint, but filtered by receipt status

---

### 3. Combined Filters ✅ CRITICAL

**Required:** Support combining `status` and `receipt_status` filters

**Use Cases:**
- Get approved contracts waiting for receipt: `?status=approved&receipt_status=pending`
- Get approved contracts with receipt: `?status=approved&receipt_status=uploaded`
- Get all contracts waiting for receipt: `?receipt_status=pending`

**Examples:**
```
GET /portallogistice/admin/contracts?status=approved&receipt_status=pending
GET /portallogistice/admin/contracts?status=approved&receipt_status=uploaded
GET /portallogistice/admin/contracts?status=pending&receipt_status=pending  // Should return empty (pending contracts don't have receipt status)
```

**Logic:**
- If `status=pending`, `receipt_status` should be ignored (pending contracts don't have receipt requirements)
- If `status=denied`, `receipt_status` should be ignored (denied contracts don't have receipt requirements)
- If `status=approved`, `receipt_status` filter should work

---

### 4. Update Contract Approval Endpoint ✅ CRITICAL

**Current Endpoint:** `PUT /portallogistice/admin/contracts/{id}/status`

**Current Behavior:** Only sets `status` to 1 (approved) or 0 (denied)

**Required Change:** When approving (status = 1), also set receipt tracking fields

**Required Code Logic:**
```php
if ($request->status == 1) {
    // Approve contract
    $contract->status = 1;
    
    // NEW: Set receipt tracking fields
    $contract->approved_at = now();
    $contract->receipt_upload_deadline = now()->addHours(48);
    $contract->receipt_upload_status = 'pending';
    
    $contract->save();
}
```

**Note:** This should be done in the existing approval endpoint, no new endpoint needed.

---

## 📊 API SPECIFICATIONS

### Endpoint: GET /portallogistice/admin/contracts

**Query Parameters:**
- `status` (existing): `pending`, `approved`, `denied`, `all`
- `contract_type` (existing): `selling`, `rental`, `all`
- `search` (existing): Search term
- `per_page` (existing): Number of results per page
- `page` (existing): Page number
- `receipt_status` (NEW): `pending`, `uploaded`, `overdue`

**Example Request:**
```
GET /portallogistice/admin/contracts?status=approved&receipt_status=pending&per_page=15&page=1
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 123,
        "national_id": "1234567890",
        "applicant_name": "أحمد محمد علي",
        "email": "ahmed@example.com",
        "phone": "+966501234567",
        "contract_type": "selling",
        "contract_type_ar": "بيع",
        "status": "approved",
        "status_ar": "مقبول",
        "amount": "6600.00",
        "application_date": "2025-01-15 10:00:00",
        "contract_download_url": "https://...",
        "contract_signed": true,
        
        // NEW FIELDS:
        "approved_at": "2025-01-16 10:00:00",
        "receipt_upload_deadline": "2025-01-18 10:00:00",
        "receipt_uploaded_at": null,
        "receipt_upload_status": "pending"
      }
    ],
    "total": 12,
    "per_page": 15,
    "current_page": 1,
    "last_page": 1
  }
}
```

---

## 🔍 VALIDATION RULES

### Receipt Status Calculation:
1. **If contract is not approved** (`status != 'approved'`):
   - `receipt_upload_status` = `null`
   - `approved_at` = `null`
   - `receipt_upload_deadline` = `null`
   - `receipt_uploaded_at` = `null`

2. **If contract is approved** (`status = 'approved'`):
   - `approved_at` must be set
   - `receipt_upload_deadline` must be set (approved_at + 48 hours)
   - If `receipt_uploaded_at` is NULL:
     - If current time < `receipt_upload_deadline`: `receipt_upload_status` = `'pending'`
     - If current time >= `receipt_upload_deadline`: `receipt_upload_status` = `'overdue'`
   - If `receipt_uploaded_at` is set: `receipt_upload_status` = `'uploaded'`

### Filter Validation:
- If `status=pending` or `status=denied`, ignore `receipt_status` filter (return empty or all)
- If `receipt_status` is provided without `status=approved`, only return approved contracts

---

## ✅ TESTING REQUIREMENTS

### Test Cases:

1. **Get approved contracts waiting for receipt:**
   ```
   GET /portallogistice/admin/contracts?status=approved&receipt_status=pending
   ```
   - Should return only approved contracts where receipt is not uploaded and deadline not passed

2. **Get approved contracts with receipt:**
   ```
   GET /portallogistice/admin/contracts?status=approved&receipt_status=uploaded
   ```
   - Should return only approved contracts where receipt has been uploaded

3. **Get overdue receipts:**
   ```
   GET /portallogistice/admin/contracts?receipt_status=overdue
   ```
   - Should return only approved contracts where deadline passed and receipt not uploaded

4. **Combined filters:**
   ```
   GET /portallogistice/admin/contracts?status=approved&receipt_status=pending&contract_type=selling
   ```
   - Should return approved selling contracts waiting for receipt

5. **Approval sets receipt fields:**
   - Approve a contract via `PUT /portallogistice/admin/contracts/{id}/status` with `status=1`
   - Verify `approved_at`, `receipt_upload_deadline`, and `receipt_upload_status='pending'` are set

---

## 🚨 CRITICAL NOTES

1. **Backward Compatibility:** 
   - Existing endpoints should continue to work
   - New fields should be nullable (don't break existing contracts)

2. **Database Migration:**
   - If columns don't exist, need migration:
   ```sql
   ALTER TABLE portal_logistices 
   ADD COLUMN approved_at TIMESTAMP NULL,
   ADD COLUMN receipt_upload_deadline TIMESTAMP NULL,
   ADD COLUMN receipt_uploaded_at TIMESTAMP NULL,
   ADD COLUMN receipt_upload_status ENUM('pending', 'uploaded', 'overdue') NULL;
   ```

3. **Existing Contracts:**
   - For existing approved contracts without these fields:
     - Set `approved_at` = contract creation date or approval date (if tracked elsewhere)
     - Calculate `receipt_upload_deadline` = `approved_at + 48 hours`
     - Set `receipt_upload_status` based on current state

4. **Receipt Upload Endpoint:**
   - When receipt is uploaded (via existing or new endpoint), update:
     - `receipt_uploaded_at` = current timestamp
     - `receipt_upload_status` = `'uploaded'`

---

## 📝 IMPLEMENTATION CHECKLIST

### Database:
- [ ] Add `approved_at` column to `portal_logistices` table
- [ ] Add `receipt_upload_deadline` column to `portal_logistices` table
- [ ] Add `receipt_uploaded_at` column to `portal_logistices` table
- [ ] Add `receipt_upload_status` ENUM column to `portal_logistices` table
- [ ] Backfill existing approved contracts with receipt fields

### API Endpoints:
- [ ] Update `GET /portallogistice/admin/contracts` to include receipt fields in response
- [ ] Add `receipt_status` query parameter support to `GET /portallogistice/admin/contracts`
- [ ] Support combined filters (`status` + `receipt_status`)
- [ ] Update `PUT /portallogistice/admin/contracts/{id}/status` to set receipt fields on approval
- [ ] Update receipt upload endpoint to set `receipt_uploaded_at` and `receipt_upload_status`

### Business Logic:
- [ ] Calculate `receipt_upload_status` dynamically (pending/overdue/uploaded)
- [ ] Set `receipt_upload_deadline` = `approved_at + 48 hours` on approval
- [ ] Handle edge cases (null values, old contracts)

### Testing:
- [ ] Test filtering by `receipt_status`
- [ ] Test combined filters
- [ ] Test approval sets receipt fields
- [ ] Test receipt upload updates status
- [ ] Test with existing contracts (backward compatibility)

---

## ❓ QUESTIONS FOR BACKEND TEAM

1. **Do receipt tracking columns already exist in the database?**
   - If yes, what are the exact column names?
   - If no, can we add them?

2. **Is there an existing receipt upload endpoint?**
   - If yes, does it update these fields?
   - If no, do we need to create one?

3. **How are existing approved contracts handled?**
   - Do they have approval timestamps stored elsewhere?
   - Should we backfill receipt fields for existing contracts?

4. **Timeline:**
   - When can we expect these changes?
   - Can we implement in phases (fields first, then filtering)?

---

## 📞 CONTACT

**Frontend Team Contact:** [Your Name/Team]  
**Priority:** 🔴 High - Needed for admin contracts page enhancement  
**Estimated Frontend Implementation:** 3-4 days after backend is ready

---

**Status:** 📋 Awaiting Backend Implementation  
**Last Updated:** January 2025
