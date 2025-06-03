"use client";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

// Load Stripe with your publishable key (replace with your key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key');

export default function StripeProvider({ children }: { children: React.ReactNode }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    // Optionally fetch clientSecret if using PaymentIntents
    // For now, we only need stripePromise
  }, []);

  return (
    <Elements stripe={stripePromise} options={clientSecret ? { clientSecret } : undefined}>
      {children}
    </Elements>
  );
}