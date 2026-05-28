import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Receipt, Calendar, DollarSign, Tag, Briefcase, Trash2, Edit, Filter, RefreshCw, TrendingDown } from 'lucide-react'
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

const CATEGORY_COLORS: Record<string, string> = {
  'Toll & RTO': 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  'Maintenance & Repairs': 'border-orange-500/30 text-orange-500 bg-orange-500/10',
  'Driver Salary / Bhatta': 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  'Office Rent / Bills': 'border-green-500/30 text-green-500 bg-green-500/10',
  'Taxes & Insurance': 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10',
  'Other Operational Expenses': 'border-slate-500/30 text-slate-500 bg-slate-500/10'
}

export default function Expenses() {
  const location = useLocation()
  const [expenses, setExpenses] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)

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
      if (res.error) { setError(res.error) } else { setIsOpen(false); resetForm(); loadData() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    try {
      const res = await window.electronAPI.prisma.query('expense', 'update', {
        where: { id: selectedExpense.id },
        data: {
          category,
          description: description || null,
          amount: parseFloat(amount),
          paidBy: paidBy || null,
          tripReference: tripReference || null,
          date: new Date(date)
        }
      })
      if (res.error) { setError(res.error) } else { setIsEditOpen(false); resetForm(); loadData() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleOpenEdit = (expense: any) => {
    setSelectedExpense(expense)
    setCategory(expense.category)
    setDescription(expense.description || '')
    setAmount(String(expense.amount))
    setPaidBy(expense.paidBy || '')
    setTripReference(expense.tripReference || '')
    setDate(new Date(expense.date).toISOString().split('T')[0])
    setError('')
    setIsEditOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedExpense) return
    try {
      await window.electronAPI.prisma.query('expense', 'delete', { where: { id: selectedExpense.id } })
      setIsDeleteOpen(false)
      setSelectedExpense(null)
      loadData()
    } catch (err: any) { setError(err.message || 'Delete failed') }
  }

  const resetForm = () => {
    setCategory(EXPENSE_CATEGORIES[0])
    setDescription('')
    setAmount('')
    setPaidBy('')
    setTripReference('')
    setDate(new Date().toISOString().split('T')[0])
    setError('')
    setSelectedExpense(null)
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const filteredExpenses = expenses.filter(exp => {
    const matchesCat = categoryFilter === 'All' || exp.category === categoryFilter
    const matchesSearch = exp.category.toLowerCase().includes(search.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(search.toLowerCase())) ||
      (exp.tripReference && exp.tripReference.toLowerCase().includes(search.toLowerCase()))
    const expDate = new Date(exp.date)
    const matchesMonth = monthFilter === 'all' ||
      (monthFilter === 'this' && expDate >= thisMonthStart) ||
      (monthFilter === 'last' && expDate >= lastMonthStart && expDate <= lastMonthEnd)
    return matchesCat && matchesSearch && matchesMonth
  })

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

  const totalExpense = filteredExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0)
  const tollExpenses = filteredExpenses.filter(e => e.category === 'Toll & RTO').reduce((acc, exp) => acc + (exp.amount || 0), 0)
  const maintenanceExpenses = filteredExpenses.filter(e => e.category === 'Maintenance & Repairs').reduce((acc, exp) => acc + (exp.amount || 0), 0)
  const thisMonthTotal = expenses.filter(e => new Date(e.date) >= thisMonthStart).reduce((acc, e) => acc + (e.amount || 0), 0)

  // Category breakdown
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((acc, e) => acc + (e.amount || 0), 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const grandTotal = categoryTotals.reduce((acc, c) => acc + c.total, 0)

  const renderExpenseForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      <div className="space-y-2">
        <Label>Expense Category *</Label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" required>
          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Expense Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/50 border-white/10" required /></div>
        <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background/50 border-white/10" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Paid By</Label><Input placeholder="e.g. Owner, Driver" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2">
          <Label>Link to Trip (Optional)</Label>
          <select value={tripReference} onChange={(e) => setTripReference(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">None</option>
            {trips.map(t => <option key={t.id} value={t.tripNo}>{t.tripNo} ({t.from} → {t.to})</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2"><Label>Notes / Description</Label><Input placeholder="e.g. Toll taxes paid on NH8 or vehicle spare parts" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background/50 border-white/10" /></div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setIsEditOpen(false); resetForm() }}>Cancel</Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{isEdit ? 'Update Expense' : 'Log Expense'}</Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Expense Log</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Operational Expense</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(thisMonthTotal)} this month</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tolls & Permits</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tollExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.filter(e => e.category === 'Toll & RTO').length} entries</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Repairs & Maintenance</CardTitle>
            <Receipt className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(maintenanceExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.filter(e => e.category === 'Maintenance & Repairs').length} entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Bar */}
      {categoryTotals.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-red-400" />
              Expense Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryTotals.map(({ cat, total }) => (
                <div key={cat} className="flex items-center space-x-3">
                  <div className="w-28 text-xs text-muted-foreground truncate">{cat.split(' ')[0]}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(total / grandTotal) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right text-xs font-semibold">{formatCurrency(total)}</div>
                  <div className="w-10 text-right text-xs text-muted-foreground">{Math.round((total / grandTotal) * 100)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {[['all', 'All Time'], ['this', 'This Month'], ['last', 'Last Month']].map(([val, label]) => (
            <button key={val} onClick={() => setMonthFilter(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${monthFilter === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-1 flex-wrap gap-y-1">
          {['All', ...EXPENSE_CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              {cat === 'All' ? 'All' : cat.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Expense Tracker</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search expenses, tags or notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
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
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No expenses logged.</TableCell></TableRow>
                ) : (
                  filteredExpenses.map((exp) => (
                    <TableRow key={exp.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <Badge variant="outline" className={CATEGORY_COLORS[exp.category] || 'border-slate-500/30 text-slate-500 bg-slate-500/10'}>
                          <Tag className="h-3 w-3 mr-1" />{exp.category}
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
                          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">{exp.tripReference}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-500">{formatCurrency(exp.amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(exp)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedExpense(exp); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredExpenses.length > 0 && (
            <div className="flex justify-between items-center mt-3 px-2 py-2 bg-red-500/5 rounded-lg border border-red-500/10">
              <span className="text-sm text-muted-foreground">Total ({filteredExpenses.length} entries)</span>
              <span className="text-sm font-bold text-red-500">{formatCurrency(totalExpense)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Log Expense Entry</DialogTitle><DialogDescription>Record operational and fleet maintenance expenses to balance reports.</DialogDescription></DialogHeader>
          {renderExpenseForm(false, handleSubmit)}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Edit Expense Entry</DialogTitle><DialogDescription>Update the details of this expense record.</DialogDescription></DialogHeader>
          {renderExpenseForm(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Expense?</DialogTitle>
            <DialogDescription>
              Delete this {selectedExpense?.category} entry of <strong>{formatCurrency(selectedExpense?.amount || 0)}</strong> on {selectedExpense && new Date(selectedExpense.date).toLocaleDateString()}? Cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
