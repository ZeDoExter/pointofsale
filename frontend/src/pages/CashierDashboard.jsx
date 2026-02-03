import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    table_id: '',
    items: [{ item_name: '', price: '', quantity: 1 }]
  });

  const userName = localStorage.getItem('name') || 'Cashier';
  const branchName = localStorage.getItem('branch_name') || 'Branch';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const createOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      
      const orderData = {
        table_id: newOrder.table_id || '',
        items: newOrder.items.filter(item => item.item_name && item.price),
        created_by: userId
      };

      const response = await fetch('http://localhost:8080/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert('Order created successfully!');
        setShowCreateOrder(false);
        setNewOrder({ table_id: '', items: [{ item_name: '', price: '', quantity: 1 }] });
        fetchOrders();
      } else {
        const error = await response.json();
        alert('Failed to create order: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        alert('Order status updated!');
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const addItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { item_name: '', price: '', quantity: 1 }]
    });
  };

  const updateItem = (index, field, value) => {
    const items = [...newOrder.items];
    items[index][field] = value;
    setNewOrder({ ...newOrder, items });
  };

  const removeItem = (index) => {
    const items = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#fbbf24';
      case 'CONFIRMED': return '#10b981';
      case 'PAID': return '#3b82f6';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

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
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>💰 Cashier POS</h1>
          <p style={{ margin: '5px 0 0 0', color: '#9ca3af' }}>{userName} - {branchName}</p>
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
            🍳 Kitchen View
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

      {/* Main Content */}
      <div style={{ padding: '30px' }}>
        {/* Action Bar */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateOrder(!showCreateOrder)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            ➕ New Order
          </button>
          <button
            onClick={fetchOrders}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Create Order Form */}
        {showCreateOrder && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Create New Order</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Table Number (optional)
              </label>
              <input
                type="text"
                value={newOrder.table_id}
                onChange={(e) => setNewOrder({ ...newOrder, table_id: e.target.value })}
                placeholder="e.g., 5"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Items</h3>
            {newOrder.items.map((item, index) => (
              <div key={index} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: '10px',
                marginBottom: '10px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Item Name</label>
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                    placeholder="e.g., Pad Thai"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Price</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                <button
                  onClick={() => removeItem(index)}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={addItem}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                + Add Item
              </button>
              <button
                onClick={createOrder}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Create Order
              </button>
              <button
                onClick={() => setShowCreateOrder(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#d1d5db',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Orders List */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Active Orders</h2>
          {orders.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '60px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              No orders yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    borderLeft: `6px solid ${getStatusColor(order.status)}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        Order #{order.order_number}
                      </h3>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getStatusColor(order.status),
                        color: 'white'
                      }}>
                        {order.status}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                        ฿{order.total_amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {order.status === 'OPEN' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✓ Confirm
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}

                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PAID')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        marginTop: '15px'
                      }}
                    >
                      💳 Mark as Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
