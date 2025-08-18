import axios from 'axios';
import WebApp from '@twa-dev/sdk';
import { normalizeMenuLegacy, denormalizeToLegacy } from './menuNormalize';
import type { NormalizedMenu } from './types';

// ⚠️ Не хардкодим URL. Ожидаем REACT_APP_API_BASE из .env (или прокинутый глобально).
const envBase =
  (process.env.REACT_APP_API_BASE as string) ||
  (typeof window !== 'undefined' ? (window as any).__REACT_APP_API_BASE__ : '');
if (!envBase) {
  // Явно предупреждаем, чтобы не было тихих сетевых ошибок
  // (запросы уйдут на текущий origin, если не настроен proxy — будут 404)
  console.warn(
    '[api] REACT_APP_API_BASE is not set. Set it in .env e.g. REACT_APP_API_BASE=https://<your-api-host>',
  );
}

const baseURL = envBase?.replace(/\/$/, ''); // без завершающего '/'
export const api = axios.create({ baseURL: baseURL || undefined });

// Добавляем заголовок только если мы реально внутри Telegram и initData есть
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  try {
    const initData = (WebApp as any)?.initData as string | undefined;
    if (typeof initData === 'string' && initData.trim().length > 0) {
      (config.headers as any)['X-Telegram-Init-Data'] = initData;
    }
  } catch {}
  return config;
});

// Универсальный GET (поддержка путей без .json на конце)
async function getJson(path: string) {
  const withJson = path.endsWith('.json') ? path : `${path}.json`;
  const url = withJson.startsWith('/') ? withJson : `/${withJson}`;
  try {
    const { data } = await api.get(url);
    return data;
  } catch (e) {
    // Попытка без расширения (на случай статической раздачи с extensions: ['json'])
    const fallback = path.startsWith('/') ? path : `/${path}`;
    const { data } = await api.get(fallback);
    return data;
  }
}

// ---- Меню ----
export async function getMenu(): Promise<NormalizedMenu> {
  const raw = await getJson('/menu');
  return normalizeMenuLegacy(raw);
}

export async function saveMenu(data: NormalizedMenu) {
  const legacy = denormalizeToLegacy(data);
  return putFile('menu.json', legacy);
}

// ---- Отзывы ----
export async function getReviews(): Promise<any[]> {
  const data = await getJson('/reviews');
  return Array.isArray(data) ? data : [];
}

export async function deleteReview(id: string | number) {
  const list = await getReviews();
  const next = Array.isArray(list) ? list.filter((r: any) => String(r.id) !== String(id)) : [];
  return putFile('reviews.json', next);
}

// ---- Универсальные файлы ----
export async function getFile(path: string): Promise<any> {
  return getJson(path);
}

export async function putFile(fileName: string, body: any) {
  // Пишем через PUT на /api/data/<fileName>
  const url = `/api/data/${fileName}`;
  const { data } = await api.put(url, body);
  return data;
}

export async function appendToArrayFile(fileName: string, entry: any) {
  const url = `/api/data/${fileName}`;
  const { data } = await api.post(url, entry);
  return data;
}
