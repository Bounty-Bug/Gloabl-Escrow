import * as React from "react"
import { useListEscrows } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Link } from "wouter"
import { Search, Eye } from "lucide-react"

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

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Escrows</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all escrow transactions.
            </p>
          </div>
          <Link href="/escrows/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            Create Escrow
          </Link>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEscrows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No escrows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEscrows.map((escrow) => (
                    <TableRow key={escrow.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{escrow.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {escrow.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1 text-sm">
                          <span className="text-muted-foreground">B: {escrow.buyerEmail}</span>
                          <span className="text-muted-foreground">S: {escrow.sellerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">
                          {escrow.amount} {escrow.currency}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(escrow.status) as any} className="capitalize">
                          {escrow.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link 
                          href={`/escrows/${escrow.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground h-8 w-8 text-muted-foreground"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Link>
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