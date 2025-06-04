"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PaymentForm({ orderId, amount, onSuccess, userEmail, onTokenExpired, loyaltyPoints: initialLoyaltyPoints, setLoyaltyPoints, cart }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [promoCode, setPromoCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [localLoyaltyPoints, setLocalLoyaltyPoints] = useState(initialLoyaltyPoints || 0); // Domyślna wartość 0

  const maxRedeemablePoints = Math.min(localLoyaltyPoints, Math.floor(amount / 10) * 100);
  const totalDiscount = Math.min(amount, promoDiscount + pointsDiscount);
  const finalAmount = Math.max(0, amount - totalDiscount);

  useEffect(() => {
    if (userEmail) {
      axios.get(`http://localhost:3004/api/loyalty/balance?email=${userEmail}`)
        .then(response => setLocalLoyaltyPoints(response.data.points))
        .catch(err => setError(`Błąd pobierania punktów: ${err.message}`));
    }
  }, [userEmail]);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    try {
      const response = await axios.post('http://localhost:3003/api/promo/validate', { code: promoCode });
      const discount = parseFloat(response.data.discount) || 0;
      setPromoDiscount(Math.min(amount, discount));
      setError(null);
    } catch (err) {
      setError(`Błąd: ${err.response?.data?.error || 'Nieprawidłowy kod promocyjny'}`);
      setPromoDiscount(0);
    }
  };

  const applyPoints = async () => {
    if (pointsToRedeem > maxRedeemablePoints || pointsToRedeem < 0) {
      setError('Nieprawidłowa liczba punktów do wykorzystania');
      setPointsDiscount(0);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3004/api/loyalty/redeem', {
        email: userEmail,
        points: pointsToRedeem,
      });
      const discount = response.data.discount || 0;
      setPointsDiscount(discount);
      setLocalLoyaltyPoints(response.data.remainingPoints);
      setError(null);
    } catch (err) {
      setError(`Błąd: ${err.response?.data?.error || 'Nie udało się zrealizować punktów'}`);
      setPointsDiscount(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      let payload;

      if (paymentMethod === 'card') {
        if (cardNumber !== '4242424242424242') {
          throw new Error('Nieprawidłowy numer karty. Użyj 4242424242424242 do testów.');
        }

        payload = {
          order_id: orderId,
          amount: finalAmount,
          payment_method: 'card',
          promo_code: promoCode.trim() === '' ? undefined : promoCode,
          transaction_id: `simulated_${Date.now()}`,
          user_email: userEmail && userEmail.trim() !== '' ? userEmail : undefined,
          points_to_redeem: pointsToRedeem || 0,
          cart_items: cart.map(item => ({
            product_id: Number(item.product.id),
            quantity: Number(item.quantity),
          })),
        };

        console.log('Wysyłanie żądania (card):', payload);
        response = await axios.post('http://localhost:3003/api/payments', payload);
      } else {
        payload = {
          order_id: orderId,
          amount: finalAmount,
          payment_method: paymentMethod,
          promo_code: promoCode.trim() === '' ? undefined : promoCode,
          user_email: userEmail && userEmail.trim() !== '' ? userEmail : undefined,
          points_to_redeem: pointsToRedeem || 0,
          cart_items: cart.map(item => ({
            product_id: Number(item.product.id),
            quantity: Number(item.quantity),
          })),
        };

        if (paymentMethod === 'mobile_app') {
          payload.mobile_transaction_id = `mobile_${Date.now()}`;
        }

        console.log('Wysyłanie żądania (inny sposób):', payload);
        response = await axios.post('http://localhost:3003/api/payments', payload);
      }

      // Synchronizacja punktów po płatności
      if (userEmail && pointsToRedeem > 0) {
        const balanceResponse = await axios.get(`http://localhost:3004/api/loyalty/balance?email=${userEmail}`);
        setLocalLoyaltyPoints(balanceResponse.data.points);
      }
      setLoyaltyPoints(localLoyaltyPoints); // Propagacja do rodzica
      onSuccess(response.data.confirmation);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'Płatność dla tego zamówienia już istnieje') {
        setError('Zamówienie o tym ID zostało już opłacone. Skontaktuj się z obsługą.');
      } else if (err.response?.status === 401) {
        onTokenExpired();
        setError('Sesja wygasła, zaloguj się ponownie');
      } else {
        setError(`Błąd: ${err.response?.status || 'Network'} - ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-600">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">Płatność</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-red-600 font-medium">Metoda płatności:</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black"
          >
            <option value="card">Karta</option>
            <option value="cash">Gotówka</option>
            <option value="mobile_app">Aplikacja mobilna</option>
          </select>
        </div>
        {paymentMethod === 'card' && (
          <div>
            <label className="block text-red-600 font-medium">Numer karty (test: 4242424242424242):</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Wprowadź numer karty"
              className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
            />
          </div>
        )}
        <div>
          <label className="block text-red-600 font-medium">Kod promocyjny:</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Wprowadź kod"
              className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
            />
            <button
              type="button"
              onClick={applyPromoCode}
              className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold"
            >
              Użyj
            </button>
          </div>
          {promoDiscount > 0 && (
            <p className="text-sm text-red-600 mt-1">Zniżka promocyjna: {promoDiscount} PLN</p>
          )}
        </div>
        {userEmail && (
          <div>
            <label className="block text-red-600 font-medium">
              Punkty lojalnościowe (dostępne: {localLoyaltyPoints})
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={pointsToRedeem}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 0 && value <= maxRedeemablePoints) {
                    setPointsToRedeem(value);
                  }
                }}
                placeholder="Wprowadź punkty"
                className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
                min="0"
                max={maxRedeemablePoints}
              />
              <button
                type="button"
                onClick={applyPoints}
                className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold"
              >
                Użyj
              </button>
            </div>
            {pointsDiscount > 0 && (
              <p className="text-sm text-red-600 mt-1">Zniżka z punktów: {pointsDiscount} PLN</p>
            )}
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || (paymentMethod === 'card' && !cardNumber)}
          className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold disabled:bg-gray-400"
        >
          {loading ? 'Przetwarzanie...' : `Zapłać ${finalAmount} PLN`}
        </button>
      </form>
    </div>
  );
}