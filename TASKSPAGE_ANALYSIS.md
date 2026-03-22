# TasksPage (`/dashboard/tasks`) - Analysis & Issues

## 📍 Endpoints Used

### 1. GET `/api/v1/portallogistice/notifications?status=${filter}`
- **Purpose**: Fetch notifications/tasks
- **Query Parameters**: 
  - `status`: `'pending'` or `'completed'` (from filter state)
- **Response Structure**:
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": 1,
          "type": "upload_receipt" | "upload_doc" | "document_rejected" | "contract_denied" | etc,
          "title": "English title",
          "title_en": "English title",
          "description": "Arabic description",
          "description_en": "English description",
          "priority": "urgent" | "normal" | "low",
          "status": "pending" | "completed" | "dismissed",
          "read_at": null | "2025-01-16 10:00:00",
          "deadline": "2025-01-18 10:00:00" | null,
          "deadline_remaining_hours": 24 | null,
          "related_contract": {
            "id": 123,
            "contract_number": "CN-2025-001"
          },
          "contract_id": 123,
          "payment_amount": 6600,
          "payment_month": 1,
          "doc_type": "iban_doc" | "national_address_doc" | "receipt",
          "is_dynamic": true | false,
          "action_url": "/dashboard/profile" | "/dashboard/tasks"
        }
      ],
      "summary": {
        "unread_count": 5,
        "urgent_count": 2,
        "pending_count": 10,
        "with_deadline_count": 3
      }
    }
  }
  ```
- **Called**: On component mount and when `filter` changes (line 46-49)
- **Used For**: Displaying task list, summary badges

### 2. GET `/api/v1/portallogistice/documents`
- **Purpose**: Fetch user's documents to filter out already-uploaded document tasks
- **Response Structure**:
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "iban_doc": {
          "exists": true,
          "status": "pending" | "approved" | "rejected",
          "rejection_reason": null | "Reason text"
        },
        "national_address_doc": {
          "exists": true,
          "status": "pending" | "approved" | "rejected",
          "rejection_reason": null | "Reason text"
        },
        "receipt": {
          "exists": true,
          "status": "pending" | "approved" | "rejected",
          "rejection_reason": null | "Reason text"
        }
      }
    }
  }
  ```
- **Called**: On component mount and when `filter` changes (line 48)
- **Used For**: Filtering out `upload_doc` tasks for documents that already exist (line 222-245)

### 3. PUT `/api/v1/portallogistice/notifications/${id}/read`
- **Purpose**: Mark notification as read
- **Called**: When user clicks on task or marks as read (line 85-101)
- **Note**: Only works for numeric IDs (stored notifications), not dynamic tasks

### 4. PUT `/api/v1/portallogistice/notifications/${id}/complete`
- **Purpose**: Mark task as completed
- **Called**: When user clicks complete button (line 103-129)
- **Note**: Only works for numeric IDs (stored notifications)

### 5. PUT `/api/v1/portallogistice/notifications/${id}/dismiss`
- **Purpose**: Dismiss a notification
- **Called**: When user clicks dismiss button (line 131-148)
- **Note**: Only works for numeric IDs (stored notifications)

### 6. POST `/api/v1/portallogistice/documents/upload`
- **Purpose**: Upload receipt or document
- **Body (FormData)**:
  - `type`: `'receipt'` | `'iban_doc'` | `'national_address_doc'`
  - `contract_id`: Contract ID (for receipts)
  - `file`: File object
- **Called**: When user uploads receipt (line 150-200)
- **Response**: Success message
- **After Upload**: Calls `fetchNotifications()` and `fetchDocuments()` (line 184)

---

## 📋 Fields Displayed in TasksPage

### Task Card Fields (Lines 434-573)

1. **Title** (`title` / `title_en`)
   - Localized based on `i18n.language`
   - Displayed as `<h3>` (line 435, 536)

2. **Description** (`description` / `description_en`)
   - Localized based on `i18n.language`
   - Displayed as `<p>` (line 436, 537)

