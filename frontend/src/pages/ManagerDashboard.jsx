import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { orderAPI, productAPI } from '../services/api';

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9' },
  nav: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: {
    width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
  },
  logoText: { color: 'white', fontSize: '20px', fontWeight: 700 },
  logoSub: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  branchSelect: {
    padding: '10px 16px', borderRadius: '10px', border: 'none',
    background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: 500,
  },
  btnLogout: {
    padding: '10px 20px', background: 'rgba(239,68,68,0.9)', color: 'white',
    border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '24px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: {
    padding: '12px 20px', background: 'white', border: '2px solid #e2e8f0',
    borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: { background: '#1e3a5f', color: 'white', borderColor: '#1e3a5f' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  card: {
    background: 'white', borderRadius: '16px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  stat: { textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px' },
  statNum: { fontSize: '32px', fontWeight: 800 },
  statLabel: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white',
  },
  btnPrimary: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
  },
  btnDanger: {
    padding: '8px 14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '10px',
  },
  message: { padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500 },
  msgSuccess: { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' },
  msgError: { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 600 },
  td: { padding: '14px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 },
  formGrid: { display: 'grid', gap: '12px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Data
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Forms
  const [cashierForm, setCashierForm] = useState({ username: '', name: '', password: '', branch_id: '' });
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', category: '', image_url: '',
    is_available: true, sort_order: 0, options: []
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);

  const userName = localStorage.getItem('name') || 'Manager';
  const orgName = localStorage.getItem('organization_name') || 'Organization';

  useEffect(() => {
    loadBranches();
    loadCashiers();
    loadOrders();
    if (activeTab === 'catalog') {
      loadProducts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBranch) {
      loadCashiers(selectedBranch);
    } else {
      loadCashiers();
    }
  }, [selectedBranch]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const loadBranches = async () => {
    try {
      const { data } = await api.get('/api/manager/branches');
      const list = Array.isArray(data?.branches) ? data.branches : [];
      setBranches(list);
      // Auto-select first branch if only one
      if (list.length === 1) {
        setSelectedBranch(list[0].id);
        setCashierForm(prev => ({ ...prev, branch_id: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadCashiers = async (branchId) => {
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const { data } = await api.get('/api/users/cashiers', { params });
      const list = Array.isArray(data?.cashiers) ? data.cashiers : [];
      setCashiers(list);
    } catch (err) {
      console.error('Failed to load cashiers:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await orderAPI.list();
      const list = Array.isArray(data?.orders) ? data.orders : [];
      setOrders(list.slice(0, 20)); // Show last 20
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await productAPI.list();
      const list = Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
      showMsg('Failed to load products', 'error');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await productAPI.create({
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        image_url: productForm.image_url,
        is_available: productForm.is_available,
        sort_order: parseInt(productForm.sort_order) || 0,
        options: productForm.options.filter(opt => opt.option_group && opt.option_name).map(opt => ({
          option_group: opt.option_group,
          option_name: opt.option_name,
          price_modifier: parseFloat(opt.price_modifier) || 0,
          is_required: opt.is_required || false,
          sort_order: parseInt(opt.sort_order) || 0
        }))
      });
      setProductForm({
        name: '', description: '', price: '', category: '', image_url: '',
        is_available: true, sort_order: 0, options: []
      });
      setShowProductForm(false);
      loadProducts();
      showMsg('✓ Product created!');
    } catch (err) {
      console.error('Create product error:', err);
      showMsg('Failed to create product', 'error');
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const updates = {};
      if (productForm.name) updates.name = productForm.name;
      if (productForm.description !== undefined) updates.description = productForm.description;
      if (productForm.price) updates.price = parseFloat(productForm.price);
      if (productForm.category !== undefined) updates.category = productForm.category;
      if (productForm.image_url !== undefined) updates.image_url = productForm.image_url;
      if (productForm.is_available !== undefined) updates.is_available = productForm.is_available;
      if (productForm.sort_order !== undefined) updates.sort_order = parseInt(productForm.sort_order) || 0;

      await productAPI.update(editingProduct.id, updates);
      setEditingProduct(null);
      setProductForm({
        name: '', description: '', price: '', category: '', image_url: '',
        is_available: true, sort_order: 0, options: []
      });
      setShowProductForm(false);
      loadProducts();
      showMsg('✓ Product updated!');
    } catch (err) {
      showMsg('Failed to update product', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productAPI.delete(id);
      loadProducts();
      showMsg('✓ Product deleted');
    } catch (err) {
      showMsg('Failed to delete product', 'error');
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      await productAPI.update(product.id, { is_available: !product.is_available });
      loadProducts();
      showMsg(`✓ Product ${!product.is_available ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showMsg('Failed to update product', 'error');
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      sort_order: product.sort_order || 0,
      options: product.options || []
    });
    setShowProductForm(true);
  };

  const addProductOption = () => {
    setProductForm({
      ...productForm,
      options: [...productForm.options, { option_group: '', option_name: '', price_modifier: 0, is_required: false, sort_order: 0 }]
    });
  };

  const updateProductOption = (index, field, value) => {
    const newOptions = [...productForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setProductForm({ ...productForm, options: newOptions });
  };

  const removeProductOption = (index) => {
    setProductForm({
      ...productForm,
      options: productForm.options.filter((_, i) => i !== index)
    });
  };

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    const branchId = cashierForm.branch_id || (branches.length === 1 ? branches[0].id : '');
    if (!branchId) {
      showMsg('Please select a branch', 'error');
      return;
    }
    try {
      await api.post('/api/users/cashiers', { ...cashierForm, branch_id: branchId });
      setCashierForm({ username: '', name: '', password: '', branch_id: branches.length === 1 ? branches[0].id : '' });
      loadCashiers(selectedBranch);
      showMsg('✓ Cashier created!');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create cashier';
      showMsg(errMsg === 'username_taken' ? 'Username already taken' : errMsg, 'error');
    }
  };

  const handleDeleteCashier = async (id) => {
    if (!window.confirm('Delete this cashier?')) return;
    try {
      await api.delete('/api/users/cashiers/' + id);
      loadCashiers(selectedBranch);
      showMsg('✓ Cashier deleted');
    } catch {
      showMsg('Failed to delete', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#f59e0b', 'CONFIRMED': '#3b82f6', 'PREPARING': '#8b5cf6',
      'READY': '#10b981', 'PAID': '#06b6d4', 'CANCELLED': '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  const todayOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(o.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders
    .filter(o => o.status === 'PAID')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const showBranchSelector = branches.length > 1;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>📊</div>
          <div>
            <div style={styles.logoText}>Manager Dashboard</div>
            <div style={styles.logoSub}>{userName} • {orgName}</div>
          </div>
        </div>
        <div style={styles.navRight}>
          {showBranchSelector && (
            <select
              style={styles.branchSelect}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button style={styles.btnLogout} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.container}>
        {/* Tabs */}
        <div style={styles.tabs}>
          {['overview', 'orders', 'catalog', 'settings'].map(tab => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📈 Overview'}
              {tab === 'orders' && '📋 Orders'}
              {tab === 'catalog' && '📦 Catalog'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Message */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'error' ? styles.msgError : styles.msgSuccess) }}>
            {message.text}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📊 Today's Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#3b82f6' }}>{todayOrders.length}</div>
                  <div style={styles.statLabel}>Orders Today</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#10b981' }}>฿{todayRevenue.toLocaleString()}</div>
                  <div style={styles.statLabel}>Revenue Today</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#8b5cf6' }}>{cashiers.length}</div>
                  <div style={styles.statLabel}>Cashiers</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#f59e0b' }}>{branches.length}</div>
                  <div style={styles.statLabel}>Branches</div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>🕐 Recent Orders</div>
              {orders.length === 0 ? (
                <div style={styles.emptyState}>No orders yet</div>
              ) : (
                <ul style={styles.list}>
                  {orders.slice(0, 5).map(o => (
                    <li key={o.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Table {o.table_id || '-'}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          ฿{Number(o.total_amount || 0).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ ...styles.badge, background: getStatusColor(o.status) + '20', color: getStatusColor(o.status) }}>
                        {o.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>👥 Cashiers</div>
              {cashiers.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No cashiers yet</p>
                  <p style={{ fontSize: '13px' }}>Go to Settings to add cashiers</p>
                </div>
              ) : (
                <ul style={styles.list}>
                  {cashiers.slice(0, 5).map(c => (
                    <li key={c.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          @{c.username} {c.branch_name && `• ${c.branch_name}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>📋 All Orders</div>
            {orders.length === 0 ? (
              <div style={styles.emptyState}>No orders yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order ID</th>
                      <th style={styles.th}>Table</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={styles.td}>{o.id?.slice(0, 8)}...</td>
                        <td style={styles.td}>{o.table_id || '-'}</td>
                        <td style={styles.td}>฿{Number(o.total_amount || 0).toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: getStatusColor(o.status) + '20', color: getStatusColor(o.status) }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(o.created_at).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div style={styles.grid}>
            {/* Product List */}
            <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={styles.cardTitle}>📦 Products</div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      name: '', description: '', price: '', category: '', image_url: '',
                      is_available: true, sort_order: 0, options: []
                    });
                    setShowProductForm(true);
                  }}
                  style={styles.btnPrimary}
                >
                  + Add Product
                </button>
              </div>
              {products.length === 0 ? (
                <div style={styles.emptyState}>No products yet. Click "+ Add Product" to create one.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Options</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            {p.description && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                {p.description.substring(0, 50)}{p.description.length > 50 ? '...' : ''}
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>{p.category || '-'}</td>
                          <td style={styles.td}>฿{Number(p.price).toFixed(2)}</td>
                          <td style={styles.td}>
                            {p.options && p.options.length > 0 ? (
                              <div style={{ fontSize: '12px' }}>
                                {[...new Set(p.options.map(o => o.option_group))].length} group(s)
                              </div>
                            ) : '-'}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleToggleAvailability(p)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: p.is_available ? '#d1fae5' : '#fee2e2',
                                color: p.is_available ? '#065f46' : '#991b1b',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600
                              }}
                            >
                              {p.is_available ? 'Available' : 'Unavailable'}
                            </button>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => startEditProduct(p)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                style={styles.btnDanger}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Product Form */}
            {showProductForm && (
              <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                <div style={styles.cardTitle}>
                  {editingProduct ? '✏️ Edit Product' : '➕ Create Product'}
                </div>
                <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} style={styles.formGrid}>
                  <input
                    required
                    placeholder="Product Name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    style={styles.input}
                  />
                  <textarea
                    placeholder="Description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      placeholder="Category"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    style={styles.input}
                  />
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={productForm.is_available}
                        onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
                      />
                      <span>Available</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Sort Order"
                      value={productForm.sort_order}
                      onChange={(e) => setProductForm({ ...productForm, sort_order: parseInt(e.target.value) || 0 })}
                      style={{ ...styles.input, width: '150px' }}
                    />
                  </div>

                  {/* Product Options */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600 }}>Options</div>
                      <button
                        type="button"
                        onClick={addProductOption}
                        style={{
                          padding: '6px 12px',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        + Add Option
                      </button>
                    </div>
                    {productForm.options.map((opt, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 80px 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input
                          placeholder="Option Group (e.g., Size)"
                          value={opt.option_group}
                          onChange={(e) => updateProductOption(idx, 'option_group', e.target.value)}
                          style={{ ...styles.input, fontSize: '13px', padding: '8px' }}
                        />
                        <input
                          placeholder="Option Name (e.g., Large)"
                          value={opt.option_name}
                          onChange={(e) => updateProductOption(idx, 'option_name', e.target.value)}
                          style={{ ...styles.input, fontSize: '13px', padding: '8px' }}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price Modifier"
                          value={opt.price_modifier}
                          onChange={(e) => updateProductOption(idx, 'price_modifier', parseFloat(e.target.value) || 0)}
                          style={{ ...styles.input, fontSize: '13px', padding: '8px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={opt.is_required}
                            onChange={(e) => updateProductOption(idx, 'is_required', e.target.checked)}
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeProductOption(idx)}
                          style={{
                            padding: '6px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button type="submit" style={styles.btnPrimary}>
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                        setProductForm({
                          name: '', description: '', price: '', category: '', image_url: '',
                          is_available: true, sort_order: 0, options: []
                        });
                      }}
                      style={{
                        padding: '14px',
                        background: '#f3f4f6',
                        color: '#64748b',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '15px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={styles.grid}>
            {/* Create Cashier */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>➕ Add Cashier Account</div>
              <form onSubmit={handleCreateCashier} style={styles.formGrid}>
                <input
                  required
                  placeholder="Username"
                  value={cashierForm.username}
                  onChange={(e) => setCashierForm({ ...cashierForm, username: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  placeholder="Full Name"
                  value={cashierForm.name}
                  onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={cashierForm.password}
                  onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })}
                  style={styles.input}
                />
                {branches.length > 0 && !showBranchSelector && (
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', fontSize: '14px', color: '#64748b' }}>
                    📍 {branches[0].name}
                  </div>
                )}
                {showBranchSelector && (
                  <select
                    required
                    value={cashierForm.branch_id}
                    onChange={(e) => setCashierForm({ ...cashierForm, branch_id: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <button type="submit" style={styles.btnPrimary}>Create Cashier</button>
              </form>
            </div>

            {/* Cashier List */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>👥 Cashier Accounts</div>
              {cashiers.length === 0 ? (
                <div style={styles.emptyState}>No cashiers yet</div>
              ) : (
                <ul style={styles.list}>
                  {cashiers.map(c => (
                    <li key={c.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          @{c.username}
                          {c.branch_name && <span style={{ marginLeft: '8px', color: '#3b82f6' }}>• {c.branch_name}</span>}
                        </div>
                      </div>
                      <button style={styles.btnDanger} onClick={() => handleDeleteCashier(c.id)}>🗑️</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Branches Info */}
            {branches.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>🏢 Your Branches</div>
                <ul style={styles.list}>
                  {branches.map(b => (
                    <li key={b.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {b.city || 'No city'} • {b.slug}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
