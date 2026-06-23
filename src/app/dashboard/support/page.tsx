"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HelpCircle, ChevronRight, ChevronDown, Search, Mail, MessageCircle, Copy, CheckCircle2, Clock, Send, Bot, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { openCrispChat } from "@/components/CrispChat";

const faqSections = [
  {
    title: "Getting Started",
    items: [
      { q: "How do I create an account?", a: "Click 'Start Investing' on the homepage, enter your full name, email, and password. After verifying your email, complete the KYC verification to unlock all features." },
      { q: "What is KYC and why is it required?", a: "KYC (Know Your Customer) is a regulatory requirement. We verify your identity to comply with FCA regulations and protect against fraud. It typically takes under 24 hours." },
      { q: "What is the minimum deposit?", a: "The minimum deposit is $50 USD. You can deposit using any of our supported cryptocurrencies including BTC, ETH, USDT, and more." },
      { q: "How do I deposit funds?", a: "Go to Dashboard → Deposit, select your cryptocurrency, enter the amount, and send funds to the generated wallet address. Deposits are credited within 1-3 network confirmations." },
      { q: "Is Naxcal regulated?", a: "Yes, Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority (FCA). Your capital is protected under the compensation scheme." },
    ],
  },
  {
    title: "Returns & Profits",
    items: [
      { q: "How are daily returns calculated?", a: "Returns are calculated based on your investment tier: Bronze (1.5%), Silver (1.8%), or Gold (2.1%). Returns are posted daily and automatically added to your balance." },
      { q: "When are profits posted?", a: "Daily profits are typically posted between 8:00-10:00 AM UTC each day. You'll receive an email notification when your return is credited." },
      { q: "Can I reinvest my profits?", a: "Yes, auto-compound is enabled by default. Your daily returns are automatically reinvested. You can change this in Settings → Preferences." },
      { q: "What trading strategies does Naxcal use?", a: "We employ AI-driven algorithmic strategies across forex, equities, crypto, and commodities. Our diversified approach manages risk while targeting consistent daily returns." },
    ],
  },
  {
    title: "Withdrawals",
    items: [
      { q: "How do I withdraw funds?", a: "Go to Dashboard → Withdraw, select the cryptocurrency, enter the amount and your wallet address, then enter your 6-digit withdrawal PIN. Withdrawals are processed within 24 hours." },
      { q: "What is the minimum withdrawal?", a: "The minimum withdrawal amount is $100 USD." },
      { q: "How long do withdrawals take?", a: "Withdrawals are typically processed within 24 hours. After processing, blockchain confirmations may take additional time depending on network congestion." },
      { q: "Why was my withdrawal rejected?", a: "Common reasons include: KYC not completed, insufficient balance, invalid wallet address, or security hold. Contact support for specific details." },
    ],
  },
  {
    title: "Security",
    items: [
      { q: "How is my account secured?", a: "We use 256-bit SSL encryption, two-factor authentication (2FA), and advanced fraud detection. Your funds are stored in cold wallets with multi-signature protection." },
      { q: "What should I do if I suspect unauthorized access?", a: "Immediately change your password, enable 2FA if not already active, and contact security@naxcal.com. We can freeze your account to prevent unauthorized transactions." },
      { q: "How do I enable two-factor authentication?", a: "Go to Settings → Security → Two-Factor Authentication and follow the setup instructions using an authenticator app like Google Authenticator or Authy." },
    ],
  },
  {
    title: "Account",
    items: [
      { q: "How do I upgrade my investment tier?", a: "Tiers are automatically upgraded based on your total balance: Bronze ($0+), Silver ($5,000+), Gold ($25,000+). Simply deposit more to upgrade." },
      { q: "How do I set my withdrawal PIN?", a: "Go to Settings → Security → Withdrawal PIN. Enter a 6-digit numeric PIN. This PIN is required for all withdrawal requests." },
      { q: "Can I download my transaction history?", a: "Yes, go to Dashboard → Quick Actions → Statement to download a CSV of all your transactions." },
    ],
  },
];

