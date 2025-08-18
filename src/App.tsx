import React, { useEffect } from 'react'
import { NavTabs } from './components/NavTabs'
import MenuPage from './features/menu/MenuPage'
import ReviewsPage from './features/reviews/ReviewsPage'
import CakesPage from './features/cakes/CakesPage'
import EasterPage from './features/easter/EasterPage'
import ServicePackagesPage from './features/servicePackages/ServicePackagesPage'
import InfoPage from './features/info/InfoPage'
import WebApp from '@twa-dev/sdk'
import Loader from './components/Loader/Loader'

export default function App() {
  const [loading, setLoading] = React.useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    try {
      if (!WebApp) {
        console.error('Telegram WebApp API недоступен.');
        return;
      }
      WebApp.ready();
      WebApp.expand();
    } catch (error) {
      console.error('Ошибка при инициализации Telegram WebApp:', error);
    }
  }, 500); // задержка в полсекунды

  return () => clearTimeout(timer);
}, []);

  const [tab, setTab] = React.useState('menu')

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <NavTabs value={tab} onChange={setTab} />
    {loading ? (
        <Loader />
      ) : (
        <>
          <div className='pt-20'>
            {tab === 'menu' && <MenuPage />}
            {tab === 'reviews' && <ReviewsPage />}
            {tab === 'cakes' && <CakesPage />}
            {tab === 'easter' && <EasterPage />}
            {tab === 'servicePackages' && <ServicePackagesPage />}
            {tab === 'info' && <InfoPage />}
          </div>
        </>
      )}
    </div>
  )
}
