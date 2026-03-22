# Payments Page Access Control - Backend Requirements

## 📋 Executive Summary

The `/dashboard/payments` page should only be accessible to users who have:
1. **An approved contract** (status = approved/1)
2. **A signed contract** (contract_signed = true)
3. **An uploaded receipt** (receipt_upload_status = 'uploaded')
4. **All contract steps completed** (contract is in "active" state)

Currently, the payments page is accessible to all authenticated users, which creates a poor UX and potential confusion.

---

## 🎯 Problem Statement

### Current Situation
- Payments page (`/dashboard/payments`) is accessible to all authenticated users
- Users without active contracts see empty payment lists or errors
- No clear indication why payments aren't available
- Frontend must make multiple API calls to determine eligibility

### Desired Behavior
- Payments page should only appear/be accessible when user has an active contract
- Clear messaging when access is denied
- Efficient eligibility checking (minimal API calls)
- Consistent contract status determination across frontend/backend

---

## 🔍 Contract Status Flow

### Contract Lifecycle States

```
1. PENDING → Contract submitted, awaiting admin approval
2. APPROVED → Admin approved, waiting for receipt upload
3. ACTIVE → Approved + Signed + Receipt Uploaded (READY FOR PAYMENTS)
4. DENIED → Contract rejected by admin
```

### Active Contract Criteria

A contract is considered **ACTIVE** (eligible for payments) when **ALL** of the following are true:

```javascript
{
  status: 'approved' || 1,                    // Admin approved
  contract_signed: true,                      // User signed via Nafath
  receipt_upload_status: 'uploaded'           // Receipt uploaded and approved
}
```

**Note:** The frontend currently determines this with:
```javascript
const isActive = statusStr === 'active' || 
  (isApproved && contract.contract_signed && receiptStatus === 'uploaded');
```

---

## 📡 API Endpoint Requirements

### Option 1: Enhance Existing Contracts Endpoint (RECOMMENDED)

**Endpoint:** `GET /portallogistice/contracts`

**Current Behavior:** Returns all user contracts

**Required Enhancement:** Add `is_active` and `eligibility` fields to each contract object

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 123,
        "contract_type": "rental",
        "status": "approved",
        "status_ar": "مقبول",
        "contract_signed": true,
        "receipt_upload_status": "uploaded",
        "receipt_uploaded_at": "2025-01-20 10:00:00",
        "approved_at": "2025-01-18 10:00:00",
        "amount": "6600.00",
        "contract_number": "CNT-2025-001",
        
        // NEW FIELDS:
        "is_active": true,
        "can_access_payments": true,
        "eligibility_status": "active",
        "eligibility_reason": null
      },
      {
        "id": 124,
        "contract_type": "selling",
        "status": "approved",
        "contract_signed": true,
        "receipt_upload_status": "pending",
        
        // NEW FIELDS:
        "is_active": false,
        "can_access_payments": false,
        "eligibility_status": "waiting_receipt",
        "eligibility_reason": "Receipt upload pending"
      }
    ]
  }
}
```

**Eligibility Status Values:**
- `active` - Contract is active, payments accessible
- `waiting_receipt` - Approved but receipt not uploaded
- `receipt_overdue` - Receipt deadline passed
- `not_signed` - Contract not signed
- `pending_approval` - Awaiting admin approval
- `denied` - Contract rejected
- `no_contract` - User has no contracts

---

### Option 2: New Eligibility Endpoint (OPTIONAL - For Performance)

**Endpoint:** `GET /portallogistice/contracts/eligibility`

**Purpose:** Lightweight endpoint that returns only eligibility information

**Response:**
```json
{
  "success": true,
  "data": {
    "can_access_payments": true,
    "has_active_contract": true,
    "active_contract_id": 123,
    "active_contract_number": "CNT-2025-001",
    "eligibility_status": "active",
    "blocking_reasons": [],
    "next_steps": []
  }
}
```

**When `can_access_payments` is false:**
```json
{
  "success": true,
  "data": {
    "can_access_payments": false,
    "has_active_contract": false,
    "active_contract_id": null,
    "eligibility_status": "waiting_receipt",
    "blocking_reasons": [
      "Receipt upload pending. Deadline: 2025-01-20 10:00:00"
    ],
    "next_steps": [
      "Upload receipt to activate contract",
      "Contact support if receipt was already uploaded"
    ]
  }
}
```

**Benefits:**
- Single lightweight call for eligibility check
- Clear messaging for frontend
- Can be cached more easily
- Reduces payload size

---

### Option 3: Add to User Profile Endpoint (ALTERNATIVE)

**Endpoint:** `GET /portallogistice/profile`

**Enhancement:** Add payment eligibility flags to user profile response

**Response Addition:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "national_id": "1234567890",
      "name": "أحمد محمد",
      // ... existing fields ...
      
      // NEW FIELDS:
      "contract_eligibility": {
        "can_access_payments": true,
        "has_active_contract": true,
        "active_contract_id": 123,
        "eligibility_status": "active"
      }
    }
  }
}
```