// AI knowledge base for the chatbot
const AI_RESPONSES: { keywords: string[]; response: string }[] = [
  { keywords: ["deposit", "fund", "add money", "top up"], response: "To deposit funds:\n\n1. Go to **Dashboard → Deposit**\n2. Select your cryptocurrency (BTC, ETH, USDT, etc.)\n3. Enter the amount (minimum $50)\n4. Send crypto to the generated wallet address\n\nFunds are credited within 1-3 network confirmations. Your balance updates within 30 minutes." },
  { keywords: ["withdraw", "cash out", "take out", "send money"], response: "To withdraw funds:\n\n1. Complete KYC verification first\n2. Set a withdrawal PIN in **Settings → Security**\n3. Go to **Dashboard → Withdraw**\n4. Enter amount (minimum $100), wallet address, and PIN\n\nWithdrawals are processed within 24 hours." },
  { keywords: ["kyc", "verify", "verification", "identity", "document", "passport", "id"], response: "To verify your identity:\n\n1. Go to **Dashboard → Verification**\n2. Complete the Sumsub verification process\n3. Upload your government-issued ID\n4. Take a selfie for facial verification\n\nReview typically takes under 24 hours. You'll receive an email once approved." },
  { keywords: ["return", "profit", "earn", "daily", "interest", "yield"], response: "Daily returns are based on your investment tier:\n\n• **Bronze**: 1.5% daily (balance $0+)\n• **Silver**: 1.8% daily (balance $5,000+)\n• **Gold**: 2.1% daily (balance $25,000+)\n\nReturns are posted daily between 8-10 AM UTC and auto-reinvested by default." },
  { keywords: ["tier", "upgrade", "bronze", "silver", "gold", "level"], response: "Investment tiers are based on your total balance:\n\n• **Bronze**: $0+ → 1.5% daily\n• **Silver**: $5,000+ → 1.8% daily\n• **Gold**: $25,000+ → 2.1% daily\n\nYour tier upgrades automatically when your balance reaches the threshold." },
  { keywords: ["pin", "withdrawal pin", "set pin", "change pin"], response: "To set or change your withdrawal PIN:\n\n1. Go to **Settings → Security**\n2. Scroll to **Withdrawal PIN**\n3. Enter a 6-digit numeric PIN\n4. Confirm the PIN\n\nThis PIN is required for every withdrawal request." },
  { keywords: ["2fa", "two factor", "authenticator", "google auth", "security"], response: "To enable Two-Factor Authentication:\n\n1. Go to **Settings → Security**\n2. Click **Enable 2FA**\n3. Scan the QR code with Google Authenticator or Authy\n4. Enter the 6-digit code to verify\n\nThis adds an extra layer of security to your account." },
  { keywords: ["swap", "exchange", "convert", "trade crypto"], response: "To swap cryptocurrencies:\n\n1. Go to **Dashboard → Swap**\n2. Select the token you want to swap FROM\n3. Select the token you want TO receive\n4. Enter the amount\n5. Click **Swap Now**\n\nSwaps use live CoinGecko rates with a 0.5% fee." },
  { keywords: ["stock", "invest", "share", "equity", "buy stock"], response: "To invest in stocks:\n\n1. Go to **Dashboard → Invest**\n2. Search for any stock or ETF\n3. Click on a stock to see details\n4. Enter the amount (minimum $50)\n5. Click **Invest Now**\n\nYour positions track real market prices with live P&L." },
  { keywords: ["referral", "invite", "refer", "bonus", "friend"], response: "Share your referral code to earn bonuses:\n\n1. Go to **Dashboard → Referrals**\n2. Copy your unique referral link\n3. Share via WhatsApp, Email, or copy the link\n\nYou earn **5% of your referral's first deposit** as a bonus." },
  { keywords: ["currency", "gbp", "eur", "pound", "euro", "dollar"], response: "To change your display currency:\n\n1. Go to **Settings → Preferences**\n2. Select USD ($), GBP (£), or EUR (€)\n\nAll amounts across the dashboard will convert automatically." },
  { keywords: ["password", "reset", "forgot", "change password"], response: "To change your password:\n\n1. Go to **Settings → Security**\n2. Enter your current password\n3. Enter and confirm your new password\n\nIf you forgot your password, use the **Forgot Password** link on the login page." },
  { keywords: ["fee", "charge", "cost", "commission"], response: "Naxcal fees:\n\n• **Deposits**: No fees (network fees apply)\n• **Withdrawals**: No fees (network fees apply)\n• **Crypto swaps**: 0.5% per swap\n• **Stock trades**: No commission\n• **Daily returns**: Performance fee may apply (shown in your dashboard)" },
  { keywords: ["minimum", "min deposit", "min withdrawal"], response: "Minimum amounts:\n\n• **Minimum deposit**: $50 USD\n• **Minimum withdrawal**: $100 USD\n• **Minimum stock investment**: $50 USD" },
  { keywords: ["safe", "secure", "trust", "legit", "scam", "regulated"], response: "Naxcal security measures:\n\n• FCA Authorised & Regulated\n• 256-bit SSL encryption\n• Two-factor authentication (2FA)\n• Cold storage for crypto assets\n• Multi-signature wallet protection\n• Sumsub KYC verification\n\nYour capital is protected under the UK compensation scheme." },
  { keywords: ["contact", "email", "phone", "support", "help"], response: "You can reach us at:\n\n• **Email**: support@naxcal.com\n• **Live Chat**: Click the chat bubble in the bottom-right corner\n• **Response time**: Within 2 hours\n\nFor security issues, email security@naxcal.com immediately." },
  { keywords: ["statement", "download", "csv", "history", "export"], response: "To download your transaction statement:\n\n1. Go to **Dashboard**\n2. Click **Statement** in Quick Actions\n3. A CSV file will download automatically\n\nYou can also export from the **Transactions** page using the Export button." },
];

