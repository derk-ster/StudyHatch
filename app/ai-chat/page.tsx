'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { getDeckById, getAllDecks, getDailyUsage, getTimeUntilReset, incrementDailyAIMessages, canSendAIMessage, getUserLimits, hasAISubscription, getSubscriptionInfo, getEffectiveClassSettingsForUser } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { isSchoolModeEnabled } from '@/lib/school-mode';
import { recordStudentActivityForClasses } from '@/lib/activity-log';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export default function AIChatPage() {
  const router = useRouter();
  const { session } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const schoolMode = isSchoolModeEnabled();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const decks = getAllDecks();
  const dailyUsage = getDailyUsage();
  const limits = getUserLimits();
  const hasSubscription = hasAISubscription();
  const subscriptionInfo = getSubscriptionInfo();
  const canSend = canSendAIMessage();
  const selectedDeck = selectedDeckId ? getDeckById(selectedDeckId) : null;
  const effectiveSettings = session?.userId && session.role ? getEffectiveClassSettingsForUser(session.userId, session.role) : null;
  const aiEnabled = !schoolMode || (effectiveSettings?.aiTutorEnabled ?? false);

  // Load messages from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai-chat-messages');
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('ai-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !canSend.allowed || !aiEnabled) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Track usage
    incrementDailyAIMessages();

    // Generate AI response using Groq API
    try {
      const response = await fetch(`${apiBase}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          deckId: selectedDeckId,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          allowAI: aiEnabled,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const aiResponse: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, aiResponse]);
        if (session?.userId) {
          recordStudentActivityForClasses(session.userId, 'ai_chat', 'Sent an AI tutor message.');
        }
        setIsLoading(false);
        return;
      } else {
        // Handle API errors
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to get AI response';
        
        const errorResponse: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: errorData.needsConfiguration 
            ? `⚠️ AI service not configured. Please set OPENAI_API_KEY in your environment variables to enable AI chat.`
            : `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorResponse]);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      const errorResponse: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your internet connection and try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };


  const handleClearChat = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([]);
      localStorage.removeItem('ai-chat-messages');
    }
  };

  const remainingMessages = hasSubscription 
    ? 'Unlimited' 
    : Math.max(0, limits.dailyAILimit - dailyUsage.aiMessagesToday);

  return (
    <div className="min-h-screen bg-noise flex flex-col">
      <Nav />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
        {/* Subscription Reminder Banner */}
        {!schoolMode && subscriptionInfo.isExpired && (
          <div className="mb-6 bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-400 mb-1">⚠️ Subscription Expired</h3>
                <p className="text-white/80 text-sm">
                  Your AI Chat subscription has expired. Renew now to continue enjoying unlimited AI messages!
                </p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
              >
                Renew Now
              </button>
            </div>
          </div>
        )}
        {!schoolMode && subscriptionInfo.isExpiringSoon && !subscriptionInfo.isExpired && (
          <div className="mb-6 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-400 mb-1">⏰ Subscription Expiring Soon</h3>
                <p className="text-white/80 text-sm">
                  Your AI Chat subscription expires in <strong>{subscriptionInfo.daysRemaining} day{subscriptionInfo.daysRemaining !== 1 ? 's' : ''}</strong>. Renew now to keep unlimited access!
                </p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all"
              >
                Renew Now
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="mb-6 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Study Assistant</h1>
              <p className="text-white/70">Ask me anything about your vocabulary!</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70 mb-1">Messages Today</div>
              <div className="text-2xl font-bold text-purple-400">
                {hasSubscription ? '∞' : `${remainingMessages} / ${limits.dailyAILimit}`}
              </div>
              {!schoolMode && !hasSubscription && dailyUsage.aiMessagesToday >= limits.dailyAILimit && (
                <div className="text-xs text-yellow-400 mt-1">
                  Resets in {Math.ceil(getTimeUntilReset() / (60 * 60 * 1000))}h
                </div>
              )}
            </div>
          </div>
          {schoolMode && !aiEnabled && (
            <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              {session?.role === 'teacher'
                ? 'AI tutor is currently disabled. Enable it in the Teacher Dashboard.'
                : 'AI tutor is currently disabled for your class. Ask your teacher to enable it.'}
            </div>
          )}

          {/* Deck Selector */}
          {decks.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-white/90 mb-2">
                Study Deck (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedDeckId || ''}
                  onChange={(e) => setSelectedDeckId(e.target.value || null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No deck selected</option>
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id} className="bg-gray-800">
                      {deck.name} ({deck.cards.length} cards)
                    </option>
                  ))}
                </select>
                {selectedDeck && <LanguageBadge languageCode={selectedDeck.targetLanguage} />}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20 mb-4 overflow-y-auto min-h-[400px] max-h-[600px]">
          {messages.length === 0 ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg">Start a conversation with your AI study assistant!</p>
              <p className="text-sm mt-2">Try asking: &quot;Quiz me on my deck&quot; or &quot;Explain the word &apos;hello&apos;&quot;</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20">
          {!canSend.allowed && !schoolMode && (
            <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 font-medium mb-2">
                {canSend.reason}
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
              >
                Subscribe for Unlimited AI Chat
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={aiEnabled ? "Ask me anything about your vocabulary..." : "AI tutor disabled by your teacher"}
              disabled={!canSend.allowed || isLoading || !aiEnabled}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!canSend.allowed || isLoading || !input.trim() || !aiEnabled}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                title="Clear chat"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
