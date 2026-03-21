import React from 'react'
import { NavTabs } from './components/NavTabs'
import PinGate from './components/PinGate'
import { ConfirmProvider } from './components/ConfirmProvider'
import MenuPage from './features/menu/MenuPage'
import ReviewsPage from './features/reviews/ReviewsPage'
import CakesPage from './features/cakes/CakesPage'
import EasterPage from './features/easter/EasterPage'
import ServicePackagesPage from './features/servicePackages/ServicePackagesPage'
import InfoPage from './features/info/InfoPage'
import NewYearPage from './features/new-year/NewYearPage'
import Loader from './components/Loader/Loader'
import { clearStoredAdminPin, getStoredAdminPin, storeAdminPin } from './lib/adminAuth'
import { verifyAdminAccess } from './lib/api'

type AuthStatus = 'checking' | 'locked' | 'ready'

function AppContent() {
  const [tab, setTab] = React.useState<string>('Фуршетное Меню')
  const [authStatus, setAuthStatus] = React.useState<AuthStatus>('checking')
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [authLoading, setAuthLoading] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.setAttribute('data-color-scheme', media.matches ? 'dark' : 'light')
    }

    applyTheme()
    media.addEventListener?.('change', applyTheme)

    return () => media.removeEventListener?.('change', applyTheme)
  }, [])

  React.useEffect(() => {
    const storedPin = getStoredAdminPin()
    if (!storedPin) {
      setAuthStatus('locked')
      return
    }

    let cancelled = false
    setAuthLoading(true)

    verifyAdminAccess(storedPin)
      .then(() => {
        if (cancelled) return
        setAuthStatus('ready')
        setAuthError(null)
      })
      .catch(() => {
        if (cancelled) return
        clearStoredAdminPin()
        setAuthStatus('locked')
        setAuthError('Сохранённый PIN больше не подходит. Введите актуальный код.')
      })
      .finally(() => {
        if (cancelled) return
        setAuthLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handlePinSubmit(pin: string) {
    setAuthLoading(true)
    setAuthError(null)
    try {
      await verifyAdminAccess(pin)
      storeAdminPin(pin)
      setAuthStatus('ready')
    } catch (error) {
      clearStoredAdminPin()
      setAuthStatus('locked')
      setAuthError(error instanceof Error ? error.message : 'Не удалось проверить PIN')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    clearStoredAdminPin()
    setAuthStatus('locked')
    setAuthError(null)
  }

  return (
    <div className="app-shell-safe-area mx-auto max-w-7xl space-y-4">
      {authStatus === 'checking' ? (
        <Loader />
      ) : authStatus === 'ready' ? (
        <>
          <NavTabs value={tab} onChange={setTab} onLock={handleLogout} />
          <div className="pb-32">
            {tab === 'Фуршетное Меню' && <MenuPage />}
            {tab === 'Новый Год' && <NewYearPage />}
            {tab === 'Отзывы' && <ReviewsPage />}
            {tab === 'Торты' && <CakesPage />}
            {tab === 'Пасха' && <EasterPage />}
            {tab === 'Пакеты услуг' && <ServicePackagesPage />}
            {tab === 'Инфо' && <InfoPage />}
          </div>
        </>
      ) : (
        <PinGate loading={authLoading} error={authError} onSubmit={handlePinSubmit} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ConfirmProvider>
      <AppContent />
    </ConfirmProvider>
  )
}
