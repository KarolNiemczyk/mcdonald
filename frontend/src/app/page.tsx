"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import ProductCustomization from './components/ProductCustomization';
import PaymentForm from './components/PaymentForm';
import Register from './components/Register';

export default function Home() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category_id: 1,
    calories: '',
    ingredients: '',
  });
  const [orderId, setOrderId] = useState(null);
  const [orderAmount, setOrderAmount] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('on-site');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
  });
  const [showRegister, setShowRegister] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0); // Added

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded = jwt.decode(storedToken);
        setRoleId(decoded?.role_id || null);
      } catch (err) {
        console.error('Błąd dekodowania tokenu:', err);
        setRoleId(null);
      }
    }

    const fetchMenu = async () => {
      try {
        const menuResponse = await axios.get('http://localhost:3001/api/menu');
        setMenu(menuResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Nie udało się pobrać danych');
        setLoading(false);
      }
    };

    const fetchLoyaltyPoints = async () => {
      if (storedToken) {
        try {
          const response = await axios.get('http://localhost:3004/api/loyalty/balance', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setLoyaltyPoints(response.data.points || 0);
        } catch (err) {
          console.error('Błąd pobierania punktów lojalnościowych:', err.response?.data || err.message);
          setLoyaltyPoints(0);
        }
      }
    };

    fetchMenu();
    fetchLoyaltyPoints();
  }, []);

  const login = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/login', {
        email,
        password,
      });
      const { token } = response.data;
      setToken(token);
      localStorage.setItem('token', token);
      try {
        const decoded = jwt.decode(token);
        setRoleId(decoded?.role_id || null);
      } catch (err) {
        console.error('Błąd dekodowania tokenu w login:', err);
      }
      try {
        const pointsResponse = await axios.get('http://localhost:3004/api/loyalty/balance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLoyaltyPoints(pointsResponse.data.points || 0);
      } catch (err) {
        console.error('Błąd pobierania punktów po login:', err.response?.data || err.message);
        setLoyaltyPoints(0);
      }
      alert('Zalogowano!');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      alert('Błąd logowania: ' + (err.response?.data?.error || err.message));
    }
  };

  const logout = () => {
    setToken(null);
    setRoleId(null);
    setLoyaltyPoints(0); // Added
    localStorage.removeItem('token');
    alert('Wylogowano');
  };

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const submitOrder = async () => {
    if (deliveryOption === 'on-site' && !tableNumber) {
      alert('Wprowadź numer stolika dla opcji na miejscu');
      return;
    }
    if (deliveryOption === 'delivery' && (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.postalCode)) {
      alert('Wypełnij wszystkie pola adresu dla dostawy');
      return;
    }
  
    try {
      const payload = {
        delivery_option: deliveryOption,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          customizations: item.customizations,
        })),
      };
  
      if (deliveryOption === 'on-site') {
        payload.table_number = parseInt(tableNumber) || 1;
      } else if (deliveryOption === 'delivery') {
        payload.delivery_address = {
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          postalCode: deliveryAddress.postalCode,
        };
      }
  
      const response = await axios.post('http://localhost:3002/api/orders', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setOrderId(response.data.id);
      setOrderAmount(response.data.total_price);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        alert('Sesja wygasła, zaloguj się ponownie');
      } else {
        alert('Błąd podczas składania zamówienia: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handlePaymentSuccess = (confirmation) => {
    setLoyaltyPoints((prev) => prev + (confirmation.pointsEarned || 0) - (confirmation.pointsRedeemed || 0)); // Added
    alert(`Zamówienie złożone i opłacone! Potwierdzenie: ${JSON.stringify(confirmation)}`);
    setCart([]);
    setOrderId(null);
    setOrderAmount(null);
    setTableNumber('');
    setDeliveryAddress({ street: '', city: '', postalCode: '' });
  };

  const addProduct = async () => {
    if (!token) {
      alert('Zaloguj się, aby dodać produkt');
      return;
    }
    if (roleId !== 1) {
      alert('Tylko użytkownicy z role_id=1 mogą dodawać produkty');
      return;
    }
    const { name, price, category_id, calories, ingredients } = newProduct;
    if (!name || !price || !calories) {
      alert('Wypełnij wszystkie pola: nazwa, cena, kalorie');
      return;
    }
    const priceFloat = parseFloat(price);
    const caloriesInt = parseInt(calories);
    if (isNaN(priceFloat) || priceFloat <= 0) {
      alert('Cena musi być liczbą dodatnią');
      return;
    }
    if (isNaN(caloriesInt) || caloriesInt < 0) {
      alert('Kalorie muszą być liczbą nieujemną');
      return;
    }
    const payload = {
      name,
      price: priceFloat,
      category_id: parseInt(category_id),
      nutritional_info: { calories: caloriesInt },
      ingredients: ingredients ? ingredients.split(',').map(i => i.trim()).filter(i => i) : [],
    };
    try {
      const response = await axios.post('http://localhost:3001/api/products', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Produkt dodany!');
      const menuResponse = await axios.get('http://localhost:3001/api/menu');
      setMenu(menuResponse.data);
      setNewProduct({ name: '', price: '', category_id: 1, calories: '', ingredients: '' });
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        alert('Sesja wygasła, zaloguj się ponownie');
      } else if (err.response?.status === 403) {
        alert('Brak uprawnień do dodawania produktów');
      } else {
        console.error('Error:', err.response?.data || err.message);
        alert('Błąd podczas dodawania produktu: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddressInput = (e) => {
    const { name, value } = e.target;
    setDeliveryAddress({ ...deliveryAddress, [name]: value });
  };

  const toggleAuthForm = () => {
    setShowRegister(!showRegister);
    setEmail('');
    setPassword('');
    setError(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-3xl font-semibold text-red-600">Ładowanie</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-3xl font-semibold text-red-600">Błąd: {error}</div>;

  return (
    <div className="min-h-screen bg-yellow-400">
      <header className="bg-red-600 text-white p-6 shadow-lg">
        <h1 className="text-4xl font-semibold text-center">McDonald's Kiosk</h1>
      </header>
      <main className="container mx-auto p-6">
        {!token && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-red-600">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">{showRegister ? 'Rejestracja' : 'Logowanie'}</h2>
            {showRegister ? (
              <Register />
            ) : (
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                />
                <input
                  type="password"
                  placeholder="Hasło"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-400"
                />
                <button
                  onClick={login}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition font-semibold"
                >
                  Zaloguj
                </button>
              </div>
            )}
            <button
              onClick={toggleAuthForm}
              className="mt-4 w-full mr-2 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition font-semibold"
            >
              {showRegister ? 'Przełącz na Logowanie' : 'Przełącz na Rejestrację'}
            </button>
          </div>
        )}
        {token && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-red-600">
            <div className="flex justify-between items-center">
              <span className="text-red-600 font-medium">Punkty lojalnościowe: {loyaltyPoints}</span> {/* Added */}
              <button
                onClick={logout}
                className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition font-semibold"
              >
                Wyloguj
              </button>
            </div>
            {roleId === 1 && (
              <>
                <h2 className="text-2xl font-semibold text-red-600 mt-4 mb-4">Dodaj produkt</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nazwa produktu"
                    value={newProduct.name}
                    onChange={handleInput}
                    className="p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                  <input
                    type="number"
                    name="price"
                    placeholder="Cena"
                    value={newProduct.price}
                    onChange={handleInput}
                    step="0.01"
                    className="p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                  <input
                    type="number"
                    name="category_id"
                    placeholder="ID kategorii"
                    value={newProduct.category_id}
                    onChange={handleInput}
                    className="p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                  <input
                    type="number"
                    name="calories"
                    placeholder="Kalorie"
                    value={newProduct.calories}
                    onChange={handleInput}
                    className="p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                  <input
                    type="text"
                    name="ingredients"
                    placeholder="Składniki (oddziel przecinkami)"
                    value={newProduct.ingredients}
                    onChange={handleInput}
                    className="p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={addProduct}
                  className="mt-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold"
                >
                  Dodaj produkt
                </button>
              </>
            )}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-red-600">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Koszyk ({cart.length})</h2>
          <ul className="space-y-2">
            {cart.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-black">
                <span className="font-medium">{item.product.name} x{item.quantity}</span>
                {Object.keys(item.customizations).length > 0 && (
                  <span className="text-sm text-red-600">({JSON.stringify(item.customizations)})</span>
                )}
              </li>
            ))}
          </ul>
          {cart.length > 0 && !orderId && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-red-600 font-medium">Opcja dostawy:</label>
                <select
                  value={deliveryOption}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black"
                >
                  <option value="on-site">Na miejscu</option>
                  <option value="delivery">Dostawa</option>
                  <option value="pickup">Odbiór</option>
                </select>
              </div>
              {deliveryOption === 'on-site' && (
                <div>
                  <label className="block text-red-600 font-medium">Numer stolika:</label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Wprowadź numer stolika"
                    className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                  />
                </div>
              )}
              {deliveryOption === 'delivery' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-red-600 font-medium">Ulica:</label>
                    <input
                      type="text"
                      name="street"
                      value={deliveryAddress.street}
                      onChange={handleAddressInput}
                      placeholder="Wprowadź ulicę"
                      className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-red-600 font-medium">Miasto:</label>
                    <input
                      type="text"
                      name="city"
                      value={deliveryAddress.city}
                      onChange={handleAddressInput}
                      placeholder="Wprowadź miasto"
                      className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-red-600 font-medium">Kod pocztowy:</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={deliveryAddress.postalCode}
                      onChange={handleAddressInput}
                      placeholder="Wprowadź kod pocztowy"
                      className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={submitOrder}
                className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold"
              >
                Złóż zamówienie
              </button>
            </div>
          )}
          {orderId && orderAmount && (
            <PaymentForm
              orderId={orderId}
              amount={orderAmount}
              onSuccess={handlePaymentSuccess}
              token={token}
              onTokenExpired={logout}
              loyaltyPoints={loyaltyPoints} // Added
              setLoyaltyPoints={setLoyaltyPoints} // Added
              cart={cart}
            />
          )}
        </div>
        {menu.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-red-600">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.products.map((product) => (
                <ProductCustomization
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}