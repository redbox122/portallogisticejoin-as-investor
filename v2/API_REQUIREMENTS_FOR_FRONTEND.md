# API Requirements for Frontend Dashboard Implementation

**Project:** Portal Logistics - User Dashboard Enhancement  
**Date:** January 9, 2026  
**Version:** 1.0  
**Purpose:** Complete API specifications required for frontend implementation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Profile Endpoints](#user-profile-endpoints)
4. [Contract Endpoints](#contract-endpoints)
5. [Payment Endpoints](#payment-endpoints)
6. [Document Endpoints](#document-endpoints)
7. [Notification Endpoints](#notification-endpoints)
8. [Analytics Endpoints](#analytics-endpoints)
9. [Account Details Endpoint](#account-details-endpoint)
10. [Common Response Formats](#common-response-formats)

---

## Overview

### Base URL
```
https://shellafood.com/api/v1
```

### Authentication
All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer {token}
```

### Headers Required (All Requests)
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
X-LANG: ar|en
```

### Response Format (Standard)
```json
{
  "success": true|false,
  "data": {...},
  "message": "Optional message",
  "errors": {...}  // Only on validation errors
}
```

---

## Authentication Endpoints

### ✅ Existing Endpoints (Already Implemented)

#### 1. User Login
- **Method:** `POST`
- **Endpoint:** `/portallogistice/login`
- **Headers:** None (public)
- **Request Body:**
```json
{
  "login": "user@example.com|0501234567|1234567890",
  "password": "password123"
}
```
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 24,
      "national_id": "1234567890",
      "email": "user@example.com",
      "phone": "0501234567",
      "first_name": "أحمد",
      "family_name": "العلي",
      "full_name": "أحمد محمد علي العلي",
      "is_active": true
    }
  }
}
```

#### 2. User Logout
- **Method:** `POST`
- **Endpoint:** `/portallogistice/logout`
- **Headers:** `Authorization: Bearer {token}`
- **Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

## User Profile Endpoints

### ✅ Existing Endpoints

#### 1. Get User Profile
- **Method:** `GET`
- **Endpoint:** `/portallogistice/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 24,
      "national_id": "1234567890",
      "email": "user@example.com",
      "phone": "0501234567",
      "first_name": "أحمد",
      "family_name": "العلي",
      "father_name": "محمد",
      "grandfather_name": "علي",
      "full_name": "أحمد محمد علي العلي",
      "birth_date": "1990-01-01",
      "region": "الرياض",
      "national_address_email": "address@example.com",
      "bank_name": "البنك الأهلي",
      "iban": "SA1234567890123456789012",
      "iban_document_path": "/storage/documents/iban_1234567890.pdf",
      "national_address_document_path": "/storage/documents/address_1234567890.pdf",
      "is_active": true,
      "max_contracts_allowed": null,
      "last_login_at": "2026-01-09 10:30:00",
      "created_at": "2026-01-01 08:00:00",
      "updated_at": "2026-01-09 10:30:00"
    },
    "documents": {
      "iban_doc": {
        "id": 1,
        "type": "iban_doc",
        "status": "approved",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "uploaded_at": "2026-01-02 10:00:00",
        "reviewed_at": "2026-01-02 11:00:00"
      },
      "national_address_doc": {
        "id": 2,
        "type": "national_address_doc",
        "status": "pending",
        "file_path": "/storage/documents/address_1234567890.pdf",
        "uploaded_at": "2026-01-02 12:00:00",
        "reviewed_at": null
      }
    }
  }
}
```

#### 2. Update User Profile
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "phone": "0501234567",
  "region": "الرياض"
}
```
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 24,
      "phone": "0501234567",
      "region": "الرياض",
      "updated_at": "2026-01-09 11:00:00"
    }
  },
  "message": "تم تحديث الملف الشخصي بنجاح"
}
```

---

## Contract Endpoints

### ✅ Existing Endpoints

#### 1. Get User Contracts
- **Method:** `GET`
- **Endpoint:** `/portallogistice/contracts`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 1,
        "user_id": 24,
        "national_id": "1234567890",
        "contract_type": "selling",
        "amount": "6600",
        "linked_rental_contract_id": 2,
        "status": 1,
        "status_ar": "مقبول",
        "approved_at": "2026-01-10 10:00:00",
        "receipt_upload_deadline": "2026-01-12 10:00:00",
        "receipt_upload_status": "pending",
        "receipt_uploaded_at": null,
        "contract_starts_at": null,
        "payment_option": null,
        "payment_schedule": null,
        "signed_contract_path": "/storage/contracts/selling_1.pdf",
        "payment_receipt_path": null,
        "contract_download_url": "https://shellafood.com/api/v1/portallogistice/download-contract/1?national_id=1234567890",
        "created_at": "2026-01-10 09:00:00",
        "updated_at": "2026-01-10 10:00:00",
        "linked_rental": {
          "id": 2,
          "contract_type": "rental",
          "amount": "660",
          "status": 1,
          "approved_at": "2026-01-11 10:00:00",
          "contract_starts_at": "2026-03-16 10:00:00",
          "payment_schedule": [
            {
              "month": 1,
              "amount": 660,
              "due_date": "2026-03-16",
              "status": "pending"
            }
          ]
        }
      }
    ],
    "total_contracts": 1,
    "statistics": {
      "total_selling": 1,
      "total_rental": 1,
      "approved": 2,
      "pending": 0,
      "denied": 0
    }
  }
}
```

