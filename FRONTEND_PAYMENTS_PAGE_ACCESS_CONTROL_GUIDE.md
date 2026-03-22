# Payments Page Access Control - Frontend Implementation Guide

**Date:** 2025-01-21  
**Status:** ✅ **READY FOR IMPLEMENTATION**

---

## 📋 Overview

The backend has implemented eligibility fields in the contracts API. This guide shows how to implement access control for the payments page on the frontend.

---

## 🔌 API Response Structure

### Endpoint: `GET /api/v1/portallogistice/contracts`

### Response Format:

```typescript
interface ContractsResponse {
  success: boolean;
  data: {
    contracts: Contract[];
    eligibility_summary?: EligibilitySummary;
  };
}

interface Contract {
  id: number;
  contract_type: 'selling' | 'rental';
  status: 'approved' | 'pending' | 'denied' | 1 | 0 | null;
  contract_signed: boolean;
  receipt_upload_status: 'pending' | 'uploaded' | 'overdue' | null;
  receipt_uploaded_at: string | null;
  approved_at: string | null;
  receipt_upload_deadline: string | null;
  contract_starts_at: string | null; // For rental contracts
  amount: string;
  contract_number: string;
  
  // NEW FIELDS:
  is_active: boolean;
  can_access_payments: boolean;
  eligibility_status: EligibilityStatus;
  eligibility_reason: BilingualMessage | null;
}

interface EligibilitySummary {
  can_access_payments: boolean; // ⭐ USE THIS FOR ACCESS CONTROL
  has_active_contract: boolean;
  active_contract_id: number | null;
  eligibility_status: EligibilityStatus;
  eligibility_reason: BilingualMessage | null;
}

type EligibilityStatus = 
  | 'active'
  | 'waiting_receipt'
  | 'receipt_overdue'
  | 'not_signed'
  | 'pending_approval'
  | 'denied'
  | 'no_contract';

interface BilingualMessage {
  en: string;
  ar: string;
}
```

---

## 🎯 Active Contract Criteria

### Selling Contracts:
- ✅ `status === 'approved'` (or `1`)
- ✅ `contract_signed === true`
- ✅ `receipt_upload_status === 'uploaded'`

### Rental Contracts:
- ✅ `status === 'approved'` (or `1`)
- ✅ `contract_signed === true`
- ✅ `contract_starts_at` is set (contract has started)

---

## 💻 Implementation Steps

### Step 1: Create TypeScript Types

Create `src/types/contract.ts`:

```typescript
export type EligibilityStatus = 
  | 'active'
  | 'waiting_receipt'
  | 'receipt_overdue'
  | 'not_signed'
  | 'pending_approval'
  | 'denied'
  | 'no_contract';

export interface BilingualMessage {
  en: string;
  ar: string;
}

export interface Contract {
  id: number;
  contract_type: 'selling' | 'rental';
  status: 'approved' | 'pending' | 'denied' | 1 | 0 | null;
  contract_signed: boolean;
  receipt_upload_status: 'pending' | 'uploaded' | 'overdue' | null;
  receipt_uploaded_at: string | null;
  approved_at: string | null;
  receipt_upload_deadline: string | null;
  contract_starts_at: string | null;
  amount: string;
  contract_number: string;
  is_active: boolean;
  can_access_payments: boolean;
  eligibility_status: EligibilityStatus;
  eligibility_reason: BilingualMessage | null;
}

export interface EligibilitySummary {
  can_access_payments: boolean;
  has_active_contract: boolean;
  active_contract_id: number | null;
  eligibility_status: EligibilityStatus;
  eligibility_reason: BilingualMessage | null;
}

export interface ContractsResponse {
  success: boolean;
  data: {
    contracts: Contract[];
    eligibility_summary?: EligibilitySummary;
  };
}
```

---

### Step 2: Create Eligibility Hook

Create `src/hooks/useContractEligibility.js`:

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';

