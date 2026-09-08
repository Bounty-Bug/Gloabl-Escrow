import * as React from "react"
import { useParams, Link } from "wouter"
import { useUser, useAuth } from "@clerk/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  useGetEscrow, useFundEscrow, useReleaseEscrow,
  useDisputeEscrow, useCancelEscrow, getGetEscrowQueryKey,
} from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Copy, Check, ShieldCheck, Clock, Activity, AlertCircle,
  XCircle, ArrowLeft, User, Calendar, FileText, Hash,
  Send, MessageSquare, Wallet, ArrowDownToLine, Timer,
} from "lucide-react"

/* ─── status config ─────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { badge: any; dot: string; label: string }> = {
  completed: { badge: "success",     dot: "bg-emerald-500", label: "Completed" },
  released:  { badge: "primary",     dot: "bg-blue-500",    label: "Released"  },
  funded:    { badge: "warning",     dot: "bg-amber-500",   label: "Funded"    },
  pending:   { badge: "secondary",   dot: "bg-slate-400",   label: "Pending"   },
  disputed:  { badge: "destructive", dot: "bg-red-500",     label: "Disputed"  },
  cancelled: { badge: "destructive", dot: "bg-slate-300",   label: "Cancelled" },
}

const STAGES = ["pending", "funded", "released"]
/** Inspection window: 72 hours (3 days) from the moment funds arrive */
const INSPECTION_HOURS = 72