#### 2. Create Contract
- **Method:** `POST`
- **Endpoint:** `/portallogistice/register`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "contract_type": "selling|rental",
  "amount": "6600",  // Optional - backend uses prices from settings automatically
  "linked_selling_contract_id": 1  // Only for rental contracts
}
```
- **Note:** The `amount` field is now **optional**. If not provided, the backend automatically uses the price from contract settings (`selling_price` for selling contracts, `rental_price` for rental contracts). The amount is stored in the contract record and returned in all contract endpoints.
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contract": {
      "id": 3,
      "contract_type": "selling",
      "amount": "6600",
      "status": null,
      "created_at": "2026-01-09 12:00:00"
    },
    "nafath_code": "123456",
    "message": "تم إنشاء العقد بنجاح. يرجى إدخال رمز نفاذ في التطبيق."
  }
}
```

#### 3. Download Contract PDF
- **Method:** `GET`
- **Endpoint:** `/portallogistice/download-contract/{id}`
- **Query Parameters:** `?national_id={national_id}`
- **Headers:** None (public endpoint)
- **Response:** PDF file download

### ❌ New Endpoints Required

#### 4. Validate Contract Creation ⭐ REQUIRED
- **Method:** `POST`
- **Endpoint:** `/portallogistice/contracts/validate`
- **Headers:** `Authorization: Bearer {token}`
- **Purpose:** Check if user can create contract (business rules validation)
- **Request Body:**
```json
{
  "contract_type": "selling|rental",
  "linked_selling_contract_id": 1  // Optional, for rental contracts
}
```
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "can_create": true,
    "reason": null,
    "required_actions": [],
    "business_rules": {
      "has_approved_selling": true,
      "has_completed_rental": true,
      "pending_receipts_count": 0,
      "max_receipts_reached": false,
      "can_create_third_contract": true
    }
  }
}
```
- **Error Response (200) - Cannot Create:**
```json
{
  "success": false,
  "data": {
    "can_create": false,
    "reason": "Cannot create rental without approved selling contract",
    "reason_ar": "لا يمكن إنشاء عقد إيجار بدون عقد بيع معتمد",
    "required_actions": [
      {
        "type": "create_selling",
        "message": "Please create and get approval for selling contract first",
        "message_ar": "يرجى إنشاء والحصول على موافقة عقد البيع أولاً"
      }
    ],
    "business_rules": {
      "has_approved_selling": false,
      "has_completed_rental": false,
      "pending_receipts_count": 2,
      "max_receipts_reached": true,
      "can_create_third_contract": false
    }
  }
}
```
- **Use Case:** Check before showing contract creation form

#### 5. Get Contract Timeline ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/contracts/{id}/timeline`
- **Headers:** `Authorization: Bearer {token}`
- **Purpose:** Get contract timeline and events
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contract_id": 1,
    "events": [
      {
        "type": "created",
        "title": "Contract Created",
        "title_ar": "تم إنشاء العقد",
        "date": "2026-01-10 09:00:00",
        "status": "completed"
      },
      {
        "type": "signed",
        "title": "Contract Signed via Nafath",
        "title_ar": "تم التوقيع عبر نفاذ",
        "date": "2026-01-10 09:30:00",
        "status": "completed"
      },
      {
        "type": "approved",
        "title": "Contract Approved",
        "title_ar": "تم اعتماد العقد",
        "date": "2026-01-10 10:00:00",
        "status": "completed"
      },
      {
        "type": "receipt_upload",
        "title": "Upload Payment Receipt",
        "title_ar": "رفع إيصال السداد",
        "deadline": "2026-01-12 10:00:00",
        "deadline_remaining_hours": 23,
        "status": "pending"
      },
      {
        "type": "contract_start",
        "title": "Contract Starts",
        "title_ar": "بداية العقد",
        "date": "2026-03-16 10:00:00",
        "status": "upcoming"
      }
    ],
    "current_status": "approved",
    "next_action": {
      "type": "receipt_upload",
      "deadline": "2026-01-12 10:00:00",
      "remaining_hours": 23
    }
  }
}
```

#### 6. Get Contract Receipt Status ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/contracts/{id}/receipt-status`
- **Headers:** `Authorization: Bearer {token}`
- **Purpose:** Get receipt upload status and deadline info
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contract_id": 1,
    "contract_type": "selling",
    "can_upload": true,
    "receipt_upload_status": "pending",
    "receipt_uploaded_at": null,
    "approved_at": "2026-01-10 10:00:00",
    "receipt_upload_deadline": "2026-01-12 10:00:00",
    "hours_remaining": 23,
    "is_overdue": false,
    "warning_message": null,
    "warning_message_ar": null
  }
}
```
- **Overdue Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": 1,
    "can_upload": true,
    "receipt_upload_status": "overdue",
    "receipt_uploaded_at": null,
    "approved_at": "2026-01-10 10:00:00",
    "receipt_upload_deadline": "2026-01-12 10:00:00",
    "hours_remaining": -5,
    "is_overdue": true,
    "warning_message": "Receipt upload deadline has passed. You can still upload but contract activation may be delayed.",
    "warning_message_ar": "انتهت مهلة رفع الإيصال. يمكنك الرفع ولكن قد يتأخر تفعيل العقد."
  }
}
```

