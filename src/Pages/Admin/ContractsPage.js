import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { API_BASE_URL } from '../../config';

const STATUS_LABELS = {
  admin_pending: { text: '⏳ قيد المراجعة', color: '#a16207', bg: '#fef3c7' },
  approved: { text: '✅ مقبول', color: '#065f46', bg: '#d1fae5' },
  rejected: { text: '❌ مرفوض', color: '#991b1b', bg: '#fee2e2' },
  sent: { text: 'تم الإرسال', color: '#1e3a8a', bg: '#dbeafe' },
  nafath_pending: { text: 'بانتظار نفاذ', color: '#7c3aed', bg: '#ede9fe' },
  nafath_approved: { text: 'موثق عبر نفاذ', color: '#166534', bg: '#dcfce7' },
  draft: { text: 'مسودة', color: '#374151', bg: '#f3f4f6' },
};

const TAB_FILTERS = {
  all: () => true,
  pending: (c) => c.status === 'admin_pending' || c.status === 'nafath_approved',
  approved: (c) => c.status === 'approved',
  rejected: (c) => c.status === 'rejected',
};

const AdminContractsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [form, setForm] = useState({
    national_id: '',
    type: 'sale',
    title: '',
    file: null,
  });

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`, {
        headers: getAuthHeaders(),
      });
      setContracts(response.data?.data || []);
    } catch (e) {
      console.error('Failed to fetch contracts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const filteredContracts = useMemo(
    () => contracts.filter(TAB_FILTERS[tab]),
    [contracts, tab]
  );

  const sendContract = async (id) => {
    await axios.post(`${API_BASE_URL}/contracts/${id}/send`, {}, { headers: getAuthHeaders() });
    fetchContracts();
  };

  const approveContract = async (id) => {
    await axios.post(`${API_BASE_URL}/contracts/${id}/admin-approve`, {}, { headers: getAuthHeaders() });
    fetchContracts();
  };

  const rejectContract = async (id) => {
    await axios.post(`${API_BASE_URL}/contracts/${id}/reject`, {}, { headers: getAuthHeaders() });
    fetchContracts();
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('national_id', form.national_id);
    data.append('type', form.type);
    data.append('title', form.title);
    if (form.file) data.append('file', form.file);

    await axios.post(`${API_BASE_URL}/contracts`, data, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    setForm({ national_id: '', type: 'sale', title: '', file: null });
    fetchContracts();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>إدارة العقود</h2>

      <form onSubmit={submitCreate} style={{ display: 'grid', gap: 10, marginBottom: 20, maxWidth: 520 }}>
        <input
          placeholder="الهوية الوطنية للمستخدم"
          value={form.national_id}
          onChange={(e) => setForm((p) => ({ ...p, national_id: e.target.value }))}
          required
        />
        <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
          <option value="sale">عقد مبايعة (sale)</option>
          <option value="rental">عقد استئجار (rental)</option>
        </select>
        <input
          placeholder="عنوان العقد"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <input type="file" accept="application/pdf" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} />
        <button type="submit">إنشاء العقد</button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('all')}>جميع العقود</button>
        <button onClick={() => setTab('pending')}>قيد المراجعة</button>
        <button onClick={() => setTab('approved')}>مقبولة</button>
        <button onClick={() => setTab('rejected')}>مرفوضة</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>النوع</th>
              <th>العنوان</th>
              <th>الحالة</th>
              <th>PDF</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map((contract) => {
              const badge = STATUS_LABELS[contract.status] || { text: contract.status, color: '#111827', bg: '#f3f4f6' };
              return (
                <tr key={contract.id}>
                  <td>{contract.id}</td>
                  <td>{contract.type}</td>
                  <td>{contract.title}</td>
                  <td>
                    <span style={{ background: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: 8 }}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    {contract.file_url ? (
                      <a href={contract.file_url} target="_blank" rel="noreferrer">
                        عرض PDF
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {contract.status === 'draft' && <button onClick={() => sendContract(contract.id)}>إرسال</button>}
                    {(contract.status === 'admin_pending' || contract.status === 'nafath_approved') && (
                      <>
                        <button onClick={() => approveContract(contract.id)}>اعتماد</button>
                        <button onClick={() => rejectContract(contract.id)}>رفض</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminContractsPage;
