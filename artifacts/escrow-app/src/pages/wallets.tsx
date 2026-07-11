import * as React from "react"
import { useListCurrencies, useGetDepositAddress, getGetDepositAddressQueryKey } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Wallet, ChevronDown, ChevronRight, ArrowDownToLine, Copy, Check, Info, Search, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"

// ─── Deposit Address Dialog ───────────────────────────────────────────────────

function DepositAddressDialog({ currency, chain }: { currency: string; chain: string }) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)

  const { data: addresses, isLoading } = useGetDepositAddress(
    { currency, chain },
    { query: { enabled: open, queryKey: getGetDepositAddressQueryKey({ currency, chain }) } }
  )

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"
          className="border-slate-200 hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50 text-xs gap-1.5 h-8">
          <ArrowDownToLine className="w-3.5 h-3.5" /> Get Address
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-bold">{currency}</span>
            <span className="text-slate-400 font-normal text-sm">·</span>
            <span className="text-slate-500 font-normal text-sm">{chain}</span>
          </DialogTitle>
          <DialogDescription>Deposit address for this network</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Fetching deposit address…</p>
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className="space-y-5">
              {addresses.map((addr, i) => (
                <div key={i} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Address</label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs break-all text-slate-700 leading-relaxed">
                        {addr.addr}
                      </div>
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                        onClick={() => copy(addr.addr, `addr-${i}`)}>
                        {copied === `addr-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {addr.memo && (
                    <div>
                      <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Memo / Tag Required
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-amber-50 border border-amber-200 rounded-xl font-mono text-sm font-bold text-amber-900">
                          {addr.memo}
                        </div>
                        <Button variant="outline" size="icon" className="flex-shrink-0 border-amber-200 hover:bg-amber-50"
                          onClick={() => copy(addr.memo!, `memo-${i}`)}>
                          {copied === `memo-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3 flex-shrink-0" />
                        Always include the memo/tag — funds may be permanently lost without it.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No deposit address available for this network.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Coin Logo ────────────────────────────────────────────────────────────────

function CoinLogo({ src, symbol, size = "md" }: { src: string; symbol: string; size?: "sm" | "md" }) {
  const [err, setErr] = React.useState(false)
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm"
  if (!src || err) {
    return (
      <div className={`${dim} rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 flex-shrink-0`}>
        {symbol[0]}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={symbol}
      className={`${dim} rounded-full border border-slate-100 flex-shrink-0 object-cover`}
      onError={() => setErr(true)}
    />
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NetworkEntry = { chain: string; minDepositAmt: string }
type CurrencyGroup = {
  symbol: string
  name: string
  logoLink: string
  networks: NetworkEntry[]
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WalletsList() {
  const [search, setSearch] = React.useState("")
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const { data: currencies, isLoading } = useListCurrencies()

  // Group flat list by currency symbol
  const groups = React.useMemo<CurrencyGroup[]>(() => {
    if (!currencies) return []
    const map = new Map<string, CurrencyGroup>()
    for (const c of currencies) {
      if (!map.has(c.currency)) {
        map.set(c.currency, { symbol: c.currency, name: c.name, logoLink: c.logoLink, networks: [] })
      }
      map.get(c.currency)!.networks.push({ chain: c.chain, minDepositAmt: c.minDepositAmt })
    }
    return Array.from(map.values())
  }, [currencies])

  const filtered = React.useMemo(() => {
    if (!search) return groups
    const q = search.toLowerCase()
    return groups.filter(g =>
      g.symbol.toLowerCase().includes(q) ||
      g.name.toLowerCase().includes(q) ||
      g.networks.some(n => n.chain.toLowerCase().includes(q))
    )
  }, [groups, search])

  const toggle = (symbol: string) =>
    setExpanded(prev => (prev === symbol ? null : symbol))

  return (
    <Shell>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Supported Assets</h1>
          <p className="text-slate-500 text-sm mt-1">
            All cryptocurrencies and networks available for escrow deposits. Click an asset to see its networks.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search asset or network…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {/* Asset list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No assets found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(group => {
                const isOpen = expanded === group.symbol
                return (
                  <div key={group.symbol}>
                    {/* Token row — clickable header */}
                    <button
                      onClick={() => toggle(group.symbol)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <CoinLogo src={group.logoLink} symbol={group.symbol} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{group.symbol}</span>
                          <span className="text-slate-400 text-sm font-normal">{group.name}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {group.networks.length} network{group.networks.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                          {isOpen ? "Hide" : "Show"} networks
                        </span>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Network rows — expanded */}
                    {isOpen && (
                      <div className="bg-slate-50 border-t border-slate-100">
                        {group.networks.map((net, ni) => (
                          <div
                            key={ni}
                            className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 last:border-none"
                          >
                            {/* indent line */}
                            <div className="w-10 flex justify-center flex-shrink-0">
                              <div className="w-px h-full bg-slate-200 relative">
                                <div className="absolute top-1/2 left-0 w-5 h-px bg-slate-200" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-700">
                                {net.chain.replace(`${group.symbol}-`, "")}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                {net.chain}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              {net.minDepositAmt && (
                                <div className="hidden sm:block text-right">
                                  <div className="text-xs text-slate-400">Min deposit</div>
                                  <div className="text-xs font-mono font-semibold text-slate-600">
                                    {net.minDepositAmt} {group.symbol}
                                  </div>
                                </div>
                              )}
                              <DepositAddressDialog currency={group.symbol} chain={net.chain} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""} · {filtered.reduce((a, g) => a + g.networks.length, 0)} networks total
          </p>
        )}
      </div>
    </Shell>
  )
}
