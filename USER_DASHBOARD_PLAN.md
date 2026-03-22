# User Dashboard Redesign - Complete Implementation Plan

**Project:** Portal Logistics - Client Dashboard Enhancement  
**Date:** January 2025  
**Focus:** User Experience & Business Flow Optimization

---

## 🎯 Executive Summary

Transform the single-page user dashboard into a multi-page, sidebar-navigated experience that guides clients through the complete investment contract lifecycle: from profile completion → contract creation → document upload → payment tracking.

---

## 📐 Architecture Overview

### Navigation Structure
```
Sidebar Navigation:
├── Overview (Home)
├── Dashboard (Analytics & Insights)
├── Contracts
├── Payments
├── Profile
├── Tasks (Notifications & Pending Actions)
└── Logout
```

### Route Structure
```
/dashboard/overview          → Overview page (default landing)
/dashboard/analytics         → Dashboard page (stats & charts)
/dashboard/contracts         → Contracts page
/dashboard/payments          → Payments page
/dashboard/profile           → Profile page
/dashboard/tasks             → Tasks/Notifications page
```

---

## 📄 Page Specifications

### 1. Overview Page (`/dashboard/overview`)

**Purpose:** First thing users see - quick status, pending actions, recent activity

**Content Sections:**

1. **Welcome Card**
   - User name greeting
   - Account status badge
   - Quick stats: Total contracts, Active contracts, Total earned

2. **Pending Actions (Priority Cards)**
   - Upload receipt (with countdown timer if within 48h window)
   - Complete profile (if incomplete)
   - Upload documents (IBAN doc, National Address doc - if missing)
   - Create rental contract (if orphan selling exists)
   - Each card: Icon, Title, Description, Action Button, Urgency indicator

3. **Recent Activity Timeline**
   - Last 5-7 activities: Contract created, Payment received, Document uploaded, Status changed
   - Visual timeline with icons and timestamps

4. **Quick Stats Grid**
   - Total Contracts: X
   - Pending Approval: X
   - Active Contracts: X
   - Total Earned: X SAR
   - Next Payment: Date & Amount

5. **Contract Status Overview**
   - Visual progress bars or pie chart showing:
     - Approved contracts
     - Pending contracts
     - Active contracts
     - Completed contracts

**Design Notes:**
- Clean, card-based layout
- Color-coded urgency (red for urgent, yellow for pending, green for complete)
- Responsive grid (3 columns desktop, 1 column mobile)
- Smooth animations on load

---

### 2. Dashboard Page (`/dashboard/analytics`)

**Purpose:** Deep analytics, charts, and financial insights

**Content Sections:**

1. **Key Metrics Cards (Top Row)**
   - Total Contracts Created
   - Total Amount Invested
   - Total Payments Received
   - Average Monthly Income
   - Next Payment Date
   - Pending Payments Count

2. **Earnings Chart**
   - Line chart showing monthly payments over time
   - X-axis: Months
   - Y-axis: Amount (SAR)
   - Multiple lines if multiple contracts
   - Tooltip on hover showing exact amount and contract ID

3. **Payment Distribution Chart**
   - Pie chart or bar chart showing:
     - Payments by contract
     - Total per contract vs overall
   - Interactive: Click to filter/view contract details

4. **Contract Performance Table**
   - Table showing each contract with:
     - Contract ID
     - Type (Selling/Rental)
     - Amount
     - Status
     - Payments Received
     - Remaining Payments
     - Start Date
     - End Date (if applicable)

5. **Monthly Payment History**
   - Calendar view or list view
   - Shows each payment received
   - Status: Received, Pending, Reported Missing
   - Filter by contract or date range

6. **Financial Summary**
   - Total Invested: X SAR
   - Total Received: X SAR
   - Pending: X SAR
   - ROI percentage (if applicable)

**Design Notes:**
- Use chart library (Chart.js, Recharts, or similar)
- Export to PDF/Excel option
- Date range filters
- Dark/light mode support
- Print-friendly layout

---

