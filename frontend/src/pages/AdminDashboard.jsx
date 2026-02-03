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
      if (role !== 'admin' && role !== 'manager') {
        alert('Access denied. This area is for admin/manager only.');
        navigate('/admin/login');
        return;
      }
      setUser({ role });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/admin/login');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h1>POS Admin Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px', padding: '5px 10px', backgroundColor: user.role === 'admin' ? '#28a745' : '#007bff', color: 'white', borderRadius: '5px' }}>
            Role: {user.role.toUpperCase()}
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav style={{ marginBottom: '20px' }}>
        <Link to="/admin" style={{ marginRight: '15px' }}>Orders</Link>
        <Link to="/admin/create">New Order</Link>
      </nav>

      <Routes>
        <Route index element={<OrderList />} />
        <Route path="create" element={<CreateOrder />} />
        <Route path="order/:orderId" element={<OrderDetail />} />
      </Routes>
    </div>
  );
}
