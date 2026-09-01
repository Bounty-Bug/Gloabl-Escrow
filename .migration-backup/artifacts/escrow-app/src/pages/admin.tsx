import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EscrowStatus = "pending" | "funded" | "released" | "disputed" | "cancelled"

interface Escrow {
  id: number
  userId: string
  title: string
  description: string | null
  buyerEmail: string
  sellerEmail: string
  amount: string
  currency: string
  network: string
  walletAddress: string
  status: EscrowStatus
  txHash: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Stats {
  counts: {
    total: number; pending: number; funded: number;
    released: number; disputed: number; cancelled: number
  }
  volumeByCurrency: Array<{ currency: string; total: string; count: number }>
  uniqueUsers: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-slate-100 text-slate-600",
  funded:    "bg-amber-100 text-amber-700",
  released:  "bg-blue-100 text-blue-700",
  disputed:  "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400",
}

const ALL_STATUSES: EscrowStatus[] = ["pending", "funded", "released", "disputed", "cancelled"]

// ─── Admin API helper ─────────────────────────────────────────────────────────

function makeAdminFetch(key: string) {
  return async (path: string, opts: RequestInit = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { "x-admin-key": key, "content-type": "application/json", ...(opts.headers ?? {}) },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error ?? res.statusText)
    }
    return res.json()
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-5 py-3 rounded-xl ${color}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium mt-0.5 capitalize">{label}</span>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

// ─── Status changer modal ─────────────────────────────────────────────────────

function StatusChangeModal({
  escrow,
  onClose,
  onSaved,
  adminFetch,
}: {
  escrow: Escrow
  onClose: () => void
  onSaved: (updated: Escrow) => void
  adminFetch: ReturnType<typeof makeAdminFetch>
}) {
  const [status, setStatus] = React.useState<EscrowStatus>(escrow.status)
  const [notes, setNotes] = React.useState(escrow.notes ?? "")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const save = async () => {
    setLoading(true); setError("")
    try {
      const updated = await adminFetch(`/api/admin/escrows/${escrow.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes: notes || undefined }),
      })
      onSaved(updated)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Change Status — #{escrow.id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map(s => (
                <button key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:border-blue-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason for status change…"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
  escrow,
  onClose,
  onDeleted,
  adminFetch,
}: {
  escrow: Escrow
  onClose: () => void
  onDeleted: (id: number) => void
  adminFetch: ReturnType<typeof makeAdminFetch>
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const confirm = async () => {
    setLoading(true); setError("")
    try {
      await adminFetch(`/api/admin/escrows/${escrow.id}`, { method: "DELETE" })
      onDeleted(escrow.id)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-red-600 text-xl">⚠</span>
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Delete Escrow #{escrow.id}?</h3>
          <p className="text-slate-500 text-sm mt-1">
            <strong className="text-slate-700">{escrow.title}</strong> will be permanently removed. This cannot be undone.
          </p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Escrow detail drawer ─────────────────────────────────────────────────────

function EscrowDrawer({ escrow, onClose }: { escrow: Escrow; onClose: () => void }) {
  const fmt = (v: string) => new Date(v).toLocaleString()
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md shadow-2xl overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-slate-900">Escrow #{escrow.id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-5 flex-1">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</p>
            <p className="text-slate-900 font-medium">{escrow.title}</p>
          </div>
          {escrow.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-slate-600 text-sm">{escrow.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <StatusBadge status={escrow.status} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
              <p className="font-mono font-bold text-slate-900">{parseFloat(escrow.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {escrow.currency}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Network</p>
              <p className="text-slate-700 text-sm">{escrow.network}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">User ID</p>
              <p className="font-mono text-slate-500 text-xs break-all">{escrow.userId}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Buyer</p>
            <p className="text-slate-700 text-sm">{escrow.buyerEmail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Seller</p>
            <p className="text-slate-700 text-sm">{escrow.sellerEmail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wallet Address</p>
            <p className="font-mono text-xs text-slate-600 break-all bg-slate-50 p-2 rounded-lg">{escrow.walletAddress || "—"}</p>
          </div>
          {escrow.txHash && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">TX Hash</p>
              <p className="font-mono text-xs text-slate-600 break-all bg-slate-50 p-2 rounded-lg">{escrow.txHash}</p>
            </div>
          )}
          {escrow.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-slate-600 text-sm bg-amber-50 border border-amber-100 rounded-lg p-3">{escrow.notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Created</p>
              <p className="text-slate-600 text-xs">{fmt(escrow.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Updated</p>
              <p className="text-slate-600 text-xs">{fmt(escrow.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [keyInput, setKeyInput] = React.useState("")
  const [adminKey, setAdminKey] = React.useState<string | null>(null)
  const [authError, setAuthError] = React.useState("")

  // Data state
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [escrows, setEscrows] = React.useState<Escrow[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(0)
  const PAGE_SIZE = 20

  // Modal state
  const [statusModal, setStatusModal] = React.useState<Escrow | null>(null)
  const [deleteModal, setDeleteModal]  = React.useState<Escrow | null>(null)
  const [drawer, setDrawer]             = React.useState<Escrow | null>(null)

  const adminFetch = React.useMemo(
    () => (adminKey ? makeAdminFetch(adminKey) : null),
    [adminKey],
  )

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    if (!keyInput.trim()) { setAuthError("Please enter the admin key."); return }
    try {
      const f = makeAdminFetch(keyInput.trim())
      await f("/api/admin/stats") // test auth
      setAdminKey(keyInput.trim())
    } catch (err: any) {
      setAuthError(err.message === "Invalid or missing admin key." ? "Incorrect admin key." : err.message)
    }
  }

  // Load data
  const load = React.useCallback(async () => {
    if (!adminFetch) return
    setLoading(true); setError("")
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search.trim()  ? { search: search.trim() } : {}),
      })
      const [statsData, listData] = await Promise.all([
        adminFetch("/api/admin/stats"),
        adminFetch(`/api/admin/escrows?${params}`),
      ])
      setStats(statsData)
      setEscrows(listData.escrows)
      setTotal(listData.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [adminFetch, page, statusFilter, search])

  React.useEffect(() => { load() }, [load])

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🛡</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm mt-1">VaultBridge internal tools</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="Enter admin key…"
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
              Unlock Admin Panel
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Admin dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      {/* Modals */}
      {statusModal && (
        <StatusChangeModal
          escrow={statusModal}
          adminFetch={adminFetch!}
          onClose={() => setStatusModal(null)}
          onSaved={updated => {
            setEscrows(prev => prev.map(e => e.id === updated.id ? updated : e))
            setStatusModal(null)
          }}
        />
      )}
      {deleteModal && (
        <DeleteModal
          escrow={deleteModal}
          adminFetch={adminFetch!}
          onClose={() => setDeleteModal(null)}
          onDeleted={id => {
            setEscrows(prev => prev.filter(e => e.id !== id))
            setDeleteModal(null)
            setTotal(t => t - 1)
            load()
          }}
        />
      )}
      {drawer && <EscrowDrawer escrow={drawer} onClose={() => setDrawer(null)} />}

      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">🛡</div>
          <span className="font-bold text-white">VaultBridge Admin</span>
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Internal</span>
        </div>
        <button onClick={() => setAdminKey(null)} className="text-slate-400 hover:text-white text-sm transition-colors">
          Sign out
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        {stats && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatPill label="Total"     value={stats.counts.total}     color="bg-slate-800 text-slate-100" />
              <StatPill label="Pending"   value={stats.counts.pending}   color="bg-slate-700 text-slate-300" />
              <StatPill label="Funded"    value={stats.counts.funded}    color="bg-amber-900/60 text-amber-200" />
              <StatPill label="Released"  value={stats.counts.released}  color="bg-blue-900/60 text-blue-200" />
              <StatPill label="Disputed"  value={stats.counts.disputed}  color="bg-red-900/60 text-red-200" />
              <StatPill label="Cancelled" value={stats.counts.cancelled} color="bg-slate-700/50 text-slate-400" />
              <StatPill label="Users"     value={stats.uniqueUsers}      color="bg-emerald-900/60 text-emerald-200" />
            </div>
            {stats.volumeByCurrency.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {stats.volumeByCurrency.map(v => (
                  <div key={v.currency} className="bg-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
                    <span className="font-bold text-blue-400 text-sm">{v.currency}</span>
                    <span className="font-mono text-white text-sm">{parseFloat(v.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-slate-500 text-xs">({v.count} escrows)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search title, email, user ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
            {loading ? "Loading…" : "Refresh"}
          </button>
          <span className="text-slate-500 text-sm ml-auto">{total} total escrows</span>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_160px_140px_120px_100px_120px] gap-3 px-4 py-3 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div>ID</div>
            <div>Title / User</div>
            <div>Buyer</div>
            <div>Seller</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800">
            {loading && escrows.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_160px_140px_120px_100px_120px] gap-3 px-4 py-3 animate-pulse">
                  {[...Array(7)].map((_, j) => <div key={j} className="h-4 bg-slate-800 rounded" />)}
                </div>
              ))
            ) : escrows.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No escrows found.</div>
            ) : escrows.map(escrow => (
              <div key={escrow.id}
                className="grid grid-cols-[60px_1fr_160px_140px_120px_100px_120px] gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors items-start text-sm">
                <div className="font-mono text-slate-500 text-xs pt-0.5">#{escrow.id}</div>
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{escrow.title}</div>
                  <div className="font-mono text-slate-500 text-[10px] truncate mt-0.5">{escrow.userId}</div>
                </div>
                <div className="text-slate-400 text-xs truncate">{escrow.buyerEmail}</div>
                <div className="text-slate-400 text-xs truncate">{escrow.sellerEmail}</div>
                <div className="font-mono text-white text-xs">
                  {parseFloat(escrow.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-slate-500 ml-1">{escrow.currency}</span>
                </div>
                <div><StatusBadge status={escrow.status} /></div>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setDrawer(escrow)}
                    className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors">
                    View
                  </button>
                  <button onClick={() => setStatusModal(escrow)}
                    className="px-2 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-300 text-xs transition-colors">
                    Status
                  </button>
                  <button onClick={() => setDeleteModal(escrow)}
                    className="px-2 py-1 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-300 text-xs transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 disabled:opacity-40 transition-colors">
              ← Prev
            </button>
            <span className="text-slate-400 text-sm">
              Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 disabled:opacity-40 transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
