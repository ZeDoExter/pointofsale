import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../../services/api';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data } = await orderAPI.get(orderId);
      setOrder(data);
      setNewStatus(data.status);
    } catch (err) {
      alert('Failed to fetch order');
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      fetchOrder();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCheckout = async () => {
    try {
      const payload = {
        order_id: orderId,
        payment_method_id: 'cash',
        idempotency_key: `order-${orderId}-${Date.now()}`,
      };
      if (promoCode) {
        payload.promotion_code = promoCode;
      }
      await paymentAPI.checkout(payload);
      alert('Payment successful');
      fetchOrder();
    } catch (err) {
      alert('Payment failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!order) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: '20px' }}>← Back</button>
      
      <h2>Order #{order.order_number}</h2>
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Table:</strong> {order.table_id || 'N/A'}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
      </div>

      <h3>Items</h3>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '8px' }}>{item.item_name}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>฿{item.price.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>฿{item.item_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '2px solid #333' }}>
        <p><strong>Subtotal:</strong> ฿{order.subtotal.toFixed(2)}</p>
        <p><strong>Tax:</strong> ฿{order.tax.toFixed(2)}</p>
        {order.discount_amount > 0 && <p><strong>Discount:</strong> -฿{order.discount_amount.toFixed(2)}</p>}
        <h3><strong>Total:</strong> ฿{order.total_amount.toFixed(2)}</h3>
      </div>

      {order.status !== 'PAID' && order.status !== 'CANCELLED' && (
        <>
          <h3>Update Status</h3>
          <div style={{ marginBottom: '20px' }}>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ padding: '5px', marginRight: '10px' }}>
              <option value="PENDING">PENDING</option>
              <option value="PREPARING">PREPARING</option>
              <option value="READY">READY</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <button onClick={handleStatusUpdate}>Update</button>
          </div>

          <h3>Checkout</h3>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Promo code (optional)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              style={{ padding: '5px', marginRight: '10px', width: '200px' }}
            />
            <button onClick={handleCheckout} style={{ padding: '5px 20px' }}>Process Payment</button>
          </div>
        </>
      )}
    </div>
  );
}
