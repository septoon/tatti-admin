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

const imageReplaceEndpoint = (process.env.REACT_APP_IMAGE_REPLACE_ENDPOINT as string) || '/api/images/replace';

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

type ReplaceServerImageTarget = {
  oldUrl: string;
  oldPath: string;
  targetPath: string;
  targetUrl: string;
  targetDir: string;
  targetFileName: string;
};

function buildReplaceTarget(oldImageUrl: string): ReplaceServerImageTarget {
  if (!oldImageUrl || oldImageUrl.trim() === '') {
    throw new Error('У блюда не задан текущий URL изображения');
  }

  const apiOrigin = baseURL ? new URL(baseURL).origin : '';
  const parsed = new URL(
    oldImageUrl,
    apiOrigin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost'),
  );

  if (apiOrigin && parsed.origin !== apiOrigin) {
    throw new Error('Заменять можно только изображения на REACT_APP_API_BASE');
  }

  const oldPath = parsed.pathname;
  const lastSlash = oldPath.lastIndexOf('/');
  const targetDir = lastSlash >= 0 ? oldPath.slice(0, lastSlash + 1) : '/';
  const oldFileName = lastSlash >= 0 ? oldPath.slice(lastSlash + 1) : oldPath;
  const baseName = oldFileName.replace(/\.[^.]+$/, '') || 'image';
  const targetFileName = `${baseName}.webp`;
  const targetPath = `${targetDir}${targetFileName}`.replace(/\/{2,}/g, '/');
  const targetUrl = `${parsed.origin}${targetPath}`;

  return {
    oldUrl: parsed.toString(),
    oldPath,
    targetPath,
    targetUrl,
    targetDir,
    targetFileName,
  };
}

function pickImageUrlFromResponse(payload: any): string | null {
  const variants: unknown[] = [
    payload?.url,
    payload?.image,
    payload?.imageUrl,
    payload?.data?.url,
    payload?.data?.image,
    payload?.data?.imageUrl,
  ];

  for (const value of variants) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function getErrorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const fromBody =
      (typeof error.response?.data?.error === 'string' && error.response?.data?.error) ||
      (typeof error.response?.data?.message === 'string' && error.response?.data?.message);
    if (fromBody) return fromBody;
    if (error.response?.status) return `HTTP ${error.response.status}`;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'unknown';
}

export async function replaceServerImage(params: { oldImageUrl: string; webpFile: File | Blob }) {
  const target = buildReplaceTarget(params.oldImageUrl);

  let directPutError: unknown = null;

  // Попытка прямой замены по целевому пути (если бэкенд поддерживает PUT на статические файлы).
  try {
    await api.put(target.targetPath, params.webpFile, {
      headers: { 'Content-Type': 'image/webp' },
    });
    return target.targetUrl;
  } catch (err) {
    // Fallback на выделенный endpoint замены.
    directPutError = err;
  }

  const formData = new FormData();
  formData.append('image', params.webpFile, target.targetFileName);
  formData.append('oldUrl', target.oldUrl);
  formData.append('oldPath', target.oldPath);
  formData.append('targetPath', target.targetPath);
  formData.append('targetDir', target.targetDir);
  formData.append('targetFileName', target.targetFileName);

  try {
    const { data } = await api.post(imageReplaceEndpoint, formData);
    const uploadedUrl = pickImageUrlFromResponse(data);
    return uploadedUrl ?? target.targetUrl;
  } catch (err) {
    const putErr = getErrorText(directPutError);
    const endpointErr = getErrorText(err);
    throw new Error(
      `Не удалось заменить изображение. PUT ${target.targetPath}: ${putErr}. POST ${imageReplaceEndpoint}: ${endpointErr}`,
    );
  }
}
