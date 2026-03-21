import React from 'react'
import Stop from '../common/stop.png'
import { iosUi } from '../styles/ios'

type Props = {
  loading: boolean
  error: string | null
  onSubmit: (pin: string) => Promise<void>
}

export default function PinGate({ loading, error, onSubmit }: Props) {
  const [pin, setPin] = React.useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await onSubmit(pin)
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className={`${iosUi.panel} w-full max-w-md space-y-4 p-5 text-[#111827] dark:text-[#f2f2f7]`}
        style={{ fontFamily: iosUi.fontFamily }}
      >
        <div className="flex flex-col items-center text-center">
          <img src={Stop} alt="Access" className="mb-4 w-16" />
          <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em]">Вход в админку</h1>
          <p className="mt-2 text-[15px] leading-6 text-[#4b5563] dark:text-[#d1d5db]">
            Введите PIN-код. На этом устройстве он сохранится и повторно не спросится.
          </p>
        </div>

        <div className="space-y-1">
          <div className={iosUi.label}>PIN-код</div>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            className={iosUi.input}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Введите PIN"
            disabled={loading}
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <button type="submit" className={`${iosUi.primaryButtonLarge} w-full`} disabled={loading}>
          {loading ? 'Проверка...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
