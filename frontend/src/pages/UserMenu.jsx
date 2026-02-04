import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderAPI, productAPI, sessionAPI } from '../services/api';

export default function UserMenu() {
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({}); // { productId: { optionGroup: optionName } }
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionToken = searchParams.get('session') || '';
  const tableFromLink = searchParams.get('table') || '';

  useEffect(() => {
    if (tableFromLink) {
      setTableId(tableFromLink);
    }
    loadProducts();
  }, [sessionToken, tableFromLink]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      let organizationId = null;
      
      // If we have session token, get organization_id from session
      if (sessionToken) {
        try {
          const { data: session } = await sessionAPI.getByToken(sessionToken);
          organizationId = session.organization_id;
        } catch (err) {
          console.error('Failed to load session:', err);
          setError('ไม่พบ session กรุณาตรวจสอบ QR Code');
          setLoading(false);
          return;
        }
      }

      // Fetch products
      const params = {};
      if (organizationId) {
        // For now, we'll need to pass org_id via query param
        // But products API filters by organization_id from token
        // So we need to make products API public or accept org_id param
        params.organization_id = organizationId;
      }
      params.available_only = 'true';

      const { data } = await productAPI.list(params);
      const list = Array.isArray(data?.products) ? data.products : [];
      setProducts(list.filter(p => p.is_available));
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('โหลดเมนูไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (productId, optionGroup, optionName) => {
    setSelectedOptions(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [optionGroup]: optionName
      }
    }));
  };

  const getProductPrice = (product) => {
    let price = product.price;
    const options = selectedOptions[product.id] || {};
    
    // Add price modifiers from selected options
    if (product.options && Array.isArray(product.options)) {
      product.options.forEach(opt => {
        if (options[opt.option_group] === opt.option_name) {
          price += opt.price_modifier || 0;
        }
      });
    }
    
    return price;
  };

  const addToCart = (product) => {
    const finalPrice = getProductPrice(product);
    const options = selectedOptions[product.id] || {};
    
    // Check required options
    if (product.options && Array.isArray(product.options)) {
      const requiredGroups = [...new Set(product.options.filter(o => o.is_required).map(o => o.option_group))];
      const selectedGroups = Object.keys(options);
      const missingRequired = requiredGroups.filter(g => !selectedGroups.includes(g));
      
      if (missingRequired.length > 0) {
        alert(`กรุณาเลือก: ${missingRequired.join(', ')}`);
        return;
      }
    }

    const cartItem = {
      item_name: product.name,
      price: finalPrice,
      quantity: 1,
      menu_item_id: product.id,
      options: Object.entries(options).map(([group, name]) => {
        const opt = product.options?.find(o => o.option_group === group && o.option_name === name);
        return {
          option_group: group,
          option_name: name,
          price_modifier: opt?.price_modifier || 0
        };
      })
    };

    const existingIndex = cart.findIndex(c => 
      c.menu_item_id === product.id && 
      JSON.stringify(c.options) === JSON.stringify(cartItem.options)
    );

    if (existingIndex >= 0) {
      setCart(cart.map((c, idx) => 
        idx === existingIndex 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, cartItem]);
    }
  };

  const updateQuantity = (index, delta) => {
    setCart(cart.map((item, idx) => {
      if (idx === index) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
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
        qr_session_token: sessionToken || undefined,
      });
      navigate(`/user/order/${data.order_id}`);
    } catch (err) {
      alert('สั่งอาหารไม่สำเร็จ');
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Group options by option_group
  const getOptionGroups = (product) => {
    if (!product.options || !Array.isArray(product.options)) return [];
    const groups = {};
    product.options.forEach(opt => {
      if (!groups[opt.option_group]) {
        groups[opt.option_group] = {
          name: opt.option_group,
          options: [],
          isRequired: opt.is_required
        };
      }
      groups[opt.option_group].options.push(opt);
    });
    return Object.values(groups);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>🍜 Restaurant Menu</h1>

      {sessionToken && (
        <div style={{ margin: '10px 0 20px 0', padding: '12px', backgroundColor: '#ecfeff', border: '1px solid #bae6fd', borderRadius: '8px', color: '#0ea5e9' }}>
          Linked to table session: {tableFromLink || 'N/A'}
        </div>
      )}
      
      {error && (
        <div style={{ margin: '10px 0 20px 0', padding: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {!sessionToken && (
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
      )}

      <h2>เมนู</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดเมนู...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          ไม่มีเมนูในขณะนี้
        </div>
      ) : (
        <div style={{ marginBottom: '30px' }}>
          {products.map((product) => {
            const optionGroups = getOptionGroups(product);
            const currentOptions = selectedOptions[product.id] || {};
            
            return (
              <div
                key={product.id}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  backgroundColor: product.is_available ? 'white' : '#f5f5f5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                        {product.description}
                      </div>
                    )}
                    <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '16px' }}>
                      ฿{getProductPrice(product).toFixed(2)}
                    </div>
                  </div>
                  {product.is_available && (
                    <button
                      onClick={() => addToCart(product)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      + เพิ่ม
                    </button>
                  )}
                </div>

                {optionGroups.length > 0 && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    {optionGroups.map((group) => (
                      <div key={group.name} style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                          {group.name} {group.isRequired && <span style={{ color: '#dc2626' }}>*</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {group.options.map((opt) => {
                            const isSelected = currentOptions[group.name] === opt.option_name;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleOptionChange(product.id, group.name, opt.option_name)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: isSelected ? '#10b981' : '#f3f4f6',
                                  color: isSelected ? 'white' : '#374151',
                                  border: `1px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: isSelected ? '600' : '400'
                                }}
                              >
                                {opt.option_name}
                                {opt.price_modifier !== 0 && (
                                  <span style={{ marginLeft: '4px' }}>
                                    {opt.price_modifier > 0 ? '+' : ''}฿{opt.price_modifier.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2>🛒 ตะกร้า</h2>
      {cart.length === 0 ? (
        <p>ยังไม่มีรายการ</p>
      ) : (
        <>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{item.item_name}</div>
                {item.options && item.options.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {item.options.map((opt, i) => (
                      <span key={i}>
                        {opt.option_group}: {opt.option_name}
                        {i < item.options.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => updateQuantity(idx, -1)}
                  style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(idx, 1)}
                  style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  +
                </button>
                <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: '600' }}>
                  ฿{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #333' }}>
            <h3>รวม: ฿{total.toFixed(2)}</h3>
            <button
              onClick={handleOrder}
              style={{ width: '100%', padding: '15px', fontSize: '18px', marginTop: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              สั่งอาหาร
            </button>
          </div>
        </>
      )}
    </div>
  );
}
