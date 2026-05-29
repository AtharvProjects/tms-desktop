import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Fuel, 
  Receipt, 
  FileText, 
  Settings,
  Car,
  Languages,
  Monitor
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { usePreferences } from '../contexts/PreferencesContext'

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Trips', path: '/trips', icon: Truck },
  { name: 'Vehicles', path: '/vehicles', icon: Car },
  { name: 'Drivers', path: '/drivers', icon: Users },
  { name: 'Parties', path: '/parties', icon: Users },
  { name: 'Diesel', path: '/diesel', icon: Fuel },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export default function AppLayout() {
  const location = useLocation()
  const { language, setLanguage, density, setDensity, t } = usePreferences()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Draggable Titlebar Area for macOS */}
      <div className="absolute top-0 left-0 right-0 h-10 app-region-drag z-50 pointer-events-none" />

      {/* Sidebar - Glassmorphism */}
      <aside className="w-72 flex-shrink-0 glass-sidebar flex flex-col pt-14 relative z-40 transition-all duration-300">
        <div className="px-8 pb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            TMS Pro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Logistics & Transport</p>
        </div>

        <nav className="flex-1 px-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 relative',
                  isActive 
                    ? 'text-primary bg-primary/10 font-bold' 
                    : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 z-10", isActive && "text-primary")} />
                <span className="z-10">{t(item.name)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-5 pb-6 pt-4 border-t border-white/5 space-y-2 mt-auto">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <Languages className="w-4 h-4" />
            {language === 'en' ? 'मराठी (Marathi)' : 'English'}
          </button>
          
          <button 
            onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <Monitor className="w-4 h-4" />
            {t(density === 'comfortable' ? 'Compact' : 'Comfortable')} {t('Density')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-30 pt-10">
        <div className="flex-1 overflow-y-auto p-8 pt-4 pb-12">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="max-w-[1600px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
