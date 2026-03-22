# Payments Access Control - Flow Diagram

## Contract Lifecycle & Payments Access Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTRACT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

1. CONTRACT CREATION
   ┌─────────────────┐
   │ User Submits    │
   │ Contract        │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ status: pending │
   │ contract_signed: false
   │ receipt_upload_status: null
   │                 │
   │ ❌ NO PAYMENTS  │
   └─────────────────┘
            │
            │ Admin Reviews
            ▼
   ┌─────────────────┐
   │ status: denied  │
   │                 │
   │ ❌ NO PAYMENTS  │
   └─────────────────┘
            │
            │ OR
            ▼
   ┌─────────────────┐
   │ status: approved│
   │ approved_at: set │
   │ receipt_upload_deadline: set (48h)
   │ receipt_upload_status: 'pending'
   │                 │
   │ ❌ NO PAYMENTS  │
   └────────┬────────┘
            │
            │ User Signs via Nafath
            ▼
   ┌─────────────────┐
   │ status: approved│
   │ contract_signed: true
   │ receipt_upload_status: 'pending'
   │                 │
   │ ❌ NO PAYMENTS  │
   │ (Waiting receipt)
   └────────┬────────┘
            │
            │ User Uploads Receipt
            │ (Within 48h deadline)
            ▼
   ┌─────────────────┐
   │ status: approved│
   │ contract_signed: true
   │ receipt_upload_status: 'uploaded'
   │ receipt_uploaded_at: set
   │                 │
   │ ✅ ACTIVE       │
   │ ✅ PAYMENTS     │
   │    ACCESSIBLE   │
   └─────────────────┘
            │
            │ OR (Deadline Passed)
            ▼
   ┌─────────────────┐
   │ status: approved│
   │ contract_signed: true
   │ receipt_upload_status: 'overdue'
   │                 │
   │ ❌ NO PAYMENTS  │
   │ (Receipt overdue)
   └─────────────────┘
```

## Eligibility Decision Tree

```
                    ┌─────────────────┐
                    │  Check Contract │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         Has Contract?              No Contract
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │ Check Status  │         │ ❌ NO ACCESS │
        └───────┬───────┘         └──────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
denied    pending    approved
    │           │           │
    ▼           ▼           ▼
❌ NO      ❌ NO      Check Signed
ACCESS    ACCESS         │
                    ┌─────┴─────┐
                    │           │
              Not Signed    Signed
                    │           │
                    ▼           ▼
              ❌ NO ACCESS  Check Receipt
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                null/pending  overdue   uploaded
                    │           │           │
                    ▼           ▼           ▼
              ❌ NO ACCESS  ❌ NO ACCESS  ✅ ACCESS
```

## API Response Flow

### Scenario 1: Active Contract (Payments Accessible)

```json
GET /portallogistice/contracts

Response:
{
  "contracts": [{
    "status": "approved",
    "contract_signed": true,
    "receipt_upload_status": "uploaded",
    "is_active": true,              ← KEY FIELD
    "can_access_payments": true,     ← KEY FIELD
    "eligibility_status": "active"   ← KEY FIELD
  }]
}
```

**Frontend Action:** ✅ Show payments link, allow access

---

### Scenario 2: Waiting for Receipt (No Access)

```json
{
  "contracts": [{
    "status": "approved",
    "contract_signed": true,
    "receipt_upload_status": "pending",
    "receipt_upload_deadline": "2025-01-21 10:00:00",
    "is_active": false,                    ← KEY FIELD
    "can_access_payments": false,         ← KEY FIELD
    "eligibility_status": "waiting_receipt", ← KEY FIELD
    "eligibility_reason": "Receipt upload required. Deadline: 2025-01-21 10:00:00"
  }]
}
```

**Frontend Action:** ❌ Hide payments link, redirect if accessed

---

### Scenario 3: No Contract (No Access)

```json
{
  "contracts": [],
  "eligibility_summary": {
    "can_access_payments": false,
    "has_active_contract": false,
    "eligibility_status": "no_contract"
  }
}
```

**Frontend Action:** ❌ Hide payments link, show "Create Contract" CTA

---

## Frontend Implementation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. USER NAVIGATION
   ┌─────────────────┐
   │ User clicks     │
   │ "Payments" link │
   └────────┬─────────┘
            │
            ▼
   ┌─────────────────┐
   │ Check Eligibility│
   │ (useContractEligibility hook)
   └────────┬────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
Eligible?      Not Eligible?
    │               │
    ▼               ▼
┌─────────┐    ┌──────────────┐
│ Allow   │    │ Redirect to  │
│ Access  │    │ /contracts   │
│         │    │ Show Message │
└─────────┘    └──────────────┘

2. SIDEBAR RENDERING
   ┌─────────────────┐
   │ Render Sidebar  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Check Eligibility│
   │ (useContractEligibility hook)
   └────────┬────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
Eligible?      Not Eligible?
    │               │
    ▼               ▼
┌─────────┐    ┌──────────────┐
│ Show    │    │ Hide Payments│
│ Payments│    │ Link          │
│ Link    │    │               │
└─────────┘    └──────────────┘
```

## State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│              CONTRACT STATE TRANSITIONS                      │
└─────────────────────────────────────────────────────────────┘

PENDING
  │
  ├─→ DENIED (Admin rejects)
  │     └─→ ❌ Payments: NO ACCESS
  │
  └─→ APPROVED (Admin approves)
        │
        ├─→ NOT SIGNED
        │     └─→ ❌ Payments: NO ACCESS
        │
        └─→ SIGNED
              │
              ├─→ RECEIPT PENDING
              │     └─→ ❌ Payments: NO ACCESS
              │
              ├─→ RECEIPT OVERDUE
              │     └─→ ❌ Payments: NO ACCESS
              │
              └─→ RECEIPT UPLOADED
                    └─→ ✅ Payments: ACCESSIBLE
```

## Multiple Contracts Scenario

```
User has 3 contracts:

Contract A: status=approved, signed=true, receipt=uploaded
  → is_active: true ✅
  → can_access_payments: true ✅

Contract B: status=approved, signed=true, receipt=pending
  → is_active: false ❌
  → can_access_payments: false ❌

Contract C: status=pending
  → is_active: false ❌
  → can_access_payments: false ❌

Result: User CAN access payments (Contract A is active)
Payments page shows payments for Contract A only
```

## Real-time Updates

```
┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME ACCESS GRANTING                       │
└─────────────────────────────────────────────────────────────┘

User uploads receipt
  │
  ▼
Admin approves receipt
  │
  ▼
Backend updates: receipt_upload_status = 'uploaded'
  │
  ▼
Frontend refetches eligibility
  │
  ▼
is_active: false → true
  │
  ▼
Payments link appears in sidebar
  │
  ▼
User can now access /dashboard/payments
```

---

## Summary

**Key Points:**
1. Contract must be **approved + signed + receipt uploaded** for payments access
2. Backend calculates `is_active` and `can_access_payments` fields
3. Frontend uses these fields to control UI and route access
4. Multiple contracts: User needs at least ONE active contract
5. Real-time: When contract becomes active, payments should become accessible immediately
