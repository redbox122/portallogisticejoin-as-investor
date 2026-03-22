import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/AuthContext';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { Watch } from 'react-loader-spinner';
import { Store } from 'react-notifications-component';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const UserManagement = () => {
  const { t } = useTranslation(['common']);
  const { getAuthHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 15, last_page: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    first_name: '',
    family_name: '',
    login: '', // Can be email, phone, or national_id
    login_type: 'email', // 'email', 'phone', or 'national_id'
    password: '',
    iban: '',
    max_contracts_allowed: '',
    is_active: true
  });
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    family_name: '',
    father_name: '',
    grandfather_name: '',
    email: '',
    phone: '',
    birth_date: '',
    region: '',
    national_address_email: '',
    bank_name: '',
    iban: '',
    max_contracts_allowed: '',
    is_active: true
  });
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const adminUsersBase = `${API_BASE_URL}/admin/users`;
  const legacyAdminUsersBase = `${API_BASE_URL}/portallogistice/admin/users`;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('per_page', '15');
      params.append('page', currentPage.toString());

      let response;
      try {
        response = await axios.get(`${adminUsersBase}?${params.toString()}`, { headers });
      } catch (primaryError) {
        // Backward compatibility with older backend route layout.
        response = await axios.get(`${legacyAdminUsersBase}?${params.toString()}`, { headers });
      }

      if (response.data.success) {
        setUsers(response.data.data.data || []);
        setPagination({
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || 15,
          last_page: response.data.data.last_page || 1,
          current_page: response.data.data.current_page || 1
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      const isUnauthenticated = error.response?.status === 401;
      Store.addNotification({
        title: t('admin.error.title'),
        message: isUnauthenticated
          ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
          : (error.response?.data?.message || t('admin.error.fetch_users')),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, currentPage, getAuthHeaders, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleViewUser = async (nationalId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/admin/users/${nationalId}`,
        { headers }
      );

      if (response.data.success) {
        setSelectedUser(response.data.data);
        setShowUserModal(true);
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.fetch_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  const handleEditUser = (user) => {
    setEditFormData({
      first_name: user.user?.first_name || '',
      family_name: user.user?.family_name || '',
      father_name: user.user?.father_name || '',
      grandfather_name: user.user?.grandfather_name || '',
      email: user.user?.email || '',
      phone: user.user?.phone || '',
      birth_date: user.user?.birth_date || '',
      region: user.user?.region || '',
      national_address_email: user.user?.national_address_email || '',
      bank_name: user.user?.bank_name || '',
      iban: user.user?.iban || '',
      max_contracts_allowed: user.user?.max_contracts_allowed !== null && user.user?.max_contracts_allowed !== undefined ? user.user.max_contracts_allowed.toString() : '',
      is_active: user.user?.is_active ?? true
    });
    setShowEditModal(true);
    setShowUserModal(false);
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (editErrors[field]) {
      setEditErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateEditForm = () => {
    const newErrors = {};

    // Validate max_contracts_allowed if provided
    if (editFormData.max_contracts_allowed && editFormData.max_contracts_allowed.trim()) {
      const maxContracts = parseInt(editFormData.max_contracts_allowed);
      if (isNaN(maxContracts) || maxContracts < 0) {
        newErrors.max_contracts_allowed = t('admin.users.invalid_max_contracts');
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.error.update_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return;
    }

    if (!selectedUser?.user?.national_id) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('admin.error.invalid_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return;
    }

    setEditLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Prepare update data
      const updateData = {
        first_name: editFormData.first_name || null,
        family_name: editFormData.family_name || null,
        father_name: editFormData.father_name || null,
        grandfather_name: editFormData.grandfather_name || null,
        email: editFormData.email || null,
        phone: editFormData.phone || null,
        birth_date: editFormData.birth_date || null,
        region: editFormData.region || null,
        national_address_email: editFormData.national_address_email || null,
        bank_name: editFormData.bank_name || null,
        iban: editFormData.iban || null,
        is_active: editFormData.is_active
      };
      
      // Add max_contracts_allowed if provided (convert to integer or null)
      if (editFormData.max_contracts_allowed && editFormData.max_contracts_allowed.trim()) {
        const maxContracts = parseInt(editFormData.max_contracts_allowed);
        if (!isNaN(maxContracts) && maxContracts >= 0) {
          updateData.max_contracts_allowed = maxContracts;
        }
      } else {
        updateData.max_contracts_allowed = null; // NULL = unlimited
      }
      
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/users/${selectedUser.user.national_id}`,
        updateData,
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.user_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        
        setShowEditModal(false);
        setEditErrors({});
        
        // Refresh users list and user details
        fetchUsers();
        if (selectedUser?.user?.national_id) {
          handleViewUser(selectedUser.user.national_id);
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.message || error.message || t('admin.error.update_user');
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.code) {
            apiErrors[err.code] = err.message;
          }
        });
        setEditErrors(apiErrors);
      }
      
      Store.addNotification({
        title: t('admin.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (createErrors[field]) {
      setCreateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateCreateForm = () => {
    const newErrors = {};

    // First name and family name are optional (API has defaults)
    // No validation needed for them

    // Login credential is REQUIRED (at least one: email, phone, or national_id)
    if (!createFormData.login.trim()) {
      newErrors.login = `${t('admin.users.login_credential')} ${t('dashboard.form.error.required_field')}`;
    } else {
      // Validate based on login type
      if (createFormData.login_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.login)) {
        newErrors.login = t('dashboard.form.error.invalid_email');
      } else if (createFormData.login_type === 'national_id' && createFormData.login.trim().length < 10) {
        newErrors.login = t('dashboard.form.error.national_id_length');
      } else if (createFormData.login_type === 'phone' && (createFormData.login.replace(/\D/g, '').length < 10 || createFormData.login.replace(/\D/g, '').length > 20)) {
        newErrors.login = t('dashboard.form.error.phone_length');
      }
    }
    
    // Password is REQUIRED
    if (!createFormData.password.trim()) {
      newErrors.password = `${t('password')} ${t('dashboard.form.error.required_field')}`;
    } else if (createFormData.password.length < 6) {
      newErrors.password = t('admin.users.password_min_length');
    }

    // Validate IBAN if provided (KSA format: SA + 24 digits = 26 characters)
    if (createFormData.iban && createFormData.iban.trim()) {
      const ibanValue = createFormData.iban.trim().toUpperCase();
      // Remove spaces if user added them
      const cleanIban = ibanValue.replace(/\s/g, '');
      if (!/^SA\d{24}$/.test(cleanIban)) {
        newErrors.iban = t('admin.users.invalid_iban') || 'IBAN must start with SA followed by 24 digits (e.g., SA123456789012345678901234)';
      }
    }

    // Validate max_contracts_allowed if provided
    if (createFormData.max_contracts_allowed && createFormData.max_contracts_allowed.trim()) {
      const maxContracts = parseInt(createFormData.max_contracts_allowed);
      if (isNaN(maxContracts) || maxContracts < 1) {
        newErrors.max_contracts_allowed = t('admin.users.invalid_max_contracts');
      }
    }

    setCreateErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!validateCreateForm()) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: t('dashboard.form.error.required_field'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
      return;
    }

    setCreateLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Prepare data based on login type
      const userData = {
        password: createFormData.password,
        is_active: createFormData.is_active
      };
      
      // Add optional first_name and family_name if provided
      if (createFormData.first_name.trim()) {
        userData.first_name = createFormData.first_name.trim();
      }
      if (createFormData.family_name.trim()) {
        userData.family_name = createFormData.family_name.trim();
      }
      
      // Add IBAN if provided (clean and validate format)
      if (createFormData.iban && createFormData.iban.trim()) {
        const ibanValue = createFormData.iban.trim().toUpperCase().replace(/\s/g, '');
        userData.iban = ibanValue;
      }
      
      // Add max_contracts_allowed if provided (convert to integer or null)
      if (createFormData.max_contracts_allowed && createFormData.max_contracts_allowed.trim()) {
        const maxContracts = parseInt(createFormData.max_contracts_allowed);
        if (!isNaN(maxContracts) && maxContracts > 0) {
          userData.max_contracts_allowed = maxContracts;
        }
      } else {
        userData.max_contracts_allowed = null; // NULL = unlimited
      }
      
      // Add login credential based on selected type (REQUIRED - at least one)
      if (createFormData.login_type === 'email') {
        userData.email = createFormData.login.trim();
      } else if (createFormData.login_type === 'phone') {
        userData.phone = createFormData.login.replace(/\D/g, ''); // Remove non-digits
      } else if (createFormData.login_type === 'national_id') {
        userData.national_id = createFormData.login.trim();
      }
      
      // Add send_email parameter if checkbox is checked and user has email
      if (sendEmail && createFormData.login_type === 'email' && createFormData.login.trim()) {
        userData.send_email = true;
      }
      
      let response;
      try {
        response = await axios.post(adminUsersBase, userData, { headers });
      } catch (primaryError) {
        // Backward compatibility with older backend route layout.
        response = await axios.post(legacyAdminUsersBase, userData, { headers });
      }

      if (response.data.success) {
        // Show different message if email was sent
        const successMessage = sendEmail && createFormData.login_type === 'email' && createFormData.login.trim()
          ? (response.data.message || t('admin.success.user_created_with_email') || 'تم إنشاء الحساب وإرسال بيانات تسجيل الدخول عبر البريد الإلكتروني')
          : (response.data.message || t('admin.success.user_created'));
        
        Store.addNotification({
          title: t('admin.success.title'),
          message: successMessage,
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        
        // Reset form and close modal
        setCreateFormData({
          first_name: '',
          family_name: '',
          login: '',
          login_type: 'email',
          password: '',
          iban: '',
          max_contracts_allowed: '',
          is_active: true
        });
        setSendEmail(false);
        setShowCreateModal(false);
        setCreateErrors({});
        
        // Refresh users list
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      const isUnauthenticated = error.response?.status === 401;
      const errorMessage = isUnauthenticated
        ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
        : (error.response?.data?.message || error.message || t('admin.error.create_user'));
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.code) {
            apiErrors[err.code] = err.message;
          }
        });
        setCreateErrors(apiErrors);
      }
      
      Store.addNotification({
        title: t('admin.error.title'),
        message: errorMessage,
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (nationalId, currentStatus) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.put(
        `${API_BASE_URL}/portallogistice/admin/users/${nationalId}/status`,
        { is_active: !currentStatus },
        { headers }
      );

      if (response.data.success) {
        Store.addNotification({
          title: t('admin.success.title'),
          message: response.data.message || t('admin.success.user_updated'),
          type: 'success',
          insert: 'top',
          container: 'top-right',
          dismiss: { duration: 3000, onScreen: true }
        });
        fetchUsers();
      }
    } catch (error) {
      Store.addNotification({
        title: t('admin.error.title'),
        message: error.response?.data?.message || t('admin.error.update_user'),
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        dismiss: { duration: 5000, onScreen: true }
      });
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-loading">
        <Watch height="60" width="60" radius="9" color="#073491" ariaLabel="loading" />
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h2>{t('admin.users.title')}</h2>
        <div className="filters">
          <input
            type="text"
            placeholder={t('admin.users.search_placeholder')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('admin.users.filter.all')}</option>
            <option value="active">{t('admin.users.filter.active')}</option>
            <option value="inactive">{t('admin.users.filter.inactive')}</option>
          </select>
          <button
            className="create-btn primary-btn"
            onClick={() => {
              setShowCreateModal(true);
              setSendEmail(false); // Reset email checkbox when opening modal
            }}
          >
            {t('admin.users.create')}
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <p>{t('admin.users.empty')}</p>
        </div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('dashboard.profile.full_name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('phone_number')}</th>
                  <th>{t('national_id')}</th>
                  <th>{t('admin.users.contract_count')}</th>
                  <th>{t('admin.users.status')}</th>
                  <th>{t('admin.users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.national_id}>
                    <td>{user.full_name || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.national_id || '-'}</td>
                    <td>{user.contract_count || 0}</td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                        {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewUser(user.national_id)}
                          title={t('admin.users.view')}
                        >
                          {t('admin.users.view')}
                        </button>
                        <button
                          className={`action-btn ${user.is_active ? 'deactivate-btn' : 'activate-btn'}`}
                          onClick={() => handleToggleStatus(user.national_id, user.is_active)}
                          title={user.is_active ? t('admin.users.deactivate') : t('admin.users.activate')}
                        >
                          {user.is_active ? t('admin.users.deactivate') : t('admin.users.activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.last_page > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                {t('admin.pagination.previous')}
              </button>
              <span className="page-info">
                {t('admin.pagination.page')} {currentPage} {t('admin.pagination.of')} {pagination.last_page}
              </span>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                disabled={currentPage === pagination.last_page}
              >
                {t('admin.pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.users.user_details')}</h2>
              <button className="close-btn" onClick={() => setShowUserModal(false)}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <h3>{t('admin.users.user_info')}</h3>
                <div className="details-grid">
                  <div><strong>{t('dashboard.profile.full_name')}:</strong> {selectedUser.user?.full_name}</div>
                  <div><strong>{t('email')}:</strong> {selectedUser.user?.email}</div>
                  <div><strong>{t('phone_number')}:</strong> {selectedUser.user?.phone}</div>
                  <div><strong>{t('national_id')}:</strong> {selectedUser.user?.national_id}</div>
                  <div><strong>{t('birth_date')}:</strong> {selectedUser.user?.birth_date}</div>
                  <div><strong>{t('region')}:</strong> {selectedUser.user?.region}</div>
                  <div><strong>{t('bank_name')}:</strong> {selectedUser.user?.bank_name}</div>
                  <div><strong>{t('iban')}:</strong> {selectedUser.user?.iban ? (selectedUser.user.iban.startsWith('SA') ? selectedUser.user.iban : 'SA' + selectedUser.user.iban) : '-'}</div>
                  <div><strong>{t('admin.users.max_contracts_allowed')}:</strong> 
                    {selectedUser.user?.max_contracts_allowed !== null && selectedUser.user?.max_contracts_allowed !== undefined 
                      ? selectedUser.user.max_contracts_allowed 
                      : t('admin.users.unlimited')}
                    {selectedUser.user?.max_contracts_allowed !== null && selectedUser.user?.max_contracts_allowed !== undefined && (
                      <span className="contract-limit-info">
                        {' '}({selectedUser.total_contracts || 0} / {selectedUser.user.max_contracts_allowed})
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <button
                    className="edit-btn primary-btn"
                    onClick={() => handleEditUser(selectedUser)}
                  >
                    {t('admin.users.edit')}
                  </button>
                </div>

                <h3 style={{ marginTop: '30px' }}>{t('admin.users.contracts')} ({selectedUser.total_contracts || 0})</h3>
                {selectedUser.contracts && selectedUser.contracts.length > 0 ? (
                  <div className="contracts-list">
                    {selectedUser.contracts.map((contract) => (
                      <div key={contract.id} className="contract-item">
                        <div><strong>{t('dashboard.contract.type')}:</strong> {contract.contract_type_ar || contract.contract_type}</div>
                        <div><strong>{t('dashboard.contract.status')}:</strong> 
                          <span className={`status-badge status-${contract.status}`}>
                            {contract.status_ar || contract.status}
                          </span>
                        </div>
                        <div><strong>{t('dashboard.contract.amount')}:</strong> {contract.amount} {t('dashboard.currency')}</div>
                        {contract.contract_download_url && (
                          <button
                            className="download-btn site-btn"
                            onClick={() => window.open(contract.contract_download_url, '_blank')}
                          >
                            {t('download')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{t('admin.users.no_contracts')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setSendEmail(false);
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.users.create')}</h2>
              <button className="close-btn" onClick={() => {
                setShowCreateModal(false);
                setSendEmail(false);
              }}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateUser} className="create-user-form">
                <p className="form-info">{t('admin.users.create_info')}</p>
                
                {/* Basic Information */}
                <div className="form-section">
                  <h3>{t('admin.users.basic_info')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('first_name')}</label>
                      <input
                        type="text"
                        value={createFormData.first_name}
                        onChange={(e) => handleCreateFormChange('first_name', e.target.value)}
                        className={createErrors.first_name ? 'input-error' : ''}
                        placeholder={t('first_name_placeholder')}
                      />
                      {createErrors.first_name && <p className="error-message">{createErrors.first_name}</p>}
                      <small className="form-hint">{t('admin.users.optional_field')}</small>
                    </div>
                    <div className="form-group">
                      <label>{t('family_name')}</label>
                      <input
                        type="text"
                        value={createFormData.family_name}
                        onChange={(e) => handleCreateFormChange('family_name', e.target.value)}
                        className={createErrors.family_name ? 'input-error' : ''}
                        placeholder={t('last_name_placeholder')}
                      />
                      {createErrors.family_name && <p className="error-message">{createErrors.family_name}</p>}
                      <small className="form-hint">{t('admin.users.optional_field')}</small>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="form-section">
                  <h3>{t('admin.users.login_credentials')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('admin.users.login_type')} *</label>
                      <select
                        value={createFormData.login_type}
                        onChange={(e) => {
                          handleCreateFormChange('login_type', e.target.value);
                          handleCreateFormChange('login', ''); // Clear login field when type changes
                          setSendEmail(false); // Reset email checkbox when login type changes
                        }}
                        className={createErrors.login_type ? 'input-error' : ''}
                      >
                        <option value="email">{t('email')}</option>
                        <option value="phone">{t('phone_number')}</option>
                        <option value="national_id">{t('national_id')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('admin.users.login_credential')} *</label>
                      {createFormData.login_type === 'phone' ? (
                        <PhoneInput
                          defaultCountry="sa"
                          value={createFormData.login}
                          onChange={(phone) => handleCreateFormChange('login', phone)}
                          className={createErrors.login ? 'phone-input-error' : ''}
                          inputStyle={{
                            width: '100%',
                            padding: '12px',
                            border: createErrors.login ? '1px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontFamily: '"Cairo", sans-serif'
                          }}
                          countrySelectorStyleProps={{
                            buttonStyle: {
                              padding: '12px',
                              border: createErrors.login ? '1px solid #dc3545' : '1px solid #ddd',
                              borderRadius: '6px 0 0 6px',
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                        />
                      ) : (
                        <input
                          type={createFormData.login_type === 'email' ? 'email' : 'text'}
                          value={createFormData.login}
                          onChange={(e) => handleCreateFormChange('login', e.target.value)}
                          className={createErrors.login ? 'input-error' : ''}
                          placeholder={
                            createFormData.login_type === 'email' 
                              ? t('email_placeholder')
                              : createFormData.login_type === 'national_id'
                              ? t('admin.users.national_id_placeholder')
                              : ''
                          }
                          minLength={createFormData.login_type === 'national_id' ? 10 : undefined}
                          required
                        />
                      )}
                      {createErrors.login && <p className="error-message">{createErrors.login}</p>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('password')} *</label>
                      <input
                        type="password"
                        value={createFormData.password}
                        onChange={(e) => handleCreateFormChange('password', e.target.value)}
                        className={createErrors.password ? 'input-error' : ''}
                        placeholder={t('admin.users.password_placeholder')}
                        minLength="6"
                        required
                      />
                      {createErrors.password && <p className="error-message">{createErrors.password}</p>}
                      <small className="form-hint">{t('admin.users.password_hint')}</small>
                    </div>
                    <div className="form-group">
                      <label>{t('admin.users.max_contracts_allowed')}</label>
                      <input
                        type="number"
                        value={createFormData.max_contracts_allowed}
                        onChange={(e) => handleCreateFormChange('max_contracts_allowed', e.target.value)}
                        className={createErrors.max_contracts_allowed ? 'input-error' : ''}
                        placeholder={t('admin.users.max_contracts_placeholder')}
                        min="1"
                      />
                      {createErrors.max_contracts_allowed && <p className="error-message">{createErrors.max_contracts_allowed}</p>}
                      <small className="form-hint">{t('admin.users.max_contracts_hint')}</small>
                    </div>
                  </div>
                  {/* Send Email Checkbox - Only show if login type is email */}
                  {createFormData.login_type === 'email' && (
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          disabled={!createFormData.login.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.login.trim())}
                          style={{ marginLeft: '8px', cursor: 'pointer' }}
                        />
                        <span>
                          {t('admin.users.send_email_credentials') || 'إرسال بيانات تسجيل الدخول عبر البريد الإلكتروني'}
                          {' / '}
                          {t('admin.users.send_email_credentials_en') || 'Send login credentials via email'}
                        </span>
                      </label>
                      {(!createFormData.login.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.login.trim())) && (
                        <small style={{ color: '#999', display: 'block', marginTop: '5px', marginRight: '28px' }}>
                          {t('admin.users.email_required_for_send') || 'يجب إدخال البريد الإلكتروني لإرسال بيانات تسجيل الدخول / Email is required to send login credentials'}
                        </small>
                      )}
                    </div>
                  )}
                </div>

                {/* Banking Information */}
                <div className="form-section">
                  <h3>{t('admin.users.banking_info')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('iban')}</label>
                      <input
                        type="text"
                        value={createFormData.iban}
                        onChange={(e) => {
                          // Auto-uppercase and allow only SA + digits
                          let value = e.target.value.toUpperCase().replace(/[^SA0-9]/g, '');
                          // Ensure it starts with SA
                          if (value && !value.startsWith('SA')) {
                            if (value.startsWith('S')) {
                              value = 'SA' + value.substring(1).replace(/[^0-9]/g, '');
                            } else {
                              value = 'SA' + value.replace(/[^0-9]/g, '');
                            }
                          }
                          // Limit to 26 characters (SA + 24 digits)
                          if (value.length > 26) {
                            value = value.substring(0, 26);
                          }
                          handleCreateFormChange('iban', value);
                        }}
                        className={createErrors.iban ? 'input-error' : ''}
                        placeholder="SA123456789012345678901234"
                        maxLength={26}
                      />
                      {createErrors.iban && <p className="error-message">{createErrors.iban}</p>}
                      <small className="form-hint">{t('admin.users.iban_hint') || 'IBAN format: SA followed by 24 digits (e.g., SA123456789012345678901234)'}</small>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="form-section">
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createFormData.is_active}
                        onChange={(e) => handleCreateFormChange('is_active', e.target.checked)}
                      />
                      {' '}{t('admin.users.active')}
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn primary-btn" disabled={createLoading}>
                    {createLoading ? t('dashboard.form.submitting') : t('admin.users.create')}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => {
                    setShowCreateModal(false);
                    setSendEmail(false);
                  }} disabled={createLoading}>
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.users.edit')}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                {t('close')}
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateUser} className="create-user-form">
                <p className="form-info">{t('admin.users.edit_info')}</p>
                
                {/* Basic Information */}
                <div className="form-section">
                  <h3>{t('admin.users.basic_info')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('first_name')}</label>
                      <input
                        type="text"
                        value={editFormData.first_name}
                        onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                        className={editErrors.first_name ? 'input-error' : ''}
                        placeholder={t('first_name_placeholder')}
                      />
                      {editErrors.first_name && <p className="error-message">{editErrors.first_name}</p>}
                    </div>
                    <div className="form-group">
                      <label>{t('family_name')}</label>
                      <input
                        type="text"
                        value={editFormData.family_name}
                        onChange={(e) => handleEditFormChange('family_name', e.target.value)}
                        className={editErrors.family_name ? 'input-error' : ''}
                        placeholder={t('last_name_placeholder')}
                      />
                      {editErrors.family_name && <p className="error-message">{editErrors.family_name}</p>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('father_name')}</label>
                      <input
                        type="text"
                        value={editFormData.father_name}
                        onChange={(e) => handleEditFormChange('father_name', e.target.value)}
                        className={editErrors.father_name ? 'input-error' : ''}
                      />
                      {editErrors.father_name && <p className="error-message">{editErrors.father_name}</p>}
                    </div>
                    <div className="form-group">
                      <label>{t('grandfather_name')}</label>
                      <input
                        type="text"
                        value={editFormData.grandfather_name}
                        onChange={(e) => handleEditFormChange('grandfather_name', e.target.value)}
                        className={editErrors.grandfather_name ? 'input-error' : ''}
                      />
                      {editErrors.grandfather_name && <p className="error-message">{editErrors.grandfather_name}</p>}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                  <h3>{t('admin.users.contact_info')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('email')}</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        className={editErrors.email ? 'input-error' : ''}
                        placeholder={t('email_placeholder')}
                      />
                      {editErrors.email && <p className="error-message">{editErrors.email}</p>}
                    </div>
                    <div className="form-group">
                      <label>{t('phone_number')}</label>
                      <PhoneInput
                        defaultCountry="sa"
                        value={editFormData.phone}
                        onChange={(phone) => handleEditFormChange('phone', phone)}
                        className={editErrors.phone ? 'phone-input-error' : ''}
                        inputStyle={{
                          width: '100%',
                          padding: '12px',
                          border: editErrors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontFamily: '"Cairo", sans-serif'
                        }}
                        countrySelectorStyleProps={{
                          buttonStyle: {
                            padding: '12px',
                            border: editErrors.phone ? '1px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '6px 0 0 6px',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      />
                      {editErrors.phone && <p className="error-message">{editErrors.phone}</p>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('birth_date')}</label>
                      <input
                        type="date"
                        value={editFormData.birth_date}
                        onChange={(e) => handleEditFormChange('birth_date', e.target.value)}
                        className={editErrors.birth_date ? 'input-error' : ''}
                      />
                      {editErrors.birth_date && <p className="error-message">{editErrors.birth_date}</p>}
                    </div>
                    <div className="form-group">
                      <label>{t('region')}</label>
                      <input
                        type="text"
                        value={editFormData.region}
                        onChange={(e) => handleEditFormChange('region', e.target.value)}
                        className={editErrors.region ? 'input-error' : ''}
                      />
                      {editErrors.region && <p className="error-message">{editErrors.region}</p>}
                    </div>
                  </div>
                </div>

                {/* Banking Information */}
                <div className="form-section">
                  <h3>{t('admin.users.banking_info')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('bank_name')}</label>
                      <input
                        type="text"
                        value={editFormData.bank_name}
                        onChange={(e) => handleEditFormChange('bank_name', e.target.value)}
                        className={editErrors.bank_name ? 'input-error' : ''}
                      />
                      {editErrors.bank_name && <p className="error-message">{editErrors.bank_name}</p>}
                    </div>
                    <div className="form-group">
                      <label>{t('iban')}</label>
                      <input
                        type="text"
                        value={editFormData.iban}
                        onChange={(e) => handleEditFormChange('iban', e.target.value)}
                        className={editErrors.iban ? 'input-error' : ''}
                      />
                      {editErrors.iban && <p className="error-message">{editErrors.iban}</p>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('national_address_email')}</label>
                      <input
                        type="email"
                        value={editFormData.national_address_email}
                        onChange={(e) => handleEditFormChange('national_address_email', e.target.value)}
                        className={editErrors.national_address_email ? 'input-error' : ''}
                      />
                      {editErrors.national_address_email && <p className="error-message">{editErrors.national_address_email}</p>}
                    </div>
                  </div>
                </div>

                {/* Contract Limit */}
                <div className="form-section">
                  <h3>{t('admin.users.contract_settings')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('admin.users.max_contracts_allowed')}</label>
                      <input
                        type="number"
                        value={editFormData.max_contracts_allowed}
                        onChange={(e) => handleEditFormChange('max_contracts_allowed', e.target.value)}
                        className={editErrors.max_contracts_allowed ? 'input-error' : ''}
                        placeholder={t('admin.users.max_contracts_placeholder')}
                        min="0"
                      />
                      {editErrors.max_contracts_allowed && <p className="error-message">{editErrors.max_contracts_allowed}</p>}
                      <small className="form-hint">{t('admin.users.max_contracts_hint')}</small>
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={editFormData.is_active}
                          onChange={(e) => handleEditFormChange('is_active', e.target.checked)}
                        />
                        {' '}{t('admin.users.active')}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn primary-btn" disabled={editLoading}>
                    {editLoading ? t('dashboard.form.submitting') : t('admin.users.update')}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={editLoading}>
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