export const useContractEligibility = () => {
  const { getAuthHeaders } = useAuth();
  const [eligibility, setEligibility] = useState({
    canAccessPayments: false,
    hasActiveContract: false,
    activeContractId: null,
    eligibilityStatus: 'no_contract',
    eligibilityReason: null,
    loading: true
  });

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    setEligibility(prev => ({ ...prev, loading: true }));
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        'https://shellafood.com/api/v1/portallogistice/contracts',
        { headers }
      );

      if (response.data?.success) {
        const { contracts = [], eligibility_summary } = response.data.data;
        
        // Use eligibility_summary if available, otherwise calculate from contracts
        if (eligibility_summary) {
          setEligibility({
            canAccessPayments: eligibility_summary.can_access_payments || false,
            hasActiveContract: eligibility_summary.has_active_contract || false,
            activeContractId: eligibility_summary.active_contract_id || null,
            eligibilityStatus: eligibility_summary.eligibility_status || 'no_contract',
            eligibilityReason: eligibility_summary.eligibility_reason || null,
            loading: false
          });
        } else {
          // Fallback: Check if any contract is active
          const activeContract = contracts.find(c => c.is_active === true);
          setEligibility({
            canAccessPayments: !!activeContract,
            hasActiveContract: !!activeContract,
            activeContractId: activeContract?.id || null,
            eligibilityStatus: activeContract?.eligibility_status || 'no_contract',
            eligibilityReason: activeContract?.eligibility_reason || null,
            loading: false
          });
        }
      } else {
        setEligibility(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error checking contract eligibility:', error);
      setEligibility(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    ...eligibility,
    refetch: checkEligibility
  };
};
```

---

### Step 3: Create Route Guard Component

Create `src/Components/PaymentsRouteGuard.js`:

```javascript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useContractEligibility } from '../hooks/useContractEligibility';
import { Watch } from 'react-loader-spinner';
import { useTranslation } from 'react-i18next';
import { getLang, pickText } from '../Utitlities/uxText';

const PaymentsRouteGuard = ({ children }) => {
  const { canAccessPayments, loading, eligibilityReason, eligibilityStatus } = useContractEligibility();
  const { t, i18n } = useTranslation(['common']);
  const location = useLocation();
  const lang = getLang(i18n);

  if (loading) {
    return (
      <div className="page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (!canAccessPayments) {
    // Get reason message
    const reasonMessage = eligibilityReason 
      ? pickText(lang, eligibilityReason.ar, eligibilityReason.en, '')
      : t('dashboard.payments.access_denied_default');

    return (
      <Navigate 
        to="/dashboard/contracts" 
        replace 
        state={{ 
          message: 'payments_access_denied',
          reason: reasonMessage,
          eligibilityStatus 
        }} 
      />
    );
  }

  return children;
};

export default PaymentsRouteGuard;
```

---

### Step 4: Update Route Configuration

Update `src/index.js`:

```javascript
// Add import
import PaymentsRouteGuard from './Components/PaymentsRouteGuard';

// Update payments route
<Route 
  path="payments" 
  element={
    <PaymentsRouteGuard>
      <PaymentsPage />
    </PaymentsRouteGuard>
  } 
/>
```

---

### Step 5: Update Sidebar to Conditionally Show Link

Update `src/Components/DashboardSidebar.js`:

```javascript
// Add import at top
import { useContractEligibility } from '../hooks/useContractEligibility';

// Inside component, add eligibility check
const DashboardSidebar = ({ isOpen, onToggle }) => {
  // ... existing code ...
  const { canAccessPayments } = useContractEligibility();

  // Filter menu items
  const visibleMenuItems = menuItems.filter(item => {
    // Hide payments if user doesn't have access
    if (item.id === 'payments' && !canAccessPayments) {
      return false;
    }
    return true;
  });

  // Use visibleMenuItems instead of menuItems in render
  return (
    // ... existing JSX ...
    <nav className="sidebar-nav">
      <ul className="nav-menu">
        {visibleMenuItems.map((item) => (
          // ... existing menu item rendering ...
        ))}
      </ul>
    </nav>
  );
};
```

---

### Step 6: Show Message on Contracts Page

Update `src/Pages/Dashboard/ContractsPage.js`:

```javascript
// Add at top
import { useLocation } from 'react-router-dom';
import { Store } from 'react-notifications-component';

// Inside component
const ContractsPage = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Check if redirected from payments page
    if (location.state?.message === 'payments_access_denied') {
      const reason = location.state.reason || t('dashboard.payments.access_denied_default');
      
      Store.addNotification({
        title: t('dashboard.payments.access_denied_title'),
        message: reason,
        type: 'info',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000 }
      });
      
      // Clear state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // ... rest of component
};
```

---

### Step 7: Update Overview Page Quick Actions

Update `src/Pages/Dashboard/OverviewPage.js`:

```javascript
// Add import
import { useContractEligibility } from '../hooks/useContractEligibility';

