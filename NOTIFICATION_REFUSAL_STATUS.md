# Notification System for Document/Contract Refusal - Status Report

## Problem Statement
When an admin refuses a document or contract, the user should:
1. ✅ See a popup notification immediately
2. ✅ See the refusal in the notification bell dropdown
3. ✅ See it in the notifications page (`/dashboard/notifications`)
4. ❌ **Currently NOT working** - Users don't get notified when admin refuses

---

## Current Frontend Status ✅

### Notification Infrastructure (Already Built)
- ✅ **Notification Page**: `/dashboard/notifications` - Fully implemented
- ✅ **Notification Bell**: Component exists with dropdown
- ✅ **Notification Types**: Frontend supports `document_rejected` and `contract_denied` types
- ✅ **Polling**: NotificationBell polls every 30 seconds for new notifications
- ✅ **Popup System**: Uses `react-notifications-component` for popups

### Frontend Components Ready
1. **NotificationBell.js** - Shows notification count and dropdown
2. **NotificationsPage.js** - Full page for viewing all notifications
3. **Notification icons** - Already configured for `document_rejected` and `contract_denied`
4. **Routes** - `/dashboard/notifications` route is configured

---

## Required Backend Endpoints

### ✅ Already Implemented (Used by Frontend)

#### 1. GET `/api/v1/portallogistice/notifications`
- **Status**: ✅ Frontend uses this
- **Purpose**: Get user notifications
- **Query Params**: `status`, `type`, `read`, `page`, `per_page`
- **Used In**: `NotificationsPage.js`, `NotificationBell.js`

#### 2. GET `/api/v1/portallogistice/notifications/count`
- **Status**: ✅ Frontend uses this
- **Purpose**: Get unread/urgent notification counts
- **Used In**: `NotificationBell.js`, `DashboardSidebar.js`

#### 3. PUT `/api/v1/portallogistice/notifications/{id}/read`
- **Status**: ✅ Frontend uses this
- **Purpose**: Mark notification as read
- **Used In**: `NotificationsPage.js`, `NotificationBell.js`

#### 4. PUT `/api/v1/portallogistice/notifications/{id}/dismiss`
- **Status**: ✅ Frontend uses this
- **Purpose**: Dismiss a notification
- **Used In**: `NotificationsPage.js`

#### 5. PUT `/api/v1/portallogistice/notifications/mark-all-read`
- **Status**: ✅ Frontend uses this
- **Purpose**: Mark all notifications as read
- **Used In**: `NotificationsPage.js`

---

### ⚠️ Admin Endpoints (Need Notification Creation)

#### 6. PUT `/api/v1/portallogistice/admin/documents/{id}/reject`
- **Status**: ✅ Frontend calls this
- **Current Issue**: ❌ Backend likely NOT creating notification for user
- **Required Action**: Backend must create notification with:
  - `type`: `"document_rejected"`
  - `title_ar`: `"تم رفض المستند"`
  - `title`: `"Document Rejected"`
  - `description`: Rejection reason
  - `priority`: `"normal"` or `"urgent"`
  - `status`: `"pending"`
  - `action_url`: `/dashboard/profile` (for IBAN/Address docs) or `/dashboard/tasks` (for receipts)
  - `user_id`: Document owner's national_id

#### 7. PUT `/api/v1/portallogistice/admin/contracts/{id}/status`
- **Status**: ✅ Frontend calls this (with `status: 0` for denial)
- **Current Issue**: ❌ Backend likely NOT creating notification for user
- **Required Action**: When `status: 0` (denied), backend must create notification with:
  - `type`: `"contract_denied"`
  - `title_ar`: `"تم رفض العقد"`
  - `title`: `"Contract Denied"`
  - `description`: Denial reason (`denial_reason`)
  - `priority`: `"normal"` or `"urgent"`
  - `status`: `"pending"`
  - `action_url`: `/dashboard/contracts`
  - `user_id`: Contract owner's national_id

---

## Notification Data Structure Expected by Frontend

```json
{
  "id": 1,
  "type": "document_rejected",  // or "contract_denied"
  "title": "Document Rejected",
  "title_ar": "تم رفض المستند",
  "description": "Rejection reason here",
  "description_ar": "سبب الرفض هنا",
  "priority": "normal",  // "urgent" | "normal" | "low"
  "status": "pending",   // "pending" | "completed" | "dismissed"
  "read_at": null,
  "created_at": "2025-01-16 15:00:00",
  "action_url": "/dashboard/profile"
}
```

---

## What Needs to Happen

### Backend Changes Required ⚠️

1. **Document Rejection Endpoint** (`PUT /admin/documents/{id}/reject`)
   - ✅ Currently rejects document
   - ❌ **MUST CREATE NOTIFICATION** for the document owner
   - Insert into `portal_logistice_notifications` table
   - Set appropriate notification type and details

2. **Contract Denial Endpoint** (`PUT /admin/contracts/{id}/status` when status=0)
   - ✅ Currently denies contract
   - ❌ **MUST CREATE NOTIFICATION** for the contract owner
   - Insert into `portal_logistice_notifications` table
   - Set appropriate notification type and details

### Frontend Changes (Optional Enhancement) 💡

The frontend already handles notifications properly, but we could add:
- Real-time notification polling (currently 30 seconds - could reduce to 10 seconds)
- WebSocket support for instant notifications (future enhancement)

---

## Endpoint Summary

### ✅ Confirmed Working Endpoints (Frontend Uses)
| Endpoint | Method | Status | Used By |
|----------|--------|--------|---------|
| `/notifications` | GET | ✅ | NotificationsPage, NotificationBell |
| `/notifications/count` | GET | ✅ | NotificationBell, DashboardSidebar |
| `/notifications/{id}/read` | PUT | ✅ | NotificationsPage, NotificationBell |
| `/notifications/{id}/dismiss` | PUT | ✅ | NotificationsPage |
| `/notifications/mark-all-read` | PUT | ✅ | NotificationsPage |
| `/admin/documents/{id}/reject` | PUT | ✅ (but missing notification) | AdminDocumentsPage |
| `/admin/contracts/{id}/status` | PUT | ✅ (but missing notification) | ContractManagement |

### ❌ Missing Functionality
- **Notification creation** when documents are rejected
- **Notification creation** when contracts are denied

---

## Testing Checklist

Once backend implements notification creation:

1. ✅ Admin rejects a document → User gets notification
2. ✅ Admin denies a contract → User gets notification
3. ✅ Notification appears in NotificationBell dropdown
4. ✅ Notification appears on `/dashboard/notifications` page
5. ✅ Notification count updates in bell icon
6. ✅ User can mark notification as read
7. ✅ User can dismiss notification

---

## Conclusion

**Frontend Status**: ✅ **READY** - All components, pages, and endpoints are implemented and working

**Backend Status**: ⚠️ **NEEDS UPDATE** - Endpoints exist but need to create notifications when rejecting/denying

**Action Required**: Backend team needs to modify the rejection/denial endpoints to create notifications in the `portal_logistice_notifications` table.

---

**Last Updated**: January 2025
**Status**: Frontend Ready, Backend Needs Notification Creation
