import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../services/api';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const { data } = await orderAPI.list({ status: filter });
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  return (
    <div>
      <h2>Orders</h2>
      <div style={{ marginBottom: '15px' }}>
        <label>Filter by status: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '5px' }}>
          <option value="">All</option>
          <option value="PENDING">PENDING</option>
          <option value="PREPARING">PREPARING</option>
          <option value="READY">READY</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button onClick={fetchOrders} style={{ marginLeft: '10px' }}>Refresh</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Order #</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Table</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{order.order_number}</td>
              <td style={{ padding: '10px' }}>{order.table_id || '-'}</td>
              <td style={{ padding: '10px' }}>{order.status}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>฿{order.total_amount?.toFixed(2)}</td>
              <td style={{ padding: '10px' }}>{new Date(order.created_at).toLocaleString()}</td>
              <td style={{ padding: '10px' }}>
                <Link to={`/admin/order/${order.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p>No orders found</p>}
    </div>
  );
}