**Note:** This approach is less ideal because:
- Profile endpoint may be cached longer
- Contract status changes won't reflect immediately
- Mixes user data with contract data

---

## 🔧 Implementation Details

### Backend Logic for `is_active` Calculation

```php
// Pseudo-code for contract eligibility check
function isContractActive($contract) {
    // Check status
    $isApproved = in_array($contract->status, ['approved', 1, '1']);
    
    // Check if signed
    $isSigned = $contract->contract_signed === true;
    
    // Check receipt status
    $receiptUploaded = $contract->receipt_upload_status === 'uploaded';
    
    return $isApproved && $isSigned && $receiptUploaded;
}

// Determine eligibility status
function getEligibilityStatus($contract) {
    if (!$contract) {
        return 'no_contract';
    }
    
    $status = strtolower($contract->status);
    
    if ($status === 'denied' || $contract->status === 0) {
        return 'denied';
    }
    
    if ($status !== 'approved' && $contract->status !== 1) {
        return 'pending_approval';
    }
    
    if (!$contract->contract_signed) {
        return 'not_signed';
    }
    
    if ($contract->receipt_upload_status === 'overdue') {
        return 'receipt_overdue';
    }
    
    if ($contract->receipt_upload_status === 'pending') {
        return 'waiting_receipt';
    }
    
    if ($contract->receipt_upload_status === 'uploaded') {
        return 'active';
    }
    
    return 'unknown';
}
```

### Database Fields Required

Ensure these fields exist and are populated:

**Contract Table Fields:**
- `status` (int/string) - Contract approval status
- `contract_signed` (boolean) - Whether contract is signed via Nafath
- `receipt_upload_status` (string) - 'pending', 'uploaded', 'overdue', or null
- `receipt_uploaded_at` (datetime/nullable) - When receipt was uploaded
- `approved_at` (datetime/nullable) - When contract was approved
- `receipt_upload_deadline` (datetime/nullable) - Receipt upload deadline

**Status Values:**
- `status`: `0` (denied), `1` (approved), `null` (pending)
- `receipt_upload_status`: `'pending'`, `'uploaded'`, `'overdue'`, or `null`

---

## 📊 Response Examples

