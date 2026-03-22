# Overview Endpoint Implementation Plan
## Profile & Wire Receipt Status - UI/UX Strategy

**Date:** January 9, 2026  
**Version:** 1.0  
**Status:** Ready for Implementation

---

## 🎯 Executive Summary

This document outlines the complete implementation strategy for handling the new `profile_completion_status` and `wire_receipt_status` fields from the `/api/v1/portallogistice/overview` endpoint. We'll cover both **user-facing** and **admin-facing** interfaces, component architecture, data flow, and UX patterns.

---

## 📊 Current State Analysis

### What We Have
- ✅ `OverviewPage.js` - Already calls `/overview` endpoint
- ✅ `TasksPage.js` - Handles notifications/pending actions
- ✅ `ProfilePage.js` - Has document upload functionality
- ✅ `AdminDashboard.js` - Admin interface with tabs
- ✅ Design system with consistent CSS patterns
- ✅ RTL/LTR support for Arabic/English

### What's Missing
- ❌ Profile completion status cards/components
- ❌ Wire receipt status cards/components
- ❌ Account details integration in wire transfer flow
- ❌ Admin view of user document/receipt status
- ❌ Real-time countdown timers for deadlines
- ❌ Contract creation blocking logic

---

## 🏗️ Architecture Overview

### Component Hierarchy

```
User Dashboard:
├── OverviewPage
│   ├── ProfileCompletionCard (NEW)
│   ├── WireReceiptCard (NEW)
│   ├── AccountDetailsCard (NEW)
│   └── ContractCreationButton (ENHANCED)
│
├── ProfilePage
│   ├── DocumentUploadSection (ENHANCED)
│   └── AccountDetailsSection (EXISTS)
│
└── ContractsPage
    └── ReceiptUploadModal (NEW)

Admin Dashboard:
├── AdminDashboard
│   └── DocumentsTab (NEW)
│       ├── DocumentsList
│       ├── DocumentReviewModal
│       └── StatusFilters
│
└── UserManagement
    └── UserDocumentStatus (ENHANCED)
```

---

## 👤 USER-FACING UI/UX

### 1. Overview Page Enhancements

#### 1.1 Profile Completion Card

**Location:** Top of OverviewPage, after status cards, before urgent tasks

**When to Show:**
- `profile_completion_status.is_complete === false`
- User has at least one contract (documents only required if contracts exist)

**Design Pattern:**
```jsx
<ProfileCompletionCard 
  status={profile_completion_status}
  onUpload={handleDocumentUpload}
/>
```

**Visual Design:**
- **Card Style:** Warning/Info card (yellow/blue gradient)
- **Icon:** `fa-user-check` or `fa-exclamation-circle`
- **Layout:**
  ```
  ⚠️ Complete Your Profile
  Please upload the following documents to continue:
  
  [ ] IBAN Document
      Status: Missing
      [Upload Document] Button
      
  [ ] National Address Document  
      Status: Missing
      [Upload Document] Button
      
  [Go to Profile Page →] Link
  ```

**States:**
- **Missing:** Red border, "Missing" badge
- **Pending Review:** Yellow border, "Pending Review" badge
- **Approved:** Green checkmark, "Approved" badge

**UX Flow:**
1. User sees card on overview
2. Clicks "Upload Document" → Opens file picker
3. Uploads file → Shows "Uploading..." state
4. Success → Card updates to "Pending Review"
5. Admin approves → Card disappears (if both docs approved)

**Implementation:**
```jsx
// src/Components/ProfileCompletionCard.js
function ProfileCompletionCard({ status, onUpload }) {
  if (status.is_complete) return null;
  
  return (
    <div className="profile-completion-card warning-card">
      <div className="card-header">
        <i className="fas fa-exclamation-circle"></i>
        <h3>Complete Your Profile</h3>
      </div>
      <p>Please upload the following documents:</p>
      <div className="documents-list">
        {status.missing_documents.map(docType => (
          <DocumentUploadItem 
            key={docType}
            type={docType}
            onUpload={() => onUpload(docType)}
          />
        ))}
      </div>
      <Link to="/dashboard/profile">Go to Profile Page →</Link>
    </div>
  );
}
```

---

#### 1.2 Wire Receipt Card

**Location:** After Profile Completion Card (if shown), before Recent Activity

