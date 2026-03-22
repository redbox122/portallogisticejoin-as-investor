import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../../config';
import '../../Css/pages/admin-email-templates-page.css';

const AdminEmailTemplatesPage = () => {
  const { t, i18n } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total: 0,
    per_page: 15,
    last_page: 1
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [showCustomEmailModal, setShowCustomEmailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    notification_type: '',
    name: '',
    name_en: '',
    subject: '',
    subject_en: '',
    body: '',
    body_en: '',
    is_active: true,
    priority: 'normal',
    include_action_button: true,
    action_button_text: '',
    action_button_text_en: '',
    header_color: '#667eea',
    priority_color: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Send email state
  const [sendEmailData, setSendEmailData] = useState({
    emails: [''],
    subject: '',
    body: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchNotificationTypes();
  }, [pagination.current_page, search, activeFilter]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        per_page: pagination.per_page,
        page: pagination.current_page,
        ...(search && { search }),
        ...(activeFilter && { is_active: activeFilter })
      });

      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/email-templates?${params.toString()}`,
        { headers }
      );

      if (response.data?.success) {
        setTemplates(response.data.data.data || []);
        setPagination({
          current_page: response.data.data.current_page || 1,
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || 15,
          last_page: response.data.data.last_page || 1
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.fetch'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationTypes = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/email-templates/notification-types`,
        { headers }
      );

      if (response.data?.success) {
        setNotificationTypes(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notification types:', error);
    }
  };

  const fetchTemplate = async (id) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/email-templates/${id}`,
        { headers }
      );

      if (response.data?.success) {
        const template = response.data.data;
        setFormData({
          notification_type: template.notification_type || '',
          name: template.name || '',
          name_en: template.name_en || '',
          subject: template.subject || '',
          subject_en: template.subject_en || '',
          body: template.body || '',
          body_en: template.body_en || '',
          is_active: template.is_active !== undefined ? template.is_active : true,
          priority: template.priority || 'normal',
          include_action_button: template.include_action_button !== undefined ? template.include_action_button : true,
          action_button_text: template.action_button_text || '',
          action_button_text_en: template.action_button_text_en || '',
          header_color: template.header_color || '#667eea',
          priority_color: template.priority_color || '',
          description: template.description || ''
        });
        setSelectedTemplate(template);
        return template;
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.fetch_template'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    }
  };

  const handleCreate = () => {
    setFormData({
      notification_type: '',
      name: '',
      name_en: '',
      subject: '',
      subject_en: '',
      body: '',
      body_en: '',
      is_active: true,
      priority: 'normal',
      include_action_button: true,
      action_button_text: '',
      action_button_text_en: '',
      header_color: '#667eea',
      priority_color: '',
      description: ''
    });
    setFormErrors({});
    setSelectedTemplate(null);
    setShowCreateModal(true);
  };

  const handleEdit = async (id) => {
    const template = await fetchTemplate(id);
    if (template) {
      setShowEditModal(true);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.email_templates.confirm_delete'))) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      await axios.delete(
        `${API_BASE_URL}/portallogistice/admin/email-templates/${id}`,
        { headers }
      );

      Store.addNotification({
        title: t('admin.success.title'),
        message: t('admin.email_templates.success.template_deleted'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000 }
      });

      fetchTemplates();
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.delete'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    // Optimistic update - immediately update UI
    setTemplates(prevTemplates => 
      prevTemplates.map(template => 
        template.id === id 
          ? { ...template, is_active: !currentStatus }
          : template
      )
    );

    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/admin/email-templates/${id}`,
        { is_active: !currentStatus },
        { headers }
      );

      Store.addNotification({
        title: t('admin.success.title'),
        message: !currentStatus ? t('admin.email_templates.success.template_activated') : t('admin.email_templates.success.template_deactivated'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000 }
      });

      fetchTemplates();
    } catch (error) {
      // Revert optimistic update on error
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.id === id 
            ? { ...template, is_active: currentStatus }
            : template
        )
      );

      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.update'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    }
  };

  const handlePreview = async (id) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/admin/email-templates/${id}/preview`,
        {},
        { headers }
      );

      if (response.data?.success) {
        setPreviewData(response.data.data);
        setShowPreviewModal(true);
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.preview'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    }
  };

  const handleSendTemplate = async (id) => {
    const template = await fetchTemplate(id);
    if (template) {
      setSendEmailData({
        emails: [''],
        subject: template.subject || '',
        body: template.body || ''
      });
      setSelectedTemplate(template);
      setShowSendEmailModal(true);
    }
  };

  const handleSave = async () => {
    setFormErrors({});
    const newErrors = {};

    if (!formData.notification_type) {
      newErrors.notification_type = t('admin.email_templates.form.notification_type_required');
    }
    if (!formData.name) {
      newErrors.name = t('admin.email_templates.form.name_ar_required');
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const headers = getAuthHeaders();
      const url = selectedTemplate
        ? `${API_BASE_URL}/portallogistice/admin/email-templates/${selectedTemplate.id}`
        : `${API_BASE_URL}/portallogistice/admin/email-templates`;

      const method = selectedTemplate ? 'put' : 'post';

      await axios[method](url, formData, { headers });

      Store.addNotification({
        title: t('admin.success.title'),
        message: selectedTemplate ? t('admin.email_templates.success.template_updated') : t('admin.email_templates.success.template_created'),
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000 }
      });

      setShowCreateModal(false);
      setShowEditModal(false);
      fetchTemplates();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        Store.addNotification({
          title: t('admin.error.title'),
          message: error.response?.data?.message || (selectedTemplate ? t('admin.email_templates.error.update') : t('admin.email_templates.error.create')),
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 5000 }
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    const emails = sendEmailData.emails.filter(e => e.trim());
    if (emails.length === 0) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.email_templates.error.at_least_one_email'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
      return;
    }

    if (!sendEmailData.subject || !sendEmailData.body) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.email_templates.error.subject_body_required'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
      return;
    }

    setSendingEmail(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/admin/send-custom-email`,
        {
          subject: sendEmailData.subject,
          body: sendEmailData.body,
          emails: emails
        },
        { headers }
      );

      if (response.data?.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.email_templates.success.email_sent', { count: response.data.data?.sent_count || 0 }),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: { duration: 5000 }
        });

        setShowSendEmailModal(false);
        setShowCustomEmailModal(false);
        setSendEmailData({ emails: [''], subject: '', body: '' });
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.email_templates.error.send'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000 }
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const insertVariable = (field, variable) => {
    const currentValue = formData[field] || '';
    const newValue = currentValue + `{${variable}}`;
    setFormData({ ...formData, [field]: newValue });
  };

  const getAvailableVariables = () => {
    if (!formData.notification_type) return [];
    
    const variableMap = {
      contract_approved: ['user_name', 'contract_id', 'contract_type'],
      contract_denied: ['user_name', 'contract_id', 'denial_reason', 'contract_type'],
      document_approved: ['user_name', 'document_type', 'contract_id'],
      document_rejected: ['user_name', 'document_type', 'rejection_reason', 'contract_id'],
      upload_receipt: ['user_name', 'contract_id', 'deadline'],
      payment_received: ['user_name', 'contract_id', 'amount', 'payment_date'],
      payment_overdue: ['user_name', 'contract_id', 'amount', 'days_overdue']
    };

    return variableMap[formData.notification_type] || [];
  };

  const addEmailField = () => {
    setSendEmailData({
      ...sendEmailData,
      emails: [...sendEmailData.emails, '']
    });
  };

  const removeEmailField = (index) => {
    const newEmails = sendEmailData.emails.filter((_, i) => i !== index);
    setSendEmailData({ ...sendEmailData, emails: newEmails.length > 0 ? newEmails : [''] });
  };

  const updateEmailField = (index, value) => {
    const newEmails = [...sendEmailData.emails];
    newEmails[index] = value;
    setSendEmailData({ ...sendEmailData, emails: newEmails });
  };

  if (loading && templates.length === 0) {
    return (
      <div className="admin-page-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading') || 'Loading...'}</p>
      </div>
    );
  }

  const isRTL = i18n.language === 'ar';

  return (
    <div className="admin-email-templates-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.email_templates.title')}</h1>
          <p className="admin-page-subtitle">{t('admin.email_templates.subtitle')}</p>
        </div>
        <div className="admin-page-actions">
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => setShowCustomEmailModal(true)}
          >
            <i className="fas fa-envelope"></i>
            {t('admin.email_templates.send_custom_email')}
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleCreate}
          >
            <i className="fas fa-plus"></i>
            {t('admin.email_templates.create_template')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-email-templates-filters">
        <div className="admin-filter-group">
          <input
            type="text"
            className="admin-filter-input"
            placeholder={t('admin.email_templates.search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination({ ...pagination, current_page: 1 });
            }}
          />
        </div>
        <div className="admin-filter-group">
          <select
            className="admin-filter-select"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPagination({ ...pagination, current_page: 1 });
            }}
          >
            <option value="">{t('admin.email_templates.filter.all_status')}</option>
            <option value="true">{t('admin.email_templates.filter.active')}</option>
            <option value="false">{t('admin.email_templates.filter.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Templates Table */}
      <div className="admin-email-templates-table-container">
        <table className="admin-email-templates-table">
          <thead>
            <tr>
              <th>{t('admin.email_templates.table.id')}</th>
              <th>{t('admin.email_templates.table.notification_type')}</th>
              <th>{t('admin.email_templates.table.name')}</th>
              <th>{t('admin.email_templates.table.status')}</th>
              <th>{t('admin.email_templates.table.priority')}</th>
              <th>{t('admin.email_templates.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-table-empty">
                  {t('admin.email_templates.empty')}
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.id}</td>
                  <td>
                    <code className="admin-code-badge">{template.notification_type}</code>
                  </td>
                  <td>
                    <div>
                      <strong>{template.name}</strong>
                      {template.name_en && (
                        <div className="admin-text-muted">{template.name_en}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                      {template.is_active ? t('admin.email_templates.status.active') : t('admin.email_templates.status.inactive')}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-priority-badge ${template.priority}`}>
                      {t(`admin.email_templates.priority.${template.priority}`) || template.priority}
                    </span>
                  </td>
                  <td>
                    <div className="admin-action-buttons">
                      <button
                        className="admin-action-btn admin-action-btn-edit"
                        onClick={() => handleEdit(template.id)}
                        title={t('admin.email_templates.actions.edit')}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn-preview"
                        onClick={() => handlePreview(template.id)}
                        title={t('admin.email_templates.actions.preview')}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn-send"
                        onClick={() => handleSendTemplate(template.id)}
                        title={t('admin.email_templates.actions.send_email')}
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                      <label
                        className="admin-toggle-switch"
                        title={template.is_active ? t('admin.email_templates.actions.deactivate') : t('admin.email_templates.actions.activate')}
                      >
                        <input
                          type="checkbox"
                          checked={template.is_active}
                          onChange={() => handleToggleActive(template.id, template.is_active)}
                        />
                        <span className="admin-toggle-slider"></span>
                      </label>
                      <button
                        className="admin-action-btn admin-action-btn-danger"
                        onClick={() => handleDelete(template.id)}
                        title={t('admin.email_templates.actions.delete')}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-pagination-btn"
            disabled={pagination.current_page === 1}
            onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
          >
            <i className={`fas fa-chevron-${isRTL ? 'right' : 'left'}`}></i>
            {t('admin.email_templates.pagination.previous')}
          </button>
          <span className="admin-pagination-info">
            {t('admin.email_templates.pagination.page')} {pagination.current_page} {t('admin.email_templates.pagination.of')} {pagination.last_page} ({pagination.total} {t('admin.email_templates.pagination.total')})
          </span>
          <button
            className="admin-pagination-btn"
            disabled={pagination.current_page === pagination.last_page}
            onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
          >
            {t('admin.email_templates.pagination.next')}
            <i className={`fas fa-chevron-${isRTL ? 'left' : 'right'}`}></i>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{selectedTemplate ? t('admin.email_templates.modal.edit') : t('admin.email_templates.modal.create')}</h2>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.notification_type')} *</label>
                <select
                  className={`admin-form-input ${formErrors.notification_type ? 'error' : ''}`}
                  value={formData.notification_type}
                  onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                  disabled={!!selectedTemplate}
                >
                  <option value="">{t('admin.email_templates.form.select_type')}</option>
                  {notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {formErrors.notification_type && (
                  <span className="admin-form-error">
                    {Array.isArray(formErrors.notification_type) 
                      ? formErrors.notification_type[0] 
                      : formErrors.notification_type}
                  </span>
                )}
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.name_ar')} *</label>
                <input
                  type="text"
                  className={`admin-form-input ${formErrors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && (
                  <span className="admin-form-error">
                    {Array.isArray(formErrors.name) 
                      ? formErrors.name[0] 
                      : formErrors.name}
                  </span>
                )}
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.name_en')}</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.subject_ar')}</label>
                <div className="admin-variable-helper">
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder={t('admin.email_templates.form.subject')}
                  />
                  {getAvailableVariables().length > 0 && (
                    <div className="admin-variable-buttons">
                      {getAvailableVariables().map((varName) => (
                        <button
                          key={varName}
                          type="button"
                          className="admin-variable-btn"
                          onClick={() => insertVariable('subject', varName)}
                        >
                          {`{${varName}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.subject_en')}</label>
                <div className="admin-variable-helper">
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.subject_en}
                    onChange={(e) => setFormData({ ...formData, subject_en: e.target.value })}
                    placeholder={t('admin.email_templates.form.subject') + ' (English)'}
                  />
                  {getAvailableVariables().length > 0 && (
                    <div className="admin-variable-buttons">
                      {getAvailableVariables().map((varName) => (
                        <button
                          key={varName}
                          type="button"
                          className="admin-variable-btn"
                          onClick={() => insertVariable('subject_en', varName)}
                        >
                          {`{${varName}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.body_ar')}</label>
                <div className="admin-variable-helper">
                  <textarea
                    className="admin-form-textarea"
                    rows="6"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder={t('admin.email_templates.form.body')}
                  />
                  {getAvailableVariables().length > 0 && (
                    <div className="admin-variable-buttons">
                      {getAvailableVariables().map((varName) => (
                        <button
                          key={varName}
                          type="button"
                          className="admin-variable-btn"
                          onClick={() => insertVariable('body', varName)}
                        >
                          {`{${varName}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.body_en')}</label>
                <div className="admin-variable-helper">
                  <textarea
                    className="admin-form-textarea"
                    rows="6"
                    value={formData.body_en}
                    onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                    placeholder={t('admin.email_templates.form.body') + ' (English)'}
                  />
                  {getAvailableVariables().length > 0 && (
                    <div className="admin-variable-buttons">
                      {getAvailableVariables().map((varName) => (
                        <button
                          key={varName}
                          type="button"
                          className="admin-variable-btn"
                          onClick={() => insertVariable('body_en', varName)}
                        >
                          {`{${varName}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>{t('admin.email_templates.form.priority')}</label>
                  <select
                    className="admin-form-input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="normal">{t('admin.email_templates.priority.normal')}</option>
                    <option value="urgent">{t('admin.email_templates.priority.urgent')}</option>
                    <option value="low">{t('admin.email_templates.priority.low')}</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>{t('admin.email_templates.form.header_color')}</label>
                  <input
                    type="color"
                    className="admin-form-input"
                    value={formData.header_color}
                    onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.include_action_button}
                    onChange={(e) => setFormData({ ...formData, include_action_button: e.target.checked })}
                  />
                  {t('admin.email_templates.form.include_action_button')}
                </label>
              </div>

              {formData.include_action_button && (
                <>
                  <div className="admin-form-group">
                    <label>{t('admin.email_templates.form.action_button_text_ar')}</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.action_button_text}
                      onChange={(e) => setFormData({ ...formData, action_button_text: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>{t('admin.email_templates.form.action_button_text_en')}</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.action_button_text_en}
                      onChange={(e) => setFormData({ ...formData, action_button_text_en: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.description')}</label>
                <textarea
                  className="admin-form-textarea"
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('admin.email_templates.form.description')}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  {t('admin.email_templates.form.is_active')}
                </label>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
              >
                {t('admin.email_templates.modal.cancel')}
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Watch height="20" width="20" radius="9" color="#ffffff" ariaLabel="saving" />
                    {t('admin.email_templates.modal.saving')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    {selectedTemplate ? t('admin.email_templates.modal.update') : t('admin.email_templates.modal.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="admin-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="admin-modal admin-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{t('admin.email_templates.modal.preview')}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowPreviewModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-email-preview">
                <div className="admin-email-preview-header">
                  <strong>Subject:</strong> {previewData.preview_data?.subject || previewData.template?.subject}
                </div>
                <div className="admin-email-preview-body">
                  <pre>{previewData.preview_data?.body || previewData.template?.body}</pre>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                {t('admin.email_templates.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal (from template) */}
      {showSendEmailModal && selectedTemplate && (
        <div className="admin-modal-overlay" onClick={() => setShowSendEmailModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{t('admin.email_templates.modal.send_from_template')}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowSendEmailModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.template')}: {selectedTemplate.name}</label>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.email_addresses')} *</label>
                {sendEmailData.emails.map((email, index) => (
                  <div key={index} className="admin-email-input-group">
                    <input
                      type="email"
                      className="admin-form-input"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                    />
                    {sendEmailData.emails.length > 1 && (
                      <button
                        type="button"
                        className="admin-email-remove-btn"
                        onClick={() => removeEmailField(index)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-link"
                  onClick={addEmailField}
                >
                  <i className="fas fa-plus"></i> {t('admin.email_templates.form.add_another_email')}
                </button>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.subject')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={sendEmailData.subject}
                  onChange={(e) => setSendEmailData({ ...sendEmailData, subject: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.body')} *</label>
                <textarea
                  className="admin-form-textarea"
                  rows="8"
                  value={sendEmailData.body}
                  onChange={(e) => setSendEmailData({ ...sendEmailData, body: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowSendEmailModal(false)}
              >
                {t('admin.email_templates.modal.cancel')}
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <Watch height="20" width="20" radius="9" color="#ffffff" ariaLabel="sending" />
                    {t('admin.email_templates.modal.sending')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    {t('admin.email_templates.modal.send')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Email Modal */}
      {showCustomEmailModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCustomEmailModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{t('admin.email_templates.modal.send_custom')}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowCustomEmailModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.email_addresses')} *</label>
                {sendEmailData.emails.map((email, index) => (
                  <div key={index} className="admin-email-input-group">
                    <input
                      type="email"
                      className="admin-form-input"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                    />
                    {sendEmailData.emails.length > 1 && (
                      <button
                        type="button"
                        className="admin-email-remove-btn"
                        onClick={() => removeEmailField(index)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-link"
                  onClick={addEmailField}
                >
                  <i className="fas fa-plus"></i> {t('admin.email_templates.form.add_another_email')}
                </button>
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.subject')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={sendEmailData.subject}
                  onChange={(e) => setSendEmailData({ ...sendEmailData, subject: e.target.value })}
                  placeholder={t('admin.email_templates.form.subject')}
                />
              </div>

              <div className="admin-form-group">
                <label>{t('admin.email_templates.form.body')} *</label>
                <textarea
                  className="admin-form-textarea"
                  rows="10"
                  value={sendEmailData.body}
                  onChange={(e) => setSendEmailData({ ...sendEmailData, body: e.target.value })}
                  placeholder={t('admin.email_templates.form.body')}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowCustomEmailModal(false)}
              >
                {t('admin.email_templates.modal.cancel')}
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <Watch height="20" width="20" radius="9" color="#ffffff" ariaLabel="sending" />
                    {t('admin.email_templates.modal.sending')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    {t('admin.email_templates.modal.send')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmailTemplatesPage;
