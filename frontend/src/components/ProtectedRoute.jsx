import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Your role: <strong>{role}</strong></p>
        <p>Required role: <strong>{requiredRole}</strong></p>
      </div>
    );
  }

  return children;
}
