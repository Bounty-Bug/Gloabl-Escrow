import * as React from "react"
import { useListEscrows } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Link } from "wouter"
import { Search, Eye, Clock, Activity, ShieldCheck, AlertCircle, CheckCircle2, Plus } from "lucide-react"

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; badge: any; dot: string }> = {
  completed: { color: "text-emerald-600", icon: CheckCircle2, badge: "success",     dot: "bg-emerald-500" },
  released:  { color: "text-blue-600",    icon: ShieldCheck,  badge: "primary",     dot: "bg-blue-500" },
  funded:    { color: "text-amber-600",   icon: Activity,     badge: "warning",     dot: "bg-amber-500" },
  pending:   { color: "text-slate-400",   icon: Clock,        badge: "secondary",   dot: "bg-slate-400" },
  disputed:  { color: "text-red-500",     icon: AlertCircle,  badge: "destructive", dot: "bg-red-500" },
  cancelled: { color: "text-slate-400",   icon: AlertCircle,  badge: "destructive", dot: "bg-slate-300" },
}

export default function EscrowsList() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const { data: escrows, isLoading } = useListEscrows()

  const filteredEscrows = React.useMemo(() => {
    if (!escrows) return []
    if (!searchTerm) return escrows
    const lower = searchTerm.toLowerCase()
    return escrows.filter(e =>
      e.title.toLowerCase().includes(lower) ||
      e.buyerEmail.toLowerCase().includes(lower) ||
      e.sellerEmail.toLowerCase().includes(lower) ||
      e.id.toString().includes(lower)
    )
  }, [escrows, searchTerm])

  return (
    <Shell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Escrows</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and track all escrow transactions</p>
          </div>
          <Link href="/escrows/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Create Escrow
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search ID, title, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500"
          />
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))
          ) : filteredEscrows.length === 0 ? (
            <div className="text-center py-16">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No escrows found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchTerm ? "Try a different search term" : "Create your first escrow to get started"}
              </p>
            </div>
          ) : filteredEscrows.map((escrow) => {
            const cfg = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.pending
            return (
              <Link key={escrow.id} href={`/escrows/${escrow.id}`}>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-slate-900 text-sm leading-snug flex-1">{escrow.title}</span>
                    <Badge variant={cfg.badge as any} className="capitalize text-xs flex-shrink-0">{escrow.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 truncate max-w-[55%]">{escrow.buyerEmail}</div>
                    <div className="font-mono text-sm font-bold text-slate-900">
                      {parseFloat(escrow.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {escrow.currency}
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">#{escrow.id}</div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_1.2fr_120px_110px_60px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div>ID</div>
            <div>Title</div>
            <div>Parties</div>
            <div>Amount</div>
            <div>Status</div>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_1.2fr_120px_110px_60px] gap-4 px-6 py-4 animate-pulse">
                  <div className="h-4 w-10 bg-slate-200 rounded" />
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-5 w-20 bg-slate-200 rounded-full" />
                  <div />
                </div>
              ))
            ) : filteredEscrows.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No escrows found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {searchTerm ? "Try a different search term" : "Create your first escrow to get started"}
                </p>
              </div>
            ) : filteredEscrows.map((escrow) => {
              const cfg = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.pending
              return (
                <div key={escrow.id}
                  className="grid grid-cols-[80px_1fr_1.2fr_120px_110px_60px] gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center">
                  <div className="font-mono text-xs text-slate-400">#{escrow.id}</div>
                  <div className="font-semibold text-slate-900 text-sm truncate">{escrow.title}</div>
                  <div className="space-y-0.5 text-xs text-slate-400 min-w-0">
                    <div className="truncate">↑ {escrow.buyerEmail}</div>
                    <div className="truncate">↓ {escrow.sellerEmail}</div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-slate-900">
                    {parseFloat(escrow.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    <span className="text-slate-400 font-normal ml-1">{escrow.currency}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <Badge variant={cfg.badge as any} className="capitalize text-xs">{escrow.status}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link href={`/escrows/${escrow.id}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {filteredEscrows.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Showing {filteredEscrows.length} of {escrows?.length ?? 0} escrows
          </p>
        )}
      </div>
    </Shell>
  )
}
