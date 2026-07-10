import * as React from "react"
import { useLocation, useParams } from "wouter"
import { useGetEscrow, useFundEscrow, useReleaseEscrow, useDisputeEscrow, useCancelEscrow, getGetEscrowQueryKey } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Copy, Check, ArrowRight, ShieldCheck, Clock, Activity, AlertCircle, RefreshCw, XCircle } from "lucide-react"

export default function EscrowDetail() {
  const { id } = useParams()
  const escrowId = parseInt(id || "0", 10)
  const { data: escrow, isLoading } = useGetEscrow(escrowId, { query: { enabled: !!escrowId, queryKey: getGetEscrowQueryKey(escrowId) } })
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState(false)

  // Mutations
  const fundEscrow = useFundEscrow()
  const releaseEscrow = useReleaseEscrow()
  const disputeEscrow = useDisputeEscrow()
  const cancelEscrow = useCancelEscrow()

  // Form states for modals
  const [txHash, setTxHash] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [openModal, setOpenModal] = React.useState<string | null>(null)

  const copyToClipboard = () => {
    if (!escrow?.walletAddress) return
    navigator.clipboard.writeText(escrow.walletAddress)
    setCopied(true)
    toast({ description: "Wallet address copied to clipboard" })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAction = (action: string) => {
    if (!escrow) return

    const onSuccess = () => {
      toast({ title: "Success", description: `Escrow ${action} successfully.` })
      queryClient.invalidateQueries({ queryKey: getGetEscrowQueryKey(escrow.id) })
      setOpenModal(null)
      setTxHash("")
      setNotes("")
    }

    const onError = () => {
      toast({ title: "Error", description: `Failed to ${action} escrow.`, variant: "destructive" })
    }

    switch (action) {
      case "fund":
        fundEscrow.mutate({ id: escrow.id, data: { txHash, notes: notes || undefined } }, { onSuccess, onError })
        break
      case "release":
        releaseEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError })
        break
      case "dispute":
        disputeEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError })
        break
      case "cancel":
        cancelEscrow.mutate({ id: escrow.id, data: { notes: notes || undefined } }, { onSuccess, onError })
        break
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2">
              <CardContent className="h-64 bg-muted animate-pulse m-6 rounded" />
            </Card>
            <Card>
              <CardContent className="h-64 bg-muted animate-pulse m-6 rounded" />
            </Card>
          </div>
        </div>
      </Shell>
    )
  }

  if (!escrow) {
    return (
      <Shell>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Escrow not found</h2>
          <p className="text-muted-foreground mt-2">The escrow ID you requested does not exist.</p>
        </div>
      </Shell>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'released': return 'primary'
      case 'funded': return 'warning'
      case 'pending': return 'secondary'
      case 'disputed': return 'destructive'
      case 'cancelled': return 'destructive'
      default: return 'default'
    }
  }

  // Calculate timeline progress
  const stages = ['pending', 'funded', 'released']
  let currentStageIndex = stages.indexOf(escrow.status)
  if (escrow.status === 'completed') currentStageIndex = 2
  if (escrow.status === 'disputed' || escrow.status === 'cancelled') currentStageIndex = -1

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Escrow #{escrow.id}</h1>
              <Badge variant={getStatusColor(escrow.status) as any} className="capitalize text-sm px-2.5 py-0.5">
                {escrow.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {escrow.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {escrow.status === 'pending' && (
              <>
                <Dialog open={openModal === 'fund'} onOpenChange={(open) => setOpenModal(open ? 'fund' : null)}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-warning text-warning-foreground hover:bg-warning/90">
                      <Activity className="w-4 h-4 mr-2" /> Mark as Funded
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fund Escrow</DialogTitle>
                      <DialogDescription>
                        Confirm that the buyer has sent {escrow.amount} {escrow.currency} to the provided address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Transaction Hash (Required)</label>
                        <Input 
                          placeholder="0x..." 
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <Input 
                          placeholder="Additional context..." 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                      <Button onClick={() => handleAction("fund")} disabled={!txHash || fundEscrow.isPending}>
                        {fundEscrow.isPending ? "Confirming..." : "Confirm Funding"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openModal === 'cancel'} onOpenChange={(open) => setOpenModal(open ? 'cancel' : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                      <XCircle className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Escrow</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel this escrow? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for cancellation (Optional)</label>
                        <Input 
                          placeholder="Why is this being cancelled?" 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Back</Button>
                      <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={cancelEscrow.isPending}>
                        {cancelEscrow.isPending ? "Cancelling..." : "Confirm Cancellation"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {escrow.status === 'funded' && (
              <>
                <Dialog open={openModal === 'release'} onOpenChange={(open) => setOpenModal(open ? 'release' : null)}>
                  <DialogTrigger asChild>
                    <Button variant="default">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Release Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Release Funds</DialogTitle>
                      <DialogDescription>
                        Release {escrow.amount} {escrow.currency} to the seller ({escrow.sellerEmail}).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <Input 
                          placeholder="Confirmation note..." 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                      <Button onClick={() => handleAction("release")} disabled={releaseEscrow.isPending}>
                        {releaseEscrow.isPending ? "Releasing..." : "Confirm Release"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openModal === 'dispute'} onOpenChange={(open) => setOpenModal(open ? 'dispute' : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                      <AlertCircle className="w-4 h-4 mr-2" /> Raise Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Raise Dispute</DialogTitle>
                      <DialogDescription>
                        Freeze funds and escalate this transaction for review.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for dispute (Required)</label>
                        <Input 
                          placeholder="Please explain the issue..." 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenModal(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => handleAction("dispute")} disabled={!notes || disputeEscrow.isPending}>
                        {disputeEscrow.isPending ? "Submitting..." : "Confirm Dispute"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Timeline */}
        {currentStageIndex >= 0 && (
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-sidebar-accent z-0" />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary z-0 transition-all duration-500" 
                  style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                />
                
                {stages.map((stage, idx) => (
                  <div key={stage} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${idx <= currentStageIndex 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-sidebar border-sidebar-accent text-muted-foreground'}`}
                    >
                      {idx < currentStageIndex ? <Check className="w-4 h-4" /> : 
                       idx === 0 ? <Clock className="w-4 h-4" /> : 
                       idx === 1 ? <Activity className="w-4 h-4" /> : 
                       <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium uppercase tracking-wider
                      ${idx <= currentStageIndex ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {stage}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {escrow.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm">{escrow.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Buyer</h3>
                    <p className="text-sm font-medium">{escrow.buyerEmail}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Seller</h3>
                    <p className="text-sm font-medium">{escrow.sellerEmail}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                    <p className="text-sm">{new Date(escrow.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                    <p className="text-sm">{new Date(escrow.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                {escrow.notes && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
                    <p className="text-sm italic">{escrow.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {escrow.txHash && (
              <Card>
                <CardHeader>
                  <CardTitle>Funding Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center p-3 bg-muted rounded-md font-mono text-sm break-all">
                    {escrow.txHash}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Escrow Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono">{escrow.amount}</span>
                  <span className="text-xl font-semibold text-muted-foreground">{escrow.currency}</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Network: <span className="font-medium text-foreground">{escrow.network}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deposit Address</CardTitle>
                <CardDescription>Send exactly {escrow.amount} {escrow.currency} to this address on the {escrow.network} network.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-sidebar border border-sidebar-border rounded-lg mb-4">
                  <div className="font-mono text-sm break-all text-center leading-relaxed">
                    {escrow.walletAddress}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy Address</>
                  )}
                </Button>
              </CardContent>
              <CardFooter className="bg-muted/50 p-4 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground text-center w-full">
                  Funds will be held securely until both parties confirm release.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  )
}