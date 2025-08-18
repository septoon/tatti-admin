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
    const init = async () => {
      try {
        WebApp.ready();
        WebApp.expand();
        
        await fetch('/ping'); 
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const [tab, setTab] = React.useState('menu')

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
    {loading ? (
        <Loader />
      ) : (
        <>
          <NavTabs value={tab} onChange={setTab} />
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