---

## Payment Endpoints

### ❌ All New Endpoints Required

#### 1. Get All User Payments ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/payments`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `contract_id` (optional) - Filter by contract
  - `status` (optional) - Filter by status (pending|sent|received|reported_missing)
  - `from_date` (optional) - Filter from date (YYYY-MM-DD)
  - `to_date` (optional) - Filter to date (YYYY-MM-DD)
  - `page` (optional) - Page number (default: 1)
  - `per_page` (optional) - Items per page (default: 50)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "contract_id": 2,
        "user_id": 24,
        "national_id": "1234567890",
        "amount": 660.00,
        "month_number": 1,
        "due_date": "2026-03-16",
        "payment_date": "2026-03-10",
        "status": "sent",
        "sent_at": "2026-03-10 10:00:00",
        "received_at": null,
        "reported_at": null,
        "notes": null,
        "created_at": "2026-01-11 10:00:00",
        "updated_at": "2026-03-10 10:00:00",
        "contract": {
          "id": 2,
          "contract_type": "rental",
          "amount": "660",
          "status": 1
        }
      },
      {
        "id": 2,
        "contract_id": 2,
        "amount": 660.00,
        "month_number": 2,
        "due_date": "2026-04-16",
        "payment_date": null,
        "status": "pending",
        "sent_at": null,
        "received_at": null,
        "reported_at": null,
        "contract": {
          "id": 2,
          "contract_type": "rental",
          "amount": "660",
          "status": 1
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total": 12,
      "total_pages": 1
    }
  }
}
```

#### 2. Get Payments by Contract ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/payments/{contractId}`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contract_id": 2,
    "contract": {
      "id": 2,
      "contract_type": "rental",
      "amount": "660",
      "contract_starts_at": "2026-03-16 10:00:00",
      "payment_schedule": [
        {
          "month": 1,
          "amount": 660,
          "due_date": "2026-03-16",
          "status": "pending"
        }
      ]
    },
    "payments": [
      {
        "id": 1,
        "month_number": 1,
        "amount": 660.00,
        "due_date": "2026-03-16",
        "payment_date": null,
        "status": "pending",
        "sent_at": null,
        "received_at": null
      },
      {
        "id": 2,
        "month_number": 2,
        "amount": 660.00,
        "due_date": "2026-04-16",
        "payment_date": null,
        "status": "pending",
        "sent_at": null,
        "received_at": null
      }
    ],
    "summary": {
      "total_amount": 7920.00,
      "total_received": 0.00,
      "total_pending": 7920.00,
      "completed_payments": 0,
      "pending_payments": 12,
      "next_payment": {
        "id": 1,
        "amount": 660.00,
        "due_date": "2026-03-16"
      }
    }
  }
}
```

#### 3. Get Payment Summary ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/payments/summary`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total_received": 1320.00,
    "this_month": 660.00,
    "pending": 6600.00,
    "total_contracts_with_payments": 2,
    "next_payment": {
      "contract_id": 2,
      "amount": 660.00,
      "due_date": "2026-02-01",
      "days_remaining": 22
    },
    "monthly_breakdown": [
      {
        "month": "2026-01",
        "amount": 660.00,
        "contracts_count": 1
      },
      {
        "month": "2026-02",
        "amount": 1320.00,
        "contracts_count": 2
      }
    ]
  }
}
```

#### 4. Report Missing Payment ⭐ REQUIRED
- **Method:** `POST`
- **Endpoint:** `/portallogistice/payments/report-missing`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
```json
{
  "payment_id": 1,
  "contract_id": 2,
  "expected_date": "2026-03-16",
  "amount": 660.00,
  "notes": "Payment not received in my account"
}
```
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payment_id": 1,
    "status": "reported_missing",
    "reported_at": "2026-03-17 10:00:00"
  },
  "message": "تم الإبلاغ عن الدفعة المفقودة بنجاح. سيتم مراجعة طلبك."
}
```
- **Error Response (422):**
```json
{
  "success": false,
  "errors": {
    "payment_id": ["Payment not found"],
    "expected_date": ["Expected date is required"]
  }
}
```

