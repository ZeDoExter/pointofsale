import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../services/api';

export default function CreateOrder() {
  const [tableId, setTableId] = useState('');
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const navigate = useNavigate();

  const addItem = () => {
    if (!itemName || !price || !quantity) return;
    setItems([...items, { item_name: itemName, price: parseFloat(price), quantity: parseInt(quantity) }]);
    setItemName('');
    setPrice('');
    setQuantity('1');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    try {
      const { data } = await orderAPI.create({
        table_id: tableId || null,
        items: items,
      });
      navigate(`/admin/order/${data.order_id}`);
    } catch (err) {
      alert('Failed to create order');
    }
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div>
      <h2>Create New Order</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Table ID (optional): </label>
        <input
          type="text"
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          placeholder="e.g., A1"
          style={{ padding: '5px', marginLeft: '10px' }}
        />
      </div>

      <h3>Add Items</h3>
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Item name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          style={{ padding: '5px', flex: 2 }}
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ padding: '5px', flex: 1 }}
        />
        <input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{ padding: '5px', width: '60px' }}
        />
        <button onClick={addItem} style={{ padding: '5px 15px' }}>Add</button>
      </div>

      <h3>Order Items</h3>
      {items.length === 0 ? (
        <p>No items added yet</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
              <th style={{ padding: '8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px' }}>{item.item_name}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>฿{item.price.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>฿{(item.price * item.quantity).toFixed(2)}</td>
                <td style={{ padding: '8px' }}>
                  <button onClick={() => removeItem(idx)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #333' }}>
        <h3>Total: ฿{total.toFixed(2)}</h3>
        <button
          onClick={handleCreate}
          disabled={items.length === 0}
          style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
        >
          Create Order
        </button>
      </div>
    </div>
  );
}
