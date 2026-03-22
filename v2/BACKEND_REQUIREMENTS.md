# Backend Requirements & Questions - User Dashboard Enhancement

**Project:** Portal Logistics - Client Dashboard  
**Date:** January 2025  
**Purpose:** Clarify backend capabilities and required new endpoints

---

## 📋 Current Backend Status

### Existing Endpoints (From ENDPOINTS.md)
✅ **Authentication:**
- POST `/portallogistice/login`
- POST `/portallogistice/logout`
- POST `/portallogistice/admin/login`
- POST `/portallogistice/admin/logout`

✅ **User Profile:**
- GET `/portallogistice/profile`
- PUT `/portallogistice/profile`

✅ **Contracts:**
- GET `/portallogistice/contracts`
- POST `/portallogistice/register` (create contract)
- GET `/portallogistice/download-contract/{id}`

✅ **Nafath:**
- POST `/portallogistice/nafath/initiate`
- GET `/portallogistice/nafath/checkStatus`

✅ **Admin:**
- GET `/portallogistice/admin/dashboard/stats`
- GET `/portallogistice/admin/users`
- GET `/portallogistice/admin/contracts`
- PUT `/portallogistice/admin/contracts/{id}/status`

---

## ❓ Critical Questions for Backend Team

### 1. Payment Tracking & History

**Question:** Do we have endpoints for payment tracking?

**What We Need:**
- GET `/portallogistice/payments` - Get all payments for authenticated user
  - Response should include:
    - Payment ID
    - Contract ID
    - Amount
    - Payment Date
    - Status (received, pending, reported_missing)
    - Month/Period
  
- GET `/portallogistice/payments/{contractId}` - Get payments for specific contract
  
- GET `/portallogistice/payments/summary` - Get payment summary (total received, pending, etc.)

- POST `/portallogistice/payments/report-missing` - Report missing payment
  - Body: `{ contract_id, expected_date, amount, notes }`

**Current Status:** ❓ Unknown - Need confirmation

---

### 2. Document Upload System

**Question:** Do we have endpoints for document uploads?

**What We Need:**
- POST `/portallogistice/documents/upload` - Upload document
  - Body: `{ type: 'iban_doc' | 'national_address_doc' | 'receipt', contract_id?: number, file: File }`
  - Response: `{ success, document_id, status: 'pending' | 'approved' | 'rejected' }`

- GET `/portallogistice/documents` - Get all user documents
  - Response: List of documents with status

- GET `/portallogistice/documents/{id}` - Get specific document

- PUT `/portallogistice/documents/{id}` - Update document (re-upload if rejected)

- DELETE `/portallogistice/documents/{id}` - Delete document

**Current Status:** ❓ Unknown - Need confirmation

**Specific Documents:**
1. **IBAN Document** - Uploaded once at profile level
2. **National Address Document** - Uploaded once at profile level
3. **Contract Receipt** - Uploaded per contract after approval

---

### 3. Receipt Upload & 48-Hour Window

**Question:** How do we track the 48-hour receipt upload window?

**What We Need:**
- When admin approves contract, backend should:
  - Set `receipt_upload_deadline` = approval_date + 48 hours
  - Set `receipt_upload_status` = 'pending'
  
- GET `/portallogistice/contracts/{id}/receipt-status` - Get receipt upload status
  - Response: `{ can_upload, deadline, status, hours_remaining }`

- POST `/portallogistice/contracts/{id}/upload-receipt` - Upload receipt
  - Body: `{ file: File }`
  - Validation: Check if within 48h window (or allow late upload with warning)

**Current Status:** ❓ Need implementation details

---

### 4. Contract Creation Business Rules

**Question:** Are these rules enforced in backend?

**Rules to Enforce:**
1. ✅ **Cannot create rental without selling** - Already enforced?
2. ✅ **Cannot create new selling without completing rental** - Need confirmation
3. ✅ **Receipt upload limits** - Max 2 receipts pending simultaneously
4. ✅ **Cannot create 3rd contract unless receipt provided** - Need confirmation

**What We Need:**
- POST `/portallogistice/contracts/validate` - Check if user can create contract
  - Body: `{ contract_type: 'selling' | 'rental' }`
  - Response: `{ can_create, reason, required_actions }`

