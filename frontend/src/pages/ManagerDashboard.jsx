import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [salesReport, setSalesReport] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [promotionReport, setPromotionReport] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
    setLoading(false);
  };

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/reports/sales?from=2024-01-01&to=2026-12-31', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setSalesReport(data || []);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
    }
    setLoading(false);
  };

  const fetchTopItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/reports/top-items?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setTopItems(data || []);
    } catch (error) {
      console.error('Failed to fetch top items:', error);
    }
  };

  const fetchPromotionReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/reports/promotions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setPromotionReport(data || []);
    } catch (error) {
      console.error('Failed to fetch promotion report:', error);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const totalRevenue = salesReport.reduce((sum, day) => sum + day.total_revenue, 0);
  const totalOrders = salesReport.reduce((sum, day) => sum + day.order_count, 0);
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
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '2px solid #e5e7eb',
        padding: '0 30px'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['overview', 'sales', 'promotions'].map((tab) => (
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
                            ฿{order.total_amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                            ฿{day.total_revenue.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>
                            -฿{day.total_discount.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            ฿{day.total_tax.toFixed(2)}
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
                            ฿{item.total_revenue.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.quantity_sold} sold
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
                            -฿{promo.total_discount.toFixed(2)}
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
