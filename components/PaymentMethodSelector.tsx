'use client';

import { useState } from 'react';
import { setPremium, setAISubscription } from '@/lib/storage';

type PaymentPlan = 'premium' | 'ai-chat';
type PaymentMethod = 'cashapp' | 'paypal';

interface PaymentMethodSelectorProps {
  plan: PaymentPlan;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PaymentMethodSelector({ plan, amount, onSuccess, onClose }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const normalizeCashAppTag = (tag: string) => {
    const trimmed = tag.trim();
    return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
  };

  const normalizePaypalUsername = (username: string) => username.trim().replace(/^@/, '');

  const handleSelectMethod = async (method: PaymentMethod) => {
    if (method === 'cashapp') {
      // Generate payment code first
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBase}/api/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            plan,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          const cashAppTag = normalizeCashAppTag(
            data.cashAppTag || process.env.NEXT_PUBLIC_CASH_APP_TAG || '$StudyHatch01'
          );
          // Open Cash App link in new tab (works on mobile too - will open app if installed)
          const cashAppLink = `https://cash.app/${cashAppTag.replace('$', '')}/${amount}`;
          window.open(cashAppLink, '_blank');
          setSelectedMethod('cashapp');
          setPaymentCode(data.paymentCode);
        } else {
          setError(data.error || 'Failed to generate payment code');
        }
      } catch (error) {
        setError('Failed to generate payment code');
      } finally {
        setIsLoading(false);
      }
    } else if (method === 'paypal') {
      // Generate payment code first
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBase}/api/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            plan,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          const paypalUsername = normalizePaypalUsername(
            data.paypalUsername || process.env.NEXT_PUBLIC_PAYPAL_USERNAME || 'StudyHatch01'
          );
          if (paypalUsername) {
            // If username is set, open PayPal.me link
            const paypalLink = `https://www.paypal.com/paypalme/${paypalUsername}/${amount}?note=${encodeURIComponent(data.paymentCode)}`;
            window.open(paypalLink, '_blank');
          }
          setSelectedMethod('paypal');
          setPaymentCode(data.paymentCode);
        } else {
          setError(data.error || 'Failed to generate payment code');
        }
      } catch (error) {
        setError('Failed to generate payment code');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyPayment = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter your payment code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${apiBase}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: verificationCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Activate the plan
        if (data.plan === 'premium') {
          setPremium(true);
        } else if (data.plan === 'ai-chat') {
          const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
          setAISubscription('active', expiresAt);
        }
        
        onSuccess();
        onClose();
        window.location.reload();
      } else {
        setError(data.error || 'Payment verification failed');
      }
    } catch (error) {
      setError('Failed to verify payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Choose Payment Method
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {!selectedMethod ? (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-6 text-center mb-6">
              <div className="text-4xl mb-4">💵</div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${amount.toFixed(2)}
              </div>
              <p className="text-white/70">
                {plan === 'premium' ? 'Premium - One-time payment' : 'AI Chat - Monthly subscription'}
              </p>
            </div>

            {/* Payment Method Options */}
            <button
              onClick={() => handleSelectMethod('cashapp')}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">💵</span>
              <span>Cash App</span>
            </button>

            <button
              onClick={() => handleSelectMethod('paypal')}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">💳</span>
              <span>PayPal</span>
            </button>

          </div>
        ) : selectedMethod === 'cashapp' ? (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {paymentCode}
              </div>
              <p className="text-white/70 text-sm mb-4">
                Send ${amount.toFixed(2)} via Cash App
              </p>
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-xs mb-4">
                <strong>Important:</strong> Include this payment code in your Cash App payment note/memo so we can verify your payment.
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-left">
                <h3 className="font-bold mb-2 text-white">How to pay:</h3>
                <ol className="list-decimal list-inside space-y-2 text-white/80 text-sm">
                  <li>Open Cash App on your phone or computer</li>
                  <li>Send ${amount.toFixed(2)} to the Cash App tag shown</li>
                  <li><strong>Include this code in the payment note:</strong> <span className="font-mono text-green-400">{paymentCode}</span></li>
                  <li>Come back here and enter the code below to verify</li>
                </ol>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Enter Payment Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="STUDY-XXXXX-XXXX"
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setVerificationCode('');
                  setError('');
                }}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={isLoading || !verificationCode.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Payment'}
              </button>
            </div>
          </div>
        ) : selectedMethod === 'paypal' ? (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {paymentCode}
              </div>
              <p className="text-white/70 text-sm mb-4">
                Send ${amount.toFixed(2)} via PayPal
              </p>
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-blue-400 text-xs mb-4">
                <strong>Important:</strong> Include this payment code in your PayPal payment note/memo so we can verify your payment.
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-left">
                <h3 className="font-bold mb-2 text-white">How to pay:</h3>
                <ol className="list-decimal list-inside space-y-2 text-white/80 text-sm">
                  <li>Open PayPal on your phone or computer</li>
                  <li>Send ${amount.toFixed(2)} to the PayPal account</li>
                  <li><strong>Include this code in the payment note:</strong> <span className="font-mono text-blue-400">{paymentCode}</span></li>
                  <li>Come back here and enter the code below to verify</li>
                </ol>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Enter Payment Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="STUDY-XXXXX-XXXX"
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setVerificationCode('');
                  setError('');
                }}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={isLoading || !verificationCode.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Payment'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
