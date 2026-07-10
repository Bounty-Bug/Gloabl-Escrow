import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocation } from "wouter"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CreateEscrowSchema } from "@/lib/schemas"
import { z } from "zod"
import { useCreateEscrow, useListCurrencies, getListEscrowsQueryKey } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    // The API might return multiple entries for the same currency but different chains
    return currencies.filter(c => c.currency === selectedCurrency).map(c => c.chain)
  }, [currencies, selectedCurrency])

  // Reset network when currency changes
  React.useEffect(() => {
    form.setValue("network", "")
  }, [selectedCurrency, form])

  const uniqueCurrencies = React.useMemo(() => {
    if (!currencies) return []
    const unique = new Set(currencies.map(c => c.currency))
    return Array.from(unique)
  }, [currencies])

  function onSubmit(values: z.infer<typeof CreateEscrowSchema>) {
    createEscrow.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({
          title: "Escrow Created",
          description: `Escrow #${data.id} has been created successfully.`,
        })
        queryClient.invalidateQueries({ queryKey: getListEscrowsQueryKey() })
        setLocation(`/escrows/${data.id}`)
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to create escrow. Please try again.",
          variant: "destructive"
        })
      }
    })
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Escrow</h1>
          <p className="text-muted-foreground mt-1">
            Create a new trusted transaction between buyer and seller.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Enter the specifics of the deal and the parties involved.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Website Development Milestone 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief details about deliverables..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buyerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="buyer@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sellerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seller@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCurrencies}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uniqueCurrencies.map(currency => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="network"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCurrency || availableNetworks.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableNetworks.map(network => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createEscrow.isPending}>
                    {createEscrow.isPending ? "Creating..." : "Create Escrow"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}