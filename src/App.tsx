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
  let cancelled = false;
  const timer = setTimeout(() => {
    const init = async () => {
      try {
        if (WebApp) {
          WebApp.ready();
          WebApp.expand();
        } else {
          console.error('Telegram WebApp API недоступен.');
        }
        // дожидаемся доступности API (или тайм‑аут)
        const controller = new AbortController();
        const pingTimeout = setTimeout(() => controller.abort(), 4000);
        try {
          await fetch('https://api.tatti-shef.ru/ping', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          });
        } catch (e) {
          console.warn('ping failed or timed out', e);
        } finally {
          clearTimeout(pingTimeout);
        }
      } catch (error) {
        console.error('Ошибка при инициализации Telegram WebApp:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
  }, 500); // небольшая задержка, чтобы TWA успел инициализироваться

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
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
