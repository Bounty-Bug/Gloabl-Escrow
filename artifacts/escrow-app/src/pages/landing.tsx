import * as React from "react"
import { Link } from "wouter"
import {
  Shield, Globe, Zap, CheckCircle, ArrowRight, Lock, Clock,
  Users, TrendingUp, Star, ChevronRight, Menu, X,
  BadgeCheck, BarChart3, Headphones, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
]

const STATS = [
  { value: "$2.4B+", label: "Escrow Volume" },
  { value: "180+", label: "Countries" },
  { value: "99.97%", label: "Uptime" },
  { value: "50K+", label: "Transactions" },
]

const STEPS = [
  {
    number: "01",
    icon: <Users className="w-6 h-6" />,
    title: "Create an Escrow",
    description: "Buyer and seller agree on terms. Set up a secure escrow in minutes — no bank, no middleman, just the blockchain.",
  },
  {
    number: "02",
    icon: <Lock className="w-6 h-6" />,
    title: "Funds Are Locked",
    description: "The buyer deposits cryptocurrency to the escrow wallet. Funds are securely held and fully verifiable on-chain.",
  },
  {
    number: "03",
    icon: <CheckCircle className="w-6 h-6" />,
    title: "Delivery & Release",
    description: "Once the seller delivers, the buyer confirms and funds are released instantly. Both parties get email confirmation.",
  },
]

const FEATURES = [
  {
    icon: <Shield className="w-6 h-6 text-blue-600" />,
    bg: "bg-blue-50",
    title: "Non-Custodial Security",
    description: "Funds are held transparently on-chain. No third party controls your money — only verified wallets.",
  },
  {
    icon: <Globe className="w-6 h-6 text-emerald-600" />,
    bg: "bg-emerald-50",
    title: "Global Reach",
    description: "Accept Bitcoin, Ethereum, USDT and more across 50+ networks worldwide with real-time OKX pricing.",
  },
  {
    icon: <Zap className="w-6 h-6 text-amber-600" />,
    bg: "bg-amber-50",
    title: "Instant Settlement",
    description: "No wire transfers, no delays. Once both parties confirm, funds move at blockchain speed.",
  },
  {
    icon: <Headphones className="w-6 h-6 text-violet-600" />,
    bg: "bg-violet-50",
    title: "Dispute Resolution",
    description: "Our team steps in when things go wrong. Raise a dispute and we'll hold funds until the issue is resolved.",
  },
  {
    icon: <BadgeCheck className="w-6 h-6 text-rose-600" />,
    bg: "bg-rose-50",
    title: "Email Notifications",
    description: "Every status change sends automatic email alerts to both buyer and seller. Stay informed, always.",
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-cyan-600" />,
    bg: "bg-cyan-50",
    title: "Live Dashboard",
    description: "Track all your escrow transactions in one place — volume, status, history, and analytics at a glance.",
  },
]

const CURRENCIES = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "TRX"]

export default function Landing() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* ─── NAVBAR ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Escrow<span className="text-blue-600">Global</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4" /> {l.label}
              </a>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-center">Sign In</Button>
              </Link>
              <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOFYwaDM2djM2aC0uMDZDMzcuNTYgMzMuODYgMzYgMjYuMTMgMzYgMTh6IiBmaWxsPSIjZThmMGZlIiBmaWxsLW9wYWNpdHk9Ii40Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            🔒 Trusted Crypto Escrow
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
            Trade Crypto{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Safely
            </span>
            {" "}Anywhere in the World
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Escrow Global protects every crypto transaction between buyer and seller. Funds are locked securely on-chain and released only when both parties are satisfied.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/sign-up">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-8 h-12 text-base font-semibold w-full sm:w-auto">
                Create Your First Escrow <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 px-8 h-12 text-base font-semibold w-full sm:w-auto">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST BANNER ─── */}
      <section className="border-y border-slate-100 bg-white py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-400 font-medium">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> 256-bit encryption</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> OKX-verified addresses</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Email notifications</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Dispute resolution</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> No hidden fees</span>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How Escrow Global Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Three simple steps to protect your cryptocurrency transactions from start to finish.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* connecting line — desktop only */}
            <div className="absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 hidden sm:block" />

            {STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-blue-100 shadow-md flex items-center justify-center text-blue-600 group-hover:shadow-lg group-hover:border-blue-200 transition-all">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow">
                    {i + 1}
                  </div>
                </div>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">{step.number}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything You Need to Trade Safely</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Enterprise-grade tools built for everyone — from individual freelancers to global businesses.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SUPPORTED CURRENCIES ─── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Supported Cryptocurrencies</h2>
          <p className="text-sm text-slate-500 mb-8">All major assets available across multiple networks via OKX</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {CURRENCIES.map(c => (
              <div key={c} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 transition-colors">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {c[0]}
                </span>
                {c}
              </div>
            ))}
            <div className="px-4 py-2 text-sm text-slate-400">+ 50 more</div>
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section id="security" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: visual */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="w-full aspect-square rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-200">
                  <div className="text-center text-white p-8">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-5xl font-extrabold mb-2">256</div>
                    <div className="text-blue-200 text-sm font-medium uppercase tracking-widest">Bit Encryption</div>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                      {["OKX API", "HMAC Auth", "SSL/TLS", "On-chain"].map(t => (
                        <div key={t} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* floating badges */}
                <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" /> Funds locked
                </div>
              </div>
            </div>

            {/* Right: text */}
            <div className="flex-1 max-w-lg">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Security</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Your Funds Are Protected at Every Step
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We partner with OKX to verify every deposit address before an escrow is created. 
                Wallet credentials are never stored in our system — only signed API calls are used, 
                and every transaction can be verified independently on-chain.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <Shield className="w-5 h-5 text-blue-600" />, title: "No fake addresses", desc: "Deposit addresses come directly from OKX API — never hardcoded or mocked." },
                  { icon: <RefreshCw className="w-5 h-5 text-blue-600" />, title: "Atomic state transitions", desc: "Escrow status changes are race-condition proof using atomic database locks." },
                  { icon: <Clock className="w-5 h-5 text-blue-600" />, title: "Dispute protection", desc: "Once funded, only dispute resolution can unblock funds — never a simple cancel." },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm mb-0.5">{item.title}</div>
                      <div className="text-slate-500 text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Trade with Confidence?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Start your first escrow in minutes. No account needed — just create the deal, share the link, and we handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-10 h-12 w-full sm:w-auto shadow-xl">
                Create Escrow — It's Free
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-semibold px-10 h-12 w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-blue-200 text-sm">
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-current text-amber-400" /> No setup fees</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> End-to-end secure</span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">Escrow<span className="text-blue-400">Global</span></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
              ))}
              <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/sign-up" className="hover:text-white transition-colors">Sign Up</Link>
            </div>
            <div className="text-xs text-slate-500 text-center sm:text-right">
              © {new Date().getFullYear()} Escrow Global. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
