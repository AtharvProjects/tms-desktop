import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building, Sun, Moon, Database, Save, CheckCircle2, Download, Upload, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePreferences } from '@/contexts/PreferencesContext'
import { toast } from 'sonner'

import { WhatsAppStatusCard } from '@/components/whatsapp/WhatsAppStatusCard'

export default function Settings() {
  const { t } = usePreferences();
  // Company state loaded from localStorage
  const [companyName, setCompanyName] = useState('TMS Logistics Pro')
  const [companySub, setCompanySub] = useState('Reliable Cargo & Transportation Services')
  const [companyGst, setCompanyGst] = useState('27GTA12345Z678')
  const [companyAddr, setCompanyAddr] = useState('Mumbai, Maharashtra')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')

  // Theme state
  const [theme, setTheme] = useState('light')

  // Database stats
  const [stats, setStats] = useState({
    trips: 0,
    vehicles: 0,
    drivers: 0,
    parties: 0,
    dieselLogs: 0,
    expenses: 0,
    invoices: 0
  })

  // Alert/Notification State
  const [success, setSuccess] = useState(false)

  const handleBackup = async () => {
    if (!window.electronAPI?.app?.backup) {
      toast.error(t("Backup functionality is only available in the desktop application."))
      return
    }

    try {
      const res = await window.electronAPI.app.backup()
      if (res.success && res.filePath) {
        toast.success(`${t("Backup file saved successfully at: ")}${res.filePath}`)
      } else if (res.error) {
        toast.error(`${t("Failed to save backup: ")}${res.error}`)
      }
    } catch (err: any) {
      toast.error(`${t("Error creating backup: ")}${err.message}`)
    }
  }

  const handleRestore = async () => {
    if (!window.electronAPI?.app?.restore) {
      toast.error(t("Restore functionality is only available in the desktop application."))
      return
    }

    const confirm = window.confirm(t("WARNING: Restoring a backup will overwrite your current active database and delete any unsaved changes. The application will reload. Do you want to proceed?"))
    if (!confirm) return

    try {
      const res = await window.electronAPI.app.restore()
      if (res.success) {
        toast.success(t("Database successfully restored! The app will now reload."))
        setTimeout(() => window.location.reload(), 1000)
      } else if (res.error) {
        toast.error(`${t("Failed to restore database: ")}${res.error}`)
      }
    } catch (err: any) {
      toast.error(`${t("Error restoring database: ")}${err.message}`)
    }
  }

  const handleResetDatabase = async () => {
    if (!window.electronAPI?.app?.resetDatabase) {
      toast.error(t("Database reset is only available in the desktop application."));
      return;
    }

    const confirm = window.confirm(t("DANGER: This will permanently delete ALL data (trips, invoices, vehicles, drivers, expenses) and start fresh. Are you absolutely sure you want to delete all data?"));
    if (!confirm) return;

    try {
      const res = await window.electronAPI.app.resetDatabase();
      if (res.success) {
        toast.success(t("All data deleted successfully! Application will now reload fresh."));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(`${t("Failed to reset database: ")}${res.error}`);
      }
    } catch (err: any) {
      toast.error(`${t("Error resetting database: ")}${err.message}`);
    }
  }

  useEffect(() => {
    // Load company details
    const savedName = localStorage.getItem('companyName')
    const savedSub = localStorage.getItem('companySub')
    const savedGst = localStorage.getItem('companyGst')
    const savedAddr = localStorage.getItem('companyAddr')
    
    if (savedName) setCompanyName(savedName)
    if (savedSub) setCompanySub(savedSub)
    if (savedGst) setCompanyGst(savedGst)
    if (savedAddr) setCompanyAddr(savedAddr)

    const savedOwner = localStorage.getItem('ownerName')
    const savedPhone = localStorage.getItem('ownerPhone')
    if (savedOwner) setOwnerName(savedOwner)
    if (savedPhone) setOwnerPhone(savedPhone)

    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)

    // Load Database statistics
    async function loadStats() {
      try {
        const trips = await window.electronAPI.prisma.query('trip', 'count')
        const vehicles = await window.electronAPI.prisma.query('vehicle', 'count')
        const drivers = await window.electronAPI.prisma.query('driver', 'count')
        const parties = await window.electronAPI.prisma.query('party', 'count')
        const dieselLogs = await window.electronAPI.prisma.query('dieselLog', 'count')
        const expenses = await window.electronAPI.prisma.query('expense', 'count')
        const invoices = await window.electronAPI.prisma.query('invoice', 'count')

        setStats({
          trips: trips.data || 0,
          vehicles: vehicles.data || 0,
          drivers: drivers.data || 0,
          parties: parties.data || 0,
          dieselLogs: dieselLogs.data || 0,
          expenses: expenses.data || 0,
          invoices: invoices.data || 0
        })
      } catch (err) {
        console.error('Failed to load database settings stats', err)
      }
    }

    loadStats()
  }, [])

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('companyName', companyName)
    localStorage.setItem('companySub', companySub)
    localStorage.setItem('companyGst', companyGst)
    localStorage.setItem('companyAddr', companyAddr)
    localStorage.setItem('ownerName', ownerName)
    localStorage.setItem('ownerPhone', ownerPhone)

    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
    }, 3000)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('System Settings')}
        </h1>
        {success && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-1.5 bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-medium"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('Settings saved successfully!')}
          </motion.div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form & Preference */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">{t('Company Profile Settings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-semibold">{t('Company Registered Name')}</Label>
                    <Input 
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base"
                      placeholder={t('e.g. TMS Logistics Pro')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySub" className="text-sm font-semibold">{t('Company Tagline / Subtitle')}</Label>
                    <Input 
                      id="companySub"
                      value={companySub}
                      onChange={(e) => setCompanySub(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base"
                      placeholder={t('e.g. Reliable Transport Solutions')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyGst" className="text-sm font-semibold">{t('Company GSTIN No.')}</Label>
                    <Input 
                      id="companyGst"
                      value={companyGst}
                      onChange={(e) => setCompanyGst(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base font-mono uppercase"
                      placeholder={t('e.g. 27GTA12345Z678')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddr" className="text-sm font-semibold">{t('Registered Office Address')}</Label>
                    <Input 
                      id="companyAddr"
                      value={companyAddr}
                      onChange={(e) => setCompanyAddr(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base"
                      placeholder={t('e.g. Mumbai, Maharashtra')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-sm font-semibold">{t('Owner Name')}</Label>
                    <Input 
                      id="ownerName"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base"
                      placeholder={t('e.g. Rahul Sharma')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone" className="text-sm font-semibold">{t('Owner Phone No')}</Label>
                    <Input 
                      id="ownerPhone"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      className="bg-background/50 border-white/10 h-12 text-base"
                      placeholder={t('e.g. 9876543210')}
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button type="submit" className="h-12 px-6 text-base font-semibold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl">
                    <Save className="h-4 w-4 mr-2" />
                    {t('Save Company Info')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Theme Preferences */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Sun className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">{t('Theme Settings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('Toggle between light and dark display preferences.')}
              </p>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                  className={`h-16 flex-1 text-base font-semibold rounded-xl flex items-center justify-center gap-2 ${
                    theme === 'light' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'border-white/10 hover:bg-white/5 text-foreground'
                  }`}
                >
                  <Sun className="h-5 w-5 text-amber-500" />
                  {t('Light Mode')}
                </Button>
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                  className={`h-16 flex-1 text-base font-semibold rounded-xl flex items-center justify-center gap-2 ${
                    theme === 'dark' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'border-white/10 hover:bg-white/5 text-foreground'
                  }`}
                >
                  <Moon className="h-5 w-5 text-blue-500" />
                  {t('Dark Mode')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Professional WhatsApp Gateway Status Card */}
          <WhatsAppStatusCard />
        </div>

        {/* Right Column: Database / System Info */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">{t('Database Metrics')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-2 text-primary font-bold text-sm">
                  <Database className="h-4 w-4" />
                  <span>{t('SQLite DB connected')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">dev.db</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Trips Dispatch Logs')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.trips}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Vehicles In Registry')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.vehicles}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Drivers Onboarded')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.drivers}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Customer Accounts (Parties)')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.parties}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Diesel Refill Records')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.dieselLogs}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Recorded Expenses')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.expenses}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-medium">{t('Generated Invoices')}</span>
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold font-mono">
                    {stats.invoices}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">{t('Backup & Restore')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {t('Export all transactions, fleet logs, and accounts into a database backup file, or restore from an existing backup to retrieve your data.')}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleBackup}
                  className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  <Download className="h-4 w-4" />
                  {t('Backup Database')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRestore}
                  className="h-11 border-white/10 hover:bg-white/5 text-foreground font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4 text-emerald-400" />
                  {t('Restore Database')}
                </Button>
                <div className="pt-2 border-t border-border mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetDatabase}
                    className="w-full h-11 border-red-500/30 text-red-500 hover:bg-red-500/10 font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    {t('Delete All Data (Fresh Clean Start)')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
