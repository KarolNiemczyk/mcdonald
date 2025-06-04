"use client";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51YourPublishableKeyHere');

export default function StripeProvider({ children, clientSecret }) {
  return (
    <Elements stripe={stripePromise} options={clientSecret ? { clientSecret } : undefined}>
      {children}
    </Elements>
  );
}