---

## Document Endpoints

### ❌ All New Endpoints Required

#### 1. Upload Document ⭐ REQUIRED
- **Method:** `POST`
- **Endpoint:** `/portallogistice/documents/upload`
- **Headers:** 
  - `Authorization: Bearer {token}`
  - `Content-Type: multipart/form-data`
- **Request Body (Form Data):**
  - `type`: `iban_doc|national_address_doc|receipt`
  - `contract_id`: (optional, required for receipts)
  - `file`: (binary file)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": 3,
      "user_id": 24,
      "national_id": "1234567890",
      "contract_id": 1,
      "type": "receipt",
      "file_path": "/storage/documents/receipt_1_1234567890.pdf",
      "file_name": "receipt.pdf",
      "file_size": 245760,
      "mime_type": "application/pdf",
      "status": "pending",
      "uploaded_at": "2026-01-09 12:00:00",
      "reviewed_at": null,
      "reviewer_id": null,
      "rejection_reason": null,
      "file_url": "https://shellafood.com/storage/documents/receipt_1_1234567890.pdf"
    }
  },
  "message": "تم رفع المستند بنجاح. سيتم مراجعته قريباً."
}
```
- **Error Response (422):**
```json
{
  "success": false,
  "errors": {
    "type": ["Document type is required"],
    "file": ["File is required and must be PDF or image"],
    "contract_id": ["Contract ID is required for receipt documents"]
  }
}
```

#### 2. Get All User Documents ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/documents`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `type` (optional) - Filter by type (iban_doc|national_address_doc|receipt)
  - `status` (optional) - Filter by status (pending|approved|rejected)
  - `contract_id` (optional) - Filter by contract (for receipts)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "type": "iban_doc",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "file_name": "iban_document.pdf",
        "file_size": 245760,
        "mime_type": "application/pdf",
        "status": "approved",
        "uploaded_at": "2026-01-02 10:00:00",
        "reviewed_at": "2026-01-02 11:00:00",
        "rejection_reason": null,
        "file_url": "https://shellafood.com/storage/documents/iban_1234567890.pdf",
        "contract": null
      },
      {
        "id": 2,
        "type": "national_address_doc",
        "file_path": "/storage/documents/address_1234567890.pdf",
        "file_name": "address_document.pdf",
        "status": "pending",
        "uploaded_at": "2026-01-02 12:00:00",
        "reviewed_at": null,
        "file_url": "https://shellafood.com/storage/documents/address_1234567890.pdf",
        "contract": null
      },
      {
        "id": 3,
        "type": "receipt",
        "contract_id": 1,
        "file_path": "/storage/documents/receipt_1_1234567890.pdf",
        "status": "pending",
        "uploaded_at": "2026-01-09 12:00:00",
        "file_url": "https://shellafood.com/storage/documents/receipt_1_1234567890.pdf",
        "contract": {
          "id": 1,
          "contract_type": "selling",
          "amount": "6600",
          "status": 1
        }
      }
    ],
    "summary": {
      "iban_doc": {
        "exists": true,
        "status": "approved"
      },
      "national_address_doc": {
        "exists": true,
        "status": "pending"
      },
      "receipts_count": 2,
      "pending_receipts": 1
    }
  }
}
```

#### 3. Get Document Details ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/documents/{id}`
- **Headers:** `Authorization: Bearer {token}`
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": 3,
      "user_id": 24,
      "national_id": "1234567890",
      "contract_id": 1,
      "type": "receipt",
      "file_path": "/storage/documents/receipt_1_1234567890.pdf",
      "file_name": "receipt.pdf",
      "file_size": 245760,
      "mime_type": "application/pdf",
      "status": "pending",
      "uploaded_at": "2026-01-09 12:00:00",
      "reviewed_at": null,
      "reviewer_id": null,
      "rejection_reason": null,
      "file_url": "https://shellafood.com/storage/documents/receipt_1_1234567890.pdf",
      "contract": {
        "id": 1,
        "contract_type": "selling",
        "amount": "6600",
        "status": 1
      }
    }
  }
}
```

#### 4. Delete Document ⭐ REQUIRED
- **Method:** `DELETE`
- **Endpoint:** `/portallogistice/documents/{id}`
- **Headers:** `Authorization: Bearer {token}`
- **Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف المستند بنجاح"
}
```
- **Error Response (403):**
```json
{
  "success": false,
  "message": "Cannot delete approved documents",
  "message_ar": "لا يمكن حذف المستندات المعتمدة"
}
```

