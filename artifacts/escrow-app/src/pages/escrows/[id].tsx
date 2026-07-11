import * as React from "react"
import { useParams, Link } from "wouter"
import { useGetEscrow, useFundEscrow, useReleaseEscrow, useDisputeEscrow, useCancelEscrow, getGetEscrowQueryKey } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import {
  Copy, Check, ShieldCheck, Clock, Activity, AlertCircle, XCircle,
  ArrowLeft, User, Calendar, FileText, Hash
} from "lucide-react"

const STATUS_CONFIG: Record<string, { badge: any; dot: string; label: string }> = {
  completed: { badge: "success",     dot: "bg-emerald-500", label: "Completed" },
  released:  { badge: "primary",     dot: "bg-blue-500",    label: "Released" },
  funded:    { badge: "warning",     dot: "bg-amber-500",   label: "Funded" },
  pending:   { badge: "secondary",   dot: "bg-slate-400",   label: "Pending" },
  disputed:  { badge: "destructive", dot: "bg-red-500",     label: "Disputed" },
  cancelled: { badge: "destructive", dot: "bg-slate-300",   label: "Cancelled" },
}

const STAGES = ["pending", "funded", "released"]

export default function EscrowDetail() {
  const { id } = useParams()
  const escrowId = parseInt(id || "0", 10)
  const { data: escrow, isLoading } = useGetEscrow(escrowId, {
    query: { enabled: !!escrowId, queryKey: getGetEscrowQueryKey(escrowId) }
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState(false)
  const [txHash, setTxHash] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [openModal, setOpenModal] = React.useState<string | null>(null)

  const fundEscrow = useFundEscrow()
  const releaseEscrow = useReleaseEscrow()
  const disputeEscrow = useDisputeEscrow()
  const cancelEscrow = useCancelEscrow()

  const copyAddress = () => {
    if (!escrow?.walletAddress) return
    navigator.clipboard.writeText(escrow.walletAddress)
    setCopied(true)
    toast({ description: "Address copied to clipboard" })
    setTimeout(() => setCopied(false), 2000)
  }

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

  return (
    <Shell>
      <div className="space-y-5 max-w-5xl">

        {/* Back + header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {escrow.status === "pending" && (<>
              {/* Fund */}
              <Dialog open={openModal === "fund"} onOpenChange={o => setOpenModal(o ? "fund" : null)}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                    <Activity className="w-4 h-4 mr-1.5" /> Mark Funded
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirm Funding</DialogTitle>
                    <DialogDescription>Provide the transaction hash to confirm {escrow.amount} {escrow.currency} has been sent.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Transaction Hash <span className="text-red-500">*</span></label>
                      <Input placeholder="0x... or txid..." value={txHash} onChange={e => setTxHash(e.target.value)} className="font-mono text-sm" />
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

              {/* Cancel */}
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

            {escrow.status === "funded" && (<>
              {/* Release */}
              <Dialog open={openModal === "release"} onOpenChange={o => setOpenModal(o ? "release" : null)}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Release Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Release Funds to Seller</DialogTitle>
                    <DialogDescription>This will release {escrow.amount} {escrow.currency} to {escrow.sellerEmail}. This action cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <div className="py-3">
                    <label className="text-sm font-medium text-slate-700">Confirmation note (optional)</label>
                    <Input className="mt-1.5" placeholder="e.g. All deliverables received and approved." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction("release")} disabled={releaseEscrow.isPending}>
                      {releaseEscrow.isPending ? "Releasing…" : "Confirm Release"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dispute */}
              <Dialog open={openModal === "dispute"} onOpenChange={o => setOpenModal(o ? "dispute" : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200">
                    <AlertCircle className="w-4 h-4 mr-1.5" /> Raise Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Raise a Dispute</DialogTitle>
                    <DialogDescription>Funds will be frozen and our team will review the situation. Please explain the issue clearly.</DialogDescription>
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

        {/* Progress timeline */}
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

        {/* Disputed / Cancelled banner */}
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

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Details */}
          <div className="lg:col-span-2 space-y-5">
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
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Seller
                    </p>
                    <p className="text-sm font-medium text-slate-900 break-all">{escrow.sellerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Created
                    </p>
                    <p className="text-sm text-slate-700">{new Date(escrow.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Updated
                    </p>
                    <p className="text-sm text-slate-700">{new Date(escrow.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
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
              </CardContent>
            </Card>

            {/* Deposit Address */}
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
                <Button variant="outline" className="w-full border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors" onClick={copyAddress}>
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
          </div>
        </div>
      </div>
    </Shell>
  )
}
