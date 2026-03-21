import React from 'react'
import { iosUi } from '../styles/ios'

type Props = {
  text: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export default function BottomActionBar({ text, onClick, disabled = false, loading = false }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="mx-auto max-w-7xl">
        <div className="pointer-events-auto rounded-[28px] border border-black/10 bg-[#f2f2f7]/92 p-3 shadow-[0_-18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/92 dark:shadow-[0_-18px_40px_rgba(0,0,0,0.4)]">
          <button
            type="button"
            className={`${iosUi.primaryButtonLarge} w-full`}
            onClick={onClick}
            disabled={disabled}
            aria-busy={loading}
          >
            {text}
          </button>
        </div>
      </div>
    </div>
  )
}
