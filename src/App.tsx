import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AppLayout from './layouts/AppLayout'
import { PreferencesProvider } from './contexts/PreferencesContext'

const queryClient = new QueryClient()

// Pages
import Dashboard from './pages/Dashboard'
import Trips from './pages/Trips'
import Vehicles from './pages/Vehicles'
import Drivers from './pages/Drivers'
import Parties from './pages/Parties'
import Diesel from './pages/Diesel'
import Expenses from './pages/Expenses'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <BrowserRouter>
          <Toaster theme="dark" position="bottom-right" />
          <AnimatePresence mode="wait">
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/diesel" element={<Diesel />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}

export default App