---

## Notification Endpoints

### ❌ All New Endpoints Required

#### 1. Get All Notifications ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/notifications`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `status` (optional) - Filter by status (pending|completed|dismissed)
  - `type` (optional) - Filter by type (upload_receipt|complete_profile|upload_doc|create_rental|contract_pending|payment_received|payment_overdue)
  - `priority` (optional) - Filter by priority (urgent|normal|low)
  - `read` (optional) - Filter by read status (true|false)
  - `page` (optional) - Page number (default: 1)
  - `per_page` (optional) - Items per page (default: 20)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "user_id": 24,
        "national_id": "1234567890",
        "type": "upload_receipt",
        "title": "Upload Payment Receipt",
        "title_ar": "رفع إيصال السداد",
        "description": "Please upload payment receipt for contract #123 within 48 hours",
        "description_ar": "يرجى رفع إيصال السداد للعقد رقم 123 خلال 48 ساعة",
        "priority": "urgent",
        "deadline": "2026-01-12 10:00:00",
        "deadline_remaining_hours": 23,
        "status": "pending",
        "action_url": "/dashboard/tasks?action=upload_receipt&contract_id=1",
        "read_at": null,
        "completed_at": null,
        "dismissed_at": null,
        "created_at": "2026-01-10 10:00:00",
        "related_contract": {
          "id": 1,
          "contract_type": "selling",
          "amount": "6600",
          "status": 1
        }
      },
      {
        "id": 2,
        "type": "complete_profile",
        "title": "Complete Profile",
        "title_ar": "إكمال الملف الشخصي",
        "description": "Please complete your profile information",
        "description_ar": "يرجى إكمال معلومات ملفك الشخصي",
        "priority": "normal",
        "deadline": null,
        "status": "pending",
        "action_url": "/dashboard/profile",
        "read_at": null
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 5,
      "total_pages": 1
    },
    "summary": {
      "unread_count": 3,
      "urgent_count": 1,
      "pending_count": 4,
      "with_deadline_count": 1
    }
  }
}
```

#### 2. Get Unread Notifications Count ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/notifications/count`
- **Headers:** `Authorization: Bearer {token}`
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "unread_count": 3,
    "urgent_count": 1,
    "pending_count": 4,
    "with_deadline_count": 1,
    "breakdown": {
      "urgent": 1,
      "normal": 2,
      "low": 0
    }
  }
}
```

#### 3. Mark Notification as Read ⭐ REQUIRED
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/notifications/{id}/read`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notification_id": 1,
    "read_at": "2026-01-09 12:00:00"
  },
  "message": "تم تحديد الإشعار كمقروء"
}
```

#### 4. Mark Notification as Completed ⭐ REQUIRED
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/notifications/{id}/complete`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notification_id": 1,
    "status": "completed",
    "completed_at": "2026-01-09 12:00:00"
  },
  "message": "تم إكمال المهمة بنجاح"
}
```

#### 5. Dismiss Notification ⭐ REQUIRED
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/notifications/{id}/dismiss`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notification_id": 1,
    "status": "dismissed",
    "dismissed_at": "2026-01-09 12:00:00"
  },
  "message": "تم إخفاء الإشعار"
}
```

#### 6. Mark All as Read ⭐ REQUIRED
- **Method:** `PUT`
- **Endpoint:** `/portallogistice/notifications/mark-all-read`
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "updated_count": 3,
    "read_at": "2026-01-09 12:00:00"
  },
  "message": "تم تحديد جميع الإشعارات كمقروءة"
}
```