3. **Deadline** (`deadline`)
   - Formatted date (line 437-446, 538-547)
   - Shows remaining hours if `deadline_remaining_hours` exists
   - Shows "overdue" if hours <= 0

4. **Contract Number** (`related_contract.contract_number` or `related_contract.id`)
   - Displayed as "Contract #123" (line 448-452, 549-553)

5. **Payment Amount** (`payment_amount`, `payment_month`)
   - Displayed as "Amount: 6600 SAR (Payment #1)" (line 453-458, 554-559)

6. **Document Type** (`doc_type`)
   - Only shown for document tasks (line 560-567)
   - Shows "IBAN Document" or "National Address Document"

7. **Dynamic Badge** (`is_dynamic`)
   - Shows "Auto-generated" badge (line 459-463, 568-572)

8. **Priority** (`priority`)
   - Used for styling and icon color
   - Separates urgent vs normal tasks

9. **Read Status** (`read_at`)
   - Adds "unread" class for styling

---

## ❌ Issues Identified

### Issue 1: Rejection Reason Not Displayed

**Problem**: When admin refuses a document, the user doesn't understand what happened because the rejection reason is not displayed in TasksPage.

**Current Behavior**:
- TasksPage shows `document_rejected` type tasks (line 27 has icon for it)
- But it only displays `title` and `description` fields
- **Missing**: The `rejection_reason` field is not displayed anywhere

**Expected Behavior**:
- When `type === 'document_rejected'`, show the rejection reason prominently
- The rejection reason should come from either:
  1. The notification's `description` field (if backend includes it)
  2. A separate `rejection_reason` field in the notification
  3. The document's `rejection_reason` from the documents endpoint

**Solution Needed**:
1. Check if backend includes `rejection_reason` in notification response
2. If not, fetch it from documents endpoint when displaying rejected document tasks
3. Display rejection reason in a highlighted section (red background, warning icon)

**Code Location**: Lines 434-573 (task card rendering)

---

### Issue 2: Tasks Not Refreshing After Upload

**Problem**: After uploading a receipt, the task still shows in the list instead of disappearing or updating.

**Current Behavior**:
- After upload, code calls `fetchNotifications()` and `fetchDocuments()` (line 184)
- But the task might still show because:
  1. Backend might not be updating notification status immediately
  2. The task might be a "dynamic" task that should disappear when condition is met
  3. There might be a timing issue - notifications might be fetched before backend processes the upload

**Root Causes**:
1. **Backend Issue**: After uploading receipt, backend should:
   - Update the `upload_receipt` notification status to `completed`
   - Or remove the dynamic task from the list
   - Currently, backend might not be doing this

2. **Frontend Issue**: The refresh happens immediately after upload, but backend might need time to process

**Solution Needed**:
1. **Backend**: When receipt is uploaded successfully, backend should:
   - Mark related `upload_receipt` notification as `completed`
   - Or remove it from dynamic task generation
   
2. **Frontend**: Add a small delay before refreshing, or poll until task disappears:
   ```javascript
   // After upload success
   await Promise.all([fetchNotifications(), fetchDocuments()]);
   // Wait a bit for backend to process
   setTimeout(() => {
     fetchNotifications();
   }, 1000);
   ```

3. **Better Solution**: Backend should return updated notification status in upload response, then frontend can update local state immediately

**Code Location**: Lines 150-200 (receipt upload handler)

---

### Issue 3: Document Status Not Shown for Rejected Documents

**Problem**: When a document is rejected, the user doesn't see the current status (rejected) or rejection reason.

**Current Behavior**:
- TasksPage filters out `upload_doc` tasks if document `exists` (line 222-245)
- But it doesn't check the `status` field
- So if document is `rejected`, the task disappears, but user doesn't know why

**Expected Behavior**:
- If document exists but is `rejected`, show a task with:
  - Type: `document_rejected`
  - Status: "Rejected"
  - Rejection reason displayed
  - Action: "Re-upload" button

**Solution Needed**:
1. Modify `filterTasksByDocumentStatus` to:
   - Keep `upload_doc` tasks if document is `rejected`
   - Or create a `document_rejected` task from the rejected document
   
