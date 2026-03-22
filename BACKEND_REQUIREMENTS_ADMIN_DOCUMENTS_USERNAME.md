# 🔧 Backend Requirements: Admin Documents - User Name Field

**Date:** January 2025  
**Priority:** 🔴 CRITICAL  
**Requested By:** Frontend Team  
**Purpose:** Documents page needs to group documents by client name

---

## 📋 EXECUTIVE SUMMARY

The `/admin/documents` page groups documents by client name. The backend must return user/client information in the document response so the frontend can display documents grouped by client.

---

## 🎯 REQUIRED ENDPOINT

### **GET `/portallogistice/admin/documents`** 🔴 CRITICAL

**Current Endpoint:** `GET /api/v1/portallogistice/admin/documents`

**Required Fields in Response:**

Each document object in the response **MUST** include user/client information. The frontend will try to extract the client name in this priority order:

1. `user_name` (preferred - full name as string)
2. `user.name` (nested user object with name field)
3. `user.first_name` + `user.family_name` (will be concatenated)
4. `applicant_name` (fallback)
5. `full_name` (fallback)

---

## 📊 REQUIRED RESPONSE STRUCTURE

### **Option 1: Direct `user_name` Field (RECOMMENDED)**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "national_id": "1234567890",
        "user_name": "أحمد محمد علي العلي",
        "type": "iban_doc",
        "status": "pending",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "file_name": "iban_document.pdf",
        "file_url": "https://shellafood.com/storage/documents/iban_1234567890.pdf",
        "uploaded_at": "2025-01-16 10:00:00",
        "contract_id": null,
        "contract_type": null
      },
      {
        "id": 3,
        "national_id": "1234567890",
        "user_name": "أحمد محمد علي العلي",
        "type": "receipt",
        "status": "pending",
        "file_path": "/storage/documents/receipt_123_1234567890.pdf",
        "file_name": "receipt.pdf",
        "file_url": "https://shellafood.com/storage/documents/receipt_123_1234567890.pdf",
        "uploaded_at": "2025-01-17 10:00:00",
        "contract_id": 123,
        "contract_type": "rental"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 50,
      "last_page": 3
    }
  }
}
```

### **Option 2: Nested `user` Object (ACCEPTABLE)**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "national_id": "1234567890",
        "user_id": 24,
        "type": "iban_doc",
        "status": "pending",
        "file_path": "/storage/documents/iban_1234567890.pdf",
        "file_name": "iban_document.pdf",
        "file_url": "https://shellafood.com/storage/documents/iban_1234567890.pdf",
        "uploaded_at": "2025-01-16 10:00:00",
        "user": {
          "id": 24,
          "national_id": "1234567890",
          "name": "أحمد محمد علي العلي",
          "first_name": "أحمد",
          "family_name": "العلي",
          "email": "ahmed@example.com",
          "phone": "0501234567"
        },
        "contract_id": null,
        "contract_type": null
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 50,
      "last_page": 3
    }
  }
}
```

---

## ✅ REQUIRED FIELDS CHECKLIST

Each document object **MUST** include:

### **Critical (Required for Grouping):**
- ✅ `national_id` - Used as grouping key (fallback to `user_id` or `user_name` if not available)
- ✅ **User Name** (one of the following):
  - `user_name` (string) - **BEST OPTION**
  - OR `user.name` (string) - **GOOD OPTION**
  - OR `user.first_name` + `user.family_name` (will be concatenated)
  - OR `applicant_name` (fallback)
  - OR `full_name` (fallback)

### **Optional (Nice to Have):**
- `user.email` or `email` - For displaying client email
- `user.phone` or `phone` - For displaying client phone
- `user.national_id` - If using nested user object

---

## 🔍 FRONTEND EXTRACTION LOGIC

The frontend code extracts client information in this order:

```javascript
// Client ID (for grouping)
const clientId = doc.national_id || doc.user?.national_id || doc.user_id || doc.user_name || 'unknown';

// Client Name (for display)
const clientName = 
  doc.user_name ||                    // Direct field (BEST)
  doc.user?.name ||                   // Nested user.name (GOOD)
  (doc.user?.first_name && doc.user?.family_name 
    ? `${doc.user.first_name} ${doc.user.family_name}` 
    : null) ||                        // Concatenated first + family name
  doc.applicant_name ||               // Fallback 1
  doc.full_name ||                    // Fallback 2
  'Unknown Client';                   // Last resort
```

---

## 📝 IMPLEMENTATION NOTES

### **Backend Implementation:**

1. **If using direct `user_name` field:**
   ```php
   // In your controller/model
   $document->user_name = $user->first_name . ' ' . $user->family_name;
   // OR if you have a full_name column
   $document->user_name = $user->full_name;
   ```

2. **If using nested `user` object:**
   ```php
   // Include user relationship
   $document->load('user');
   // Make sure user object has 'name' field or first_name + family_name
   ```

3. **Database Query:**
   ```php
   // Example Laravel query
   $documents = Document::with('user')
       ->select([
           'documents.*',
           'users.national_id',
           'users.first_name',
           'users.family_name',
           'users.email',
           'users.phone'
       ])
       ->join('users', 'documents.user_id', '=', 'users.id')
       ->get()
       ->map(function($doc) {
           $doc->user_name = $doc->user->first_name . ' ' . $doc->user->family_name;
           return $doc;
       });
   ```

---

## 🚨 CRITICAL NOTES

1. **Grouping Key:**
   - Documents are grouped by `national_id` (primary)
   - Falls back to `user_id` or `user_name` if `national_id` is missing
   - **IMPORTANT:** All documents from the same user MUST have the same `national_id` for proper grouping

2. **Name Display:**
   - The client name is displayed in the group header
   - If `user_name` is missing, the frontend will show "Unknown Client"
   - **RECOMMENDATION:** Always provide `user_name` as a direct field for best compatibility

3. **Backward Compatibility:**
   - Frontend supports multiple formats for maximum compatibility
   - But `user_name` as direct field is the most reliable

---

## ✅ TESTING REQUIREMENTS

### Test Cases:

1. **Response includes `user_name`:**
   ```json
   {
     "id": 1,
     "user_name": "أحمد محمد علي العلي",
     "national_id": "1234567890"
   }
   ```
   ✅ Should group correctly by client name

2. **Response includes nested `user.name`:**
   ```json
   {
     "id": 1,
     "national_id": "1234567890",
     "user": {
       "name": "أحمد محمد علي العلي"
     }
   }
   ```
   ✅ Should group correctly by client name

3. **Response includes `user.first_name` + `user.family_name`:**
   ```json
   {
     "id": 1,
     "national_id": "1234567890",
     "user": {
       "first_name": "أحمد",
       "family_name": "العلي"
     }
   }
   ```
   ✅ Should concatenate and group correctly

4. **Missing user name:**
   ```json
   {
     "id": 1,
     "national_id": "1234567890"
   }
   ```
   ⚠️ Will show "Unknown Client" but still group by `national_id`

---

## 📞 CONTACT

**Frontend Team Contact:** [Your Name/Team]  
**Priority:** 🔴 CRITICAL - Required for documents page grouping functionality  
**Status:** 📋 Awaiting Backend Implementation

---

**Last Updated:** January 2025
