import * as React from "react"
import { useGetStats } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { ArrowRight, AlertCircle, CheckCircle2, Clock, ShieldCheck, Activity } from "lucide-react"

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats()

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  if (!stats) return null

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'released': return <ShieldCheck className="w-4 h-4 text-primary" />
      case 'funded': return <Activity className="w-4 h-4 text-warning" />
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'disputed': return <AlertCircle className="w-4 h-4 text-destructive" />
      default: return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Platform metrics and recent escrow activity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Escrows</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funded / Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.funded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Released / Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.released}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Volume by Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.totalVolumeByCurrency.map((vol) => (
                  <div key={vol.currency} className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold mr-4">
                      {vol.currency}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Total Processing
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Across all statuses
                      </p>
                    </div>
                    <div className="font-mono font-medium">
                      {vol.total}
                    </div>
                  </div>
                ))}
                {stats.totalVolumeByCurrency.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No volume data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((escrow) => (
                  <div key={escrow.id} className="flex items-start justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getStatusIcon(escrow.status)}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none mb-1">
                          {escrow.title}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {escrow.buyerEmail} &rarr; {escrow.sellerEmail}
                        </p>
                        <Badge variant={getStatusColor(escrow.status) as any} className="capitalize text-[10px] px-1.5 py-0">
                          {escrow.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="font-mono text-sm font-medium">
                        {escrow.amount} {escrow.currency}
                      </div>
                      <Link 
                        href={`/escrows/${escrow.id}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}