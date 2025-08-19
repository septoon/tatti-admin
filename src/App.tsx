import React, { useEffect } from 'react'
import { NavTabs } from './components/NavTabs'
import MenuPage from './features/menu/MenuPage'
import ReviewsPage from './features/reviews/ReviewsPage'
import CakesPage from './features/cakes/CakesPage'
import EasterPage from './features/easter/EasterPage'
import ServicePackagesPage from './features/servicePackages/ServicePackagesPage'
import InfoPage from './features/info/InfoPage'

export default function App() {
  useEffect(() => {
      try {
        const WebApp = window.Telegram?.WebApp;
        if (!WebApp) {
          console.error('Telegram WebApp API недоступен.');
          return;
        }
        WebApp.ready();
        WebApp.expand();
        WebApp.requestFullscreen();
        WebApp.disableVerticalSwipes();
        WebApp.enableClosingConfirmation();
      } catch (error) {
        console.error('Ошибка при инициализации Telegram WebApp:', error);
      }
    }, []);
  const [tab, setTab] = React.useState('Фуршетное Меню')

  return (
    <div className="max-w-7xl h-full mx-auto p-4 space-y-4">

      <NavTabs value={tab} onChange={setTab} />

      <div className=''>
        {tab === 'Фуршетное Меню' && <MenuPage />}
        {tab === 'Отзывы' && <ReviewsPage />}
        {tab === 'Торты' && <CakesPage />}
        {tab === 'Пасха' && <EasterPage />}
        {tab === 'Пакеты услуг' && <ServicePackagesPage />}
        {tab === 'Инфо' && <InfoPage />}
      </div>
    </div>
  )
}
