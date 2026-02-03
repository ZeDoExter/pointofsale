import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserMenu from './pages/UserMenu';
import UserOrder from './pages/UserOrder';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/user" />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/user" element={<UserMenu />} />
        <Route path="/user/order/:orderId" element={<UserOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