**When to Show:**
- `wire_receipt_status.requires_wire_transfer === true`

**Design Pattern:**
```jsx
<WireReceiptCard 
  status={wire_receipt_status}
  accountDetails={accountDetails}
  onUpload={handleReceiptUpload}
/>
```

**Visual Design:**
- **Card Style:** Urgent card (red/orange gradient if overdue, blue if pending)
- **Icon:** `fa-money-bill-wave` or `fa-clock`
- **Layout:**
  ```
  💰 Wire Transfer Required
  
  Contract #67
  Amount: 6,600 SAR
  Deadline: January 10, 2026 at 7:05 PM
  ⏰ 23 hours remaining
  
  [Show Account Details] [Upload Receipt]
  
  ──────────────────────────
  
  Contract #65
  Amount: 6,600 SAR
  ⚠️ Deadline Passed - Please upload ASAP
  [Upload Receipt]
  ```

**States:**
- **Pending (within deadline):** Blue card, countdown timer
- **Overdue:** Red card, warning message
- **Uploaded:** Green checkmark, "Receipt Uploaded" status

**Countdown Timer:**
- Real-time countdown (updates every minute)
- Visual progress bar showing time remaining
- Color changes: Green → Yellow → Red as deadline approaches

**Account Details Integration:**
- Collapsible section or modal
- Shows bank account details
- "Copy All Details" button
- "Download as PDF" button (optional)

**UX Flow:**
1. User sees wire receipt card with pending contracts
2. Clicks "Show Account Details" → Expands account info
3. Makes wire transfer at bank
4. Returns to portal
5. Clicks "Upload Receipt" → Opens file picker
6. Uploads receipt → Shows "Uploading..." state
7. Success → Card updates to show "Receipt Uploaded" for that contract
8. Card disappears when all receipts uploaded

**Implementation:**
```jsx
// src/Components/WireReceiptCard.js
function WireReceiptCard({ status, accountDetails, onUpload }) {
  if (!status.requires_wire_transfer) return null;
  
  return (
    <div className="wire-receipt-card">
      <div className="card-header">
        <i className="fas fa-money-bill-wave"></i>
        <h3>Wire Transfer Required</h3>
      </div>
      
      {status.pending_contracts.map(contract => (
        <ContractReceiptTask
          key={contract.contract_id}
          contract={contract}
          onUpload={() => onUpload(contract.contract_id)}
        />
      ))}
      
      <AccountDetailsCard details={accountDetails} />
    </div>
  );
}

function ContractReceiptTask({ contract, onUpload }) {
  return (
    <div className={`receipt-task ${contract.is_overdue ? 'overdue' : ''}`}>
      <div className="contract-info">
        <h4>Contract #{contract.contract_id}</h4>
        <p>Amount: {contract.amount.toLocaleString()} SAR</p>
      </div>
      
      {contract.is_overdue ? (
        <div className="overdue-warning">
          ⚠️ Deadline Passed - Please upload ASAP
        </div>
      ) : (
        <CountdownTimer 
          deadline={contract.receipt_upload_deadline}
          hoursRemaining={contract.hours_remaining}
        />
      )}
      
      <button onClick={onUpload}>Upload Receipt</button>
    </div>
  );
}
```

---

#### 1.3 Contract Creation Button Enhancement

**Location:** Quick Actions section, Contracts page

**When to Disable:**
- `wire_receipt_status.can_create_new_contract === false`

**Design Pattern:**
```jsx
<ContractCreationButton 
  canCreate={wire_receipt_status.can_create_new_contract}
  reason={getBlockReason(wire_receipt_status)}
  onCreate={() => navigate('/dashboard/contracts/create')}
/>
```

**Visual Design:**
- **Enabled:** Normal button style
- **Disabled:** Grayed out with tooltip/explanation

**Blocking Message:**
```
🚫 Cannot Create New Contract

You have 2+ contracts but no receipts uploaded.
Please upload receipt for at least one contract first.

[View Pending Receipts] Button
```

**UX Flow:**
1. User tries to create contract
2. If blocked → Shows modal/alert with explanation
3. Modal includes link to view pending receipts
4. User uploads receipt → Button becomes enabled

