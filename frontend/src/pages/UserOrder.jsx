import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';

export default function UserOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data } = await orderAPI.get(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch order');
    }
  };

  if (!order) return <div style={{ padding: '20px' }}>Loading...</div>;

  const statusMessages = {
    PENDING: '⏳ รอการยืนยัน',
    PREPARING: '👨‍🍳 กำลังเตรียม',
    READY: '✅ พร้อมเสิร์ฟแล้ว',
    COMPLETED: '✓ เสร็จสิ้น',
    CANCELLED: '❌ ยกเลิก',
    PAID: '💰 ชำระเงินแล้ว',
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <button onClick={() => navigate('/user')} style={{ marginBottom: '20px' }}>← กลับไปเมนู</button>
      
      <h1>รายการสั่งอาหาร #{order.order_number}</h1>
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: order.status === 'READY' ? '#d4edda' : '#f8f9fa',
        borderRadius: '5px',
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '24px'
      }}>
        {statusMessages[order.status] || order.status}
      </div>

      {order.table_id && (
        <div style={{ marginBottom: '20px' }}>
          <strong>โต๊ะ:</strong> {order.table_id}
        </div>
      )}

      <h2>รายการอาหาร</h2>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          {order.items?.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{item.item_name}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>x{item.quantity}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>฿{item.item_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '2px solid #333', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>ราคาสินค้า</span>
          <span>฿{order.subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>ภาษี</span>
          <span>฿{order.tax.toFixed(2)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: 'green' }}>
            <span>ส่วนลด</span>
            <span>-฿{order.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '24px', fontWeight: 'bold' }}>
          <span>รวมทั้งสิ้น</span>
          <span>฿{order.total_amount.toFixed(2)}</span>
        </div>
      </div>

      {order.status === 'READY' && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: '#d4edda', 
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          <h3>🍽️ อาหารพร้อมเสิร์ฟแล้ว!</h3>
          <p>กรุณามารับอาหารที่เคาน์เตอร์</p>
        </div>
      )}
    </div>
  );
}
