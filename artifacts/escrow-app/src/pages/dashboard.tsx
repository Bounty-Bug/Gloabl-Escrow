import * as React from "react"
import { useGetStats } from "@workspace/api-client-react"
import { Shell } from "@/components/layout/Shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { ArrowRight, AlertCircle, CheckCircle2, Clock, ShieldCheck, Activity, TrendingUp, DollarSign } from "lucide-react"

function StatCard({ title, value, icon: Icon, color = "text-slate-400" }: {
  title: string; value: React.ReactNode; icon: React.ElementType; color?: string
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  )
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; badge: any }> = {
  completed: { color: "text-emerald-600", icon: CheckCircle2, badge: "success" },
  released:  { color: "text-blue-600",    icon: ShieldCheck,  badge: "primary" },
  funded:    { color: "text-amber-600",   icon: Activity,     badge: "warning" },
  pending:   { color: "text-slate-400",   icon: Clock,        badge: "secondary" },
  disputed:  { color: "text-red-500",     icon: AlertCircle,  badge: "destructive" },
  cancelled: { color: "text-red-400",     icon: AlertCircle,  badge: "destructive" },
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats()

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="h-8 w-52 bg-slate-200 rounded-lg animate-pulse" />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  if (!stats) return null

  return (
    <Shell>
      <div className="space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Platform overview and recent activity</p>
          </div>
          <Link href="/escrows/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors self-start sm:self-auto">
            + New Escrow
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Escrows"        value={stats.total}    icon={ShieldCheck} color="text-blue-600" />
          <StatCard title="Pending"              value={stats.pending}  icon={Clock}       color="text-slate-400" />
          <StatCard title="Funded / Active"      value={stats.funded}   icon={Activity}    color="text-amber-500" />
          <StatCard title="Released"             value={stats.released} icon={CheckCircle2} color="text-emerald-600" />
        </div>

        {/* Volume + Activity */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Volume by currency */}
          <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Volume by Asset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.totalVolumeByCurrency.length === 0 ? (
                <p className="text-center py-6 text-sm text-slate-400">No volume data yet.</p>
              ) : stats.totalVolumeByCurrency.map((vol) => (
                <div key={vol.currency} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                    {vol.currency.substring(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{vol.currency}</div>
                    <div className="text-xs text-slate-400">Total processed</div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-slate-900 text-right">
                    {parseFloat(vol.total).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-3 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-4 pt-0">
              {stats.recentActivity.length === 0 ? (
                <p className="text-center py-6 text-sm text-slate-400">No activity yet.</p>
              ) : stats.recentActivity.map((escrow) => {
                const cfg = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.pending
                const Icon = cfg.icon
                return (
                  <Link key={escrow.id} href={`/escrows/${escrow.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{escrow.title}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {escrow.buyerEmail} → {escrow.sellerEmail}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="font-mono text-sm font-semibold text-slate-900">
                        {parseFloat(escrow.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {escrow.currency}
                      </div>
                      <Badge variant={cfg.badge as any} className="capitalize text-[10px] px-1.5 py-0 h-4">
                        {escrow.status}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors ml-1 flex-shrink-0" />
                  </Link>
                )
              })}
              {stats.recentActivity.length > 0 && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <Link href="/escrows" className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    View all escrows <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}