---

## Analytics Endpoints

### ❌ All New Endpoints Required

#### 1. Get Analytics Summary ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/analytics/summary`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total_contracts": 2,
    "active_contracts": 1,
    "pending_contracts": 0,
    "total_invested": 13200.00,
    "total_received": 1320.00,
    "pending_payments": 6600.00,
    "next_payment": {
      "contract_id": 2,
      "amount": 660.00,
      "due_date": "2026-02-01",
      "days_remaining": 22
    },
    "contracts_breakdown": {
      "selling": {
        "count": 2,
        "total_amount": 13200.00,
        "approved": 2,
        "pending": 0
      },
      "rental": {
        "count": 1,
        "total_amount": 7920.00,
        "approved": 1,
        "pending": 0
      }
    },
    "payment_statistics": {
      "total_expected": 7920.00,
      "total_received": 1320.00,
      "total_pending": 6600.00,
      "completion_percentage": 16.67,
      "average_monthly_income": 660.00
    }
  }
}
```

#### 2. Get Payment Analytics ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/analytics/payments`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `from_date` (optional) - Start date (YYYY-MM-DD)
  - `to_date` (optional) - End date (YYYY-MM-DD)
  - `group_by` (optional) - Group by month|contract (default: month)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "monthly_data": [
      {
        "month": "2026-01",
        "month_name": "January",
        "month_name_ar": "يناير",
        "total_amount": 660.00,
        "payments_count": 1,
        "contracts_count": 1,
        "status_breakdown": {
          "received": 660.00,
          "pending": 0.00,
          "reported_missing": 0.00
        }
      },
      {
        "month": "2026-02",
        "month_name": "February",
        "month_name_ar": "فبراير",
        "total_amount": 1320.00,
        "payments_count": 2,
        "contracts_count": 2,
        "status_breakdown": {
          "received": 0.00,
          "pending": 1320.00,
          "reported_missing": 0.00
        }
      }
    ],
    "contract_data": [
      {
        "contract_id": 2,
        "contract_type": "rental",
        "total_amount": 660.00,
        "received_amount": 660.00,
        "pending_amount": 6600.00,
        "completion_percentage": 9.09,
        "payments_count": 12,
        "received_count": 1
      }
    ],
    "summary": {
      "total_amount": 7920.00,
      "total_received": 1320.00,
      "total_pending": 6600.00,
      "months_covered": 2,
      "average_monthly": 330.00
    }
  }
}
```

#### 3. Get Contract Performance ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/analytics/contracts-performance`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:** None
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "contract_id": 2,
        "contract_type": "rental",
        "linked_selling_id": 1,
        "selling_amount": 6600.00,
        "rental_total": 7920.00,
        "received_amount": 660.00,
        "pending_amount": 7260.00,
        "completion_percentage": 8.33,
        "months_paid": 1,
        "months_remaining": 11,
        "start_date": "2026-03-16",
        "expected_end_date": "2027-03-16",
        "roi_percentage": 20.00,
        "status": "active"
      }
    ],
    "summary": {
      "total_contracts": 1,
      "total_invested": 6600.00,
      "total_expected_return": 7920.00,
      "total_received": 660.00,
      "total_pending": 7260.00,
      "average_roi": 20.00,
      "overall_completion": 8.33
    }
  }
}
```

---

## Account Details Endpoint

### ❌ New Endpoint Required

#### 1. Get Wire Transfer Account Details ⭐ REQUIRED
- **Method:** `GET`
- **Endpoint:** `/portallogistice/account-details`
- **Headers:** `Authorization: Bearer {token}`
- **Purpose:** Get company bank account details for wire transfers (6,600 SAR)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "account_name": "شركة تساهيل للاستثمار",
    "account_name_en": "Tasheel Investment Company",
    "account_number": "1234567890",
    "bank_name": "البنك الأهلي السعودي",
    "bank_name_en": "Al Ahli Bank",
    "iban": "SA9876543210987654321098",
    "swift_code": "NCBKSAJE",
    "beneficiary_name": "شركة تساهيل",
    "beneficiary_name_en": "Tasheel Company",
    "branch_name": "فرع الرياض الرئيسي",
    "branch_name_en": "Riyadh Main Branch",
    "address": "الرياض، المملكة العربية السعودية",
    "address_en": "Riyadh, Saudi Arabia"
  }
}
```
- **Use Case:** Display on Profile page for users to copy account details when making wire transfer