### 3. Contracts Page (`/dashboard/contracts`)

**Purpose:** Manage and view all contracts

**Content Sections:**

1. **Contract Creation Section**
   - "Create New Contract" button (with business rule validation)
   - Step-by-step guide modal (shown once or first time)
   - Guide shows:
     - Step 1: Create Selling Contract
     - Step 2: Sign via Nafath
     - Step 3: Wait for Admin Approval
     - Step 4: Upload Receipt (within 48h)
     - Step 5: Create Rental Contract
     - Step 6: Sign Rental Contract
     - Step 7: Contract Starts (after 65 days)

2. **Contracts List/Grid**
   - Grouped by contract pairs (Selling + Rental)
   - Each pair shows:
     - Contract IDs
     - Amounts (Selling: 6600 SAR, Rental: 660 SAR/month)
     - Status badges
     - Progress indicator
     - Actions available (Download, Upload Receipt, View Details)
   - Filter by: Status, Type, Date
   - Search by Contract ID

3. **Contract Details Modal**
   - Full contract information
   - Timeline of events
   - Documents uploaded
   - Payment schedule
   - Actions available

4. **Business Rules Display**
   - Visual indicators showing:
     - Can create new selling? (Yes/No + reason)
     - Can create rental? (Yes/No + reason)
     - Receipt upload deadline countdown
     - Contract start date countdown

