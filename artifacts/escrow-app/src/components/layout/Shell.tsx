import * as React from "react"
import { Link, useLocation } from "wouter"
import {
  Globe, LayoutDashboard, List, Wallet, Plus, Menu, X, ChevronRight, ArrowLeft
} from "lucide-react"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escrows", label: "Escrows", icon: List },
  { href: "/escrows/new", label: "New Escrow", icon: Plus },
  { href: "/wallets", label: "Wallets", icon: Wallet },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard"
    if (href === "/escrows") return location === "/escrows"
    if (href === "/escrows/new") return location === "/escrows/new"
    if (href === "/wallets") return location === "/wallets"
    return location.startsWith(href)
  }

  const NavLink = ({ href, label, icon: Icon }: typeof NAV[0]) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-blue-600 text-white shadow-sm shadow-blue-900/50"
            : "text-slate-400 hover:bg-sidebar-accent hover:text-white"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
        {label}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col
        bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>

        {/* Logo area */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-500 transition-colors">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">
                Escrow<span className="text-blue-400">Global</span>
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
            Platform
          </div>
          {NAV.map(item => <NavLink key={item.href} {...item} />)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">EscrowGlobal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="font-semibold text-slate-900 capitalize">
                {location === "/dashboard" ? "Dashboard"
                  : location === "/escrows/new" ? "New Escrow"
                  : location === "/wallets" ? "Wallets"
                  : location.startsWith("/escrows/") ? "Escrow Detail"
                  : location === "/escrows" ? "Escrows"
                  : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/escrows/new">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" /> New Escrow
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
