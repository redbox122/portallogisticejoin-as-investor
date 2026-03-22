# Payments Access Control - Quick Reference

## 🎯 Goal
Restrict `/dashboard/payments` page to users with **active contracts** only.

## ✅ Active Contract Definition
A contract is **ACTIVE** when ALL of these are true:
- `status === 'approved'` (or `1`)
- `contract_signed === true`
- `receipt_upload_status === 'uploaded'`

## 📡 Required API Changes

### Option 1: Enhance `/portallogistice/contracts` (RECOMMENDED)
Add these fields to each contract object:

```json
{
  "is_active": true,
  "can_access_payments": true,
  "eligibility_status": "active",
  "eligibility_reason": null
}
```

### Option 2: New Endpoint `/portallogistice/contracts/eligibility`
Lightweight endpoint returning only eligibility info:

```json
{
  "can_access_payments": true,
  "has_active_contract": true,
  "active_contract_id": 123,
  "eligibility_status": "active",
  "blocking_reasons": []
}
```

## 📊 Eligibility Status Values

| Status | Description | Can Access Payments |
|--------|-------------|---------------------|
| `active` | Approved + Signed + Receipt Uploaded | ✅ Yes |
| `waiting_receipt` | Approved but receipt not uploaded | ❌ No |
| `receipt_overdue` | Receipt deadline passed | ❌ No |
| `not_signed` | Contract not signed | ❌ No |
| `pending_approval` | Awaiting admin approval | ❌ No |
| `denied` | Contract rejected | ❌ No |
| `no_contract` | No contracts found | ❌ No |

## 🔧 Backend Logic

```php
function isContractActive($contract) {
    $isApproved = in_array($contract->status, ['approved', 1, '1']);
    $isSigned = $contract->contract_signed === true;
    $receiptUploaded = $contract->receipt_upload_status === 'uploaded';
    
    return $isApproved && $isSigned && $receiptUploaded;
}
```

## ⚠️ Edge Cases

1. **Multiple Contracts:** User can access payments if ANY contract is active
2. **Receipt Approval:** Clarify if admin must approve receipt after upload
3. **Contract Expiration:** Define if expiration affects payment access
4. **Payment Generation:** When are payments created? (On approval or activation?)

## 📋 Implementation Checklist

- [ ] Add `is_active` calculation
- [ ] Add `eligibility_status` field
- [ ] Add `can_access_payments` flag
- [ ] Test all contract states
- [ ] Handle multiple contracts
- [ ] Update API documentation

## 📄 Full Documentation
See `PAYMENTS_PAGE_ACCESS_CONTROL_REQUIREMENTS.md` for complete details.
