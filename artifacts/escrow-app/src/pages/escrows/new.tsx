import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocation } from "wouter"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CreateEscrowSchema } from "@/lib/schemas"
import { z } from "zod"
import { useCreateEscrow, useListCurrencies, getListEscrowsQueryKey } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Users, DollarSign, ArrowRight, Globe, Lock } from "lucide-react"

export default function NewEscrow() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: currencies, isLoading: isLoadingCurrencies } = useListCurrencies()
  const createEscrow = useCreateEscrow()

  const form = useForm<z.infer<typeof CreateEscrowSchema>>({
    resolver: zodResolver(CreateEscrowSchema),
    defaultValues: {
      title: "",
      description: "",
      buyerEmail: "",
      sellerEmail: "",
      amount: "",
      currency: "",
      network: "",
    },
  })

  const selectedCurrency = form.watch("currency")

  const availableNetworks = React.useMemo(() => {
    if (!currencies || !selectedCurrency) return []
    return currencies.filter(c => c.currency === selectedCurrency).map(c => c.chain)
  }, [currencies, selectedCurrency])

  React.useEffect(() => {
    form.setValue("network", "")
  }, [selectedCurrency, form])

  const uniqueCurrencies = React.useMemo(() => {
    if (!currencies) return []
    return Array.from(new Set(currencies.map(c => c.currency)))
  }, [currencies])

  function onSubmit(values: z.infer<typeof CreateEscrowSchema>) {
    createEscrow.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({ title: "✓ Escrow Created", description: `Escrow #${data.id} is ready for funding.` })
        queryClient.invalidateQueries({ queryKey: getListEscrowsQueryKey() })
        setLocation(`/escrows/${data.id}`)
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Failed to create escrow. Please try again."
        toast({ title: "Error", description: msg, variant: "destructive" })
      }
    })
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">New Escrow</h1>
          <p className="text-slate-500 text-sm mt-1">Protect your transaction with a secure on-chain escrow.</p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-blue-900 mb-0.5">How it works</div>
            <div className="text-blue-700 leading-relaxed">
              Once created, the buyer sends crypto to the escrow wallet. Funds are locked until both parties confirm delivery — then released to the seller.
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Section: Deal Info */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" /> Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Website Development — Milestone 1" className="bg-white border-slate-200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Description <span className="text-slate-400 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the deliverables, milestones, or conditions for this escrow…"
                        className="bg-white border-slate-200 resize-none min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Section: Parties */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Parties Involved
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Both will receive email updates at every step.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="buyerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Buyer Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="buyer@example.com" className="bg-white border-slate-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sellerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Seller Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seller@example.com" className="bg-white border-slate-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Section: Payment */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" /> Payment Details
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  A verified deposit address will be generated from OKX for the selected network.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="bg-white border-slate-200 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCurrencies}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder={isLoadingCurrencies ? "Loading…" : "Select asset"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {uniqueCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="network" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Network</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCurrency || availableNetworks.length === 0}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder={!selectedCurrency ? "Pick currency first" : "Select network"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableNetworks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={createEscrow.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm text-base"
            >
              {createEscrow.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Escrow…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Escrow <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </Shell>
  )
}
