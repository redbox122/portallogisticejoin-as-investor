# Portal Logistics (بوابة تساهيل)

A full-stack web application for managing logistics contracts with digital signature capabilities through Nafath authentication. The system enables users to create, sign, and manage selling and rental contracts, while providing administrators with comprehensive management tools.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Purpose](#project-purpose)
4. [Key Features](#key-features)
5. [User Interface & Experience](#user-interface--experience)
6. [System Architecture](#system-architecture)
7. [Getting Started](#getting-started)
8. [API Documentation](#api-documentation)
9. [Project Structure](#project-structure)

---

## Project Overview

Portal Logistics is a bilingual (Arabic/English) contract management system designed for the Saudi Arabian market. It facilitates the creation, signing, and management of logistics contracts with integrated digital signature authentication via Nafath (the national digital identity system).

### What It Does

- **User Management**: Secure authentication and profile management for users
- **Contract Creation**: Users can create selling and rental contracts
- **Digital Signatures**: Integration with Nafath for secure contract signing
- **Contract Management**: View, download, and track contract status
- **Admin Dashboard**: Comprehensive administrative tools for user and contract management
- **Bilingual Support**: Full Arabic and English language support with RTL/LTR layouts

---

## Technology Stack

### Frontend
- **React** 19.1.0 - UI framework
- **React Router DOM** 7.6.3 - Client-side routing
- **Bootstrap** 5.3.7 - CSS framework
- **Axios** 1.10.0 - HTTP client
- **i18next** 25.3.1 & **react-i18next** 15.6.0 - Internationalization
- **React Notifications Component** 4.0.1 - Toast notifications
- **React Loader Spinner** 6.1.6 - Loading indicators
- **FontAwesome** 6.5.1 - Icons
- **React International Phone** 4.5.0 - Phone number input

### Backend
- **Laravel** (PHP) - RESTful API
- **Laravel Passport** - OAuth2 authentication
- **MySQL** - Database

### API Base URL
```
https://shellafood.com/api/v1
```

---

## Project Purpose

Portal Logistics serves as a digital platform for:

1. **Contract Registration**: Users can register and create logistics contracts (selling and rental)
2. **Digital Authentication**: Secure contract signing using Saudi Arabia's Nafath national identity system
3. **Contract Lifecycle Management**: Track contracts from creation through approval/denial
4. **Administrative Oversight**: Admins can manage users, review contracts, and approve/deny applications
5. **Document Management**: Generate, view, and download contract PDFs

### Target Users

- **End Users**: Individuals who need to create and manage logistics contracts
- **Administrators**: Staff who review, approve, and manage user accounts and contracts

---

## Key Features

### User Features
- ✅ Multi-method login (email, phone, or national ID)
- ✅ Profile management with completion tracking
- ✅ Create selling contracts
- ✅ Create rental contracts
- ✅ Automatic contract linking (selling ↔ rental)
- ✅ View all contracts with status tracking
- ✅ Download signed contract PDFs
- ✅ OTP verification for quick access
- ✅ Bilingual interface (Arabic/English)
- ✅ Responsive design for mobile and desktop

### Admin Features
- ✅ Dashboard with statistics (total users, contracts, pending approvals)
- ✅ User management (create, view, update, activate/deactivate)
- ✅ Contract management (view, approve, deny, delete)
- ✅ Search and filter capabilities
- ✅ Pagination for large datasets
- ✅ Contract status tracking
- ✅ User activity monitoring

### System Features
- ✅ Secure authentication with Bearer tokens
- ✅ Nafath digital signature integration
- ✅ PDF contract generation
- ✅ Real-time status updates
- ✅ Form validation and error handling
- ✅ Loading states and user feedback
- ✅ Protected routes and role-based access

---

## User Interface & Experience

### User Dashboard (`/dashboard`)

**Purpose**: Main interface for authenticated users to manage their contracts and profile.

**UI Components**:
- **Header**: Logo, language switcher, user name, logout button
- **Profile Section**: 
  - Display user information (name, national ID, email, phone, region)
  - Edit profile functionality
  - Profile completion modal (appears when required fields are missing)
- **Contracts Section**:
  - List of all user contracts with status badges
  - Contract type indicators (selling/rental)
  - Download PDF buttons for signed contracts
  - Create new contract button
- **Contract Creation Flow**:
  - Step-by-step wizard for creating contracts
  - PDF preview before signing
  - Nafath authentication popup
  - Real-time status polling
  - Success confirmation

**UX Features**:
- RTL layout for Arabic, LTR for English
- Loading spinners during API calls
- Toast notifications for actions
- Modal dialogs for confirmations
- Responsive grid layouts
- Color-coded status indicators

### Admin Dashboard (`/admin/dashboard`)

**Purpose**: Administrative interface for managing users and contracts.

**UI Components**:
- **Header**: Logo, admin name, language switcher, logout
- **Navigation Tabs**:
  - Statistics: Overview metrics (total users, contracts, pending)
  - Users: User management interface
  - Contracts: Contract management interface
- **Statistics Tab**:
  - Key metrics cards
  - Visual data representation
  - Real-time updates
- **Users Tab**:
  - Search and filter functionality
  - User table with pagination
  - Create/Edit user modals
  - Status toggle (activate/deactivate)
  - View user details
- **Contracts Tab**:
  - Search and filter by status/type
  - Contract table with pagination
  - Approve/Deny actions
  - View contract details
  - Delete functionality

**UX Features**:
- Tab-based navigation
- Advanced filtering options
- Bulk operations support
- Confirmation dialogs for critical actions
- Status badges and indicators
- Responsive tables

### Login Page (`/`)

**Purpose**: Authentication entry point for both users and admins.

**UI Components**:
- Login form with email/phone/national ID input
- Password input
- User/Admin toggle
- Language switcher
- Remember me option
- Forgot password link (if implemented)

**UX Features**:
- Clean, centered layout
- Form validation
- Error message display
- Loading state during authentication
- Redirect to appropriate dashboard after login

### Tsahel Page (Public Registration)

**Purpose**: Public-facing page for new user registration and contract creation.

**UI Components**:
- Multi-step registration form
- Personal information fields
- Banking information
- Contract type selection
- Terms and conditions checkbox
- Nafath authentication integration
- PDF preview

**UX Features**:
- Progressive form disclosure
- Field validation
- Mobile-optimized inputs
- OTP verification option
- Contract preview before submission

---

## System Architecture

### Frontend Architecture

```
src/
├── Components/          # Reusable UI components
│   ├── ContractForm.js
│   ├── ContractManagement.js
│   ├── UserManagement.js
│   ├── ProfileCompletionModal.js
│   └── ProtectedRoute.js
├── Pages/              # Main page components
│   ├── LoginPage.js
│   ├── UserDashboard.js
│   ├── AdminDashboard.js
│   └── TsahelPage.js
├── Context/            # React context providers
│   └── AuthContext.js
├── CustomComponents/    # Custom UI components
│   ├── LanguageSwitcher.js
│   └── PhoneInput.js
├── Utitlities/         # Utility components
│   ├── Header.js
│   └── ScrollToTop.js
├── Css/                # Stylesheets
├── i18n/               # Internationalization
└── config/             # Configuration files
```

### Data Flow

1. **Authentication Flow**:
   ```
   User Login → API Call → Token Received → Stored in localStorage → 
   Protected Routes Access → API Calls with Bearer Token
   ```

2. **Contract Creation Flow**:
   ```
   User Fills Form → Profile Validation → PDF Generation → 
   Nafath Authentication → Contract Registration → Status Polling → 
   Success/Error Notification
   ```

3. **Admin Management Flow**:
   ```
   Admin Login → Dashboard Load → Statistics Fetch → 
   User/Contract Management → CRUD Operations → Status Updates
   ```

### API Integration

- **Base URL**: `https://shellafood.com/api/v1`
- **Authentication**: Bearer token in Authorization header
- **Error Handling**: Centralized error handling with user-friendly messages
- **Request Interceptors**: Automatic token injection
- **Response Interceptors**: Error handling and token refresh logic

---

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation

1. **Clone the repository** (if applicable) or navigate to project directory:
   ```bash
   cd /home/portallogist/public_html/portallogistice
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Open browser**:
   ```
   http://localhost:3000
   ```

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner

### Environment Configuration

The application uses the following API endpoint (configured in code):
- API Base URL: `https://shellafood.com/api/v1`

For local development, you may need to configure proxy settings or update API endpoints.

---

## API Documentation

### Authentication Endpoints

- `POST /portallogistice/login` - User login
- `POST /portallogistice/admin/login` - Admin login
- `POST /portallogistice/logout` - User logout
- `POST /portallogistice/admin/logout` - Admin logout

### User Endpoints

- `GET /portallogistice/profile` - Get user profile
- `PUT /portallogistice/profile` - Update user profile
- `GET /portallogistice/contracts` - Get user contracts

### Contract Endpoints

- `POST /portallogistice/register` - Create new contract
- `GET /portallogistice/download-contract/{id}` - Download contract PDF
- `POST /portallogistice/contract-pdf` - Generate contract PDF

### Nafath Endpoints

- `POST /portallogistice/nafath/initiate` - Initiate Nafath authentication
- `GET /portallogistice/nafath/checkStatus` - Check Nafath status

### Admin Endpoints

- `GET /portallogistice/admin/dashboard/stats` - Dashboard statistics
- `GET /portallogistice/admin/users` - List users (with pagination/filters)
- `GET /portallogistice/admin/users/{national_id}` - Get user details
- `POST /portallogistice/admin/users` - Create user
- `PUT /portallogistice/admin/users/{national_id}` - Update user
- `PUT /portallogistice/admin/users/{national_id}/status` - Update user status
- `GET /portallogistice/admin/contracts` - List contracts (with pagination/filters)
- `GET /portallogistice/admin/contracts/{id}` - Get contract details
- `PUT /portallogistice/admin/contracts/{id}/status` - Approve/deny contract
- `DELETE /portallogistice/admin/contracts/{id}` - Delete contract

### OTP Endpoints

- `POST /portallogistice/send-otp` - Send OTP code
- `POST /portallogistice/verify-otp` - Verify OTP code

For detailed API documentation, see:
- `ENDPOINTS.md` - Complete endpoint reference
- `APIS.MD` - Frontend integration guide
- `BACKEND_REVIEW.md` - Backend code review and recommendations

---

## Project Structure

```
portallogistice/
├── public/                 # Static assets
├── src/
│   ├── Components/         # Reusable components
│   ├── Pages/              # Page components
│   ├── Context/            # React context
│   ├── CustomComponents/   # Custom UI components
│   ├── Utitlities/         # Utility components
│   ├── Css/                # Stylesheets
│   ├── i18n/               # Translation files
│   ├── config/             # Configuration
│   └── index.js            # Entry point
├── build/                  # Production build
├── package.json            # Dependencies
├── README.md               # This file
├── ENDPOINTS.md            # API endpoints documentation
├── APIS.MD                 # API integration guide
└── BACKEND_REVIEW.md       # Backend review
```

---

## Contract Types

The system supports two main contract types:

1. **Selling Contract** (`contract_type: "selling"`)
   - عقد بيع - Sale contract
   - Used for selling logistics services/assets

2. **Rental Contract** (`contract_type: "rental"`)
   - عقد إيجار - Rental contract
   - Used for rental logistics services/assets

**Important**: Users can have multiple contracts of different types. Contracts can be automatically linked (selling ↔ rental) when created for the same user.

---

## Security Features

- Bearer token authentication
- Protected routes with role-based access
- Secure password hashing (backend)
- Input validation and sanitization
- CSRF protection (backend)
- Rate limiting (recommended for backend)

---

## Internationalization

The application supports two languages:
- **Arabic (ar)**: Default, RTL layout
- **English (en)**: LTR layout

Language switching is available throughout the application via the language switcher component.

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Development Notes

- The project uses Create React App as the base
- State management is handled via React Context API
- API calls are made using Axios
- Styling uses Bootstrap with custom CSS
- Form validation is implemented client-side
- Error handling includes user-friendly Arabic/English messages

---

## Future Enhancements

Potential improvements (based on backend review):
- Rate limiting implementation
- Account lockout after failed login attempts
- Audit trail for admin actions
- Email/SMS notifications for contract status changes
- Enhanced error logging
- Performance optimization (caching, query optimization)
- Comprehensive testing suite

---

## License

[Specify license if applicable]

---

## Contact & Support

For API issues or backend questions, refer to:
- `BACKEND_REVIEW.md` for security and code quality recommendations
- `ENDPOINTS.md` for complete API reference
- `APIS.MD` for frontend integration details

---

**Last Updated**: January 2025  
**Version**: 0.1.0  
**Project Name**: Portal Logistics (بوابة تساهيل)
#   p o r t a l l o g i s t i c e j o i n - a s - i n v e s t o r  
 