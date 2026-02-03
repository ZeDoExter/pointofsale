import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import api from '../services/api';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [salesReport, setSalesReport] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [promotionReport, setPromotionReport] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState(() => {
    const stored = localStorage.getItem('manager_catalog');
    return stored ? JSON.parse(stored) : [];
  });
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [typeForm, setTypeForm] = useState({ name: '', description: '', is_available: true });
  const [optionForm, setOptionForm] = useState({ label: '', price_delta: 0, is_required: false, is_available: true });

  const userName = localStorage.getItem('name') || 'Manager';
  const orgName = localStorage.getItem('organization_name') || 'Organization';
  const branchName = localStorage.getItem('branch_name');

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOrders();
    } else if (activeTab === 'sales') {
      fetchSalesReport();
      fetchTopItems();
    } else if (activeTab === 'promotions') {
      fetchPromotionReport();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/orders');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
      setOrders(list);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
    setLoading(false);
  };

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/reports/sales', { params: { from: '2024-01-01', to: '2026-12-31' } });
      const list = Array.isArray(data) ? data : (Array.isArray(data?.sales) ? data.sales : []);
      setSalesReport(list);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
    }
    setLoading(false);
  };

  const fetchTopItems = async () => {
    try {
      const { data } = await api.get('/api/reports/top-items', { params: { limit: 10 } });
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setTopItems(list);
    } catch (error) {
      console.error('Failed to fetch top items:', error);
    }
  };

  const fetchPromotionReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/reports/promotions');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.promotions) ? data.promotions : []);
      setPromotionReport(list);
    } catch (error) {
      console.error('Failed to fetch promotion report:', error);
    }
    setLoading(false);
  };

  const persistCatalog = (nextCatalog) => {
    setCatalog(nextCatalog);
    localStorage.setItem('manager_catalog', JSON.stringify(nextCatalog));
  };

  const addProductType = () => {
    if (!typeForm.name.trim()) return;
    const newType = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: typeForm.name.trim(),
      description: typeForm.description.trim(),
      is_available: typeForm.is_available,
      options: [],
    };
    const next = [...catalog, newType];
    persistCatalog(next);
    setSelectedTypeId(newType.id);
    setTypeForm({ name: '', description: '', is_available: true });
  };

  const toggleTypeAvailability = (typeId) => {
    const next = catalog.map((type) => (
      type.id === typeId ? { ...type, is_available: !type.is_available } : type
    ));
    persistCatalog(next);
  };

  const addOptionToType = () => {
    if (!selectedTypeId || !optionForm.label.trim()) return;
    const next = catalog.map((type) => {
      if (type.id !== selectedTypeId) return type;
      const option = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        label: optionForm.label.trim(),
        price_delta: Number(optionForm.price_delta) || 0,
        is_required: optionForm.is_required,
        is_available: optionForm.is_available,
      };
      return { ...type, options: [...(type.options || []), option] };
    });
    persistCatalog(next);
    setOptionForm({ label: '', price_delta: 0, is_required: false, is_available: true });
  };

  const toggleOptionAvailability = (typeId, optionId) => {
    const next = catalog.map((type) => {
      if (type.id !== typeId) return type;
      const options = (type.options || []).map((opt) => opt.id === optionId ? { ...opt, is_available: !opt.is_available } : opt);
      return { ...type, options };
    });
    persistCatalog(next);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const totalRevenue = salesReport.reduce((sum, day) => sum + Number(day.total_revenue || 0), 0);
  const totalOrders = salesReport.reduce((sum, day) => sum + Number(day.order_count || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>📊 Manager Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#9ca3af' }}>
            {userName} - {orgName} {branchName && `(${branchName})`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '2px solid #e5e7eb',
        padding: '0 30px'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['overview', 'catalog', 'sales', 'promotions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '15px 20px',
                backgroundColor: 'transparent',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                fontSize: '16px',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Orders</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                      {orders.length}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Active Orders</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
                      {orders.filter(o => o.status === 'OPEN' || o.status === 'CONFIRMED').length}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Completed</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                      {orders.filter(o => o.status === 'PAID').length}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>Recent Orders</h3>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Order #</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Amount</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 10).map((order) => (
                        <tr key={order.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px' }}>#{order.order_number}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: order.status === 'PAID' ? '#d1fae5' : '#fef3c7',
                              color: order.status === 'PAID' ? '#065f46' : '#92400e'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>
                            ฿{Number(order.total_amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Catalog Tab */}
            {activeTab === 'catalog' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Product Types & Options</h2>
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                  Manage availability, required options, and price adjustments. Data is stored locally until backend endpoints are ready.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Product Types</h3>
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>{catalog.length} types</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {catalog.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedTypeId(type.id)}
                          style={{
                            textAlign: 'left',
                            padding: '12px',
                            borderRadius: '10px',
                            border: type.id === selectedTypeId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            backgroundColor: type.id === selectedTypeId ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{type.name}</div>
                              <div style={{ color: '#6b7280', fontSize: '12px' }}>{type.description || 'No description'}</div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={type.is_available}
                                onChange={(e) => { e.stopPropagation(); toggleTypeAvailability(type.id); }}
                              />
                              Available
                            </label>
                          </div>
                        </button>
                      ))}
                      {catalog.length === 0 && (
                        <p style={{ color: '#6b7280', margin: 0 }}>No product types yet.</p>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>Add Type</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          placeholder="Name (e.g., Pizza)"
                          value={typeForm.name}
                          onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                        <textarea
                          placeholder="Description"
                          value={typeForm.description}
                          onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={typeForm.is_available}
                            onChange={(e) => setTypeForm({ ...typeForm, is_available: e.target.checked })}
                          />
                          Available
                        </label>
                        <button
                          onClick={addProductType}
                          style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Save Type
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Options</h3>
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>
                        {selectedTypeId ? 'Linked to selection' : 'Select a type first'}
                      </span>
                    </div>

                    {!selectedTypeId && (
                      <p style={{ color: '#6b7280', margin: 0 }}>Choose a product type to manage its options.</p>
                    )}

                    {selectedTypeId && (
                      <>
                        {catalog.find((t) => t.id === selectedTypeId)?.options?.length === 0 && (
                          <p style={{ color: '#6b7280' }}>No options yet for this type.</p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                          {catalog.find((t) => t.id === selectedTypeId)?.options?.map((opt) => (
                            <div key={opt.id} style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '10px',
                              padding: '12px',
                              backgroundColor: '#f9fafb'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                                    {opt.is_required ? 'Required • ' : ''}Price adj: ฿{Number(opt.price_delta || 0).toFixed(2)}
                                  </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                  <input
                                    type="checkbox"
                                    checked={opt.is_available}
                                    onChange={() => toggleOptionAvailability(selectedTypeId, opt.id)}
                                  />
                                  Available
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>Add Option</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', marginBottom: '10px' }}>
                            <input
                              placeholder="Label (e.g., Large, Extra cheese)"
                              value={optionForm.label}
                              onChange={(e) => setOptionForm({ ...optionForm, label: e.target.value })}
                              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                            />
                            <input
                              type="number"
                              placeholder="Price Δ"
                              value={optionForm.price_delta}
                              onChange={(e) => setOptionForm({ ...optionForm, price_delta: e.target.value })}
                              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                              <input
                                type="checkbox"
                                checked={optionForm.is_required}
                                onChange={(e) => setOptionForm({ ...optionForm, is_required: e.target.checked })}
                              />
                              Required
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                              <input
                                type="checkbox"
                                checked={optionForm.is_available}
                                onChange={(e) => setOptionForm({ ...optionForm, is_available: e.target.checked })}
                              />
                              Available
                            </label>
                            <button
                              onClick={addOptionToType}
                              style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Save Option
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Sales Report</h2>
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderLeft: '6px solid #10b981'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Revenue</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                      ฿{totalRevenue.toFixed(2)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderLeft: '6px solid #3b82f6'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Orders</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {totalOrders}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderLeft: '6px solid #fbbf24'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Order Value</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
                      ฿{avgOrderValue.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Sales by Day */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '30px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Daily Sales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Orders</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Revenue</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Discount</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport.map((day, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px' }}>{day.date}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>{day.order_count}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                            ฿{Number(day.total_revenue || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>
                            -฿{Number(day.total_discount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            ฿{Number(day.total_tax || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Top Items */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>🏆 Top Selling Items</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {topItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: idx < 3 ? '#fbbf24' : '#e5e7eb',
                            color: idx < 3 ? 'white' : '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}>
                            {idx + 1}
                          </div>
                          <span style={{ fontWeight: 'bold' }}>{item.menu_item_name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                            ฿{Number(item.total_revenue || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.quantity_sold || 0} sold
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Promotions Tab */}
            {activeTab === 'promotions' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Promotion Effectiveness</h2>
                <div style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Usage</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Total Discount</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotionReport.map((promo, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{promo.promotion_name}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                            {promo.code || '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>{promo.usage_count}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                            -฿{Number(promo.total_discount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: promo.is_active ? '#d1fae5' : '#fee2e2',
                              color: promo.is_active ? '#065f46' : '#991b1b'
                            }}>
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
