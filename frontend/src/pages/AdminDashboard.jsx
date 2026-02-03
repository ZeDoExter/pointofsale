import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  nav: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  btnLogout: {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  welcome: {
    color: 'white',
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '8px',
  },
  welcomeSub: {
    opacity: 0.9,
    fontSize: '16px',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#667eea',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnSuccess: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
  },
  btnBlue: {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  },
  btnGhost: {
    padding: '8px 14px',
    background: '#f8fafc',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '13px',
  },
  btnDanger: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  btnDangerOutline: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#ef4444',
    border: '1.5px solid #fca5a5',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '10px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
  },
  message: {
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontWeight: 500,
  },
  messageSuccess: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  messageError: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  orgItem: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
  },
  orgHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  orgName: {
    fontWeight: 700,
    fontSize: '16px',
    color: '#1e293b',
  },
  orgMeta: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  orgActions: {
    display: 'flex',
    gap: '8px',
  },
  expandedContent: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  branchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'white',
    borderRadius: '10px',
    marginBottom: '8px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formGrid: {
    display: 'grid',
    gap: '12px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    color: '#94a3b8',
  },
  statBox: {
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 800,
  },
  statLabel: {
    color: '#64748b',
    fontSize: '13px',
    marginTop: '4px',
  },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [managerMap, setManagerMap] = useState({});
  const [expandedOrg, setExpandedOrg] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', contact_email: '', contact_phone: '' });
  const [branchForm, setBranchForm] = useState({ name: '', slug: '', city: '', phone: '' });
  const [branchFormFor, setBranchFormFor] = useState('');
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [managerForm, setManagerForm] = useState({ username: '', name: '', password: '' });
  const [activeTab, setActiveTab] = useState('managers');
  const [editingManager, setEditingManager] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    const name = localStorage.getItem('name') || 'Admin';
    const role = (localStorage.getItem('role') || 'ADMIN').toUpperCase();
    setUser({ role, name });
    loadAll();
  }, [navigate]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const loadAll = async () => {
    try {
      const [orgRes, mgrRes] = await Promise.all([
        api.get('/api/organizations'),
        api.get('/api/users/managers'),
      ]);
      const orgs = Array.isArray(orgRes.data?.organizations) ? orgRes.data.organizations : [];
      const mgrs = Array.isArray(mgrRes.data?.managers) ? mgrRes.data.managers : [];
      setOrganizations(orgs);
      setManagerMap({ all: mgrs });
      for (const org of orgs) {
        fetchBranches(org.id);
      }
    } catch {
      showMsg('Failed to load data', 'error');
    }
  };

  const fetchBranches = async (orgId) => {
    if (!orgId) return;
    try {
      const { data } = await api.get('/api/organizations/' + orgId + '/branches');
      setBranchMap((prev) => ({ ...prev, [orgId]: data?.branches || [] }));
    } catch {}
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users/managers', managerForm);
      setManagerForm({ username: '', name: '', password: '' });
      loadAll();
      showMsg('✓ Manager created!');
    } catch {
      showMsg('Failed to create manager', 'error');
    }
  };

  const handleDeleteManager = async (id) => {
    if (!window.confirm('Delete this manager?')) return;
    try {
      await api.delete('/api/users/managers/' + id);
      loadAll();
      showMsg('✓ Manager deleted');
    } catch {
      showMsg('Failed to delete', 'error');
    }
  };

  const handleAssignOrg = async (managerId, orgId) => {
    try {
      await api.put('/api/users/managers/' + managerId, { organization_id: orgId || '', branch_id: '' });
      setEditingManager(null);
      loadAll();
      showMsg('✓ Organization assigned!');
    } catch {
      showMsg('Failed to assign organization', 'error');
    }
  };

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/organizations', orgForm);
      setOrgForm({ name: '', slug: '', contact_email: '', contact_phone: '' });
      setShowOrgForm(false);
      loadAll();
      showMsg('✓ Organization created!');
    } catch {
      showMsg('Failed to create organization', 'error');
    }
  };

  const handleDeleteOrg = async (id) => {
    if (!window.confirm('Delete this organization and all its branches?')) return;
    try {
      await api.delete('/api/organizations/' + id);
      loadAll();
      showMsg('✓ Organization deleted');
    } catch {
      showMsg('Failed to delete', 'error');
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (!branchFormFor) return;
    try {
      await api.post('/api/organizations/' + branchFormFor + '/branches', branchForm);
      setBranchForm({ name: '', slug: '', city: '', phone: '' });
      const orgId = branchFormFor;
      setBranchFormFor('');
      fetchBranches(orgId);
      showMsg('✓ Branch created!');
    } catch {
      showMsg('Failed to create branch', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  if (!user) return null;

  const allManagers = managerMap.all || [];
  const totalBranches = Object.values(branchMap).flat().length;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>⚡</div>
          <span style={styles.logoText}>POS Admin</span>
        </div>
        <div style={styles.navButtons}>
          <button style={styles.btnLogout} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.container}>
        {/* Welcome */}
        <div style={styles.welcome}>
          <h1 style={styles.welcomeTitle}>Welcome, {user.name}!</h1>
          <p style={styles.welcomeSub}>
            {activeTab === 'managers' ? 'สร้าง Manager ก่อน → แล้วค่อยไปสร้าง Organization' : 'จัดการ Organization และ Branch'}
          </p>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'managers' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('managers')}
          >
            👤 Managers
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'orgs' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('orgs')}
          >
            🏢 Organizations
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'error' ? styles.messageError : styles.messageSuccess) }}>
            {message.text}
          </div>
        )}

        {/* Managers Tab */}
        {activeTab === 'managers' && (
          <div style={styles.grid}>
            {/* Create Manager */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>+</span>
                  Create Manager Account
                </div>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Step 1</span>
              </div>
              <form onSubmit={handleManagerSubmit} style={styles.formGrid}>
                <input
                  required
                  placeholder="Username"
                  value={managerForm.username}
                  onChange={(e) => setManagerForm({ ...managerForm, username: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  placeholder="Full Name"
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={managerForm.password}
                  onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
                  style={styles.input}
                />
                <button type="submit" style={styles.btnSuccess}>Create Manager</button>
              </form>
            </div>

            {/* Manager List */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={{ ...styles.cardIcon, background: '#f1f5f9', color: '#64748b' }}>👤</span>
                  All Managers
                </div>
                <span style={{ ...styles.badge, background: '#e0e7ff', color: '#4f46e5' }}>
                  {allManagers.length}
                </span>
              </div>
              {allManagers.length === 0 ? (
                <div style={styles.emptyState}>No managers yet</div>
              ) : (
                <ul style={styles.list}>
                  {allManagers.map((m) => (
                    <li key={m.id} style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{m.name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            @{m.username}
                            {m.organization_name && <span style={{ marginLeft: '8px', color: '#10b981' }}>• {m.organization_name}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={styles.btnGhost}
                            onClick={() => setEditingManager(editingManager === m.id ? null : m.id)}
                          >
                            {editingManager === m.id ? '✕' : '🏢 Assign Org'}
                          </button>
                          <button style={styles.btnDangerOutline} onClick={() => handleDeleteManager(m.id)}>🗑️</button>
                        </div>
                      </div>
                      {editingManager === m.id && (
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                          <select
                            style={{ ...styles.input, flex: 1 }}
                            defaultValue={m.organization_id || ''}
                            onChange={(e) => handleAssignOrg(m.id, e.target.value)}
                          >
                            <option value="">-- No Organization --</option>
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'orgs' && (
          <div style={styles.grid}>
            {/* Org Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>🏢</span>
                  {showOrgForm ? 'Create Organization' : 'Organizations'}
                </div>
                <button
                  style={showOrgForm ? styles.btnGhost : styles.btnBlue}
                  onClick={() => setShowOrgForm(!showOrgForm)}
                >
                  {showOrgForm ? '✕ Cancel' : '+ Add Org'}
                </button>
              </div>

              {showOrgForm ? (
                <form onSubmit={handleOrgSubmit} style={styles.formGrid}>
                  <input
                    required
                    placeholder="Organization Name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    style={styles.input}
                  />
                  <input
                    required
                    placeholder="Slug (e.g., my-restaurant)"
                    value={orgForm.slug}
                    onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                    style={styles.input}
                  />
                  <div style={styles.formRow}>
                    <input
                      placeholder="Contact Email"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      placeholder="Contact Phone"
                      value={orgForm.contact_phone}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.btnSuccess}>Create Organization</button>
                </form>
              ) : organizations.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No organizations yet</p>
                  <p style={{ fontSize: '13px' }}>Click "+ Add Org" to create</p>
                </div>
              ) : (
                <div>
                  {organizations.map((org) => {
                    const branches = branchMap[org.id] || [];
                    const isExpanded = expandedOrg === org.id;
                    return (
                      <div key={org.id} style={styles.orgItem}>
                        <div style={styles.orgHeader} onClick={() => setExpandedOrg(isExpanded ? '' : org.id)}>
                          <div>
                            <div style={styles.orgName}>{isExpanded ? '▼' : '▶'} {org.name}</div>
                            <div style={styles.orgMeta}>{org.slug} • {branches.length} branch(es)</div>
                          </div>
                          <div style={styles.orgActions} onClick={(e) => e.stopPropagation()}>
                            <button
                              style={styles.btnGhost}
                              onClick={() => { setExpandedOrg(org.id); setBranchFormFor(org.id); }}
                            >
                              + Branch
                            </button>
                            <button style={styles.btnDanger} onClick={() => handleDeleteOrg(org.id)}>🗑️</button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={styles.expandedContent}>
                            {branchFormFor === org.id && (
                              <form onSubmit={handleBranchSubmit} style={{ ...styles.formGrid, marginBottom: '16px' }}>
                                <div style={styles.sectionTitle}>Add New Branch</div>
                                <div style={styles.formRow}>
                                  <input required placeholder="Branch Name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} style={styles.input} />
                                  <input required placeholder="Slug" value={branchForm.slug} onChange={(e) => setBranchForm({ ...branchForm, slug: e.target.value })} style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                  <input placeholder="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} style={styles.input} />
                                  <input placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} style={styles.input} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button type="submit" style={styles.btnSuccess}>Save</button>
                                  <button type="button" style={styles.btnGhost} onClick={() => setBranchFormFor('')}>Cancel</button>
                                </div>
                              </form>
                            )}
                            <div style={styles.sectionTitle}>Branches</div>
                            {branches.length === 0 ? (
                              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No branches yet</p>
                            ) : (
                              branches.map((b) => (
                                <div key={b.id} style={styles.branchItem}>
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{b.city || 'No city'} • {b.slug}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={{ ...styles.cardIcon, background: '#fef3c7', color: '#f59e0b' }}>📊</span>
                  Quick Stats
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statNumber, color: '#3b82f6' }}>{organizations.length}</div>
                  <div style={styles.statLabel}>Organizations</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statNumber, color: '#10b981' }}>{totalBranches}</div>
                  <div style={styles.statLabel}>Branches</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statNumber, color: '#8b5cf6' }}>{allManagers.length}</div>
                  <div style={styles.statLabel}>Managers</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{allManagers.filter(m => !m.organization_id).length}</div>
                  <div style={styles.statLabel}>Unassigned</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
