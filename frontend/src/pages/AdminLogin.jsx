import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await authAPI.login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role.toUpperCase());
      localStorage.setItem('name', data.name);
      localStorage.setItem('username', data.username);
      localStorage.setItem('user_id', data.user_id || data.id || '');
      
      // Store org/branch context if available
      if (data.organization_id) localStorage.setItem('organization_id', data.organization_id);
      if (data.organization_name) localStorage.setItem('organization_name', data.organization_name);
      if (data.branch_id) localStorage.setItem('branch_id', data.branch_id);
      if (data.branch_name) localStorage.setItem('branch_name', data.branch_name);
      
      // Route based on role
      if (data.role === 'ADMIN') {
        navigate('/admin');
      } else if (data.role === 'MANAGER') {
        navigate('/manager');
      } else if (data.role === 'CASHIER') {
        navigate('/cashier');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>
          🏪 POS Login
        </h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                color: '#1f2937',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                color: '#1f2937',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {error && (
            <p style={{
              color: '#ef4444',
              backgroundColor: '#fee2e2',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </form>
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: 'bold' }}>Demo Users:</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>• admin / anypassword (ADMIN)</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>• manager.delicious / test (MANAGER)</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>• cashier.siam / test (CASHIER)</p>
        </div>
      </div>
    </div>
  );
}
