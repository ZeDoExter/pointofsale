import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, sessionAPI } from '../services/api';

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' },
  nav: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: {
    width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)',
    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px',
  },
  logoText: { color: 'white', fontSize: '18px', fontWeight: 700 },
  logoSub: { color: 'rgba(255,255,255,0.7)', fontSize: '12px' },
  btnLogout: {
    padding: '8px 16px', background: 'rgba(255,255,255,0.2)', color: 'white',
    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  main: { flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 350px', gap: '0', overflow: 'hidden' },
  sidebar: { background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid #e2e8f0' },
  sidebarTitle: { fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' },
  sessionList: { flex: 1, overflow: 'auto', padding: '8px' },
  sessionItem: {
    padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px',
    cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s',
  },
  sessionActive: { borderColor: '#10b981', background: '#ecfdf5' },
  sessionTable: { fontWeight: 700, fontSize: '16px', color: '#1e293b' },
  sessionMeta: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  center: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  orderHeader: { padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' },
  orderTitle: { fontSize: '18px', fontWeight: 700, color: '#1e293b' },
  orderList: { flex: 1, overflow: 'auto', padding: '16px 20px' },
  orderCard: {
    background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0',
  },
  orderCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  orderCardId: { fontSize: '13px', color: '#64748b' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' },
  itemName: { fontSize: '14px', color: '#1e293b' },
  itemPrice: { fontSize: '14px', fontWeight: 600, color: '#1e293b' },
  orderTotal: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #e2e8f0', marginTop: '8px' },
  totalLabel: { fontWeight: 700, color: '#1e293b' },
  totalAmount: { fontWeight: 800, fontSize: '18px', color: '#10b981' },
  actionBtns: { display: 'flex', gap: '8px', marginTop: '12px' },
  btnConfirm: {
    flex: 1, padding: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  btnPaid: {
    flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  btnCancel: {
    padding: '10px', background: '#fee2e2', color: '#dc2626',
    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  rightPanel: { background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  panelHeader: { padding: '16px', borderBottom: '1px solid #e2e8f0' },
  panelTitle: { fontSize: '14px', fontWeight: 700, color: '#1e293b' },
  panelContent: { flex: 1, overflow: 'auto', padding: '16px' },
  input: {
    width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
  },
  btnPrimary: {
    width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  btnSecondary: {
    width: '100%', padding: '12px', background: '#f1f5f9', color: '#475569',
    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', marginTop: '8px',
  },
  qrBox: {
    background: '#f8fafc', borderRadius: '12px', padding: '16px', textAlign: 'center', marginTop: '16px',
  },
  qrLabel: { fontSize: '12px', color: '#64748b', marginBottom: '8px' },
  qrLink: { fontSize: '11px', color: '#3b82f6', wordBreak: 'break-all' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' },
  statBox: { background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' },
  statNum: { fontSize: '20px', fontWeight: 800 },
  statLabel: { fontSize: '11px', color: '#64748b' },
};

export default function CashierDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const userName = localStorage.getItem('name') || 'Cashier';
  const branchName = localStorage.getItem('branch_name') || 'Branch';

  useEffect(() => {
    loadSessions();
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.list({ status: 'OPEN' });
      const list = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(list);
      if (list.length > 0 && !activeSession) {
        setActiveSession(list[0]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await orderAPI.list();
      const list = Array.isArray(data?.orders) ? data.orders : [];
      setOrders(list);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const createSession = async () => {
    const num = parseInt(tableNumber);
    if (!num || num <= 0) {
      alert('Please enter a valid table number');
      return;
    }
    setLoading(true);
    try {
      const { data } = await sessionAPI.create(num);
      setSessions(prev => [data, ...prev]);
      setActiveSession(data);
      setTableNumber('');
    } catch (err) {
      alert('Failed to create session');
    }
    setLoading(false);
  };

  const closeSession = async (sessionId) => {
    if (!window.confirm('Close this table session?')) return;
    try {
      await sessionAPI.close(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(sessions.find(s => s.id !== sessionId) || null);
      }
    } catch (err) {
      alert('Failed to close session');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      loadOrders();
    } catch (err) {
      alert('Failed to update order');
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

  const getSessionLink = (session) => {
    if (!session) return '';
    const base = window.location.origin;
    const params = new URLSearchParams({ session: session.token, table: session.table_number });
    return `${base}/user?${params.toString()}`;
  };

  const sessionOrders = activeSession
    ? orders.filter(o => o.qr_session_token === activeSession.token || o.table_id === String(activeSession.table_number))
    : orders;

  const todayRevenue = orders
    .filter(o => o.status === 'PAID')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const pendingCount = orders.filter(o => ['OPEN', 'CONFIRMED', 'PREPARING'].includes(o.status)).length;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>💰</div>
          <div>
            <div style={styles.logoText}>Cashier POS</div>
            <div style={styles.logoSub}>{userName} • {branchName}</div>
          </div>
        </div>
        <button style={styles.btnLogout} onClick={handleLogout}>Logout</button>
      </nav>

      <div style={styles.main}>
        {/* Left: Sessions */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarTitle}>📋 Table Sessions</div>
            <input
              type="number"
              placeholder="Table number..."
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSession()}
              style={styles.input}
            />
            <button onClick={createSession} style={styles.btnPrimary} disabled={loading}>
              + Open Table
            </button>
          </div>
          <div style={styles.sessionList}>
            {sessions.length === 0 ? (
              <div style={styles.emptyState}>No open tables</div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  style={{ ...styles.sessionItem, ...(activeSession?.id === s.id ? styles.sessionActive : {}) }}
                  onClick={() => setActiveSession(s)}
                >
                  <div style={styles.sessionTable}>🍽️ Table {s.table_number}</div>
                  <div style={styles.sessionMeta}>
                    {new Date(s.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Orders */}
        <div style={styles.center}>
          <div style={styles.orderHeader}>
            <div style={styles.orderTitle}>
              {activeSession ? `Table ${activeSession.table_number} Orders` : 'All Orders'}
            </div>
          </div>
          <div style={styles.orderList}>
            {sessionOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
                <p>No orders yet</p>
              </div>
            ) : (
              sessionOrders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderCardHeader}>
                    <span style={styles.orderCardId}>#{order.id?.slice(0, 8)}</span>
                    <span style={{ ...styles.badge, background: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                      {order.status}
                    </span>
                  </div>
                  
                  {Array.isArray(order.items) && order.items.map((item, i) => (
                    <div key={i} style={styles.itemRow}>
                      <span style={styles.itemName}>{item.quantity}x {item.item_name || item.name}</span>
                      <span style={styles.itemPrice}>฿{Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  ))}

                  <div style={styles.orderTotal}>
                    <span style={styles.totalLabel}>Total</span>
                    <span style={styles.totalAmount}>฿{Number(order.total_amount || 0).toLocaleString()}</span>
                  </div>

                  {order.status !== 'PAID' && order.status !== 'CANCELLED' && (
                    <div style={styles.actionBtns}>
                      {order.status === 'OPEN' && (
                        <button style={styles.btnConfirm} onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}>
                          ✓ Confirm
                        </button>
                      )}
                      {(order.status === 'CONFIRMED' || order.status === 'READY') && (
                        <button style={styles.btnPaid} onClick={() => updateOrderStatus(order.id, 'PAID')}>
                          💵 Mark Paid
                        </button>
                      )}
                      <button style={styles.btnCancel} onClick={() => updateOrderStatus(order.id, 'CANCELLED')}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>📊 Quick Stats</div>
          </div>
          <div style={styles.panelContent}>
            <div style={styles.stats}>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNum, color: '#10b981' }}>฿{todayRevenue.toLocaleString()}</div>
                <div style={styles.statLabel}>Today Revenue</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNum, color: '#f59e0b' }}>{pendingCount}</div>
                <div style={styles.statLabel}>Pending</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNum, color: '#3b82f6' }}>{sessions.length}</div>
                <div style={styles.statLabel}>Open Tables</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNum, color: '#8b5cf6' }}>{orders.length}</div>
                <div style={styles.statLabel}>Total Orders</div>
              </div>
            </div>

            {activeSession && (
              <>
                <div style={styles.qrBox}>
                  <div style={styles.qrLabel}>Customer QR Link for Table {activeSession.table_number}</div>
                  <div style={styles.qrLink}>{getSessionLink(activeSession)}</div>
                  <button
                    style={{ ...styles.btnSecondary, marginTop: '12px' }}
                    onClick={() => navigator.clipboard.writeText(getSessionLink(activeSession))}
                  >
                    📋 Copy Link
                  </button>
                </div>

                <button
                  style={{ ...styles.btnSecondary, background: '#fee2e2', color: '#dc2626', marginTop: '16px' }}
                  onClick={() => closeSession(activeSession.id)}
                >
                  Close Table {activeSession.table_number}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
