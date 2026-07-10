import * as React from "react"
import { useListCurrencies, useGetDepositAddress, getGetDepositAddressQueryKey } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Wallet, Globe, ArrowDownToLine, Copy, Check, Info, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

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
        <Button variant="outline" size="sm" className="border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs gap-1.5">
          <ArrowDownToLine className="w-3.5 h-3.5" /> Get Address
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Address</DialogTitle>
          <DialogDescription>
            {currency} on {chain} — verified via OKX API
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Fetching address from OKX…</p>
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className="space-y-5">
              {addresses.map((addr, i) => (
                <div key={i} className="space-y-3">
                  {/* Address */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Address</label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs break-all text-slate-700 leading-relaxed">
                        {addr.addr}
                      </div>
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-slate-200 hover:bg-blue-50 hover:border-blue-200" onClick={() => copy(addr.addr, `addr-${i}`)}>
                        {copied === `addr-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Memo */}
                  {addr.memo && (
                    <div>
                      <label className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Memo / Tag Required
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-amber-50 border border-amber-200 rounded-xl font-mono text-sm font-bold text-amber-900">
                          {addr.memo}
                        </div>
                        <Button variant="outline" size="icon" className="flex-shrink-0 border-amber-200 hover:bg-amber-50" onClick={() => copy(addr.memo!, `memo-${i}`)}>
                          {copied === `memo-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
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

export default function WalletsList() {
  const [search, setSearch] = React.useState("")
  const { data: currencies, isLoading } = useListCurrencies()

  const filtered = React.useMemo(() => {
    if (!currencies) return []
    if (!search) return currencies
    const q = search.toLowerCase()
    return currencies.filter(c =>
      c.currency.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.chain.toLowerCase().includes(q)
    )
  }, [currencies, search])

  return (
    <Shell>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Supported Wallets</h1>
          <p className="text-slate-500 text-sm mt-1">Browse assets and networks available for escrow deposits — powered by OKX</p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search currency, name or network…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div>
                    <div className="h-4 w-16 bg-slate-200 rounded mb-1.5" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            ))
          ) : filtered.map((c, i) => (
            <div key={`${c.currency}-${c.chain}-${i}`} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {c.logoLink ? (
                  <img src={c.logoLink} alt={c.currency} className="w-10 h-10 rounded-full border border-slate-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                    {c.currency[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900">{c.currency}</div>
                  <div className="text-xs text-slate-500">{c.name}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-mono text-xs font-normal gap-1">
                  <Globe className="w-3 h-3" /> {c.chain}
                </Badge>
                <DepositAddressDialog currency={c.currency} chain={c.chain} />
              </div>
              {c.minDepositAmt && (
                <div className="text-xs text-slate-400 mt-2">Min deposit: <span className="font-mono font-medium">{c.minDepositAmt}</span></div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[200px_1fr_180px_120px_120px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div>Asset</div>
            <div>Name</div>
            <div>Network</div>
            <div className="text-right">Min Deposit</div>
            <div className="text-right">Address</div>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr_180px_120px_120px] gap-4 px-6 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-5 w-28 bg-slate-200 rounded-full" />
                  <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
                  <div className="h-8 w-24 bg-slate-200 rounded ml-auto" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No currencies found</p>
              </div>
            ) : filtered.map((currency, i) => (
              <div key={`${currency.currency}-${currency.chain}-${i}`}
                className="grid grid-cols-[200px_1fr_180px_120px_120px] gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center">
                <div className="flex items-center gap-3">
                  {currency.logoLink ? (
                    <img src={currency.logoLink} alt={currency.currency} className="w-8 h-8 rounded-full border border-slate-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                      {currency.currency[0]}
                    </div>
                  )}
                  <span className="font-bold text-slate-900">{currency.currency}</span>
                </div>
                <div className="text-sm text-slate-600">{currency.name}</div>
                <div>
                  <Badge variant="secondary" className="font-mono text-xs font-normal gap-1">
                    <Globe className="w-3 h-3" /> {currency.chain}
                  </Badge>
                </div>
                <div className="text-right font-mono text-sm text-slate-500">
                  {currency.minDepositAmt || "—"}
                </div>
                <div className="flex justify-end">
                  <DepositAddressDialog currency={currency.currency} chain={currency.chain} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            {filtered.length} network{filtered.length !== 1 ? "s" : ""} available
          </p>
        )}
      </div>
    </Shell>
  )
}
