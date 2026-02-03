import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';

export default function UserMenu() {
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  const menuItems = [
    { name: 'ผัดไทย', price: 60 },
    { name: 'ข้าวผัด', price: 50 },
    { name: 'ต้มยำกุ้ง', price: 120 },
    { name: 'ส้มตำ', price: 40 },
    { name: 'ไก่ทอด', price: 80 },
    { name: 'น้ำเปล่า', price: 10 },
    { name: 'โค้ก', price: 20 },
  ];

  const addToCart = (item) => {
    const existing = cart.find(c => c.item_name === item.name);
    if (existing) {
      setCart(cart.map(c => 
        c.item_name === item.name 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, { item_name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemName, delta) => {
    setCart(cart.map(c => {
      if (c.item_name === itemName) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const handleOrder = async () => {
    if (cart.length === 0) {
      alert('กรุณาเลือกอาหาร');
      return;
    }
    try {
      const { data } = await orderAPI.create({
        table_id: tableId || null,
        items: cart,
      });
      navigate(`/user/order/${data.order_id}`);
    } catch (err) {
      alert('สั่งอาหารไม่สำเร็จ');
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>🍜 Restaurant Menu</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>โต๊ะ: </label>
        <input
          type="text"
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          placeholder="เช่น A1"
          style={{ padding: '5px', marginLeft: '10px' }}
        />
      </div>

      <h2>เมนู</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '30px' }}>
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
            onClick={() => addToCart(item)}
          >
            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
            <div style={{ color: '#666' }}>฿{item.price}</div>
          </div>
        ))}
      </div>

      <h2>🛒 ตะกร้า</h2>
      {cart.length === 0 ? (
        <p>ยังไม่มีรายการ</p>
      ) : (
        <>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
              <div>{item.item_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => updateQuantity(item.item_name, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.item_name, 1)}>+</button>
                <span style={{ minWidth: '60px', textAlign: 'right' }}>฿{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #333' }}>
            <h3>รวม: ฿{total.toFixed(2)}</h3>
            <button
              onClick={handleOrder}
              style={{ width: '100%', padding: '15px', fontSize: '18px', marginTop: '10px' }}
            >
              สั่งอาหาร
            </button>
          </div>
        </>
      )}
    </div>
  );
}
