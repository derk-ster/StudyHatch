'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { isPremium, getUserLimits, getAllDecks, getDailyUsage, hasAISubscription, cancelAISubscription, getSubscriptionInfo } from '@/lib/storage';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCashAppPayment, setShowCashAppPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'ai-chat' | null>(null);
  const premium = isPremium();
  const limits = getUserLimits();
  const decks = getAllDecks();
  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
  const dailyUsage = getDailyUsage();
  const hasAISub = hasAISubscription();
  const subscriptionInfo = getSubscriptionInfo();
  const schoolMode = isSchoolModeEnabled();

  const handleUpgrade = async () => {
    setSelectedPlan('premium');
    setShowCashAppPayment(true);
  };

  const handleAISubscribe = async () => {
    setSelectedPlan('ai-chat');
    setShowCashAppPayment(true);
  };

  const handleCancelSubscription = () => {
    cancelAISubscription();
    setShowCancelConfirm(false);
    alert('Subscription cancelled. You will still have access until the end of your billing period.');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        {schoolMode && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 card-glow text-center">
            <h1 className="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              School Edition
            </h1>
            <p className="text-white/70">
              Payments and subscriptions are disabled in School Edition. All learning features are included for classroom use.
            </p>
          </div>
        )}
        {!schoolMode && (
          <>
        {/* Subscription Expiration Reminder */}
        {subscriptionInfo.isExpired && (
          <div className="mb-8 bg-red-500/20 border-2 border-red-500/50 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-400 mb-2">⚠️ Subscription Expired</h3>
                <p className="text-white/80">
                  Your AI Chat subscription has expired. Renew now to continue enjoying unlimited AI messages!
                </p>
              </div>
              <button
                onClick={handleAISubscribe}
                disabled={isLoading}
                className="ml-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              >
                Renew Now
              </button>
            </div>
          </div>
        )}
        {subscriptionInfo.isExpiringSoon && !subscriptionInfo.isExpired && (
          <div className="mb-8 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">⏰ Subscription Expiring Soon</h3>
                <p className="text-white/80">
                  Your AI Chat subscription expires in <strong>{subscriptionInfo.daysRemaining} day{subscriptionInfo.daysRemaining !== 1 ? 's' : ''}</strong>. Renew now to keep unlimited access!
                </p>
              </div>
              <button
                onClick={handleAISubscribe}
                disabled={isLoading}
                className="ml-6 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              >
                Renew Now
              </button>
            </div>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-white/80">
            Unlock unlimited decks and cards
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 card-glow">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Free</h2>
              <div className="text-4xl font-bold text-purple-400 mb-2">$0</div>
              <p className="text-white/70">Forever</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Up to {limits.maxDecks === Infinity ? 'unlimited' : limits.maxDecks} decks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Up to {limits.maxCards === Infinity ? 'unlimited' : limits.maxCards} total cards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>{limits.dailyTranslationLimit} words translated per day</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>{limits.dailyDeckLimit} deck{limits.dailyDeckLimit !== 1 ? 's' : ''} created per day</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>All study modes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Progress tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>{limits.dailyAILimit} AI chat messages per day</span>
              </li>
            </ul>
            <div className="text-center">
              <div className="px-6 py-3 bg-white/10 rounded-lg text-white/70">
                Current Plan
              </div>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-8 border-2 border-purple-500 card-glow relative">
            {premium && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Active
              </div>
            )}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Premium</h2>
              <div className="text-4xl font-bold text-purple-400 mb-2">$12.99</div>
              <p className="text-white/70">One-time payment</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited decks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited cards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited daily translations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited daily deck creation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>All study modes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Advanced progress tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>{limits.dailyAILimit} AI chat messages per day</span>
              </li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={isLoading || premium}
              className={`w-full px-6 py-3 rounded-lg font-bold transition-all ${
                premium
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg'
              }`}
            >
              {premium ? 'Already Premium' : isLoading ? 'Processing...' : 'Upgrade to Premium'}
            </button>
          </div>

          {/* AI Chat Subscription Plan */}
          <div className="md:col-span-2 flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-2xl p-8 border-2 border-green-500 card-glow relative">
            {hasAISub && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Active
              </div>
            )}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">AI Chat Access</h2>
                    <div className="text-4xl font-bold text-green-400 mb-2">$1.99</div>
              <p className="text-white/70">Per month</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited AI chat messages</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Study assistance & explanations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Vocabulary quizzes & practice</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Learning tips & strategies</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Cancel anytime</span>
              </li>
            </ul>
            {hasAISub ? (
              <div className="space-y-2">
                {subscriptionInfo.isExpiringSoon && !subscriptionInfo.isExpired && (
                  <div className="mb-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm font-medium text-center">
                      ⏰ Expires in {subscriptionInfo.daysRemaining} day{subscriptionInfo.daysRemaining !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                {subscriptionInfo.isExpired ? (
                  <button
                    onClick={handleAISubscribe}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Renew Subscription'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
                    >
                      Cancel Subscription
                    </button>
                    <p className="text-xs text-white/60 text-center">
                      {subscriptionInfo.isActive && subscriptionInfo.daysRemaining > 7
                        ? `Active - ${subscriptionInfo.daysRemaining} days remaining`
                        : 'Your subscription is active. Cancel anytime.'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleAISubscribe}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Subscribe for $1.99/month'}
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Current Usage */}
        <div className="mt-12 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 card-glow max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Your Current Usage</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-white/70 text-sm mb-2">Decks</div>
              <div className="text-3xl font-bold text-purple-400">
                {decks.length} {limits.maxDecks !== Infinity && `/ ${limits.maxDecks}`}
              </div>
            </div>
            <div>
              <div className="text-white/70 text-sm mb-2">Cards Created Today</div>
              <div className="text-3xl font-bold text-blue-400">
                {dailyUsage.translationsToday} / {limits.dailyTranslationLimit}
              </div>
            </div>
            {limits.dailyDeckLimit !== Infinity && (
              <div>
                <div className="text-white/70 text-sm mb-2">Decks Created Today</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {dailyUsage.decksCreatedToday} / {limits.dailyDeckLimit}
                </div>
              </div>
            )}
            {limits.dailyAILimit !== Infinity && (
              <div>
                <div className="text-white/70 text-sm mb-2">AI Messages Today</div>
                <div className="text-3xl font-bold text-indigo-400">
                  {dailyUsage.aiMessagesToday || 0} / {limits.dailyAILimit}
                </div>
              </div>
            )}
          </div>
          {limits.maxDecks !== Infinity && (decks.length >= limits.maxDecks || totalCards >= limits.maxCards) && (
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 font-medium">
                ⚠️ You&apos;ve reached the free limit. Upgrade to Premium to create more decks and cards!
              </p>
            </div>
          )}
        </div>

        {/* Payment Method Selector Modal */}
        {showCashAppPayment && selectedPlan && (
          <PaymentMethodSelector
            plan={selectedPlan}
            amount={selectedPlan === 'premium' ? 12.99 : 1.99}
            onSuccess={() => {
              setShowCashAppPayment(false);
              setSelectedPlan(null);
            }}
            onClose={() => {
              setShowCashAppPayment(false);
              setSelectedPlan(null);
            }}
          />
        )}

        {/* Cancel Subscription Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
              <h2 className="text-2xl font-bold mb-4">Cancel AI Chat Subscription?</h2>
              <p className="text-white/70 mb-6">
                Your subscription will remain active until the end of your current billing period. After that, you&apos;ll have access to 5 free AI messages per day.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
