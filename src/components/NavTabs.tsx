import React from 'react';
import WebApp from '@twa-dev/sdk';
import { MdOutlineRateReview, MdOutlineRestaurantMenu } from 'react-icons/md';
import { HiCake } from 'react-icons/hi';
import { GiEasterEgg } from 'react-icons/gi';
import { BsFillInfoCircleFill } from 'react-icons/bs';
import { LuPackageOpen } from 'react-icons/lu';
import { TbChristmasBall } from 'react-icons/tb';

type Tab = { key: string; label: React.ReactNode };

export function NavTabs({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const tabs: Tab[] = [
    { key: 'Фуршетное Меню', label: <MdOutlineRestaurantMenu /> },
    { key: 'Новый Год', label: <TbChristmasBall /> },
    { key: 'Отзывы', label: <MdOutlineRateReview /> },
    { key: 'Торты', label: <HiCake /> },
    { key: 'Пасха', label: <GiEasterEgg /> },
    { key: 'Пакеты услуг', label: <LuPackageOpen /> },
    { key: 'Инфо', label: <BsFillInfoCircleFill /> },
  ];
  return (
    <div className="z-80 flex flex-wrap bg-light dark:bg-dark backdrop-blur-md rounded-b-3xl">
      <div className="w-full h-full flex flex-col items-center">
        <h1 className="mt-12 mb-8 px-4 text-gray dark:text-ligth dark:text-light font-bold">
          {value}
        </h1>
        <div className="w-full flex flex-wrap justify-between pb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`px-3 py-3 mx-1 mb-2 rounded-full shadow-lg whitespace-nowrap z-90 ${
                value === t.key
                  ? 'bg-[#2EA1FF] text-white'
                  : 'bg-white dark:bg-darkCard text-gray dark:text-ligth dark:bg-darkCard dark:text-light'
              }`}
              onClick={() => {
                WebApp.HapticFeedback.impactOccurred('heavy');
                onChange(t.key);
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