---

## Common Response Formats

### Success Response (200)
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

### Error Response (400 - Bad Request)
```json
{
  "success": false,
  "message": "Invalid request",
  "message_ar": "طلب غير صالح",
  "errors": {}
}
```

### Error Response (401 - Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized. Please login.",
  "message_ar": "غير مصرح. يرجى تسجيل الدخول."
}
```

### Error Response (403 - Forbidden)
```json
{
  "success": false,
  "message": "Access denied",
  "message_ar": "تم رفض الوصول"
}
```

### Error Response (404 - Not Found)
```json
{
  "success": false,
  "message": "Resource not found",
  "message_ar": "المورد غير موجود"
}
```

### Error Response (422 - Validation Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "message_ar": "فشل التحقق",
  "errors": {
    "field_name": [
      "Error message 1",
      "Error message 2"
    ]
  }
}
```

### Error Response (500 - Server Error)
```json
{
  "success": false,
  "message": "Internal server error",
  "message_ar": "خطأ في الخادم"
}
```

---

## Priority Summary

### 🔴 Priority 1 (Critical for MVP) - Required First

1. ✅ **GET** `/portallogistice/payments` - Get all user payments
2. ✅ **GET** `/portallogistice/payments/summary` - Payment summary
3. ✅ **POST** `/portallogistice/documents/upload` - Upload documents
4. ✅ **GET** `/portallogistice/documents` - Get user documents
5. ✅ **GET** `/portallogistice/contracts/{id}/receipt-status` - Receipt status
6. ✅ **POST** `/portallogistice/contracts/validate` - Validate contract creation
7. ✅ **GET** `/portallogistice/notifications` - Get notifications
8. ✅ **GET** `/portallogistice/notifications/count` - Unread count
9. ✅ **GET** `/portallogistice/analytics/summary` - Analytics summary
10. ✅ **GET** `/portallogistice/account-details` - Account details

### 🟡 Priority 2 (Important) - Can Wait

11. ✅ **GET** `/portallogistice/payments/{contractId}` - Payments by contract
12. ✅ **POST** `/portallogistice/payments/report-missing` - Report missing payment
13. ✅ **GET** `/portallogistice/contracts/{id}/timeline` - Contract timeline
14. ✅ **GET** `/portallogistice/analytics/payments` - Payment analytics
15. ✅ **PUT** `/portallogistice/notifications/{id}/read` - Mark as read
16. ✅ **PUT** `/portallogistice/notifications/{id}/complete` - Mark as completed
17. ✅ **PUT** `/portallogistice/notifications/{id}/dismiss` - Dismiss notification

### 🟢 Priority 3 (Nice to Have) - Can Wait Longer

18. ✅ **GET** `/portallogistice/documents/{id}` - Document details
19. ✅ **DELETE** `/portallogistice/documents/{id}` - Delete document
20. ✅ **GET** `/portallogistice/analytics/contracts-performance` - Contract performance
21. ✅ **PUT** `/portallogistice/notifications/mark-all-read` - Mark all as read

---

## Implementation Notes for Backend Team

