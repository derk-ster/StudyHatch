'use client';

export const dynamic = 'force-dynamic';

import { useState, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Nav from '@/components/Nav';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function RequestVocabForm() {
  const stripe = useStripe();
  const elements = useElements();
  const apiBase = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    vocabRequest: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Create payment intent
      const paymentIntentResponse = await fetch(`${apiBase}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 5.00 }),
      });

      const { clientSecret } = await paymentIntentResponse.json();

      if (!clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.name,
            email: formData.email,
          },
        },
      });

      if (paymentError) {
        setErrorMessage(paymentError.message || 'Payment failed');
        setSubmitStatus('error');
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Send request to backend (without card info)
        const response = await fetch(`${apiBase}/api/request-vocab`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            vocabRequest: formData.vocabRequest,
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (response.ok) {
          setSubmitStatus('success');
          // Reset form after 5 seconds
          setTimeout(() => {
            setFormData({
              name: '',
              email: '',
              vocabRequest: '',
            });
            setSubmitStatus('idle');
            // Clear card element
            if (cardElement) {
              cardElement.clear();
            }
          }, 5000);
        } else {
          setErrorMessage('Failed to submit request. Payment was processed but request submission failed.');
          setSubmitStatus('error');
        }
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setErrorMessage(error.message || 'An error occurred. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        '::placeholder': {
          color: 'rgba(255, 255, 255, 0.5)',
        },
        iconColor: '#ffffff',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Request Your Own Vocab
          </h1>
          <p className="text-white/70 mb-8">
            Need a custom vocabulary deck? Request one for $5. Your request will be sent to our team, and you'll receive your custom deck within 3 days or your money back.
          </p>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 font-medium">
                ✓ Payment processed and request submitted successfully! You will receive your custom vocab deck within 3 days, or your payment will be refunded.
              </p>
            </div>
          )}

          {(submitStatus === 'error' || errorMessage) && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 font-medium">
                ✗ {errorMessage || 'There was an error processing your request. Please try again.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="vocabRequest" className="block text-sm font-medium text-white/90 mb-2">
                Vocabulary Request Details
              </label>
              <textarea
                id="vocabRequest"
                name="vocabRequest"
                value={formData.vocabRequest}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Describe the vocabulary deck you'd like. Include topics, themes, or specific words you want to learn..."
              />
            </div>

            <div className="border-t border-white/20 pt-6">
              <h2 className="text-2xl font-bold text-white mb-4">Payment Information</h2>
              <p className="text-white/70 text-sm mb-6">
                Payment: $5.00 USD
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Card Details
                </label>
                <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/20">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white/80 text-sm">
                <strong className="text-white">Terms:</strong> Your request will be sent to our team. The custom vocabulary deck you request will be created and made publicly available to all users on the website (not just you). Your payment of $5.00 will be processed automatically. You will receive your custom vocabulary deck within 3 business days. If the deck is not provided within 3 days, your payment will be refunded.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !stripe}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing Payment...' : 'Submit Request & Pay $5.00'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function RequestVocabPage() {
  return (
    <Elements stripe={stripePromise}>
      <RequestVocabForm />
    </Elements>
  );
}