**Implementation:**
```jsx
// src/Components/ContractCreationButton.js
function ContractCreationButton({ canCreate, reason, onCreate }) {
  const handleClick = () => {
    if (!canCreate) {
      // Show blocking modal
      showBlockingModal(reason);
      return;
    }
    onCreate();
  };
  
  return (
    <button 
      className={`create-contract-btn ${!canCreate ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={!canCreate}
    >
      Create New Contract
      {!canCreate && (
        <Tooltip>
          {reason}
        </Tooltip>
      )}
    </button>
  );
}
```

---

### 2. Profile Page Enhancements

#### 2.1 Document Upload Section

**Enhancement:** Show status for each document type

**Current State:** ProfilePage already has document upload, but needs status indicators

**New Features:**
- Status badges (Missing, Pending Review, Approved, Rejected)
- Rejection reason display (if rejected)
- Upload progress indicator
- Document preview (if uploaded)

**Layout:**
```
Document Upload Section
───────────────────────

IBAN Document
Status: [Missing] [Pending Review] [Approved] [Rejected]
[Upload] Button

National Address Document
Status: [Missing] [Pending Review] [Approved] [Rejected]
[Upload] Button

If Rejected:
⚠️ Rejection Reason: "المستند غير واضح، يرجى إعادة الرفع"
[Re-upload] Button
```

---

### 3. Contracts Page Enhancements

#### 3.1 Receipt Upload Modal

**Location:** Contract details page or contract card

**Trigger:** "Upload Receipt" button on approved contracts

**Features:**
- File upload (PDF, JPG, PNG)
- Contract information display
- Deadline countdown
- Upload progress
- Success/error handling

---

## 👨‍💼 ADMIN-FACING UI/UX

### 1. Admin Dashboard - Documents Tab

**Location:** New tab in AdminDashboard (after Contracts tab)

**Purpose:** Admin can view, review, and approve/reject all user documents

**Design Pattern:**
```jsx
<AdminDocumentsPage>
  <DocumentsFilters />
  <DocumentsList />
  <DocumentReviewModal />
</AdminDocumentsPage>
```

**Features:**

#### 1.1 Filters
- **Type Filter:** All | IBAN | National Address | Receipt
- **Status Filter:** All | Pending | Approved | Rejected
- **Search:** By user name, national_id, contract_id
- **Date Range:** Filter by upload date

#### 1.2 Documents List Table

**Columns:**
- Document Type (with icon)
- User Name
- National ID
- Contract ID (if receipt)
- Upload Date
- Status Badge
- Actions (Review, Approve, Reject)

**Status Badges:**
- **Pending:** Yellow badge
- **Approved:** Green badge
- **Rejected:** Red badge

**Actions:**
- **Review:** Opens modal with document preview
- **Approve:** Quick approve (with confirmation)
- **Reject:** Opens reject modal with reason field

#### 1.3 Document Review Modal

**Features:**
- Document preview (PDF viewer or image)
- User information (name, national_id, email)
- Contract information (if receipt)
- Approve button
- Reject button (with reason textarea)
- Previous reviews history (if re-uploaded)

**Layout:**
```
Document Review Modal
─────────────────────

[Document Preview - PDF/Image Viewer]

User Information:
- Name: فاطمة خالد
- National ID: 1234567890
- Email: user@example.com

Contract Information (if receipt):
- Contract ID: 67
- Amount: 6,600 SAR
- Approved At: 2026-01-08 19:05:45

[Approve] [Reject with Reason]

If Rejected:
Rejection Reason: [Textarea]
[Submit Rejection]
```

**UX Flow:**
1. Admin clicks "Review" on document
2. Modal opens with document preview
3. Admin reviews document
4. Admin clicks "Approve" or "Reject"
5. If reject → Enters reason → Submits
6. Modal closes → List refreshes
7. User sees status update in their dashboard

---

### 2. User Management - Document Status

**Enhancement:** Add document status column to user table

**New Column:**
- **Documents Status:** Shows count of missing/pending/approved documents
- Clickable → Opens user's document details

**Example:**
```
Documents: 1 Missing, 1 Pending
```

---

### 3. Contract Management - Receipt Status

**Enhancement:** Add receipt status to contract table

**New Column:**
- **Receipt Status:** Pending | Uploaded | Overdue | Not Required
- Shows deadline if pending
- Clickable → Opens receipt review modal

---

## 🔄 Data Flow & State Management

### Overview Page Data Flow

```
1. Component Mounts
   ↓
