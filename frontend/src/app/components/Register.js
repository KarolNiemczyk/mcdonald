"use client";
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:3001/api/register', { email, password });
      localStorage.setItem('token', response.data.token);
      router.push('/'); // Redirect to home
    } catch (err) {
      setError(err.response?.data?.error || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-600 max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">Rejestracja</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-red-600 font-medium">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black"
            required
          />
        </div>
        <div>
          <label className="block text-red-600 font-medium">Hasło:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border-2 border-red-600 rounded-md bg-white text-black"
            required
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition font-semibold disabled:bg-gray-400"
        >
          {loading ? 'Rejestracja...' : 'Zarejestruj'}
        </button>
      </form>
    </div>
  );
}