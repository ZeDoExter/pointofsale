import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9' },
  nav: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: {
    width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
  },
  logoText: { color: 'white', fontSize: '20px', fontWeight: 700 },
  logoSub: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  branchSelect: {
    padding: '10px 16px', borderRadius: '10px', border: 'none',
    background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: 500,
  },
  btnLogout: {
    padding: '10px 20px', background: 'rgba(239,68,68,0.9)', color: 'white',
    border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '24px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: {
    padding: '12px 20px', background: 'white', border: '2px solid #e2e8f0',
    borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: { background: '#1e3a5f', color: 'white', borderColor: '#1e3a5f' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  card: {
    background: 'white', borderRadius: '16px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  stat: { textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px' },
  statNum: { fontSize: '32px', fontWeight: 800 },
  statLabel: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white',
  },
  btnPrimary: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
  },
  btnDanger: {
    padding: '8px 14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '10px',
  },
  message: { padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500 },
  msgSuccess: { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' },
  msgError: { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 600 },
  td: { padding: '14px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 },
  formGrid: { display: 'grid', gap: '12px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Data
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Forms
  const [cashierForm, setCashierForm] = useState({ username: '', name: '', password: '', branch_id: '' });

  const userName = localStorage.getItem('name') || 'Manager';
  const orgName = localStorage.getItem('organization_name') || 'Organization';

  useEffect(() => {
    loadBranches();
    loadCashiers();
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadCashiers(selectedBranch);
    } else {
      loadCashiers();
    }
  }, [selectedBranch]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const loadBranches = async () => {
    try {
      const { data } = await api.get('/api/manager/branches');
      const list = Array.isArray(data?.branches) ? data.branches : [];
      setBranches(list);
      // Auto-select first branch if only one
      if (list.length === 1) {
        setSelectedBranch(list[0].id);
        setCashierForm(prev => ({ ...prev, branch_id: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadCashiers = async (branchId) => {
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const { data } = await api.get('/api/users/cashiers', { params });
      const list = Array.isArray(data?.cashiers) ? data.cashiers : [];
      setCashiers(list);
    } catch (err) {
      console.error('Failed to load cashiers:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await api.get('/api/orders');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
      setOrders(list.slice(0, 20)); // Show last 20
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    const branchId = cashierForm.branch_id || (branches.length === 1 ? branches[0].id : '');
    if (!branchId) {
      showMsg('Please select a branch', 'error');
      return;
    }
    try {
      await api.post('/api/users/cashiers', { ...cashierForm, branch_id: branchId });
      setCashierForm({ username: '', name: '', password: '', branch_id: branches.length === 1 ? branches[0].id : '' });
      loadCashiers(selectedBranch);
      showMsg('✓ Cashier created!');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create cashier';
      showMsg(errMsg === 'username_taken' ? 'Username already taken' : errMsg, 'error');
    }
  };

  const handleDeleteCashier = async (id) => {
    if (!window.confirm('Delete this cashier?')) return;
    try {
      await api.delete('/api/users/cashiers/' + id);
      loadCashiers(selectedBranch);
      showMsg('✓ Cashier deleted');
    } catch {
      showMsg('Failed to delete', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#f59e0b', 'CONFIRMED': '#3b82f6', 'PREPARING': '#8b5cf6',
      'READY': '#10b981', 'PAID': '#06b6d4', 'CANCELLED': '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  const todayOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(o.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders
    .filter(o => o.status === 'PAID')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const showBranchSelector = branches.length > 1;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>📊</div>
          <div>
            <div style={styles.logoText}>Manager Dashboard</div>
            <div style={styles.logoSub}>{userName} • {orgName}</div>
          </div>
        </div>
        <div style={styles.navRight}>
          {showBranchSelector && (
            <select
              style={styles.branchSelect}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button style={styles.btnLogout} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.container}>
        {/* Tabs */}
        <div style={styles.tabs}>
          {['overview', 'orders', 'settings'].map(tab => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📈 Overview'}
              {tab === 'orders' && '📋 Orders'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Message */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'error' ? styles.msgError : styles.msgSuccess) }}>
            {message.text}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📊 Today's Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#3b82f6' }}>{todayOrders.length}</div>
                  <div style={styles.statLabel}>Orders Today</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#10b981' }}>฿{todayRevenue.toLocaleString()}</div>
                  <div style={styles.statLabel}>Revenue Today</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#8b5cf6' }}>{cashiers.length}</div>
                  <div style={styles.statLabel}>Cashiers</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#f59e0b' }}>{branches.length}</div>
                  <div style={styles.statLabel}>Branches</div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>🕐 Recent Orders</div>
              {orders.length === 0 ? (
                <div style={styles.emptyState}>No orders yet</div>
              ) : (
                <ul style={styles.list}>
                  {orders.slice(0, 5).map(o => (
                    <li key={o.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Table {o.table_id || '-'}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          ฿{Number(o.total_amount || 0).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ ...styles.badge, background: getStatusColor(o.status) + '20', color: getStatusColor(o.status) }}>
                        {o.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>👥 Cashiers</div>
              {cashiers.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No cashiers yet</p>
                  <p style={{ fontSize: '13px' }}>Go to Settings to add cashiers</p>
                </div>
              ) : (
                <ul style={styles.list}>
                  {cashiers.slice(0, 5).map(c => (
                    <li key={c.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          @{c.username} {c.branch_name && `• ${c.branch_name}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>📋 All Orders</div>
            {orders.length === 0 ? (
              <div style={styles.emptyState}>No orders yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order ID</th>
                      <th style={styles.th}>Table</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={styles.td}>{o.id?.slice(0, 8)}...</td>
                        <td style={styles.td}>{o.table_id || '-'}</td>
                        <td style={styles.td}>฿{Number(o.total_amount || 0).toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: getStatusColor(o.status) + '20', color: getStatusColor(o.status) }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(o.created_at).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={styles.grid}>
            {/* Create Cashier */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>➕ Add Cashier Account</div>
              <form onSubmit={handleCreateCashier} style={styles.formGrid}>
                <input
                  required
                  placeholder="Username"
                  value={cashierForm.username}
                  onChange={(e) => setCashierForm({ ...cashierForm, username: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  placeholder="Full Name"
                  value={cashierForm.name}
                  onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={cashierForm.password}
                  onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })}
                  style={styles.input}
                />
                {branches.length > 0 && !showBranchSelector && (
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', fontSize: '14px', color: '#64748b' }}>
                    📍 {branches[0].name}
                  </div>
                )}
                {showBranchSelector && (
                  <select
                    required
                    value={cashierForm.branch_id}
                    onChange={(e) => setCashierForm({ ...cashierForm, branch_id: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <button type="submit" style={styles.btnPrimary}>Create Cashier</button>
              </form>
            </div>

            {/* Cashier List */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>👥 Cashier Accounts</div>
              {cashiers.length === 0 ? (
                <div style={styles.emptyState}>No cashiers yet</div>
              ) : (
                <ul style={styles.list}>
                  {cashiers.map(c => (
                    <li key={c.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          @{c.username}
                          {c.branch_name && <span style={{ marginLeft: '8px', color: '#3b82f6' }}>• {c.branch_name}</span>}
                        </div>
                      </div>
                      <button style={styles.btnDanger} onClick={() => handleDeleteCashier(c.id)}>🗑️</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Branches Info */}
            {branches.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>🏢 Your Branches</div>
                <ul style={styles.list}>
                  {branches.map(b => (
                    <li key={b.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {b.city || 'No city'} • {b.slug}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