- When creating contract, backend should validate:
  - For selling: Check receipt status of previous contracts
  - For rental: Check if selling contract exists and is approved

**Current Status:** ❓ Need confirmation on all rules

---

### 5. Account Details for Wire Transfer

**Question:** Where is this information stored? Is it configurable?

**What We Need:**
- GET `/portallogistice/account-details` - Get wire transfer account details
  - Response: `{ account_name, account_number, bank_name, iban, swift_code, beneficiary_name }`
  - Should be same for all users (company account)

**Current Status:** ❓ Need to know if this exists or needs to be added

---

### 6. Notifications & Tasks System

**Question:** Do we have a notification system?

**What We Need:**
- GET `/portallogistice/notifications` - Get all notifications/tasks
  - Response: List of tasks with:
    - Type (upload_receipt, complete_profile, upload_doc, create_rental)
    - Title
    - Description
    - Priority (urgent, normal)
    - Deadline (if applicable)
    - Status (pending, completed)
    - Action URL

- PUT `/portallogistice/notifications/{id}/read` - Mark as read

- PUT `/portallogistice/notifications/{id}/dismiss` - Dismiss notification

**Current Status:** ❓ Need to know if this exists

**Task Types:**
1. Upload receipt (if contract approved, within 48h)
2. Complete profile (if fields missing)
3. Upload documents (IBAN or National Address missing)
4. Create rental contract (if orphan selling exists)
5. Contract approval pending

---

### 7. Contract Timeline & Status Tracking

**Question:** How do we track contract timeline (65 days, payment schedule)?

**What We Need:**
- Contract model should include:
  - `approved_at` - When admin approved
  - `receipt_uploaded_at` - When receipt uploaded
  - `contract_starts_at` - approved_at + 65 days
  - `payment_schedule` - Array of payment dates/amounts
  - `payment_option` - 'full' | 'half_plus_rest'
  - `rest_payment_deadline` - If half payment, deadline for rest (60 days)

- GET `/portallogistice/contracts/{id}/timeline` - Get contract timeline
  - Response: Events with dates and status

**Current Status:** ❓ Need to check contract model

---

### 8. Payment Schedule & Monthly Payments

**Question:** How are monthly payments tracked and sent?

**What We Need:**
- Contract should have `payment_schedule` array:
  ```json
  {
    "month": 1,
    "amount": 660,
    "due_date": "2025-02-01",
    "paid_date": "2025-02-01",
    "status": "paid" | "pending" | "overdue"
  }
  ```

- GET `/portallogistice/contracts/{id}/payments` - Get payment schedule for contract

- When admin marks payment as sent:
  - PUT `/portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent`
  - This should update payment status in user's view

**Current Status:** ❓ Need to know payment tracking system

---

### 9. User Analytics & Statistics

**Question:** Do we have user-specific analytics endpoints?

**What We Need:**
- GET `/portallogistice/analytics/summary` - Get user analytics
  - Response:
    ```json
    {
      "total_contracts": 2,
      "active_contracts": 1,
      "pending_contracts": 1,
      "total_invested": 13200,
      "total_received": 1320,
      "pending_payments": 6600,
      "next_payment_date": "2025-02-01",
      "next_payment_amount": 660
    }
    ```

- GET `/portallogistice/analytics/payments` - Get payment analytics
  - Response: Monthly payment data for charts
  - Format: `[{ month: "2025-01", amount: 660, contract_id: 1 }, ...]`

**Current Status:** ❓ Need to create or confirm

---

### 10. Document Status & Review

**Question:** How do admins review and approve/reject documents?

**What We Need:**
- Admin endpoints for document review:
  - GET `/portallogistice/admin/documents` - Get all pending documents
  - PUT `/portallogistice/admin/documents/{id}/approve` - Approve document
  - PUT `/portallogistice/admin/documents/{id}/reject` - Reject document
    - Body: `{ reason: string }`

- When document is approved/rejected, user should see status update

**Current Status:** ❓ Need to confirm admin document review flow

---

## 🔧 Required Backend Changes

### Database Schema Additions (If Needed)

**Documents Table:**
```sql
- id
- user_id (national_id)
- contract_id (nullable, for receipts)
- type (iban_doc, national_address_doc, receipt)
- file_path
- status (pending, approved, rejected)
- uploaded_at
- reviewed_at
- reviewer_id (admin)
- rejection_reason
```

