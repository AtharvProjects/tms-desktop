import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Receipt, Calendar, DollarSign, Tag, Briefcase } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'

const EXPENSE_CATEGORIES = [
  'Toll & RTO',
  'Maintenance & Repairs',
  'Driver Salary / Bhatta',
  'Office Rent / Bills',
  'Taxes & Insurance',
  'Other Operational Expenses'
]

export default function Expenses() {
  const location = useLocation()
  const [expenses, setExpenses] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Form State
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [tripReference, setTripReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const expRes = await window.electronAPI.prisma.query('expense', 'findMany', {
        orderBy: { date: 'desc' }
      })
      if (expRes.data) setExpenses(expRes.data)

      const tripsRes = await window.electronAPI.prisma.query('trip', 'findMany', {
        orderBy: { tripNo: 'desc' }
      })
      if (tripsRes.data) setTrips(tripsRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    if (location.state && (location.state as any).openNew) {
      setIsOpen(true)
    }
  }, [location.state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('expense', 'create', {
        data: {
          category,
          description: description || null,
          amount: parseFloat(amount),
          paidBy: paidBy || null,
          tripReference: tripReference || null,
          date: new Date(date)
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
        resetForm()
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setCategory(EXPENSE_CATEGORIES[0])
    setDescription('')
    setAmount('')
    setPaidBy('')
    setTripReference('')
    setDate(new Date().toISOString().split('T')[0])
    setError('')
  }

  const filteredExpenses = expenses.filter(exp => 
    exp.category.toLowerCase().includes(search.toLowerCase()) ||
    (exp.description && exp.description.toLowerCase().includes(search.toLowerCase())) ||
    (exp.tripReference && exp.tripReference.toLowerCase().includes(search.toLowerCase()))
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  const totalExpense = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0)
  const tollExpenses = expenses.filter(e => e.category === 'Toll & RTO').reduce((acc, exp) => acc + (exp.amount || 0), 0)
  const maintenanceExpenses = expenses.filter(e => e.category === 'Maintenance & Repairs').reduce((acc, exp) => acc + (exp.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Expense Log
        </h1>
        <Button 
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Operational Expense</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tolls & Permits</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tollExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Repairs & Maintenance</CardTitle>
            <Receipt className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(maintenanceExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Expense Tracker</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search expenses, tags or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description / Notes</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Trip Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                      No expenses logged.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => (
                    <TableRow key={exp.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <Badge variant="outline" className={
                          exp.category === 'Toll & RTO' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          exp.category === 'Maintenance & Repairs' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' :
                          exp.category === 'Driver Salary / Bhatta' ? 'border-purple-500/30 text-purple-500 bg-purple-500/10' :
                          exp.category === 'Office Rent / Bills' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          exp.category === 'Taxes & Insurance' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' :
                          'border-slate-500/30 text-slate-500 bg-slate-500/10'
                        }>
                          <Tag className="h-3 w-3 mr-1" />
                          {exp.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {new Date(exp.date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{exp.description || 'N/A'}</TableCell>
                      <TableCell>{exp.paidBy || 'N/A'}</TableCell>
                      <TableCell>
                        {exp.tripReference ? (
                          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                            {exp.tripReference}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-500">
                        {formatCurrency(exp.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Log Expense Entry</DialogTitle>
            <DialogDescription>
              Record operational and fleet maintenance expenses to balance reports.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="category">Expense Category *</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                required
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Expense Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidBy">Paid By</Label>
                <Input
                  id="paidBy"
                  placeholder="e.g. Owner, Driver"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripReference">Link to Trip (Optional)</Label>
                <select
                  id="tripReference"
                  value={tripReference}
                  onChange={(e) => setTripReference(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="">None</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.tripNo}>{t.tripNo} ({t.from} → {t.to})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes / Description</Label>
              <Input
                id="description"
                placeholder="e.g. Toll taxes paid on NH8 or vehicle spare parts"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Log Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
