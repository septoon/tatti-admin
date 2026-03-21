import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { iosUi } from '../styles/ios'

type ConfirmTone = 'default' | 'danger'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn>(async () => false)

type ConfirmState = ConfirmOptions & {
  open: boolean
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  message: '',
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  tone: 'default',
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>(initialState)
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)

  const close = React.useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setState(initialState)
  }, [])

  const confirm = React.useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({
        open: true,
        title: options.title || 'Подтверждение',
        message: options.message,
        confirmText: options.confirmText || 'Подтвердить',
        cancelText: options.cancelText || 'Отмена',
        tone: options.tone || 'default',
      })
    })
  }, [])

  const confirmButtonClass =
    state.tone === 'danger'
      ? 'inline-flex items-center justify-center rounded-2xl bg-[#ff3b30] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(255,59,48,0.24)] transition hover:bg-[#e03229]'
      : iosUi.primaryButtonLarge

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Transition appear show={state.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => close(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={`${iosUi.panel} w-full max-w-md space-y-4 p-5 text-[#111827] dark:text-[#f2f2f7]`}
                  style={{ fontFamily: iosUi.fontFamily }}
                >
                  <div className="space-y-2">
                    <Dialog.Title className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">
                      {state.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-[15px] leading-6 text-[#4b5563] dark:text-[#d1d5db]">
                      {state.message}
                    </Dialog.Description>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={iosUi.subtleButton} onClick={() => close(false)}>
                      {state.cancelText}
                    </button>
                    <button type="button" className={confirmButtonClass} onClick={() => close(true)}>
                      {state.confirmText}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return React.useContext(ConfirmContext)
}
