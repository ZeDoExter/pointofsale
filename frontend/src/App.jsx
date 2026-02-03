import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CashierDashboard from './pages/CashierDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import KitchenDisplay from './pages/KitchenDisplay';
import UserMenu from './pages/UserMenu';
import UserOrder from './pages/UserOrder';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/cashier" element={<CashierDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/user" element={<UserMenu />} />
        <Route path="/user/order/:orderId" element={<UserOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
