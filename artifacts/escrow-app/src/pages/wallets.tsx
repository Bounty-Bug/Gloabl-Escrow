import * as React from "react"
import { useListCurrencies, useGetDepositAddress, getGetDepositAddressQueryKey } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Wallet, Globe, ArrowDownToLine, Copy, Check, Info } from "lucide-react"

function DepositAddressDialog({ currency, chain }: { currency: string, chain: string }) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  
  const { data: addresses, isLoading } = useGetDepositAddress(
    { currency, chain },
    { query: { enabled: open, queryKey: getGetDepositAddressQueryKey({ currency, chain }) } }
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowDownToLine className="w-4 h-4 mr-2" />
          View Address
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Address</DialogTitle>
          <DialogDescription>
            Master deposit address for {currency} on {chain}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className="space-y-4">
              {addresses.map((addrInfo, i) => (
                <div key={i} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Address</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 bg-sidebar border border-sidebar-border rounded-md font-mono text-sm break-all">
                        {addrInfo.addr}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(addrInfo.addr)}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {addrInfo.memo && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Memo / Tag <Info className="w-3 h-3" />
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-warning/10 border border-warning/20 text-warning-foreground rounded-md font-mono text-sm font-bold">
                          {addrInfo.memo}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(addrInfo.memo!)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-warning mt-1">
                        A memo is required for this network. Without it, funds will be lost.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No deposit address available for this network.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function WalletsList() {
  const { data: currencies, isLoading } = useListCurrencies()

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supported Wallets</h1>
          <p className="text-muted-foreground mt-1">
            Browse supported assets and networks available for escrow deposits.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Deposit Options
            </CardTitle>
            <CardDescription>
              Current minimum deposit requirements and addresses per network
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Asset</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Network / Chain</TableHead>
                  <TableHead className="text-right">Min. Deposit</TableHead>
                  <TableHead className="text-right">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !currencies || currencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No supported currencies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currencies.map((currency, i) => (
                    <TableRow key={`${currency.currency}-${currency.chain}-${i}`}>
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          {currency.logoLink ? (
                            <img src={currency.logoLink} alt={currency.currency} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                              {currency.currency.substring(0, 1)}
                            </div>
                          )}
                          {currency.currency}
                        </div>
                      </TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono font-normal">
                          <Globe className="w-3 h-3 mr-1" /> {currency.chain}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {currency.minDepositAmt}
                      </TableCell>
                      <TableCell className="text-right">
                        <DepositAddressDialog currency={currency.currency} chain={currency.chain} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}