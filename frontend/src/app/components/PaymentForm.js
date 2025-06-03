"use client";
import { useState } from 'react';
import { CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';

export default function PaymentForm({ orderId, amount, onSuccess, token, onTokenExpired }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        order_id: orderId,
        amount,
        payment_method: paymentMethod,
        promo_code: promoCode || undefined,
      };

      if (paymentMethod === 'card') {
        payload.card_payment_id = `pm_card_visa_${Date.now()}`;
      } else if (paymentMethod === 'mobile_app') {
        payload.mobile_transaction_id = `mobile_${Date.now()}`;
      }

      let response;
      try {
        response = await axios.post('http://localhost:3003/api/payments', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (err) {
        if (err.response?.status === 401 && token) {
          response = await axios.post('http://localhost:3003/api/payments', payload);
        } else {
          console.error('Payment request failed:', err.message, err.config);
          throw err;
        }
      }

      onSuccess(response.data.confirmation);
    } catch (err) {
      if (err.response?.status === 401) {
        onTokenExpired();
        setError('Sesja wygasła, zaloguj się ponownie');
      } else {
        setError(`Błąd: ${err.response?.status || 'Network'} - ${err.message}`);
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
            <label className="block text-red-600 font-medium">Dane karty:</label>
            <CardElement className="p-2 border-2 border-red-600 rounded-md bg-white" />
          </div>
        )}
        <div>
          <label className="block text-red-600 font-medium">Kod promocyjny:</label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Wprowadź kod"
            className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black placeholder-gray-500"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold disabled:bg-gray-400"
        >
          {loading ? 'Przetwarzanie...' : 'Zapłać'}
        </button>
      </form>
    </div>
  );
}
