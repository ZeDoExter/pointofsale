import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import OrderList from '../components/admin/OrderList';
import CreateOrder from '../components/admin/CreateOrder';
import OrderDetail from '../components/admin/OrderDetail';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token) {
      navigate('/admin/login');
    } else {
      // Check if user has admin or manager role
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        alert('Access denied. This area is for admin/manager only.');
        navigate('/admin/login');
        return;
      }
      
      const name = localStorage.getItem('name');
      const orgName = localStorage.getItem('organization_name');
      
      setUser({ role, name, orgName });
    }
  }, [navigate]);

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
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <div>
          <h1>POS Admin Dashboard</h1>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
            {user.name} {user.orgName && `• ${user.orgName}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ padding: '5px 10px', backgroundColor: user.role === 'ADMIN' ? '#28a745' : '#007bff', color: 'white', borderRadius: '5px' }}>
            {user.role}
          </span>
          <button onClick={handleLogout} style={{ padding: '8px 15px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <nav style={{ marginBottom: '20px' }}>
        <Link to="/admin" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Orders</Link>
        <Link to="/admin/create" style={{ textDecoration: 'none', color: '#007bff' }}>New Order</Link>
      </nav>

      <Routes>
        <Route index element={<OrderList />} />
        <Route path="create" element={<CreateOrder />} />
        <Route path="order/:orderId" element={<OrderDetail />} />
      </Routes>
    </div>
  );
}
