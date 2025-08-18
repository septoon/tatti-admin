
import * as React from 'react'
import WebApp from '@twa-dev/sdk'

export function useTelegramInit() {
  React.useEffect(() => {
    try {
      if (!WebApp) {
        console.error('Telegram WebApp API недоступен.');
        return;
      }
      WebApp.ready();
      WebApp.expand();
    } catch (error) {
      console.error('Ошибка при инициализации Telegram WebApp:', error);
    }
  }, []);
  }, [])
}
