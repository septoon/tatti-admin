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
    <div className="flex gap-2 flex-wrap fixed top-0 left-0 right-0 p-4 bg-light/60 backdrop-blur-md">
      <div className='w-full h-full flex flex-col items-center'>
        <h1 className='mt-24 mb-8'>{WebApp.initDataUnsafe?.user?.first_name ?? 'Тигран'}</h1>
        <div className='w-full'>
          {tabs.map(t => (
          <button
            key={t.key}
            className={`px-3 py-1 rounded-full border ${value===t.key ? 'bg-[#2EA1FF] text-white border-[#2EA1FF]' : 'bg-white text-dark border-slate-300'}`}
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
