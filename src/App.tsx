/* eslint-disable */
import React, { useEffect } from 'react'
import { NavTabs } from './components/NavTabs'
import MenuPage from './features/menu/MenuPage'
import ReviewsPage from './features/reviews/ReviewsPage'
import CakesPage from './features/cakes/CakesPage'
import EasterPage from './features/easter/EasterPage'
import ServicePackagesPage from './features/servicePackages/ServicePackagesPage'
import InfoPage from './features/info/InfoPage'
import { chatIds } from './common/access'

// Safe getter to avoid TS error when Telegram is not available
const getWebApp = (): any | undefined =>
  (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined)

const isLocalAllowed = process.env.REACT_APP_ALLOW_LOCAL === 'true'

export default function App() {
  const WebApp = getWebApp()
  // userId может отсутствовать вне Telegram — учитываем это в типе
  const userId: number | undefined = WebApp?.initDataUnsafe?.user?.id as number | undefined

  useEffect(() => {
    try {
      if (!WebApp) {
        console.warn('Telegram WebApp API недоступен (запуск вне Telegram).')
        return
      }
      WebApp.ready?.()
      WebApp.expand?.()
      WebApp.disableVerticalSwipes?.()
      WebApp.enableClosingConfirmation?.()
      WebApp.requestFullscreen?.()
    } catch (error) {
      console.error('Ошибка при инициализации Telegram WebApp:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [tab, setTab] = React.useState<string>('Фуршетное Меню')

  // Доступ только если userId — число и есть в списке
  const hasAccess = (typeof userId === 'number' && chatIds.includes(userId)) || (!WebApp && isLocalAllowed)

  return (
    <div className="max-w-7xl h-full mx-auto p-4 space-y-4">
      {!WebApp && isLocalAllowed && (
        <div className="text-xs text-white bg-emerald-600 rounded px-2 py-1 inline-block">DEV MODE: local access enabled</div>
      )}
      {hasAccess ? (
        <>
          <NavTabs value={tab} onChange={setTab} />

          <div>
            {tab === 'Фуршетное Меню' && <MenuPage />}
            {tab === 'Отзывы' && <ReviewsPage />}
            {tab === 'Торты' && <CakesPage />}
            {tab === 'Пасха' && <EasterPage />}
            {tab === 'Пакеты услуг' && <ServicePackagesPage />}
            {tab === 'Инфо' && <InfoPage />}
          </div>
        </>
      ) : (
        <div className='flex w-full h-full justify-center items-center'>
          <span>К сожалению, у вас нет доступа</span>
        </div>
      )}
    </div>
  )
}
