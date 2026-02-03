import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', contact_email: '', contact_phone: '' });
  const [branchForm, setBranchForm] = useState({ name: '', slug: '', city: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const name = localStorage.getItem('name');
    const role = (localStorage.getItem('role') || 'ADMIN').toUpperCase();
    const orgName = localStorage.getItem('organization_name');
    setUser({ role, name, orgName });

    loadOrganizations();
  }, [navigate]);

  const loadOrganizations = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('/api/organizations');
      const orgs = Array.isArray(data?.organizations) ? data.organizations : [];
      setOrganizations(orgs);

      if (orgs.length > 0) {
        const current = localStorage.getItem('organization_id') || orgs[0].id;
        setSelectedOrg(current);
        fetchBranches(current);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setMessage('Failed to load organizations');
    }
    setLoading(false);
  };

  const fetchBranches = async (orgId) => {
    if (!orgId) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get(`/api/organizations/${orgId}/branches`);
      const list = Array.isArray(data?.branches) ? data.branches : [];
      setBranches(list);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setMessage('Failed to load branches');
    }
    setLoading(false);
  };

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/api/organizations', {
        name: orgForm.name,
        slug: orgForm.slug,
        contact_email: orgForm.contact_email,
        contact_phone: orgForm.contact_phone,
      });
      setOrgForm({ name: '', slug: '', contact_email: '', contact_phone: '' });
      await loadOrganizations();
      setMessage('Organization created');
    } catch (err) {
      console.error('Failed to create organization:', err);
      setMessage('Failed to create organization');
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setMessage('');
    try {
      await api.post(`/api/organizations/${selectedOrg}/branches`, {
        name: branchForm.name,
        slug: branchForm.slug,
        city: branchForm.city,
        phone: branchForm.phone,
        email: branchForm.email,
      });
      setBranchForm({ name: '', slug: '', city: '', phone: '', email: '' });
      await fetchBranches(selectedOrg);
      setMessage('Branch created');
    } catch (err) {
      console.error('Failed to create branch:', err);
      setMessage('Failed to create branch');
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

  const branchCount = useMemo(() => branches.length, [branches]);

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
            backgroundColor: '#10b981',
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

      <div style={{ padding: '30px' }}>
        {message && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#ecfeff',
            color: '#0ea5e9',
            borderRadius: '8px',
            border: '1px solid #bae6fd'
          }}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #3b82f6' }}>
            <div style={{ color: '#6b7280', marginBottom: '6px' }}>Organizations</div>
            <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{organizations.length}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #10b981' }}>
            <div style={{ color: '#6b7280', marginBottom: '6px' }}>Branches</div>
            <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{branchCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Organizations */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Organizations</h2>
              <button
                onClick={loadOrganizations}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}
              >
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrg(org.id);
                    fetchBranches(org.id);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderRadius: '10px',
                    border: org.id === selectedOrg ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    backgroundColor: org.id === selectedOrg ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{org.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>Slug: {org.slug}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>Plan: {org.plan_type || 'FREE'}</div>
                </button>
              ))}
              {organizations.length === 0 && (
                <p style={{ color: '#6b7280' }}>No organizations yet.</p>
              )}
            </div>

            <form onSubmit={handleOrgSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Create Organization</h3>
              <input
                required
                placeholder="Name"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                required
                placeholder="Slug"
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                placeholder="Contact Email"
                value={orgForm.contact_email}
                onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                placeholder="Contact Phone"
                value={orgForm.contact_phone}
                onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'Saving...' : 'Create Organization'}
              </button>
            </form>
          </div>

          {/* Branches */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Branches</h2>
              {selectedOrg && (
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Org: {selectedOrg}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {branches.map((branch) => (
                <div key={branch.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 'bold' }}>{branch.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>Slug: {branch.slug}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                    {branch.city || 'City N/A'} • {branch.phone || 'Phone N/A'}
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <p style={{ color: '#6b7280' }}>No branches for this organization.</p>
              )}
            </div>

            <form onSubmit={handleBranchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Create Branch</h3>
              <input
                required
                placeholder="Name"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                required
                placeholder="Slug"
                value={branchForm.slug}
                onChange={(e) => setBranchForm({ ...branchForm, slug: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                placeholder="City"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                placeholder="Phone"
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <input
                placeholder="Email"
                value={branchForm.email}
                onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <button
                type="submit"
                disabled={!selectedOrg || loading}
                style={{ padding: '10px', backgroundColor: selectedOrg ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: selectedOrg ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
              >
                {loading ? 'Saving...' : 'Create Branch'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
