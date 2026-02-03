import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CashierDashboard from './pages/CashierDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import KitchenDisplay from './pages/KitchenDisplay';
import UserMenu from './pages/UserMenu';
import UserOrder from './pages/UserOrder';
import './App.css';

const getStoredRole = () => (localStorage.getItem('role') || '').toUpperCase();
const getLandingPath = () => {
  const role = getStoredRole();
  if (role === 'ADMIN') return '/admin';
  if (role === 'MANAGER') return '/manager';
  if (role === 'CASHIER') return '/cashier';
  return '/admin/login';
};

const ProtectedRoute = ({ roles, children }) => {
  const token = localStorage.getItem('token');
  const role = getStoredRole();

  if (!token) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to={getLandingPath()} replace />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={getLandingPath()} replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/*"
          element={(
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/manager"
          element={(
            <ProtectedRoute roles={['MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/cashier"
          element={(
            <ProtectedRoute roles={['CASHIER']}>
              <CashierDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/kitchen"
          element={(
            <ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER']}>
              <KitchenDisplay />
            </ProtectedRoute>
          )}
        />

        <Route path="/user" element={<UserMenu />} />
        <Route path="/user/order/:orderId" element={<UserOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
