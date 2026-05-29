import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building, Sun, Moon, Database, Save, CheckCircle2, MessageSquare, QrCode, Smartphone, RefreshCw, Unlink, Check, Download, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePreferences } from '@/contexts/PreferencesContext'

export default function Settings() {
  const { t } = usePreferences();
  // Company state loaded from localStorage
  const [companyName, setCompanyName] = useState('TMS Logistics Pro')
  const [companySub, setCompanySub] = useState('Reliable Cargo & Transportation Services')
  const [companyGst, setCompanyGst] = useState('27GTA12345Z678')
  const [companyAddr, setCompanyAddr] = useState('Mumbai, Maharashtra')

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

  // WhatsApp Gateway state
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const handleLinkDevice = () => {
    setIsLinking(true)
    setQrCode(null)
    setWhatsappStatus('loading')
    if (window.electronAPI?.whatsapp) {
      window.electronAPI.whatsapp.init()
    } else {
      setTimeout(() => {
        setIsLinking(false)
        setWhatsappConnected(true)
        localStorage.setItem('whatsappConnected', 'true')
      }, 3000)
    }
  }

  const handleDisconnectWA = () => {
    if (window.electronAPI?.whatsapp) {
      window.electronAPI.whatsapp.disconnect()
    } else {
      setWhatsappConnected(false)
      localStorage.setItem('whatsappConnected', 'false')
    }
  }

  const handleSendTestMessage = async () => {
    setTestSent(true)
    if (window.electronAPI?.whatsapp) {
      const testPhone = window.prompt(t("Enter phone number to send test message (with country code, e.g. 919876543210):"))
      if (testPhone) {
        try {
          const res = await window.electronAPI.whatsapp.send(testPhone, t("Hello! This is a test message from your TMS Logistics Pro WhatsApp connection. It is successfully connected!"))
          if (res && res.error) {
            alert(t("Error sending test message: ") + res.error)
          } else {
            alert(t("Test message sent successfully!"))
          }
        } catch (err: any) {
          alert(t("Failed to send test message: ") + err.message)
        }
      }
    } else {
      setTimeout(() => {
        setTestSent(false)
      }, 3000)
      return
    }
    setTestSent(false)
  }

  const handleBackup = async () => {
    if (!window.electronAPI?.app?.backup) {
      alert(t("Backup functionality is only available in the desktop application."))
      return
    }

    try {
      const res = await window.electronAPI.app.backup()
      if (res.success && res.filePath) {
        alert(`${t("Backup file saved successfully at:\n")}${res.filePath}`)
      } else if (res.error) {
        alert(`${t("Failed to save backup: ")}${res.error}`)
      }
    } catch (err: any) {
      alert(`${t("Error creating backup: ")}${err.message}`)
    }
  }

  const handleRestore = async () => {
    if (!window.electronAPI?.app?.restore) {
      alert(t("Restore functionality is only available in the desktop application."))
      return
    }

    const confirm = window.confirm(t("WARNING: Restoring a backup will overwrite your current active database and delete any unsaved changes. The application will reload. Do you want to proceed?"))
    if (!confirm) return

    try {
      const res = await window.electronAPI.app.restore()
      if (res.success) {
        alert(t("Database successfully restored! The app will now reload."))
        window.location.reload()
      } else if (res.error) {
        alert(`${t("Failed to restore database: ")}${res.error}`)
      }
    } catch (err: any) {
      alert(`${t("Error restoring database: ")}${err.message}`)
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

    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)

    // Load WhatsApp connection state
    if (!window.electronAPI?.whatsapp) {
      const savedWA = localStorage.getItem('whatsappConnected') === 'true'
      setWhatsappConnected(savedWA)
    } else {
      const checkStatus = async () => {
        const status = await window.electronAPI.whatsapp!.getStatus()
        setWhatsappConnected(status === 'connected')
        if (status === 'connected') {
          setWhatsappStatus('connected')
        } else if (status === 'qr_ready' || status === 'loading') {
          setWhatsappStatus(status)
          setIsLinking(true)
          if (status === 'qr_ready') {
            const qr = await window.electronAPI.whatsapp!.getLastQr()
            if (qr) setQrCode(qr)
          }
        } else {
          setWhatsappStatus('disconnected')
        }
      }
      
      checkStatus()

      const unsubQr = window.electronAPI.whatsapp.onQr((qrData) => {
        setQrCode(qrData)
        setWhatsappStatus('qr_ready')
        setIsLinking(true)
      })

      const unsubStatus = window.electronAPI.whatsapp.onStatus((status) => {
        setWhatsappStatus(status)
        if (status === 'connected') {
          setWhatsappConnected(true)
          setIsLinking(false)
          localStorage.setItem('whatsappConnected', 'true')
        } else if (status === 'disconnected') {
          setWhatsappConnected(false)
          setQrCode(null)
          setIsLinking(false)
          localStorage.setItem('whatsappConnected', 'false')
        } else if (status === 'loading') {
          setIsLinking(true)
        } else if (status === 'qr_ready') {
          setIsLinking(true)
        }
      })

      window.electronAPI.whatsapp.init()

      return () => {
        unsubQr()
        unsubStatus()
      }
    }

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

          {/* WhatsApp Gateway Settings */}
          <Card className="glass overflow-hidden relative">
            {/* Inline animation styles for scanning line */}
            <style>{`
              @keyframes scan {
                0% { top: 5%; }
                50% { top: 90%; }
                100% { top: 5%; }
              }
            `}</style>
            
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg font-bold">{t('WhatsApp Gateway Link')}</CardTitle>
              </div>
              <Badge 
                variant="outline" 
                className={
                  whatsappConnected 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold" 
                    : whatsappStatus === 'loading'
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500 font-bold"
                      : "bg-orange-500/10 border-orange-500/20 text-orange-500 font-bold"
                }
              >
                {whatsappConnected ? t("Connected") : whatsappStatus === 'loading' ? t("Starting...") : t("Disconnected")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {whatsappConnected ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{t('Device Linked Successfully')}</p>
                      <p className="text-xs text-muted-foreground">{t('Active for Invoice sharing & Payment reminders')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSendTestMessage}
                      className="flex-1 h-12 font-semibold border-white/10 hover:bg-white/5 rounded-xl text-foreground flex items-center justify-center gap-2"
                    >
                      {testSent ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500 animate-bounce" />
                          {t('Test Sent!')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {t('Send Test Message')}
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={handleDisconnectWA}
                      className="flex-1 h-12 font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center gap-2"
                    >
                      <Unlink className="h-4 w-4" />
                      {t('Disconnect Phone')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      {t('Link your WhatsApp account to enable direct invoice sending and automated outstanding balance alerts.')}
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 text-xs text-muted-foreground">
                      <li>{t('Open WhatsApp on your phone')}</li>
                      <li>{t('Tap ')}<strong>{t('Settings / Linked Devices')}</strong></li>
                      <li>{t('Tap ')}<strong>{t('Link a Device')}</strong>{t(' and point your camera to this screen')}</li>
                    </ol>
                    <div className="pt-2 flex flex-col gap-2">
                      <Button 
                        type="button"
                        onClick={handleLinkDevice}
                        disabled={isLinking}
                        className="w-full h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLinking ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            {whatsappStatus === 'qr_ready' ? t('Waiting for Scan...') : t('Starting Client...')}
                          </>
                        ) : (
                          <>
                            <QrCode className="h-4 w-4" />
                            {t('Link Phone / Show QR Code')}
                          </>
                        )}
                      </Button>
                      
                      {isLinking && whatsappStatus === 'loading' && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleDisconnectWA}
                          className="w-full h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {t('Cancel / Reset if stuck')}
                        </Button>
                      )}
                    </div>
                  </div>

                   <div className="flex flex-col items-center justify-center border border-white/10 bg-white/5 rounded-2xl p-4 relative overflow-hidden group min-h-[220px]">
                    {/* Glowing green scanning laser line */}
                    {isLinking && whatsappStatus !== 'qr_ready' && (
                      <div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981] z-10 animate-[scan_2s_ease-in-out_infinite]" />
                    )}
                    {qrCode ? (
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code Link" 
                        className="h-40 w-40 object-contain rounded-lg transition-all duration-300 bg-white p-1"
                      />
                    ) : (
                      <div className="h-40 w-40 flex flex-col items-center justify-center text-muted-foreground/50 border-2 border-dashed border-white/10 rounded-xl">
                        <QrCode className="h-10 w-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium">{t('QR Area')}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-3 font-mono uppercase tracking-wider text-center">
                      {isLinking && !qrCode ? t("Starting WhatsApp engine...\n(This can take 10-30s)") : qrCode ? t("Scan QR Code to Link") : t("Click 'Link Phone' to generate QR")}
                    </span>
                    {(!window.electronAPI || !window.electronAPI.app) && (
                      <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl text-[11px] text-center max-w-[190px] font-medium leading-normal">
                        {t("⚠️ Browser Preview Mode: Scanning this mock QR will not link. Please open the Desktop App window.")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
