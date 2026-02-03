import { useEffect, useState } from 'react';
import '../App.css';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const branchId = localStorage.getItem('branch_id');
    const orgId = localStorage.getItem('organization_id');
    const role = localStorage.getItem('role');

    // Connect to WebSocket
    const wsUrl = `ws://localhost:8080/ws?branch_id=${branchId}&organization_id=${orgId}&role=${role}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);

      if (data.type === 'order_created') {
        fetchOrders();
      } else if (data.type === 'order_status_updated') {
        fetchOrders();
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
      setConnected(false);
    };

    setWs(websocket);

    // Initial fetch
    fetchOrders();

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
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
      setOrders(data.filter(order => order.status === 'OPEN' || order.status === 'CONFIRMED'));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#fbbf24';
      case 'CONFIRMED': return '#10b981';
      case 'PAID': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1f2937', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>🍳 Kitchen Display</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connected ? '#10b981' : '#ef4444'
          }}></div>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          <span style={{ marginLeft: '20px', fontSize: '24px' }}>
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '20px', color: '#9ca3af' }}>
          No active orders
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                backgroundColor: '#374151',
                borderRadius: '12px',
                padding: '20px',
                borderLeft: `6px solid ${getStatusColor(order.status)}`,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                    #{order.order_number}
                  </h2>
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
                  <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                    ฿{order.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>ITEMS</div>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: idx < order.items.length - 1 ? '1px solid #4b5563' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>
                        {item.quantity}x {item.menu_item_name}
                      </span>
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                        {item.item_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