### Example 1: User with Active Contract

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 123,
        "contract_type": "rental",
        "contract_type_ar": "إيجار",
        "status": "approved",
        "status_ar": "مقبول",
        "contract_signed": true,
        "receipt_upload_status": "uploaded",
        "receipt_uploaded_at": "2025-01-20 10:00:00",
        "approved_at": "2025-01-18 10:00:00",
        "amount": "7920.00",
        "contract_number": "CNT-2025-001",
        "contract_download_url": "https://...",
        "is_active": true,
        "can_access_payments": true,
        "eligibility_status": "active",
        "eligibility_reason": null
      }
    ]
  }
}
```

### Example 2: User Waiting for Receipt

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 124,
        "contract_type": "selling",
        "status": "approved",
        "contract_signed": true,
        "receipt_upload_status": "pending",
        "approved_at": "2025-01-19 10:00:00",
        "receipt_upload_deadline": "2025-01-21 10:00:00",
        "is_active": false,
        "can_access_payments": false,
        "eligibility_status": "waiting_receipt",
        "eligibility_reason": "Receipt upload required. Deadline: 2025-01-21 10:00:00"
      }
    ]
  }
}
```

### Example 3: User with No Contracts

```json
{
  "success": true,
  "data": {
    "contracts": [],
    "eligibility_summary": {
      "can_access_payments": false,
      "has_active_contract": false,
      "eligibility_status": "no_contract",
      "eligibility_reason": "No contracts found"
    }
  }
}
```

