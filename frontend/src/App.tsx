import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ShieldCheck, Stethoscope, Home as HomeIcon } from 'lucide-react'
import { WalletConnect } from '@/components/WalletConnect'
import { Home } from '@/pages/Home'
import { PatientPage } from '@/pages/PatientPage'
import { DoctorPage } from '@/pages/DoctorPage'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, exact: true },
  { to: '/patient', label: 'My Vault', icon: ShieldCheck, exact: false },
  { to: '/doctor', label: 'Doctor', icon: Stethoscope, exact: false },
]

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-5 md:px-8 max-w-4xl mx-auto">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">MedVault</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <WalletConnect />
      </div>
    </header>
  )
}

function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px]', active ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function Layout() {
  return (
    <div className="flex flex-col min-h-dvh">
      <Header />
      <main className="flex-1 pb-14 md:pb-0 max-w-4xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/patient" element={<PatientPage />} />
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/doctor/upload" element={<DoctorPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
