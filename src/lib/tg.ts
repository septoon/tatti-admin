
import * as React from 'react'
import WebApp from '@twa-dev/sdk'

export function useTelegramInit() {
  React.useEffect(() => {
    try {
      WebApp.ready()
      WebApp.expand()
      if ((WebApp as any).disableVerticalSwipes) (WebApp as any).disableVerticalSwipes()
      const scheme = WebApp.colorScheme === 'dark' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-color-scheme', scheme)
    } catch {
      document.documentElement.setAttribute('data-color-scheme', 'light')
    }
  }, [])
}