/* ─── helpers ────────────────────────────────────────────────── */
function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired"
  const total = Math.floor(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

/* ─── countdown hook ────────────────────────────────────────── */
function useInspectionCountdown(fundedAt: string | null | undefined): {
  timeLeft: string; expired: boolean; deadline: Date | null
} {
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    if (!fundedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [fundedAt])

  if (!fundedAt) return { timeLeft: "", expired: false, deadline: null }
  const deadline = new Date(new Date(fundedAt).getTime() + INSPECTION_HOURS * 3600_000)
  const diff = deadline.getTime() - now
  return { timeLeft: formatCountdown(diff), expired: diff <= 0, deadline }
}

/* ─── main component ─────────────────────────────────────────── */
export default function EscrowDetail() {
  const { id } = useParams()
  const escrowId = parseInt(id || "0", 10)

  const { user } = useUser()
  const { getToken } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: escrow, isLoading } = useGetEscrow(escrowId, {
    query: { enabled: !!escrowId, queryKey: getGetEscrowQueryKey(escrowId) },
  })

  /* role detection */
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ""
  const isBuyer  = !!userEmail && userEmail === escrow?.buyerEmail?.toLowerCase()
  const isSeller = !!userEmail && userEmail === escrow?.sellerEmail?.toLowerCase()

  /* local ui state */
  const [copied, setCopied]         = React.useState(false)
  const [txHash, setTxHash]         = React.useState("")
  const [notes,  setNotes]          = React.useState("")
  const [openModal, setOpenModal]   = React.useState<string | null>(null)
  const [messageText, setMessageText] = React.useState("")
  const [payoutWallet, setPayoutWallet] = React.useState("")
  const [withdrawDone, setWithdrawDone] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  /* inspection timer */
  const { timeLeft, expired: timerExpired, deadline } = useInspectionCountdown(
    escrow?.status === "funded" ? (escrow as any).fundedAt : null,
  )

  /* ── chat: fetch with 4-second polling ─────────────────── */
  const messagesQKey = ["escrow-messages", escrowId]
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: messagesQKey,
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`/api/escrows/${escrowId}/messages`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 4000,
    enabled: !!escrowId && !!escrow,
  })

  /* auto-scroll chat to bottom */
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* ── send message mutation ─────────────────────────────── */
  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      const token = await getToken()
      const res = await fetch(`/api/escrows/${escrowId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to send message")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesQKey })
      setMessageText("")
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    },
  })

  /* ── withdraw mutation ─────────────────────────────────── */
  const submitWithdraw = useMutation({
    mutationFn: async (wallet: string) => {
      const token = await getToken()
      const res = await fetch(`/api/escrows/${escrowId}/withdraw`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ payoutWallet: wallet }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to submit withdrawal")
      }
      return res.json()
    },
    onSuccess: () => {
      setWithdrawDone(true)
      toast({ title: "Withdrawal requested", description: "Your payout request has been submitted." })
      queryClient.invalidateQueries({ queryKey: getGetEscrowQueryKey(escrowId) })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    },
  })

  /* ── existing action handler ───────────────────────────── */
  const fundEscrow    = useFundEscrow()
  const releaseEscrow = useReleaseEscrow()
  const disputeEscrow = useDisputeEscrow()
  const cancelEscrow  = useCancelEscrow()

  const handleAction = (action: string) => {
    if (!escrow) return
    const onSuccess = () => {
      toast({ title: "Success", description: `Escrow ${action}d successfully.` })
      queryClient.invalidateQueries({ queryKey: getGetEscrowQueryKey(escrow.id) })
      setOpenModal(null); setTxHash(""); setNotes("")
    }
    const onError = (err: any) => {
      const msg = err?.response?.data?.error ?? `Failed to ${action} escrow.`
      toast({ title: "Error", description: msg, variant: "destructive" })
    }
    switch (action) {
      case "fund":    fundEscrow.mutate({ id: escrow.id, data: { txHash, notes: notes || undefined } }, { onSuccess, onError }); break
      case "release": releaseEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError }); break
      case "dispute": disputeEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError }); break
      case "cancel":  cancelEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError }); break
    }
  }

  const copyAddress = () => {
    if (!escrow?.walletAddress) return
    navigator.clipboard.writeText(escrow.walletAddress)
    setCopied(true)
    toast({ description: "Address copied to clipboard" })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendMessage = () => {
    const trimmed = messageText.trim()
    if (!trimmed || sendMessage.isPending) return
    sendMessage.mutate(trimmed)
  }

  /* ── loading / not-found screens ──────────────────────── */
  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-64 bg-slate-200 rounded-2xl" />
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </Shell>
    )
  }

  if (!escrow) {
    return (
      <Shell>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Escrow not found</h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">The escrow you requested doesn't exist.</p>
          <Link href="/escrows">
            <Button variant="outline" className="border-slate-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Escrows
            </Button>
          </Link>
        </div>
      </Shell>
    )
  }

  const cfg = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.pending
  const stageIndex = STAGES.indexOf(escrow.status)
  const isTerminal = escrow.status === "cancelled" || escrow.status === "disputed"
  const isReleased = escrow.status === "released" || escrow.status === "completed"

  /* ── render ────────────────────────────────────────────── */
  return (
    <Shell>
      <div className="space-y-5 max-w-5xl">

        {/* ── Back + header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <Link href="/escrows" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> All Escrows
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Escrow #{escrow.id}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <Badge variant={cfg.badge as any} className="capitalize">{escrow.status}</Badge>
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-1">{escrow.title}</p>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap gap-2">

            {/* PENDING: seller marks funded, anyone can cancel */}
            {escrow.status === "pending" && (<>
              {isSeller && (
                <Dialog open={openModal === "fund"} onOpenChange={o => setOpenModal(o ? "fund" : null)}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                      <Activity className="w-4 h-4 mr-1.5" /> Mark Funded
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Confirm Funding</DialogTitle>
                      <DialogDescription>
                        Provide the transaction hash to confirm {escrow.amount} {escrow.currency} has been sent to escrow.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Transaction Hash <span className="text-red-500">*</span></label>
                        <Input placeholder="0x… or txid…" value={txHash} onChange={e => setTxHash(e.target.value)} className="font-mono text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
                        <Input placeholder="Additional context…" value={notes} onChange={e => setNotes(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                      <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleAction("fund")} disabled={!txHash || fundEscrow.isPending}>
                        {fundEscrow.isPending ? "Confirming…" : "Confirm Funding"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={openModal === "cancel"} onOpenChange={o => setOpenModal(o ? "cancel" : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200">
                    <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cancel Escrow</DialogTitle>
                    <DialogDescription>This will permanently cancel the escrow. Only possible while funds have not yet been sent.</DialogDescription>
                  </DialogHeader>
                  <div className="py-3">
                    <label className="text-sm font-medium text-slate-700">Reason (optional)</label>
                    <Input className="mt-1.5" placeholder="Why is this being cancelled?" value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenModal(null)}>Back</Button>
                    <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={cancelEscrow.isPending}>
                      {cancelEscrow.isPending ? "Cancelling…" : "Confirm Cancellation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>)}

            {/* FUNDED: buyer confirms account → release; anyone can dispute */}
            {escrow.status === "funded" && (<>
              {isBuyer && (
                <Dialog open={openModal === "release"} onOpenChange={o => setOpenModal(o ? "release" : null)}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Confirm & Release Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Confirm Account &amp; Release Funds</DialogTitle>
                      <DialogDescription>
                        By confirming, you verify that you have full access to the account and all details match what was advertised. This releases {escrow.amount} {escrow.currency} to the seller and <strong>cannot be undone</strong>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                      <label className="text-sm font-medium text-slate-700">Confirmation note (optional)</label>
                      <Input className="mt-1.5" placeholder="e.g. Account verified and fully accessible." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction("release")} disabled={releaseEscrow.isPending}>
                        {releaseEscrow.isPending ? "Releasing…" : "Confirm & Release"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={openModal === "dispute"} onOpenChange={o => setOpenModal(o ? "dispute" : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200">
                    <AlertCircle className="w-4 h-4 mr-1.5" /> Raise Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Raise a Dispute</DialogTitle>
                    <DialogDescription>Funds will be frozen and our team will review. Please explain the issue clearly.</DialogDescription>
                  </DialogHeader>
                  <div className="py-3">
                    <label className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></label>
                    <Textarea className="mt-1.5 resize-none" placeholder="Describe the issue in detail…" value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleAction("dispute")} disabled={!notes || disputeEscrow.isPending}>
                      {disputeEscrow.isPending ? "Submitting…" : "Submit Dispute"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>)}
          </div>
        </div>

        {/* ── Progress timeline ── */}
        {!isTerminal && (
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-100" />
                <div
                  className="absolute left-0 top-5 h-0.5 bg-blue-500 transition-all duration-500"
                  style={{ width: stageIndex <= 0 ? "0%" : stageIndex === 1 ? "50%" : "100%" }}
                />
                {STAGES.map((stage, idx) => {
                  const done = idx < stageIndex
                  const current = idx === stageIndex
                  return (
                    <div key={stage} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                        done ? "bg-blue-600 border-blue-600" :
                        current ? "bg-white border-blue-600 ring-4 ring-blue-50" :
                        "bg-white border-slate-200"
                      }`}>
                        {done ? <Check className="w-4 h-4 text-white" /> :
                         stage === "pending" ? <Clock className={`w-4 h-4 ${current ? "text-blue-600" : "text-slate-300"}`} /> :
                         stage === "funded" ? <Activity className={`w-4 h-4 ${current ? "text-blue-600" : "text-slate-300"}`} /> :
                         <ShieldCheck className={`w-4 h-4 ${current ? "text-blue-600" : "text-slate-300"}`} />}
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wider capitalize ${
                        idx <= stageIndex ? "text-blue-700" : "text-slate-400"
                      }`}>{stage}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Disputed / Cancelled banner ── */}
        {isTerminal && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
            escrow.status === "disputed" ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${escrow.status === "disputed" ? "text-red-500" : "text-slate-400"}`} />
            <div>
              <div className={`text-sm font-semibold ${escrow.status === "disputed" ? "text-red-800" : "text-slate-700"}`}>
                {escrow.status === "disputed" ? "Dispute raised — funds are frozen" : "Escrow cancelled"}
              </div>
              <div className={`text-xs mt-0.5 ${escrow.status === "disputed" ? "text-red-600" : "text-slate-500"}`}>
                {escrow.notes || (escrow.status === "disputed" ? "Under review by Escrow Global." : "No further action required.")}
              </div>
            </div>
          </div>
        )}

        {/* ── Inspection Timer (funded state only) ── */}
        {escrow.status === "funded" && (escrow as any).fundedAt && (
          <div className={`flex items-center gap-4 p-5 rounded-2xl border ${
            timerExpired
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              timerExpired ? "bg-red-100" : "bg-amber-100"
            }`}>
              <Timer className={`w-6 h-6 ${timerExpired ? "text-red-600" : "text-amber-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${timerExpired ? "text-red-800" : "text-amber-800"}`}>
                {timerExpired ? "Inspection period expired" : "Buyer inspection period active"}
              </div>
              <div className={`text-xs mt-0.5 ${timerExpired ? "text-red-600" : "text-amber-700"}`}>
                {timerExpired
                  ? `${INSPECTION_HOURS}-hour window ended on ${deadline?.toLocaleString()}. Buyer should confirm or dispute.`
                  : isBuyer
                    ? "Log in to the account, verify everything matches what was advertised, then click Confirm & Release Funds."
                    : "The buyer is verifying the account. Funds will be released once they confirm."}
              </div>
            </div>
            {!timerExpired && (
              <div className="text-right flex-shrink-0">
                <div className={`text-xl font-bold font-mono tabular-nums ${timerExpired ? "text-red-700" : "text-amber-700"}`}>
                  {timeLeft}
                </div>
                <div className="text-xs text-amber-600 mt-0.5">remaining</div>
              </div>
            )}
          </div>
        )}

        {/* ── Seller payout panel (released) ── */}
        {isReleased && isSeller && (
          <Card className="bg-white border-emerald-200 shadow-sm rounded-2xl">
            <CardHeader className="px-6 py-4 border-b border-emerald-100">
              <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4" /> Withdraw Your Funds
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Funds have been released. Provide your wallet address to receive {escrow.amount} {escrow.currency}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {withdrawDone || (escrow as any).payoutWallet ? (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-800">Withdrawal request submitted</div>
                    <div className="text-xs text-emerald-700 mt-1 font-mono break-all">
                      {(escrow as any).payoutWallet}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1.5">
                      Our team will process the transfer to your wallet within 24 hours.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Amount due to you</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-800">
                      {parseFloat(escrow.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      <span className="text-base font-semibold text-emerald-600 ml-2">{escrow.currency}</span>
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Network: {escrow.network}</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-500" /> Your {escrow.currency} wallet address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder={`Enter your ${escrow.currency} address on ${escrow.network}…`}
                      value={payoutWallet}
                      onChange={e => setPayoutWallet(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">Double-check your address — crypto transfers are irreversible.</p>
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => submitWithdraw.mutate(payoutWallet)}
                    disabled={payoutWallet.trim().length < 10 || submitWithdraw.isPending}
                  >
                    {submitWithdraw.isPending ? "Submitting…" : "Request Withdrawal"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Main content grid ── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Transaction Details */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="px-6 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {escrow.description && (
                  <div className="mb-5 pb-5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{escrow.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Buyer
                    </p>
                    <p className="text-sm font-medium text-slate-900 break-all">{escrow.buyerEmail}</p>
                    {isBuyer && <span className="text-xs text-blue-600 font-medium">(you)</span>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Seller
                    </p>
                    <p className="text-sm font-medium text-slate-900 break-all">{escrow.sellerEmail}</p>
                    {isSeller && <span className="text-xs text-blue-600 font-medium">(you)</span>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Created
                    </p>
                    <p className="text-sm text-slate-700">
                      {new Date(escrow.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Updated
                    </p>
                    <p className="text-sm text-slate-700">
                      {new Date(escrow.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                {escrow.notes && !isTerminal && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notes</p>
                    <p className="text-sm text-slate-600 italic">{escrow.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TX Hash */}
            {escrow.txHash && (
              <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="px-6 py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-600" /> Funding Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-mono text-xs text-slate-600 break-all flex-1">{escrow.txHash}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Chat Section ── */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="px-6 py-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Conversation
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Secure chat between buyer and seller — messages are visible to both parties.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Message list */}
                <div className="h-72 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/60">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <MessageSquare className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No messages yet. Start the conversation.</p>
                    </div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.senderEmail?.toLowerCase() === userEmail
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                          }`}>
                            {!isMe && (
                              <p className={`text-xs font-semibold mb-1 capitalize ${
                                msg.senderRole === "buyer" ? "text-amber-600" : "text-emerald-600"
                              }`}>
                                {msg.senderRole}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
                  {(isBuyer || isSeller) ? (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type a message…"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="resize-none min-h-[42px] max-h-32 text-sm flex-1 rounded-xl border-slate-200"
                        rows={1}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessage.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex-shrink-0 self-end"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-1">
                      Only the buyer and seller can send messages.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Amount */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 shadow-lg rounded-2xl text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">Escrow Amount</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold font-mono">
                    {parseFloat(escrow.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xl font-semibold opacity-75">{escrow.currency}</span>
                </div>
                <div className="text-sm opacity-70">
                  Network: <span className="font-medium opacity-100">{escrow.network}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-70">Your role</span>
                    <span className="font-semibold">
                      {isBuyer ? "Buyer" : isSeller ? "Seller" : "Observer"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit Address (only relevant while pending/funded) */}
            {(escrow.status === "pending" || escrow.status === "funded") && (
              <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="px-5 py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-700">Deposit Address</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-1">
                    Send exactly {escrow.amount} {escrow.currency} on {escrow.network}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-mono text-xs text-slate-700 break-all text-center leading-relaxed">
                      {escrow.walletAddress}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                    onClick={copyAddress}
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2 text-emerald-600" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy Address</>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400 text-center">
                    Funds are held securely until both parties confirm release.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Released: show completion card */}
            {isReleased && (
              <Card className="bg-emerald-50 border-emerald-200 shadow-sm rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-1">Transaction Complete</h3>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Funds have been released to the seller. Thank you for using Escrow Global.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
