# Tasks Page - Quick Reference for Backend Team 🚀

## 🔥 CRITICAL: Add These Fields to Notifications Table

```sql
-- Add these columns to portal_logistice_notifications:

ALTER TABLE portal_logistice_notifications 
ADD COLUMN `context_summary` TEXT NULL,
ADD COLUMN `context_summary_ar` TEXT NULL,
ADD COLUMN `context_summary_en` TEXT NULL,
ADD COLUMN `quick_action_type` VARCHAR(50) NULL,
ADD COLUMN `quick_action_url` VARCHAR(500) NULL,
ADD COLUMN `quick_action_params` JSON NULL,
ADD COLUMN `help_text` TEXT NULL,
ADD COLUMN `help_text_ar` TEXT NULL,
ADD COLUMN `estimated_time_minutes` INT NULL,
ADD COLUMN `icon_name` VARCHAR(50) NULL,
ADD COLUMN `color_scheme` VARCHAR(20) NULL;
```

## 🎯 CRITICAL: Update GET /notifications Response

**Add these fields to each notification in response:**

```json
{
  "context_summary": "Why this task exists - clear explanation",
  "context_summary_ar": "لماذا هذه المهمة موجودة - شرح واضح",
  "context_summary_en": "Why this task exists - clear explanation",
  "quick_action": {
    "type": "upload_receipt",
    "button_text": "Upload Receipt Now",
    "button_text_ar": "رفع الإيصال الآن",
    "direct_url": "/dashboard/tasks?action=upload_receipt&contract_id=123"
  },
  "help": {
    "text": "Step-by-step instructions",
    "text_ar": "تعليمات خطوة بخطوة",
    "common_mistakes": ["Mistake 1", "Mistake 2"]
  },
  "visual": {
    "icon": "fa-receipt",
    "color_scheme": "urgent",
    "estimated_time_minutes": 2
  },
  "related_contract": {
    // FULL contract details, not just ID
    "id": 123,
    "contract_number": "CN-2025-001",
    "type": "selling",
    "amount": 6600,
    "status": "approved",
    "approved_at": "2025-01-15 10:00:00",
    "display_name": "Selling Contract #123"
  }
}
```

## 🚀 NEW ENDPOINTS NEEDED

### 1. Quick Action Endpoint (CRITICAL)
```
POST /api/v1/portallogistice/notifications/{id}/quick-action
Body: { "action_type": "upload_receipt", "params": {...} }
```

### 2. Batch Actions Endpoint (IMPORTANT)
```
POST /api/v1/portallogistice/notifications/batch-action
Body: { "actions": [{ "notification_id": 1, "action": "complete" }] }
```

### 3. Task Context Endpoint (IMPORTANT)
```
GET /api/v1/portallogistice/notifications/{id}/context
Returns: Full context, timeline, next steps
```

## 📋 IMPLEMENTATION PRIORITY

### Week 1 (CRITICAL):
- [ ] Add `context_summary` fields to notifications table
- [ ] Update notification generation to include context_summary
- [ ] Update GET /notifications to return context_summary
- [ ] Include full `related_contract` details in response

### Week 2 (IMPORTANT):
- [ ] Add `quick_action` fields to notifications table
- [ ] Implement POST /notifications/{id}/quick-action
- [ ] Add `help` section to notification response

### Week 3 (NICE TO HAVE):
- [ ] Implement batch actions endpoint
- [ ] Implement task context endpoint
- [ ] Add caching layer

## 💡 EXAMPLE: How to Generate context_summary

### For Upload Receipt Task:
```php
$contextSummary = "Your selling contract #{$contract->id} was approved on " . 
                  $contract->approved_at->format('M d') . 
                  ". Upload your bank transfer receipt within 48 hours to proceed with creating your rental contract.";
```

### For Complete Profile Task:
```php
$contextSummary = "Your profile is missing some required information. Complete it to create contracts and access all features.";
```

### For Upload Document Task:
```php
$contextSummary = "You need to upload your {$docType} document to complete your profile and create contracts.";
```

## ✅ CHECKLIST FOR BACKEND TEAM

- [ ] Database migration: Add new columns to notifications table
- [ ] Update notification generation logic: Include context_summary
- [ ] Update GET /notifications endpoint: Return new fields
- [ ] Update notification response: Include full related_contract details
- [ ] Add help text generation: For each task type
- [ ] Implement quick action endpoint: POST /notifications/{id}/quick-action
- [ ] Test: Verify all new fields are returned correctly
- [ ] Document: Update API documentation

## 🎯 SUCCESS CRITERIA

✅ Users see tasks and understand WHY immediately  
✅ Users can complete tasks in ONE CLICK  
✅ All relevant information is visible (no extra API calls needed)  
✅ Tasks load fast (< 1 second)  
✅ Actions complete fast (< 500ms)

---

**See full report:** `TASKSPAGE_PERFECTION_REPORT.md`
