# Quick Reference Guide - User Dashboard Project

**Location:** `/v2` folder  
**Last Updated:** January 8, 2025

---

## 📚 Document Index

### Planning Documents
1. **USER_DASHBOARD_PLAN.md** - Complete frontend implementation plan
   - Page specifications
   - Component list
   - Design system
   - User flows

2. **IMPLEMENTATION_ROADMAP.md** - Phased implementation strategy
   - Week-by-week breakdown
   - Mock data strategy
   - Integration plan
   - Risk mitigation

3. **BACKEND_STATUS_REPORT.md** - Backend analysis
   - What exists vs what's missing
   - Database schema needed
   - API endpoint status
   - Implementation priorities

4. **BACKEND_REQUIREMENTS.md** - Original requirements document
   - Questions asked
   - Endpoint specifications
   - Business logic requirements

5. **README.md** - Project overview
   - Technology stack
   - Project structure
   - Getting started

---

## 🎯 Quick Status

### Backend Status
- ✅ **Exists:** Auth, Profile, Contracts (basic)
- ❌ **Missing:** Payments, Documents, Notifications, Analytics, Receipt upload, Validation

### Frontend Status
- ⏳ **Planning:** Complete
- ⏳ **Implementation:** Starting Phase 0

### Timeline
- **Backend:** 3-4 weeks (estimated)
- **Frontend:** 4 weeks (parallel development)

---

## 📋 Key Endpoints Needed

### Priority 1 (Critical)
```
GET    /portallogistice/payments
GET    /portallogistice/payments/{contractId}
GET    /portallogistice/payments/summary
POST   /portallogistice/payments/report-missing
POST   /portallogistice/documents/upload
GET    /portallogistice/documents
GET    /portallogistice/contracts/{id}/receipt-status
POST   /portallogistice/contracts/{id}/upload-receipt
POST   /portallogistice/contracts/validate
GET    /portallogistice/account-details
GET    /portallogistice/contracts/{id}/payments
PUT    /portallogistice/admin/contracts/{id}/payments/{paymentId}/mark-sent
```

### Priority 2 (Important)
```
GET    /portallogistice/notifications
PUT    /portallogistice/notifications/{id}/read
PUT    /portallogistice/notifications/{id}/dismiss
GET    /portallogistice/analytics/summary
GET    /portallogistice/analytics/payments
GET    /portallogistice/contracts/{id}/timeline
```

---

## 🗂️ Database Tables Needed

### New Tables
1. `portal_logistice_payments`
2. `portal_logistice_documents`
3. `portal_logistice_notifications`

### Columns to Add to `portal_logistices`
- `iban_document_path`
- `national_address_document_path`
- `payment_receipt_path`
- `approved_at`
- `receipt_upload_deadline`
- `receipt_uploaded_at`
- `receipt_upload_status`
- `contract_starts_at`
- `payment_option`
- `rest_payment_deadline`
- `payment_schedule`

---

## 🎨 Pages to Build

1. **Overview** (`/dashboard/overview`)
   - Welcome, pending actions, recent activity
   - Status: ⏳ To build

2. **Dashboard/Analytics** (`/dashboard/analytics`)
   - Charts, metrics, financial insights
   - Status: ⏳ To build (mock data first)

3. **Contracts** (`/dashboard/contracts`)
   - Contract list, creation, management
   - Status: ⏳ To refactor

4. **Payments** (`/dashboard/payments`)
   - Payment history, charts, reporting
   - Status: ⏳ To build (mock data first)

5. **Profile** (`/dashboard/profile`)
   - User info, documents, account details
   - Status: ⏳ To refactor

6. **Tasks** (`/dashboard/tasks`)
   - Notifications, pending actions
   - Status: ⏳ To build (mock data first)

---

## 🔄 Development Phases

### Phase 0: Foundation (Week 1)
- Sidebar, routing, layout
- All pages with mock data
- Complete UI/UX

### Phase 1: Profile & Contracts (Week 1-2)
- Document upload
- Receipt upload UI
- Contract validation UI
- Backend integration (as available)

### Phase 2: Payments (Week 2-3)
- Payment tracking
- Analytics
- Charts
- Backend integration (as available)

### Phase 3: Notifications (Week 3)
- Tasks page
- Notification bell
- Backend integration (as available)

### Phase 4: Business Rules (Week 3-4)
- Validation
- Countdown timers
- User guidance
- Backend integration (as available)

### Phase 5: Polish (Week 4)
- Performance
- Testing
- Bug fixes
- Documentation

---

## 🛠️ Mock Data Strategy

### Mock Services Location
```
src/services/
├── mockPayments.js
├── mockDocuments.js
├── mockNotifications.js
└── mockAnalytics.js
```

### Feature Flags
```javascript
// src/config/features.js
export const FEATURES = {
  USE_MOCK_PAYMENTS: true,
  USE_MOCK_DOCUMENTS: true,
  USE_MOCK_NOTIFICATIONS: true,
  USE_MOCK_ANALYTICS: true
};
```

### API Status Tracking
```javascript
// src/config/apiStatus.js
export const API_STATUS = {
  PAYMENTS: { available: false },
  DOCUMENTS: { available: false },
  NOTIFICATIONS: { available: false },
  ANALYTICS: { available: false }
};
```

---

## 📞 Communication

### Daily Standups
- Frontend progress
- Backend progress
- Blockers
- Integration points

### Weekly Reviews
- Demo completed features
- Review integration status
- Plan next week

### Integration Points
- When backend endpoint ready → Frontend integrates immediately
- Test in staging
- Deploy together when stable

---

## ✅ Quick Checklist

### This Week
- [ ] Sidebar component
- [ ] Routing setup
- [ ] Overview page
- [ ] Profile page (refactor)
- [ ] Contracts page (refactor)
- [ ] Mock data services

### Next Week
- [ ] Payments page UI
- [ ] Analytics page UI
- [ ] Tasks page UI
- [ ] Backend integration (as available)

### Backend (Priority 1)
- [ ] Payment endpoints
- [ ] Document upload endpoints
- [ ] Receipt upload endpoint
- [ ] Contract validation endpoint

---

## 🔗 Related Documents

- **Main Plan:** `USER_DASHBOARD_PLAN.md`
- **Roadmap:** `IMPLEMENTATION_ROADMAP.md`
- **Backend Status:** `BACKEND_STATUS_REPORT.md`
- **Requirements:** `BACKEND_REQUIREMENTS.md`
- **Project Overview:** `README.md`

---

**Quick Reference - Last Updated:** January 8, 2025