2. fetchOverviewData()
   ↓
3. GET /api/v1/portallogistice/overview
   ↓
4. Response includes:
   - profile_completion_status
   - wire_receipt_status
   ↓
5. State Updates:
   - setProfileCompletionStatus()
   - setWireReceiptStatus()
   ↓
6. Components Render:
   - ProfileCompletionCard (if !is_complete)
   - WireReceiptCard (if requires_wire_transfer)
   ↓
7. User Actions:
   - Upload Document → POST /documents/upload
   - Upload Receipt → POST /documents/upload
   ↓
8. Refresh Overview Data
   ↓
9. UI Updates Automatically
```

### Real-time Updates

**Countdown Timer:**
- Use `setInterval` to update countdown every minute
- Update `hours_remaining` in local state
- Re-fetch overview data every 5 minutes (or on focus)

**Document Upload:**
- Optimistic UI update
- Show "Uploading..." state
- On success → Refresh overview data
- On error → Show error message, revert UI

---

## 🎨 Design System Integration

### Color Palette

**Status Colors:**
- **Success/Approved:** `#10b981` (green)
- **Warning/Pending:** `#f59e0b` (yellow)
- **Error/Rejected/Missing:** `#ef4444` (red)
- **Info/Neutral:** `#3b82f6` (blue)
- **Primary:** `#073491` (blue)

### Card Styles

**Profile Completion Card:**
```css
.profile-completion-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 16px;
  padding: 24px;
}
```

**Wire Receipt Card (Pending):**
```css
.wire-receipt-card {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 16px;
  padding: 24px;
}
```

**Wire Receipt Card (Overdue):**
```css
.wire-receipt-card.overdue {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #ef4444;
}
```

### Animation Patterns

**Card Entrance:**
- Fade in + slide up animation
- Staggered animation for multiple cards

**Countdown Timer:**
- Pulse animation when < 24 hours remaining
- Red flash when < 6 hours remaining

**Upload Progress:**
- Progress bar animation
- Success checkmark animation

---

## 📱 Responsive Design

### Mobile (< 768px)
- Stack cards vertically
- Full-width buttons
- Collapsible account details
- Simplified countdown display

### Tablet (768px - 1024px)
- 2-column grid for status cards
- Side-by-side document upload items

### Desktop (> 1024px)
- 4-column grid for status cards
- Full-width cards for profile/wire receipt

---

## 🚀 Implementation Phases

### Phase 1: User-Facing Components (Week 1)
1. ✅ ProfileCompletionCard component
2. ✅ WireReceiptCard component
3. ✅ AccountDetailsCard component
4. ✅ CountdownTimer component
5. ✅ Update OverviewPage to use new components
6. ✅ Enhance ContractCreationButton

### Phase 2: Profile Page Enhancements (Week 1)
1. ✅ Add document status indicators
2. ✅ Show rejection reasons
3. ✅ Enhance upload flow

### Phase 3: Admin Interface (Week 2)
1. ✅ Add Documents tab to AdminDashboard
2. ✅ Create AdminDocumentsPage
3. ✅ Create DocumentReviewModal
4. ✅ Add filters and search
5. ✅ Integrate approve/reject actions

### Phase 4: Polish & Testing (Week 2-3)
1. ✅ Real-time countdown timers
2. ✅ Error handling and edge cases
3. ✅ Loading states
4. ✅ Responsive design testing
5. ✅ RTL/LTR testing

---

## 🧪 Testing Checklist

### User-Facing
- [ ] Profile completion card shows when incomplete
- [ ] Document upload works for IBAN and National Address
- [ ] Status updates after upload (Pending Review)
- [ ] Card disappears when both documents approved
- [ ] Wire receipt card shows when required
- [ ] Countdown timer updates in real-time
- [ ] Account details display correctly
- [ ] Receipt upload works
- [ ] Contract creation blocked when appropriate
- [ ] Blocking message displays correctly

### Admin-Facing
- [ ] Documents tab appears in admin dashboard
- [ ] Filters work correctly
- [ ] Document preview displays
- [ ] Approve action works
- [ ] Reject action works with reason
- [ ] Status updates in user dashboard after admin action
- [ ] Search functionality works

