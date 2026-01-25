'use client';

import { useState, useEffect } from 'react';
import { setPremium, setAISubscription } from '@/lib/storage';

type PaymentPlan = 'premium' | 'ai-chat';

interface CashAppPaymentProps {
  plan: PaymentPlan;
  amount: number;
  cashAppTag?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function CashAppPayment({ plan, amount, cashAppTag, onSuccess, onClose }: CashAppPaymentProps) {
  const [step, setStep] = useState<'instructions' | 'verify'>('instructions');
  const [paymentCode, setPaymentCode] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cashAppTagFromAPI, setCashAppTagFromAPI] = useState<string | null>(null);
  
  // Get Cash App tag from environment or prop
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const envTag = process.env.NEXT_PUBLIC_CASH_APP_TAG || '$StudyHatch01';
      setCashAppTagFromAPI(cashAppTag || envTag);
    }
  }, [cashAppTag]);

  const handleGenerateCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          plan,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPaymentCode(data.paymentCode);
        // Use API tag if provided, otherwise keep the one from env/prop
        if (data.cashAppTag) {
          setCashAppTagFromAPI(data.cashAppTag);
        }
        setStep('verify');
      } else {
        setError(data.error || 'Failed to generate payment code');
      }
    } catch (error) {
      setError('Failed to generate payment code. Please try again.');
    } finally {
      setIsLoading(false);
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
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: verificationCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
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
            Pay with Cash App
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {step === 'instructions' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">💵</div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${amount.toFixed(2)}
              </div>
              <p className="text-white/70">
                {plan === 'premium' ? 'Premium - One-time payment' : 'AI Chat - Monthly subscription'}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-bold mb-3">How to pay:</h3>
              <ol className="list-decimal list-inside space-y-2 text-white/80 text-sm">
                <li>Click &quot;Generate Payment Code&quot; below</li>
                <li>Open Cash App on your phone</li>
                <li>Send ${amount.toFixed(2)} to <span className="font-bold text-green-400">{cashAppTagFromAPI || '$StudyHatch01'}</span></li>
                <li>Include the payment code in the note/memo</li>
                <li>Enter the code here to verify</li>
              </ol>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateCode}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating...' : 'Generate Payment Code'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {paymentCode}
              </div>
              <p className="text-white/70 text-sm mb-4">
                Send ${amount.toFixed(2)} to <span className="font-bold text-white">{cashAppTagFromAPI || '$StudyHatch01'}</span>
              </p>
              <p className="text-white/60 text-xs">
                Include this code in your Cash App payment note/memo
              </p>
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
              <p className="text-xs text-white/60 mt-2">
                Enter the code you included in your Cash App payment
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('instructions');
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

            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-400 text-xs">
              <strong>Note:</strong> After sending payment, enter the code above to activate your account. If you have issues, contact support.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
