import React from 'react'
import WebApp from '@twa-dev/sdk'

type Tab = { key: string; label: string }

export function NavTabs({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const tabs: Tab[] = [
    { key: 'menu', label: 'Фуршетное Меню' },
    { key: 'reviews', label: 'Отзывы' },
    { key: 'cakes', label: 'Торты' },
    { key: 'easter', label: 'Пасха' },
    { key: 'servicePackages', label: 'Пакеты услуг' },
    { key: 'info', label: 'Инфо' },
  ]
  return (
    <div className="z-99 flex gap-2 flex-wrap fixed top-0 left-0 right-0 p-4 pb-0 bg-light/60 dark:bg-dark/60 backdrop-blur-md rounded-b-3xl">
      <div className='w-full h-full flex flex-col items-center'>
        <h1 className='mt-12 mb-8 px-4 text-dark dark:text-light font-bold'>{WebApp.initDataUnsafe?.user?.first_name ?? 'Тигран'}</h1>
        <div className='w-full flex overflow-x-scroll pb-4'>
          {tabs.map(t => (
          <button
            key={t.key}
            className={`px-3 py-1 mx-2 rounded-md shadow-lg whitespace-nowrap ${value===t.key ? 'bg-[#2EA1FF] text-white' : 'bg-white text-gray'}`}
            onClick={() => {
              WebApp.HapticFeedback.impactOccurred('heavy')
              onChange(t.key)
            }}
          >
            {t.label}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}