// Inside component
const OverviewPage = () => {
  const { canAccessPayments } = useContractEligibility();
  
  // ... existing code ...
  
  // Update quick action button
  <button 
    className={`quick-action-card ${!canAccessPayments ? 'disabled' : ''}`}
    onClick={() => {
      if (canAccessPayments) {
        navigate('/dashboard/payments');
      }
    }}
    disabled={!canAccessPayments}
    title={!canAccessPayments ? t('dashboard.payments.requires_active_contract') : ''}
  >
    <i className="fas fa-money-check-alt"></i>
    <span>{t('dashboard.overview.view_payments')}</span>
  </button>
};
```

---

## 🎨 UI/UX Recommendations

### 1. Loading States
- Show spinner while checking eligibility
- Don't flash "no access" before loading completes

### 2. Error Handling
- If API fails, default to "no access" (safer)
- Log errors for debugging
- Show user-friendly error message

### 3. Real-time Updates
- Refetch eligibility when:
  - User uploads receipt
  - Admin approves contract
  - Contract status changes
- Consider polling or websocket for real-time updates

### 4. User Messaging
- Use bilingual messages from `eligibility_reason`
- Show clear next steps
- Link to relevant pages (e.g., "Upload Receipt" button)

---

## 🧪 Testing Checklist

### Manual Testing:

- [ ] User with active contract can access payments
- [ ] User without active contract cannot access payments
- [ ] Payments link hidden in sidebar when not eligible
- [ ] Direct URL access redirects to contracts page
- [ ] Redirect shows appropriate message
- [ ] Loading state shows while checking eligibility
- [ ] Error handling works if API fails
- [ ] Multiple contracts scenario (one active)
- [ ] Contract becomes active → payments accessible
- [ ] Bilingual messages display correctly

### Test Scenarios:

1. **No Contracts**
   - Sidebar: Payments link hidden
   - Direct access: Redirects to contracts
   - Message: "No contracts found"

2. **Pending Contract**
   - Sidebar: Payments link hidden
   - Direct access: Redirects to contracts
   - Message: "Contract pending approval"

3. **Approved but Not Signed**
   - Sidebar: Payments link hidden
   - Direct access: Redirects to contracts
   - Message: "Please sign your contract"

4. **Approved but Receipt Pending**
   - Sidebar: Payments link hidden
   - Direct access: Redirects to contracts
   - Message: "Receipt upload required"

5. **Active Contract**
   - Sidebar: Payments link visible
   - Direct access: Page loads normally
   - Payments displayed correctly

---

## 📝 Translation Keys Needed

Add to translation files:

```json
{
  "dashboard": {
    "payments": {
      "access_denied_title": "Payments Access Restricted",
      "access_denied_default": "You need an active contract to access payments.",
      "requires_active_contract": "An active contract is required to view payments.",
      "access_denied_no_contract": "No contracts found. Please create a contract first.",
      "access_denied_pending": "Your contract is pending approval.",
      "access_denied_not_signed": "Please sign your contract to access payments.",
      "access_denied_waiting_receipt": "Please upload your receipt to activate your contract.",
      "access_denied_receipt_overdue": "Receipt upload deadline has passed. Please contact support."
    }
  }
}
```

---

## 🔄 Refetch Strategy

### When to Refetch Eligibility:

1. **After Contract Actions:**
   - After uploading receipt
   - After signing contract
   - After contract status changes

2. **On Page Navigation:**
   - When navigating to contracts page
   - When navigating to payments page
   - On dashboard overview load

3. **Periodic Refresh:**
   - Every 30 seconds (optional)
   - On window focus (optional)

### Implementation:

```javascript
// In useContractEligibility hook
useEffect(() => {
  checkEligibility();
  
  // Refetch when window gains focus (user might have uploaded receipt in another tab)
  const handleFocus = () => checkEligibility();
  window.addEventListener('focus', handleFocus);
  
  return () => window.removeEventListener('focus', handleFocus);
}, []);
```

---

## 🐛 Troubleshooting

### Issue: Payments link shows but access denied
**Solution:** Check that `eligibility_summary.can_access_payments` is being used, not just `is_active` on individual contracts.

### Issue: Message not showing after redirect
**Solution:** Ensure `location.state` is being read in `ContractsPage` and notification is triggered.

### Issue: Eligibility not updating after receipt upload
**Solution:** Call `refetch()` from the hook after successful receipt upload.

### Issue: API returns old data
**Solution:** Add cache-busting headers or timestamp to API request.

---

## 📚 Additional Resources

- Backend API Documentation: See `PAYMENTS_PAGE_ACCESS_CONTROL_REQUIREMENTS.md`
- Flow Diagrams: See `PAYMENTS_ACCESS_FLOW_DIAGRAM.md`
- Quick Reference: See `PAYMENTS_ACCESS_QUICK_REFERENCE.md`

---

## ✅ Implementation Checklist

- [ ] Create TypeScript types/interfaces
- [ ] Create `useContractEligibility` hook
- [ ] Create `PaymentsRouteGuard` component
- [ ] Update route configuration
- [ ] Update sidebar to conditionally show link
- [ ] Update contracts page to show redirect message
- [ ] Update overview page quick actions
- [ ] Add translation keys
- [ ] Test all scenarios
- [ ] Handle error cases
- [ ] Implement refetch strategy
- [ ] Add loading states
- [ ] Test bilingual messages

---

**Questions?** Contact the backend team or refer to the full requirements document.