### 1. Payment Schedule Caching
- `payment_schedule` JSON field in `portal_logistices` table should be cached
- Update cache when payment status changes in `portal_logistice_payments` table
- Return cached schedule in contract responses for performance

### 2. Notification Auto-Generation
- Create `upload_receipt` notification when selling contract is approved
- Set `deadline` = `receipt_upload_deadline` (approved_at + 48 hours)
- Set `priority` = `urgent` if deadline < 24 hours
- Auto-complete notification when receipt is uploaded and approved

### 3. Document Status Sync
- When IBAN or National Address document is approved, update `iban_document_path` or `national_address_document_path` in `portal_logistice_users` table
- This allows quick access without JOIN queries

### 4. Contract Validation Logic
- Check business rules before allowing contract creation
- Return clear error messages in Arabic and English
- Include `required_actions` array to guide user

### 5. Receipt Upload Window
- Calculate `hours_remaining` = (deadline - now) in hours
- Return `is_overdue` boolean
- Return warning message if overdue but still allow upload

### 6. Payment Status Updates
- When admin marks payment as `sent`, update `payment_schedule` JSON cache
- When user reports missing, set status to `reported_missing` but keep original payment record

### 7. Notification Count Optimization
- Cache unread count in Redis or similar
- Update cache when notification status changes
- Return cached count in `/notifications/count` endpoint

### 8. Analytics Calculations
- Cache analytics data if possible (refresh every hour)
- Calculate ROI: ((total_expected_return - total_invested) / total_invested) * 100
- Group payment data by month for charts

---

## Testing Recommendations

### Test Cases for Backend Team

1. **Contract Validation:**
   - Test: User with no contracts tries to create rental → Should fail
   - Test: User with approved selling tries to create new selling without rental → Should fail
   - Test: User with 2 pending receipts tries to create 3rd contract → Should fail

2. **Receipt Upload:**
   - Test: Upload within 48 hours → Should succeed
   - Test: Upload after 48 hours → Should succeed with warning
   - Test: Upload receipt for wrong contract → Should fail

3. **Payment Tracking:**
   - Test: Get payments for user with no payments → Should return empty array
   - Test: Report missing payment → Should update status to `reported_missing`
   - Test: Get payment summary → Should calculate correctly

4. **Notifications:**
   - Test: Create notification when contract approved → Should auto-generate
   - Test: Mark as read → Should update `read_at`
   - Test: Get unread count → Should exclude read notifications

5. **Documents:**
   - Test: Upload IBAN doc → Should create record with `contract_id = NULL`
   - Test: Upload receipt → Should require `contract_id`
   - Test: Get documents → Should filter correctly by type/status

---

## Timeline Expectations

### Week 1: Priority 1 Endpoints (Critical)
- Payment endpoints (GET payments, summary)
- Document upload endpoint
- Receipt status endpoint
- Contract validation endpoint
- Basic notifications endpoint

### Week 2: Priority 2 Endpoints (Important)
- Complete notification endpoints
- Analytics endpoints
- Account details endpoint
- Payment reporting endpoint

### Week 3: Priority 3 Endpoints (Nice to Have)
- Additional analytics endpoints
- Document management endpoints
- Notification management endpoints

---

## Questions for Backend Team

1. **File Upload:**
   - What's the maximum file size?
   - What file types are allowed? (PDF, images?)
   - What's the storage path structure?

2. **Payment Schedule:**
   - Should we refresh cache every time or only on status change?
   - How do we handle timezone for due dates?

3. **Notifications:**
   - How often should frontend poll for new notifications?
   - Should we implement WebSockets for real-time updates?

4. **Analytics:**
   - Can we cache analytics data? How often should it refresh?
   - Should calculations be done on-the-fly or pre-calculated?

5. **Error Handling:**
   - What's the standard error format?
   - Should all errors include Arabic messages?

---

## Contact & Support

**Frontend Team Questions:**
- Please provide API specifications for any endpoint before implementation
- Share test environment URL when endpoints are ready
- Notify frontend team when endpoints are deployed to staging

**Backend Team:**
- Please review this document and confirm which endpoints can be implemented
- Provide timeline for Priority 1 endpoints
- Share any questions or clarifications needed

---

**Document Version:** 1.0  
**Last Updated:** January 9, 2026  
**Status:** Ready for Backend Team Review  
**Next Review:** After Backend Team Feedback