function findBotResponse(message: string): string {
  const lower = message.toLowerCase();
  let bestMatch: { response: string; score: number } | null = null;

  for (const entry of AI_RESPONSES) {
    const score = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { response: entry.response, score };
    }
  }

  return bestMatch?.response || "";
}

type ChatMessage = { role: "user" | "bot"; text: string };

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSection, setOpenSection] = useState<string | null>("Getting Started");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! I'm Naxcal's AI assistant. I can help with questions about deposits, withdrawals, returns, security, and more. What do you need help with?" },
  ]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const copyEmail = () => {
    navigator.clipboard.writeText("support@naxcal.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setTyping(true);

    setTimeout(() => {
      const response = findBotResponse(text);
      if (response) {
        setMessages((prev) => [...prev, { role: "bot", text: response }]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: "I'm not sure about that. Would you like me to connect you with a support agent?\n\nYou can also try asking about: deposits, withdrawals, returns, KYC verification, security, swaps, stocks, referrals, or fees." }]);
      }
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  const filteredSections = searchQuery
    ? faqSections.map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          i.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : faqSections;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Help & Support</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <HelpCircle size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Help & Support</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: FAQ */}
        <div>
          {/* Search */}
          <div className="relative mb-5">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
          </div>

          {/* FAQ Sections */}
          <div className="space-y-3 mb-6">
            {filteredSections.map((section) => (
              <div key={section.title} className="card-light overflow-hidden">
                <button onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
                  className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[#f8fafc] transition-colors">
                  <span className="text-sm font-semibold text-[#0f172a]">{section.title}</span>
                  <ChevronDown size={16} className={cn("text-[#9ca3af] transition-transform", openSection === section.title && "rotate-180")} />
                </button>
                {openSection === section.title && (
                  <div className="border-t border-[#f1f5f9]">
                    {section.items.map((item) => {
                      const key = `${section.title}-${item.q}`;
                      return (
                        <div key={key} className="border-b border-[#f8fafc] last:border-b-0">
                          <button onClick={() => setOpenItem(openItem === key ? null : key)}
                            className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors text-left">
                            <span className="text-sm text-[#374151] pr-4">{item.q}</span>
                            <ChevronDown size={14} className={cn("text-[#d1d5db] shrink-0 transition-transform", openItem === key && "rotate-180")} />
                          </button>
                          {openItem === key && (
                            <div className="px-5 pb-3">
                              <p className="text-sm text-[#6b7280] leading-relaxed">{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {filteredSections.length === 0 && (
              <div className="text-center py-6 text-sm text-[#9ca3af]">No results for &ldquo;{searchQuery}&rdquo;</div>
            )}
          </div>

          {/* Contact cards */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="card-light p-4">
              <Mail size={18} className="text-naxcal-teal mb-2" />
              <h4 className="text-sm font-semibold text-[#0f172a] mb-1">Email</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#374151]">support@naxcal.com</span>
                <button onClick={copyEmail} className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer">
                  {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} className="text-[#9ca3af]" />}
                </button>
              </div>
            </div>
            <div className="card-light p-4">
              <MessageCircle size={18} className="text-naxcal-teal mb-2" />
              <h4 className="text-sm font-semibold text-[#0f172a] mb-1">Live Chat</h4>
              <button onClick={openCrispChat} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white btn-teal cursor-pointer">Talk to Agent</button>
            </div>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="card-light flex flex-col overflow-hidden" style={{ height: "min(600px, calc(100vh - 200px))" }}>
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center gap-3" style={{ background: "#f8fafc" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(26,138,110,0.1)" }}>
              <Bot size={16} className="text-naxcal-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Naxcal Assistant</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-[#9ca3af]">Online</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(26,138,110,0.1)" }}>
                    <Bot size={12} className="text-naxcal-teal" />
                  </div>
                )}
                <div className={cn("max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-naxcal-teal text-white rounded-br-sm"
                    : "bg-[#f1f5f9] text-[#374151] rounded-bl-sm"
                )}>
                  {msg.text.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-1" : ""}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, k) =>
                        part.startsWith("**") && part.endsWith("**")
                          ? <strong key={k}>{part.slice(2, -2)}</strong>
                          : <span key={k}>{part}</span>
                      )}
                    </p>
                  ))}
                  {msg.role === "bot" && msg.text.includes("connect you with a support agent") && (
                    <button onClick={openCrispChat} className="mt-2 flex items-center gap-1 text-xs font-semibold text-naxcal-teal hover:underline cursor-pointer">
                      <ArrowRight size={12} /> Talk to an agent
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#e2e8f0]">
                    <User size={12} className="text-[#6b7280]" />
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(26,138,110,0.1)" }}>
                  <Bot size={12} className="text-naxcal-teal" />
                </div>
                <div className="bg-[#f1f5f9] px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {["How do I deposit?", "Daily returns?", "Withdrawal PIN", "KYC verification"].map((q) => (
                <button key={q} onClick={() => { setChatInput(q); setTimeout(() => { setMessages((p) => [...p, { role: "user", text: q }]); setTyping(true); setTimeout(() => { const r = findBotResponse(q); setMessages((p) => [...p, { role: "bot", text: r || "I'm not sure about that." }]); setTyping(false); }, 800); }, 50); }}
                  className="px-2.5 py-1 rounded-full text-[11px] text-naxcal-teal font-medium cursor-pointer hover:bg-naxcal-teal/5 transition-colors" style={{ border: "1px solid rgba(26,138,110,0.2)" }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#e2e8f0]">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask anything..."
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
              <button type="submit" disabled={!chatInput.trim() || typing}
                className="w-9 h-9 rounded-xl flex items-center justify-center btn-teal text-white cursor-pointer disabled:opacity-40 shrink-0">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