### Example 4: User with Multiple Contracts (One Active)

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 125,
        "contract_type": "rental",
        "status": "approved",
        "contract_signed": true,
        "receipt_upload_status": "uploaded",
        "is_active": true,
        "can_access_payments": true,
        "eligibility_status": "active"
      },
      {
        "id": 126,
        "contract_type": "selling",
        "status": "pending",
        "contract_signed": false,
        "receipt_upload_status": null,
        "is_active": false,
        "can_access_payments": false,
        "eligibility_status": "pending_approval"
      }
    ],
    "eligibility_summary": {
      "can_access_payments": true,
      "has_active_contract": true,
      "active_contract_id": 125,
      "eligibility_status": "active"
    }
  }
}
```

---

## 🎨 Frontend Integration Points

### 1. Route Protection
Frontend will check eligibility before allowing access to `/dashboard/payments`

### 2. Sidebar Navigation
Payments link will be hidden if user doesn't have active contract

### 3. User Messaging
When access is denied, user will be redirected to contracts page with clear message

### 4. Real-time Updates
When contract becomes active (receipt uploaded), payments page should become accessible

---

## ⚠️ Edge Cases & Considerations

### 1. Multiple Contracts
- If user has multiple contracts, check if **ANY** contract is active
- Payments page should show payments for **ALL active contracts**
- If user has both rental and selling contracts active, show both

### 2. Contract Status Changes
- When admin approves contract → `receipt_upload_status` should be set to `'pending'`
- When user uploads receipt → `receipt_upload_status` should be set to `'uploaded'`
- When receipt deadline passes → `receipt_upload_status` should be set to `'overdue'`

### 3. Receipt Approval Flow
- After receipt upload, admin must approve it
- Only when admin approves receipt should `receipt_upload_status` be `'uploaded'`
- If receipt is rejected, status should reflect that

### 4. Contract Expiration/Termination
- If contract is terminated or expired, `is_active` should be `false`
- Need to define: Does contract expiration affect payment access?

### 5. Payment Generation
- Payments should only be generated for active contracts
- Rental contracts: Generate 12 monthly payments when contract becomes active
- Selling contracts: Generate single payment when contract becomes active

---

## 🧪 Testing Requirements

### Test Cases for Backend

1. **User with active contract**
   - ✅ Returns `is_active: true`
   - ✅ Returns `can_access_payments: true`
   - ✅ Returns `eligibility_status: 'active'`

2. **User with approved but unsigned contract**
   - ✅ Returns `is_active: false`
   - ✅ Returns `eligibility_status: 'not_signed'`

3. **User with approved contract but no receipt**
   - ✅ Returns `is_active: false`
   - ✅ Returns `eligibility_status: 'waiting_receipt'`
   - ✅ Includes deadline in `eligibility_reason`

4. **User with overdue receipt**
   - ✅ Returns `is_active: false`
   - ✅ Returns `eligibility_status: 'receipt_overdue'`

5. **User with pending contract**
   - ✅ Returns `is_active: false`
   - ✅ Returns `eligibility_status: 'pending_approval'`

6. **User with denied contract**
   - ✅ Returns `is_active: false`
   - ✅ Returns `eligibility_status: 'denied'`

7. **User with no contracts**
   - ✅ Returns empty contracts array
   - ✅ Returns `eligibility_status: 'no_contract'`

8. **User with multiple contracts (one active)**
   - ✅ Returns all contracts
   - ✅ Active contract has `is_active: true`
   - ✅ Other contracts have `is_active: false`
   - ✅ Summary shows `can_access_payments: true`

---

## 📝 API Documentation Updates Needed

Update API documentation to include:

1. **New Response Fields:**
   - `is_active` (boolean)
   - `can_access_payments` (boolean)
   - `eligibility_status` (string)
   - `eligibility_reason` (string/nullable)

2. **Eligibility Status Enum:**
   - `active` - Contract is active
   - `waiting_receipt` - Waiting for receipt upload
   - `receipt_overdue` - Receipt deadline passed
   - `not_signed` - Contract not signed
   - `pending_approval` - Awaiting admin approval
   - `denied` - Contract rejected
   - `no_contract` - No contracts found

3. **Response Examples:**
   - Include examples for each eligibility status
   - Show multiple contracts scenario

---

## 🚀 Implementation Priority

### Phase 1: Core Functionality (HIGH PRIORITY)
1. ✅ Add `is_active` calculation to contracts endpoint
2. ✅ Add `eligibility_status` field
3. ✅ Ensure all required contract fields are returned
4. ✅ Test with various contract states

### Phase 2: Enhanced Response (MEDIUM PRIORITY)
1. ✅ Add `eligibility_reason` for better UX
2. ✅ Add `eligibility_summary` for multiple contracts
3. ✅ Add `can_access_payments` flag

### Phase 3: Performance Optimization (LOW PRIORITY)
1. ✅ Create dedicated `/eligibility` endpoint (if needed)
2. ✅ Add caching strategy
3. ✅ Optimize database queries

---

## 🔄 Migration Considerations

### Existing Data
- Ensure all existing contracts have correct `receipt_upload_status`
- Backfill `is_active` for existing contracts if needed
- Verify `contract_signed` field is accurate

### Backward Compatibility
- New fields should be optional/nullable
- Frontend should handle missing fields gracefully
- Don't break existing API consumers

---

## 📞 Questions for Backend Team

1. **Receipt Approval:** After user uploads receipt, does admin need to approve it separately, or is upload sufficient?

2. **Contract Expiration:** Do contracts expire? If so, should expired contracts affect payment access?

3. **Multiple Active Contracts:** Can a user have multiple active contracts simultaneously? How should payments be handled?

4. **Payment Generation:** When exactly are payments generated? On contract approval or when contract becomes active?

5. **Status Updates:** How are `receipt_upload_status` updates triggered? Real-time or batch job?

6. **Caching:** Should eligibility be cached? If so, what's the cache invalidation strategy?

7. **Webhooks/Events:** Can backend send events when contract becomes active? (For real-time UI updates)

---

## 📋 Summary Checklist

- [ ] Add `is_active` field to contract response
- [ ] Add `eligibility_status` field to contract response
- [ ] Add `can_access_payments` field to contract response
- [ ] Add `eligibility_reason` field (optional but recommended)
- [ ] Ensure all required contract fields are returned
- [ ] Test all contract status scenarios
- [ ] Update API documentation
- [ ] Handle multiple contracts scenario
- [ ] Define receipt approval workflow
- [ ] Define contract expiration logic (if applicable)
- [ ] Consider caching strategy
- [ ] Consider real-time update mechanism

---

## 📧 Contact

For questions or clarifications, please contact the frontend team.

**Document Version:** 1.0  
**Last Updated:** 2025-01-21  
**Status:** Ready for Backend Implementation
