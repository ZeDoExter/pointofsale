import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [managerMap, setManagerMap] = useState({});
  const [expandedOrg, setExpandedOrg] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', contact_email: '', contact_phone: '' });
  const [branchForm, setBranchForm] = useState({ name: '', slug: '', city: '', phone: '', email: '' });
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [branchFormFor, setBranchFormFor] = useState('');

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
        const firstId = orgs[0].id;
        setExpandedOrg(firstId);
        await Promise.all([fetchBranches(firstId), fetchManagers(firstId)]);
      } else {
        setExpandedOrg('');
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setMessage('Failed to load organizations');
    }
    setLoading(false);
  };

  const fetchBranches = async (orgId) => {
    if (!orgId) return;
    try {
      const { data } = await api.get(`/api/organizations/${orgId}/branches`);
      const list = Array.isArray(data?.branches) ? data.branches : [];
      setBranchMap((prev) => ({ ...prev, [orgId]: list }));
    } catch (err) {
      console.error('Failed to load branches:', err);
      setMessage('Failed to load branches');
    }
  };

  const fetchManagers = async (orgId) => {
    setManagerLoading(true);
    try {
      const { data } = await api.get('/api/users/managers', { params: { organization_id: orgId || '' } });
      const list = Array.isArray(data?.managers) ? data.managers : [];
      setManagerMap((prev) => ({ ...prev, [orgId || 'all']: list }));
    } catch (err) {
      console.error('Failed to load managers:', err);
      setMessage('Failed to load managers');
    }
    setManagerLoading(false);
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
      setShowOrgForm(false);
      await loadOrganizations();
      setMessage('Organization added');
    } catch (err) {
      console.error('Failed to create organization:', err);
      setMessage('Failed to create organization');
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    const targetOrg = branchFormFor;
    if (!targetOrg) return;
    setMessage('');
    try {
      await api.post(`/api/organizations/${targetOrg}/branches`, {
        name: branchForm.name,
        slug: branchForm.slug,
        city: branchForm.city,
        phone: branchForm.phone,
        email: branchForm.email,
      });
      setBranchForm({ name: '', slug: '', city: '', phone: '', email: '' });
      setBranchFormFor('');
      await Promise.all([fetchBranches(targetOrg), fetchManagers(targetOrg)]);
      setMessage('Branch added');
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

  const toggleOrg = async (orgId) => {
    const willOpen = expandedOrg !== orgId;
    setExpandedOrg(willOpen ? orgId : '');
    setBranchFormFor('');
    if (willOpen) {
      if (!branchMap[orgId]) {
        await fetchBranches(orgId);
      }
      if (!managerMap[orgId]) {
        await fetchManagers(orgId);
      }
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '18px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>Manager Accounts</h1>
          <p style={{ margin: 0, color: '#cbd5e1' }}>ดูโครงสร้างองค์กรกับสาขาแบบสรุป</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowOrgForm((v) => !v)}
            style={{ padding: '10px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            {showOrgForm ? 'Close' : 'Add'}
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        {message && (
          <div style={{ marginBottom: '14px', padding: '12px 14px', backgroundColor: '#ecfeff', border: '1px solid #bae6fd', borderRadius: '10px', color: '#0369a1' }}>
            {message}
          </div>
        )}

        {showOrgForm && (
          <form onSubmit={handleOrgSubmit} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '18px', display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Add Organization</h3>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>แค่ชื่อกับ slug ก็พอ</span>
            </div>
            <input required placeholder="Name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <input required placeholder="Slug" value={orgForm.slug} onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <input placeholder="Contact Email" value={orgForm.contact_email} onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <input placeholder="Contact Phone" value={orgForm.contact_phone} onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Organizations</h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Bullet list บอกว่ามี Org/Branch อะไรบ้าง</p>
            </div>
            <button onClick={loadOrganizations} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>

          {loading && <p style={{ color: '#6b7280' }}>Loading...</p>}

          <ul style={{ listStyle: 'disc', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {organizations.map((org) => {
              const isOpen = expandedOrg === org.id;
              const branches = branchMap[org.id] || [];
              const orgManagers = managerMap[org.id] || [];
              return (
                <li key={org.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => toggleOrg(org.id)} style={{ textAlign: 'left', flex: 1, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700 }}>{org.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>Slug: {org.slug} • Branches: {branches.length}</div>
                    </button>
                    <button
                      onClick={() => {
                        setExpandedOrg(org.id);
                        setBranchFormFor(org.id);
                        if (!branchMap[org.id]) {
                          fetchBranches(org.id);
                        }
                      }}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                    >
                      Add Branch
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong>Branches</strong>
                          {managerLoading && <span style={{ color: '#9ca3af', fontSize: '12px' }}>loading...</span>}
                        </div>
                        {branchFormFor === org.id && (
                          <form onSubmit={handleBranchSubmit} style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                            <input required placeholder="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                            <input required placeholder="Slug" value={branchForm.slug} onChange={(e) => setBranchForm({ ...branchForm, slug: e.target.value })} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                              <input placeholder="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                              <input placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                              <input placeholder="Email" value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="submit" style={{ padding: '9px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Branch</button>
                              <button type="button" onClick={() => setBranchFormFor('')} style={{ padding: '9px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </form>
                        )}

                        <ul style={{ listStyle: 'circle', paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {branches.length === 0 && <li style={{ color: '#9ca3af' }}>ยังไม่มีสาขา</li>}
                          {branches.map((branch) => (
                            <li key={branch.id} style={{ color: '#1f2937' }}>
                              {branch.name} <span style={{ color: '#6b7280', fontSize: '12px' }}>({branch.slug})</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong>Managers</strong>
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>{orgManagers.length} account(s)</span>
                        </div>
                        <ul style={{ listStyle: 'square', paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {orgManagers.length === 0 && <li style={{ color: '#9ca3af' }}>ยังไม่มี manager</li>}
                          {orgManagers.map((mgr) => (
                            <li key={mgr.id} style={{ color: '#111827' }}>
                              {mgr.name} <span style={{ color: '#6b7280' }}>@{mgr.username}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {organizations.length === 0 && !loading && (
              <li style={{ color: '#9ca3af' }}>ยังไม่มี organization ในระบบ</li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