### Edge Cases
- [ ] Empty states (no pending documents)
- [ ] Network errors during upload
- [ ] Expired tokens
- [ ] Multiple pending contracts
- [ ] Overdue receipts
- [ ] Document rejection and re-upload

---

## 📝 Translation Keys Needed

### Arabic (ar/common.json)
```json
{
  "dashboard": {
    "profile_completion": {
      "title": "إكمال الملف الشخصي",
      "description": "يرجى رفع المستندات التالية:",
      "iban_doc": "مستند IBAN",
      "national_address_doc": "مستند العنوان الوطني",
      "status_missing": "مفقود",
      "status_pending": "قيد المراجعة",
      "status_approved": "موافق عليه",
      "status_rejected": "مرفوض",
      "go_to_profile": "الذهاب إلى صفحة الملف الشخصي"
    },
    "wire_receipt": {
      "title": "تحويل بنكي مطلوب",
      "contract": "عقد",
      "amount": "المبلغ",
      "deadline": "الموعد النهائي",
      "hours_remaining": "ساعات متبقية",
      "overdue": "تأخر الموعد النهائي",
      "upload_receipt": "رفع الإيصال",
      "show_account_details": "عرض تفاصيل الحساب"
    },
    "contract_creation": {
      "blocked_title": "لا يمكن إنشاء عقد جديد",
      "blocked_message": "لديك عقدان أو أكثر ولكن لم يتم رفع أي إيصال. يرجى رفع إيصال لعقد واحد على الأقل أولاً."
    }
  }
}
```

### English (en/common.json)
```json
{
  "dashboard": {
    "profile_completion": {
      "title": "Complete Your Profile",
      "description": "Please upload the following documents:",
      "iban_doc": "IBAN Document",
      "national_address_doc": "National Address Document",
      "status_missing": "Missing",
      "status_pending": "Pending Review",
      "status_approved": "Approved",
      "status_rejected": "Rejected",
      "go_to_profile": "Go to Profile Page"
    },
    "wire_receipt": {
      "title": "Wire Transfer Required",
      "contract": "Contract",
      "amount": "Amount",
      "deadline": "Deadline",
      "hours_remaining": "hours remaining",
      "overdue": "Deadline Passed",
      "upload_receipt": "Upload Receipt",
      "show_account_details": "Show Account Details"
    },
    "contract_creation": {
      "blocked_title": "Cannot Create New Contract",
      "blocked_message": "You have 2+ contracts but no receipts uploaded. Please upload receipt for at least one contract first."
    }
  }
}
```

---

## 🔗 API Integration Points

### Required Endpoints

1. **GET /api/v1/portallogistice/overview** ✅ (Already exists)
   - Returns `profile_completion_status` and `wire_receipt_status`

2. **GET /api/v1/portallogistice/account-details** ✅ (Exists)
   - Returns bank account details for wire transfer

3. **POST /api/v1/portallogistice/documents/upload** ✅ (Exists)
   - Upload IBAN, National Address, or Receipt documents

4. **GET /api/v1/portallogistice/admin/documents** ⚠️ (Needs verification)
   - Admin endpoint to list all documents

5. **PUT /api/v1/portallogistice/admin/documents/{id}/approve** ⚠️ (Needs verification)
   - Admin endpoint to approve document

6. **PUT /api/v1/portallogistice/admin/documents/{id}/reject** ⚠️ (Needs verification)
   - Admin endpoint to reject document with reason

---

## 🎯 Success Metrics

### User Experience
- **Profile Completion Rate:** % of users who complete profile within 24 hours
- **Receipt Upload Time:** Average time from contract approval to receipt upload
- **Task Completion Rate:** % of users who complete pending tasks

### Admin Efficiency
- **Document Review Time:** Average time to review and approve/reject document
- **Pending Document Count:** Number of documents awaiting review
- **Rejection Rate:** % of documents rejected (quality metric)

---

## 📚 Next Steps

1. **Review this plan** with team
2. **Verify API endpoints** exist or need to be built
3. **Create component files** and structure
4. **Implement Phase 1** (User-facing components)
5. **Test with real data** from overview endpoint
6. **Implement Phase 2** (Admin interface)
7. **Polish and deploy**

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** January 9, 2026  
**Author:** Frontend Team
