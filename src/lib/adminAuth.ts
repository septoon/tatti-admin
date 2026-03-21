const ADMIN_PIN_STORAGE_KEY = 'tatti-adm.admin-pin';

export function getStoredAdminPin(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADMIN_PIN_STORAGE_KEY)?.trim() || '';
}

export function storeAdminPin(pin: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_PIN_STORAGE_KEY, String(pin || '').trim());
}

export function clearStoredAdminPin() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
}