**Design Notes:**
- Keep existing contract pair card design (it's good)
- Add visual flow indicators
- Status badges with colors
- Expandable sections for details

---

### 4. Payments Page (`/dashboard/payments`)

**Purpose:** Complete payment tracking and history

**Content Sections:**

1. **Payment Summary Cards**
   - Total Received: X SAR
   - This Month: X SAR
   - Pending: X SAR
   - Next Payment: Date & Amount

2. **Payment History Table**
   - Columns:
     - Date
     - Contract ID
     - Amount
     - Status (Received, Pending, Reported Missing)
     - Actions (Report Missing button)
   - Filter by:
     - Contract
     - Date Range
     - Status
   - Export to CSV/PDF

3. **Payments by Contract Section**
   - Expandable cards for each contract
   - Shows all payments for that contract
   - Total received per contract
   - Remaining payments
   - Payment schedule calendar

4. **Overall Payment Chart**
   - Bar chart or line chart
   - Shows cumulative payments over time
   - Can toggle between contracts

5. **Report Missing Payment Form**
   - Modal or inline form
   - Fields:
     - Contract ID
     - Expected Payment Date
     - Amount
     - Notes/Description
   - Submit to backend

**Design Notes:**
- Clean table design with sorting
- Visual payment calendar
- Color-coded status
- Export functionality

---

### 5. Profile Page (`/dashboard/profile`)

**Purpose:** User information and account details for wire transfers

**Content Sections:**

1. **Personal Information Section**
   - Full Name (read-only)
   - Email (read-only)
   - Phone (editable)
   - National ID (read-only)
   - Birth Date (read-only)
   - Region (editable)

2. **Banking Information Section**
   - Bank Name (read-only)
   - IBAN (read-only, with copy button)
   - National Address Email (read-only)

3. **Account Details for Wire Transfer** ⭐ (MOVED FROM DASHBOARD)
   - **Account Name:** [Company Name]
   - **Account Number:** [Number]
   - **Bank Name:** [Bank]
   - **IBAN:** [IBAN]
   - **SWIFT Code:** [If applicable]
   - **Beneficiary Name:** [Name]
   - **Copy All Details** button
   - **Download as PDF** button
   - Visual card with highlighted information
   - QR code option (if applicable)

4. **Document Upload Section**
   - IBAN Document (upload once, show status)
   - National Address Document (upload once, show status)
   - Upload buttons with file preview
   - Status: Uploaded, Pending Review, Approved, Rejected

5. **Edit Profile Button**
   - Opens edit modal (existing functionality)
   - Only editable fields: Phone, Region

**Design Notes:**
- Clean, organized sections
- Copy-to-clipboard functionality
- File upload with preview
- Status indicators for documents

---

### 6. Tasks Page (`/dashboard/tasks`)

**Purpose:** Centralized notification center and pending actions

**Content Sections:**

1. **Notification Bell Icon** (in header/sidebar)
   - Badge with count of pending tasks
   - Dropdown or full page view

2. **Tasks List**
   - **Upload Receipt** (if contract approved, within 48h window)
     - Contract ID
     - Deadline countdown
     - Upload button
     - Status: Pending, Uploaded, Approved, Rejected
   
   - **Complete Profile** (if fields missing)
     - List of missing fields
     - Link to profile page
   
   - **Upload Documents** (if IBAN or National Address doc missing)
     - Document type
     - Upload button
     - Link to profile page
   
   - **Create Rental Contract** (if orphan selling exists)
     - Selling contract ID
     - Link to create rental
   
   - **Contract Approval Pending** (if contract submitted)
     - Contract ID
     - Submitted date
     - Status

3. **Task Filters**
   - All Tasks
   - Urgent (within 48h)
   - Pending
   - Completed

4. **Task Actions**
   - Mark as read
   - Dismiss
   - Complete action directly from task

**Design Notes:**
- Priority-based sorting (urgent first)
- Visual countdown timers
- Action buttons inline
- Mark as read/dismiss functionality

---

## 🎨 Sidebar Design

### Desktop Sidebar
- **Width:** 260px (collapsed: 80px)
- **Position:** Fixed left (RTL: right)
- **Background:** White with subtle shadow
- **Items:**
  - Logo (top)
  - Navigation items with icons
  - User info card (bottom)
  - Logout button

### Mobile Sidebar
- **Type:** Drawer/Overlay
- **Trigger:** Hamburger menu in header
- **Behavior:** Slides in from side, overlay background
- **Close:** Tap outside or close button

### Sidebar Items
```
🏠 Overview          (Badge if pending actions)
📊 Dashboard         (Analytics)
📄 Contracts         (Badge if pending)
💰 Payments          (Badge if new payment)
👤 Profile           (Badge if incomplete)
🔔 Tasks             (Badge with count)
🚪 Logout
```

### Active State
- Highlighted background
- Bold text
- Icon color change

---

## 🔄 User Flows

### Flow 1: First-Time User Journey
1. Login → Overview page
2. See "Complete Profile" task
3. Click → Profile page
4. Fill all required fields
5. Upload IBAN & National Address documents
6. Return to Overview
7. See "Create Contract" guide (one-time)
8. Create Selling Contract
9. Sign via Nafath
10. Wait for approval
11. Upload receipt (48h window)
12. Create Rental Contract
13. Sign Rental Contract
14. Contract starts (65 days later)

### Flow 2: Contract Creation with Business Rules
1. User clicks "Create New Contract"
2. System checks:
   - Can create selling? (Check: max contracts, receipt status)
   - Can create rental? (Check: orphan selling exists)
3. If blocked → Show reason + action needed
4. If allowed → Open contract form
5. Guide shown (first time only)
6. Complete form → Sign → Submit

### Flow 3: Receipt Upload Flow
1. Contract approved by admin
2. Notification appears in Tasks
3. 48-hour countdown starts
4. User clicks task → Upload receipt page/modal
5. Upload file
6. Status: Pending Review
7. Admin reviews → Approved/Rejected
8. If approved → Contract proceeds
9. If rejected → User can re-upload

### Flow 4: Payment Tracking
1. User navigates to Payments page
2. Sees all payments (by contract or overall)
3. Can filter, search, export
4. Can report missing payment
5. Sees charts and analytics

---

## 🎯 Business Rules Implementation

### Contract Creation Rules
1. **Cannot create rental without selling**
   - Backend validation (required)
   - Frontend UI: Disable rental button, show message

2. **Cannot create new selling without completing rental**
   - Backend validation (required)
   - Frontend UI: Show message, link to create rental

3. **Receipt upload limits**
   - Can upload receipt for max 2 contracts simultaneously
   - Cannot create 3rd contract unless at least one receipt provided
   - Frontend: Show status, disable create button if needed

4. **48-hour receipt upload window**
   - Timer starts after admin approval
   - Countdown in Tasks page
   - Notification badge
   - After 48h: Show warning, but still allow upload (backend handles)

### Contract Timeline
- **Day 0:** Contract created & signed
- **Day X:** Admin approves
- **Day X+48h:** Receipt upload deadline
- **Day X+65:** Contract starts
- **Monthly:** Payments sent (user can track)

### Payment Options (Backend)
- Full price upfront
- Half price + rest within 60 days
- Track payment schedule in contract details

---

## 🛠️ Technical Implementation

### Components to Create
1. `Sidebar.js` - Navigation sidebar
2. `OverviewPage.js` - Overview page
3. `DashboardPage.js` - Analytics page
4. `ContractsPage.js` - Contracts page (refactor existing)
5. `PaymentsPage.js` - Payments page (new)
6. `ProfilePage.js` - Profile page (refactor existing)
7. `TasksPage.js` - Tasks/Notifications page (new)
8. `ContractCreationGuide.js` - Step-by-step guide modal
9. `ReceiptUploadModal.js` - Receipt upload component
10. `PaymentChart.js` - Chart components
11. `NotificationBell.js` - Notification bell with dropdown
12. `TaskCard.js` - Task item component
13. `AccountDetailsCard.js` - Wire transfer account details

### State Management
- Use React Context or local state
- Cache profile and contracts data
- Real-time updates for notifications

### API Integration
- All existing endpoints (see ENDPOINTS.md)
- New endpoints needed (see BACKEND_REQUIREMENTS.md)

### Chart Library
- **Recommendation:** Recharts or Chart.js
- Lightweight, responsive, customizable

### Animations
- Page transitions: Fade in/out
- Card hover effects
- Loading skeletons
- Smooth scroll

---

## 📱 Responsive Design

### Breakpoints
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Mobile Adaptations
- Sidebar becomes drawer
- Cards stack vertically
- Tables become cards
- Charts become simplified
- Bottom navigation option (alternative)

---

## 🎨 Design System

### Colors
- **Primary:** #073491 (existing)
- **Success:** #10b981
- **Warning:** #f59e0b
- **Error:** #ef4444
- **Info:** #3b82f6
- **Background:** #f5f5f5
- **Card:** #ffffff

### Typography
- **Font:** Cairo (existing)
- **Headings:** 700 weight
- **Body:** 400-600 weight

### Spacing
- **Card Padding:** 24px
- **Section Gap:** 32px
- **Element Gap:** 16px

### Shadows
- **Card:** 0 2px 8px rgba(0,0,0,0.1)
- **Hover:** 0 4px 12px rgba(0,0,0,0.15)

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Create sidebar component
- [ ] Set up routing structure
- [ ] Create layout wrapper
- [ ] Update navigation

### Phase 2: Core Pages
- [ ] Overview page
- [ ] Dashboard/Analytics page
- [ ] Contracts page (refactor)
- [ ] Profile page (refactor + move account details)
- [ ] Payments page
- [ ] Tasks page

### Phase 3: Features
- [ ] Contract creation guide
- [ ] Receipt upload system
- [ ] Document upload (Profile)
- [ ] Payment charts
- [ ] Notification system
- [ ] Task management

### Phase 4: Business Logic
- [ ] Contract creation validation
- [ ] Receipt upload countdown
- [ ] Payment tracking
- [ ] Status management

### Phase 5: Polish
- [ ] Animations
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] Accessibility

---

## 🚀 Next Steps

1. Review this plan with stakeholders
2. Get backend requirements confirmed (see BACKEND_REQUIREMENTS.md)
3. Create detailed component specs
4. Start implementation (Overview → Dashboard → Contracts → Payments → Profile → Tasks)
5. Test with real users
6. Iterate based on feedback

---

**End of Plan**
