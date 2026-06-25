import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ShieldCheck, Stethoscope, Home as HomeIcon, AlertTriangle, Code2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { WalletConnect } from '@/components/WalletConnect'
import { LanguageSelector } from '@/components/LanguageSelector'
import { Home } from '@/pages/Home'
import { PatientPage } from '@/pages/PatientPage'
import { DoctorPage } from '@/pages/DoctorPage'
import { ProblemPage } from '@/pages/ProblemPage'
import { ProtocolPage } from '@/pages/ProtocolPage'
import { HackathonPage } from '@/pages/HackathonPage'
import { useLanguage } from '@/hooks/useLanguage'
import { WalletProvider } from '@/contexts/WalletContext'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const BOTTOM_NAV = [
  { to: '/',         icon: HomeIcon,       key: 'home',      exact: true },
  { to: '/problem',  icon: AlertTriangle,  key: 'problem',   exact: false },
  { to: '/protocol', icon: Code2,          key: 'protocol',  exact: false },
  { to: '/patient',  icon: ShieldCheck,    key: 'vault',     exact: false },
  { to: '/doctor',   icon: Stethoscope,    key: 'doctor',    exact: false },
]

const HEADER_NAV = [
  { to: '/',          key: 'home',       exact: true },
  { to: '/problem',   key: 'problem',    exact: false },
  { to: '/protocol',  key: 'protocol',   exact: false },
  { to: '/hackathon', key: 'hackathon',  exact: false },
]

function Header({ lang, setLang }: { lang: ReturnType<typeof useLanguage>['lang']; setLang: ReturnType<typeof useLanguage>['setLang'] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-5 md:px-8 max-w-5xl mx-auto">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">MedVault</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-0.5">
          {HEADER_NAV.map(({ to, key, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {t('nav', key, lang)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector lang={lang} onChange={setLang} />
          <WalletConnect />
        </div>
      </div>
    </header>
  )
}

function BottomNav({ lang }: { lang: ReturnType<typeof useLanguage>['lang'] }) {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-14">
        {BOTTOM_NAV.map(({ to, icon: Icon, key, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
              <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[9px]', active ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {t('nav', key, lang)}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function AnimatedRoutes({ lang }: { lang: ReturnType<typeof useLanguage>['lang'] }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1"
      >
        <Routes location={location}>
          <Route path="/"          element={<Home lang={lang} />} />
          <Route path="/problem"   element={<ProblemPage lang={lang} />} />
          <Route path="/protocol"  element={<ProtocolPage lang={lang} />} />
          <Route path="/patient"   element={<PatientPage />} />
          <Route path="/doctor"    element={<DoctorPage />} />
          <Route path="/doctor/upload" element={<DoctorPage />} />
          <Route path="/hackathon" element={<HackathonPage lang={lang} />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function Layout() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex flex-col min-h-dvh">
      <Header lang={lang} setLang={setLang} />
      <main className="flex flex-col flex-1 pb-14 md:pb-0 max-w-5xl mx-auto w-full">
        <AnimatedRoutes lang={lang} />
      </main>
      <BottomNav lang={lang} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <Layout />
      </WalletProvider>
    </BrowserRouter>
  )
}