**Payments Table:**
```sql
- id
- contract_id
- user_id (national_id)
- amount
- payment_date
- due_date
- status (pending, sent, received, reported_missing)
- month_number
- created_at
- updated_at
```

**Notifications/Tasks Table:**
```sql
- id
- user_id (national_id)
- type (upload_receipt, complete_profile, etc.)
- title
- description
- priority
- deadline
- status (pending, completed, dismissed)
- action_url
- created_at
- read_at
```

**Contract Additions:**
```sql
- approved_at
- receipt_upload_deadline
- receipt_uploaded_at
- contract_starts_at
- payment_option (full, half_plus_rest)
- rest_payment_deadline
- payment_schedule (JSON)
```

---

## 📝 API Endpoint Specifications Needed

### Priority 1 (Critical for MVP)
1. ✅ Payment tracking endpoints
2. ✅ Document upload endpoints
3. ✅ Receipt upload with deadline tracking
4. ✅ Contract validation endpoint
5. ✅ Account details endpoint

### Priority 2 (Important)
6. ✅ Notifications/Tasks endpoints
7. ✅ User analytics endpoints
8. ✅ Payment schedule endpoints

### Priority 3 (Nice to Have)
9. ✅ Document review admin endpoints
10. ✅ Payment reporting endpoints

---

## 🎯 Business Logic Validation

### Backend Must Enforce:

1. **Contract Creation Rules:**
   - ❌ Block rental creation if no approved selling exists
   - ❌ Block new selling if previous rental not created
   - ❌ Block 3rd contract if no receipts uploaded for previous contracts
   - ✅ Allow max 2 pending receipts simultaneously

2. **Receipt Upload Rules:**
   - ✅ Track 48-hour deadline from approval
   - ✅ Allow upload after deadline (with warning)
   - ✅ Validate receipt belongs to correct contract

3. **Payment Rules:**
   - ✅ Calculate payment schedule (12 months × 660 SAR)
   - ✅ Track payment status
   - ✅ Handle payment reporting

4. **Document Rules:**
   - ✅ IBAN doc: One per user (profile level)
   - ✅ National Address doc: One per user (profile level)
   - ✅ Receipt: One per contract (after approval)

---

## 🔄 Data Flow Requirements

### Real-time Updates
- When admin approves contract → User should see notification immediately
- When admin marks payment sent → User should see payment status update
- When document reviewed → User should see status update

**Options:**
1. Polling (every 30 seconds)
2. WebSockets (real-time)
3. Server-Sent Events (SSE)

**Recommendation:** Start with polling, upgrade to WebSockets later

---

## 📊 Response Format Standards

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message",
  "errors": { "field": "Error message" } // For validation errors
}
```

### Pagination (if applicable):
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 50,
    "total_pages": 5
  }
}
```

---

## 🚨 Error Handling

### Common Errors to Handle:
- 401: Unauthorized (token expired/invalid)
- 403: Forbidden (user doesn't have permission)
- 404: Not found
- 422: Validation error
- 500: Server error

### Error Messages:
- Should be in user's language (Arabic/English)
- Should be clear and actionable
- Should include field-level errors for forms

---

## 📅 Timeline Questions

1. **When can we get payment tracking endpoints?**
2. **When can we get document upload system?**
3. **When can we get notifications system?**
4. **When can we get analytics endpoints?**

**Frontend Timeline:** Ready to start once we have:
- Payment endpoints (for Payments page)
- Document upload endpoints (for Profile & Tasks)
- Contract validation endpoint (for business rules)

---

## ✅ Action Items for Backend Team

1. **Review this document**
2. **Answer all questions marked with ❓**
3. **Confirm which endpoints exist vs need to be created**
4. **Provide API specifications for new endpoints**
5. **Confirm business rule enforcement**
6. **Provide timeline for implementation**
7. **Set up test environment for new endpoints**

---

## 📞 Contact & Communication

**Questions?** Please provide:
- Endpoint specifications
- Response examples
- Error codes
- Authentication requirements
- Rate limiting (if any)

**Updates:** Please notify frontend team when:
- New endpoints are ready
- Endpoints are updated
- Business rules change
- Database schema changes

---

**End of Requirements Document**