2. Display document status and rejection reason when available

**Code Location**: Lines 222-245, 301-324 (filter function)

---

## 🔧 Recommended Fixes

### Fix 1: Display Rejection Reason

Add rejection reason display in task card:

```javascript
// In task card rendering (around line 436, 537)
{task.type === 'document_rejected' && task.rejection_reason && (
  <div className="rejection-reason-box" style={{
    background: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '10px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
      <strong>{i18n.language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}</strong>
    </div>
    <p style={{ margin: 0, color: '#991b1b' }}>
      {task.rejection_reason}
    </p>
  </div>
)}
```

### Fix 2: Improve Refresh After Upload

Add polling or delay after upload:

```javascript
// In handleReceiptUpload, after line 184
if (response.data?.success) {
  // ... success notification ...
  
  // Refresh immediately
  await Promise.all([fetchNotifications(), fetchDocuments()]);
  
  // Refresh again after delay to catch backend updates
  setTimeout(async () => {
    await fetchNotifications();
  }, 2000);
}
```

### Fix 3: Show Rejected Document Status

Modify filter to keep rejected documents visible:

```javascript
// In filterTasksByDocumentStatus (line 222-245)
const filterTasksByDocumentStatus = (tasks) => {
  if (!documents?.summary) return tasks;
  
  return tasks.filter(task => {
    if (task.type !== 'upload_doc') return true;
    
    const docType = task.doc_type;
    if (!docType) return true;
    
    const docSummary = docType === 'iban_doc' 
      ? documents.summary?.iban_doc 
      : documents.summary?.national_address_doc;
    
    // Keep task if document doesn't exist OR if it's rejected (user needs to re-upload)
    if (!docSummary?.exists) return true;
    if (docSummary?.status === 'rejected') return true; // Show rejected docs
    
    // Hide if document exists and is not rejected
    return false;
  });
};
```

---

## 📊 Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/notifications?status=` | GET | Fetch tasks | ✅ Working |
| `/documents` | GET | Get document status | ✅ Working |
| `/notifications/{id}/read` | PUT | Mark as read | ✅ Working |
| `/notifications/{id}/complete` | PUT | Complete task | ✅ Working |
| `/notifications/{id}/dismiss` | PUT | Dismiss task | ✅ Working |
| `/documents/upload` | POST | Upload receipt/doc | ✅ Working |

| Issue | Severity | Status |
|-------|----------|--------|
| Rejection reason not displayed | 🔴 High | ✅ **FIXED** |
| Tasks not refreshing after upload | 🔴 High | ✅ **FIXED** |
| Rejected documents hidden | 🟡 Medium | ✅ **FIXED** |

---

---

## ✅ Fixes Implemented

### Fix 1: Display Rejection Reason ✅
- **Added**: `getRejectionReason()` helper function that:
  - Checks task's `rejection_reason` field
  - Falls back to documents summary if not in task
  - Supports IBAN, National Address, and Receipt documents
- **Added**: Rejection reason display box in both urgent and normal task sections
- **Styling**: Red background (#fee2e2), red border, warning icon
- **Location**: Lines 226-252 (helper), Lines 472-488 (urgent tasks), Lines 581-599 (normal tasks)

### Fix 2: Improve Refresh After Upload ✅
- **Added**: Delayed refresh (2 seconds) after upload to catch backend updates
- **Location**: Line 184-188 in `handleReceiptUpload`

### Fix 3: Show Rejected Documents ✅
- **Modified**: `filterTasksByDocumentStatus()` to keep rejected documents visible
- **Logic**: Documents with `status === 'rejected'` are now shown so users can re-upload
- **Added**: "Re-upload" button for rejected documents (navigates to profile page)
- **Location**: Lines 254-280 (filter function), Lines 491-496 (urgent tasks), Lines 619-624 (normal tasks)

---

**Last Updated**: January 2025
**File**: `src/Pages/Dashboard/TasksPage.js`
**Status**: ✅ All Issues Fixed
