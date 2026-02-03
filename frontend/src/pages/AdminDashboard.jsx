import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import OrderList from '../components/admin/OrderList';
import CreateOrder from '../components/admin/CreateOrder';
import OrderDetail from '../components/admin/OrderDetail';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ orders: 0, revenue: 0, active: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    } else {
      const name = localStorage.getItem('name');
      const role = localStorage.getItem('role');
      const orgName = localStorage.getItem('organization_name');

      setUser({ role, name, orgName });
      fetchStats();
    }
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      const orders = Array.isArray(data) ? data : (data.orders || []);
			
      setStats({
        orders: orders.length,
        revenue: orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + o.total_amount, 0),
        active: orders.filter(o => o.status === 'OPEN' || o.status === 'CONFIRMED').length
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('username');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('branch_name');
    navigate('/admin/login');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <header style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>⚙️ Admin Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#9ca3af' }}>
            {user.name} {user.orgName && `• ${user.orgName}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{
            padding: '8px 16px',
            backgroundColor: user.role === 'ADMIN' ? '#10b981' : '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            {user.role}
          </span>
          <button
            onClick={() => navigate('/kitchen')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🍳 Kitchen
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '6px solid #3b82f6'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Orders</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {stats.orders}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '6px solid #10b981'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Revenue</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              ฿{stats.revenue.toFixed(2)}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '6px solid #fbbf24'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Active Orders</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          backgroundColor: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '15px'
        }}>
          <Link
            to="/admin"
            style={{
              padding: '10px 20px',
              textDecoration: 'none',
              color: '#3b82f6',
              fontWeight: 'bold',
              borderRadius: '6px',
              backgroundColor: '#eff6ff'
            }}
          >
            📋 Orders
          </Link>
          <Link
            to="/admin/create"
            style={{
              padding: '10px 20px',
              textDecoration: 'none',
              color: '#10b981',
              fontWeight: 'bold',
              borderRadius: '6px',
              backgroundColor: '#d1fae5'
            }}
          >
            ➕ New Order
          </Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route index element={<OrderList />} />
          <Route path="create" element={<CreateOrder />} />
          <Route path="order/:orderId" element={<OrderDetail />} />
        </Routes>
      </div>
    </div>
  );
}
