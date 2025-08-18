import React from 'react'
import { useTelegramInit } from './lib/tg'
import { NavTabs } from './components/NavTabs'
import MenuPage from './features/menu/MenuPage'
import ReviewsPage from './features/reviews/ReviewsPage'
import CakesPage from './features/cakes/CakesPage'
import EasterPage from './features/easter/EasterPage'
import ServicePackagesPage from './features/servicePackages/ServicePackagesPage'
import InfoPage from './features/info/InfoPage'

export default function App() {
  useTelegramInit()
  const [tab, setTab] = React.useState('menu')

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">

      <NavTabs value={tab} onChange={setTab} />

      <div className='pt-20'>
        {tab === 'menu' && <MenuPage />}
        {tab === 'reviews' && <ReviewsPage />}
        {tab === 'cakes' && <CakesPage />}
        {tab === 'easter' && <EasterPage />}
        {tab === 'servicePackages' && <ServicePackagesPage />}
        {tab === 'info' && <InfoPage />}
      </div>
    </div>
  )
}
