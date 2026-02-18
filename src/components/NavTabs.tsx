import React from 'react';
import WebApp from '@twa-dev/sdk';
import { MdOutlineRateReview, MdOutlineRestaurantMenu } from 'react-icons/md';
import { HiCake } from 'react-icons/hi';
import { GiEasterEgg } from 'react-icons/gi';
import { BsFillInfoCircleFill } from 'react-icons/bs';
import { LuPackageOpen } from 'react-icons/lu';
import { TbChristmasBall } from 'react-icons/tb';
import { iosUi } from '../styles/ios';

type Tab = {
  key: string
  icon: React.ReactNode
  shortLabel: string
}

export function NavTabs({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const tabs: Tab[] = [
    { key: 'Фуршетное Меню', icon: <MdOutlineRestaurantMenu />, shortLabel: 'Меню' },
    { key: 'Новый Год', icon: <TbChristmasBall />, shortLabel: 'Новый год' },
    { key: 'Отзывы', icon: <MdOutlineRateReview />, shortLabel: 'Отзывы' },
    { key: 'Торты', icon: <HiCake />, shortLabel: 'Торты' },
    { key: 'Пасха', icon: <GiEasterEgg />, shortLabel: 'Пасха' },
    { key: 'Пакеты услуг', icon: <LuPackageOpen />, shortLabel: 'Пакеты' },
    { key: 'Инфо', icon: <BsFillInfoCircleFill />, shortLabel: 'Инфо' },
  ];

  return (
    <div
      className={`${iosUi.panel} relative w-full px-3 pt-4 pb-3 md:px-4 md:pt-5 md:pb-4`}
      style={{
        fontFamily: iosUi.fontFamily,
      }}
    >
      <div className="w-full flex flex-col items-center">
        <h1 className="mb-4 px-2 text-[24px] leading-7 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7] text-center">
          {value}
        </h1>
        <div className="no-scrollbar w-full overflow-x-auto pb-1">
          <div className="inline-flex min-w-max gap-2 px-0.5">
            {tabs.map((t) => {
              const isActive = value === t.key
              return (
                <button
                  key={t.key}
                  title={t.key}
                  aria-label={t.key}
                  className={`shrink-0 h-12 px-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-transparent bg-[#0a84ff] text-white shadow-[0_12px_24px_rgba(10,132,255,0.36)]'
                      : 'border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#2c2c2e] text-[#4b5563] dark:text-[#d1d5db] hover:bg-[#eef2ff] dark:hover:bg-[#343438]'
                  }`}
                  onClick={() => {
                    WebApp.HapticFeedback.impactOccurred('heavy');
                    onChange(t.key);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-[18px] ${
                        isActive
                          ? 'bg-white/18 text-white'
                          : 'bg-[#f2f2f7] dark:bg-[#3a3a3c] text-[#6b7280] dark:text-[#c7c7cc]'
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="text-[13px] font-semibold whitespace-nowrap">
                      {t.shortLabel}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
