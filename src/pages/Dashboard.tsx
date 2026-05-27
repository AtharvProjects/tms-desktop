import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts'
import { Truck, DollarSign, Wallet, Activity, TrendingUp, TrendingDown, Fuel, FileText, Receipt, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    activeTrips: 0,
    totalExpenses: 0
  })
  const [recentTrips, setRecentTrips] = useState<any[]>([])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const tripsRes = await window.electronAPI.prisma.query('trip', 'findMany', {
          orderBy: { createdAt: 'desc' }
        })
        const partiesRes = await window.electronAPI.prisma.query('party', 'findMany')
        const expensesRes = await window.electronAPI.prisma.query('expense', 'findMany')
        const dieselRes = await window.electronAPI.prisma.query('dieselLog', 'findMany')

        if (tripsRes.data && partiesRes.data && expensesRes.data && dieselRes.data) {
          const trips = tripsRes.data
          const parties = partiesRes.data
          const expenses = expensesRes.data
          const diesel = dieselRes.data

          const revenue = trips.reduce((acc: number, trip: any) => acc + (trip.freightAmount || 0), 0)
          const outstanding = parties.reduce((acc: number, party: any) => acc + (party.outstandingBalance || 0), 0)
          const activeTrips = trips.filter((t: any) => t.podStatus !== 'Received').length
          
          const operationalExpenses = expenses.reduce((acc: number, exp: any) => acc + (exp.amount || 0), 0)
          const fuelExpenses = diesel.reduce((acc: number, log: any) => acc + (log.totalCost || 0), 0)
          const totalExpenses = operationalExpenses + fuelExpenses

          setStats({
            totalRevenue: revenue,
            outstanding,
            activeTrips,
            totalExpenses
          })
          setRecentTrips(trips.slice(0, 4))
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error)
      }
    }

    loadDashboardData()
  }, [])

  const chartData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  const netProfit = stats.totalRevenue - stats.totalExpenses

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Dashboard Overview
        </h1>
      </div>

      {/* Quick Action Hub */}
      <Card className="glass border-white/20 p-6">
        <CardHeader className="pb-3 pt-0 px-0">
          <CardTitle className="text-lg font-bold text-foreground">Quick Dispatch Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-4 p-0">
          <Button 
            onClick={() => navigate('/trips', { state: { openNew: true } })}
            className="h-14 text-base font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl"
          >
            <Plus className="mr-2 h-5 w-5" /> Dispatch New Trip
          </Button>
          <Button 
            onClick={() => navigate('/diesel', { state: { openNew: true } })}
            variant="outline"
            className="h-14 text-base font-semibold border-white/10 hover:bg-white/5 rounded-xl text-foreground"
          >
            <Fuel className="mr-2 h-5 w-5 text-blue-500" /> Log Fuel Refill
          </Button>
          <Button 
            onClick={() => navigate('/expenses', { state: { openNew: true } })}
            variant="outline"
            className="h-14 text-base font-semibold border-white/10 hover:bg-white/5 rounded-xl text-foreground"
          >
            <Receipt className="mr-2 h-5 w-5 text-red-500" /> Record Expense
          </Button>
          <Button 
            onClick={() => navigate('/invoices', { state: { openNew: true } })}
            variant="outline"
            className="h-14 text-base font-semibold border-white/10 hover:bg-white/5 rounded-xl text-foreground"
          >
            <FileText className="mr-2 h-5 w-5 text-green-500" /> Generate Invoice
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {[
          { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-green-500', delay: 0.1 },
          { title: 'Operating Profit', value: formatCurrency(netProfit), icon: netProfit >= 0 ? TrendingUp : TrendingDown, color: netProfit >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold', delay: 0.2 },
          { title: 'Outstanding Balance', value: formatCurrency(stats.outstanding), icon: Wallet, color: 'text-orange-500', delay: 0.3 },
          { title: 'Active Trips', value: stats.activeTrips, icon: Truck, color: 'text-blue-500', delay: 0.4 },
          { title: 'Total Expenses', value: formatCurrency(stats.totalExpenses), icon: Activity, color: 'text-red-500', delay: 0.5 },
        ].map((stat) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.4, type: 'spring' }}
          >
            <Card className="glass overflow-hidden relative group">
              <div className={`absolute top-0 left-0 w-1 h-full opacity-50 bg-gradient-to-b from-primary to-transparent`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated live
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <RechartsTooltip 
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 glass">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentTrips.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No recent trip activity.
                </p>
              ) : (
                recentTrips.map((trip) => (
                  <div key={trip.id} className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Trip {trip.tripNo} created</p>
                      <p className="text-xs text-muted-foreground">
                        {trip.from} → {trip.to}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Badge variant="outline" className={
                        trip.podStatus === 'Received' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                        trip.podStatus === 'Submitted' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                        'border-orange-500/30 text-orange-500 bg-orange-500/10'
                      }>
                        {trip.podStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
