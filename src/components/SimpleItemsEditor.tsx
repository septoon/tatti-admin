import React from 'react';
import axios from 'axios'
import { HiOutlineCamera } from 'react-icons/hi'

const getWebApp = () => (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined)

export type Item = {
  name: string;
  price?: number;
  image?: string | string[];
  description?: string[];
};

type Props = {
  rows: Item[];
  setRows: React.Dispatch<React.SetStateAction<Item[]>>;
  onDeleteRow?: (idx: number) => void;
  showName?: boolean;
  showPrice?: boolean;
  showImage?: boolean;
  showDescription?: boolean;
  enableImageUpload?: boolean; // кнопка заглушена
};

export default function SimpleItemsEditor({
  rows,
  setRows,
  onDeleteRow,
  showName = true,
  showPrice = true,
  showImage = true,
  showDescription = true,
  enableImageUpload = false,
}: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = React.useState<{ row: number; idx: number | null } | null>(null)

  const confirmDelete = (idx: number) => {
    const item = rows[idx]
    const name = item?.name && item.name.trim() !== '' ? item.name : 'новое блюдо'
    const wa = getWebApp()

    if (!wa) {
      // Fallback для браузера вне Telegram
      if (window.confirm(`Вы действительно хотите удалить ${name}? Это действие безвозвратно!`)) {
        onDeleteRow?.(idx)
      }
      return
    }

    // Telegram WebApp UX
    try { wa.HapticFeedback?.impactOccurred?.('heavy') } catch {}
    wa.showConfirm(
      `Вы действительно хотите удалить ${name}? Это действие безвозвратно!`,
      (confirmed: boolean) => {
        if (confirmed) onDeleteRow?.(idx)
      },
    )
  };

  const update = (i: number, patch: Partial<Item>) => {
    setRows((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next[i] = { ...(next[i] || { name: '', price: 0, image: '', description: [] }), ...patch };
      return next;
    });
  };

  function triggerPick(rowIndex: number, imageIndex: number | null) {
    setUploadTarget({ row: rowIndex, idx: imageIndex })
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    try {
      const formData = new FormData()
      formData.append('image', file)
      const apiKey = process.env.REACT_APP_IMGBB_KEY
      if (!apiKey) throw new Error('Не задан REACT_APP_IMGBB_KEY')
      const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`
      const resp = await axios.post(imgbbUrl, formData)
      const url: string | undefined = resp?.data?.data?.url
      if (!url) throw new Error('ImgBB вернул пустой URL')

      const { row, idx } = uploadTarget
      setRows(prev => {
        const next = Array.isArray(prev) ? [...prev] : []
        const cur = next[row] || { name: '', price: 0, image: '', description: [] }
        if (Array.isArray(cur.image)) {
          const arr = [...cur.image]
          const pos = typeof idx === 'number' ? idx : 0
          arr[pos] = url
          next[row] = { ...cur, image: arr }
        } else {
          next[row] = { ...cur, image: url }
        }
        return next
      })
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки изображения')
    } finally {
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const renderImageInputs = (row: Item, i: number) => {
    const renderPreview = (url: string, imageIndex: number | null, key?: React.Key) => {
      const clickable = enableImageUpload
      if (!clickable && !url) return null
      return (
        <div
          key={`preview-${String(key ?? imageIndex ?? i)}`}
          className={`relative inline-flex h-24 w-32 overflow-hidden rounded border ${clickable ? 'cursor-pointer group' : ''}`}
          onClick={clickable ? () => triggerPick(i, imageIndex) : undefined}
        >
          {url ? (
            <img src={url} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
              Нет изображения
            </div>
          )}
          {clickable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
              <HiOutlineCamera className="text-white" />
            </div>
          )}
        </div>
      )
    }

    const makeButton = (imageIndex: number | null, key?: React.Key) =>
      enableImageUpload ? (
        <button
          key={`btn-${String(key ?? i)}`}
          type="button"
          className="px-2 py-1 rounded-md border"
          title="Загрузить изображение"
          onClick={() => triggerPick(i, imageIndex)}
        >
          📷
        </button>
      ) : null;

    // Массив ссылок
    if (Array.isArray(row.image)) {
      return (
        <>
          {row.image.map((val, idx) => (
            <div key={idx} className="space-y-2 mt-1 first:mt-0">
              <div className="flex items-center gap-2">
                <input
                  className="rounded-md px-2 py-1 w-full"
                  value={val}
                  onChange={(e) => {
                    const arr = Array.isArray(row.image) ? [...row.image] : [];
                    arr[idx] = e.target.value;
                    update(i, { image: arr });
                  }}
                />
                {makeButton(idx, idx)}
              </div>
              {(enableImageUpload || (typeof val === 'string' && val.trim())) &&
                renderPreview(typeof val === 'string' ? val : '', idx, idx)}
            </div>
          ))}
        </>
      );
    }

    // Одна ссылка (строка)
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            className="rounded-md px-2 py-1 w-full"
            value={typeof row.image === 'string' ? row.image : ''}
            onChange={(e) => update(i, { image: e.target.value })}
          />
          {makeButton(null)}
        </div>
        {(enableImageUpload ||
          (typeof row.image === 'string' && row.image.trim().length > 0)) &&
          renderPreview(typeof row.image === 'string' ? row.image : '', null)}
      </div>
    );
  };

  // ---------- Desktop table ----------
  const Table = (
    <div className="hidden md:block overflow-auto rounded-md">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {showName && <th className="text-left p-2 w-64">Название</th>}
            {showPrice && <th className="text-left p-2 w-28">Цена</th>}
            {showImage && <th className="text-left p-2 w-72">Картинка (URL)</th>}
            {showDescription && <th className="text-left p-2">Описание (по строкам)</th>}
            <th className="w-28 p-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t align-top">
              {showName && (
                <td className="p-2">
                  <input
                    className="rounded-md px-2 py-1 w-full"
                    value={row.name ?? ''}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </td>
              )}
              {showPrice && (
                <td className="p-2">
                  <input
                    type="number"
                    className="rounded-md px-2 py-1 w-28"
                    value={Number(row.price ?? 0)}
                    onChange={(e) => update(i, { price: Number(e.target.value) })}
                  />
                </td>
              )}
              {showImage && <td className="p-2">{renderImageInputs(row, i)}</td>}
              {showDescription && (
                <td className="p-2">
                  <textarea
                    className="rounded-md px-2 py-1 w-full h-28"
                    value={(row.description ?? []).join('\n')}
                    onChange={(e) =>
                      update(i, { description: e.target.value.split('\n').filter(Boolean) })
                    }
                  />
                </td>
              )}
              <td className="p-2 text-right">
                <button
                  onClick={() => confirmDelete(i)}
                  className="ml-auto bg-red text-white opacity-80 px-2 py-0.5 rounded-md z-0">
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ---------- Mobile cards ----------
  const Cards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((row, i) => (
        <div
          key={i}
          className="rounded-xl p-3 space-y-2 bg-white dark:bg-darkCard text-gray dark:text-ligt shadow-lg">
          {showName && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Название</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={row.name ?? ''}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </div>
          )}
          {showPrice && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Цена</div>
              <input
                type="number"
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={Number(row.price ?? 0)}
                onChange={(e) => update(i, { price: Number(e.target.value) })}
              />
            </div>
          )}
          {showImage && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка (URL)</div>
              {renderImageInputs(row, i)}
            </div>
          )}
          {showDescription && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Описание (по строкам)</div>
              <textarea
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full h-28"
                value={(row.description ?? []).join('\n')}
                onChange={(e) =>
                  update(i, { description: e.target.value.split('\n').filter(Boolean) })
                }
              />
            </div>
          )}
          <div className="pt-2 text-right">
            <button
              onClick={() => confirmDelete(i)}
              className="ml-auto bg-red text-white  px-2 py-0.5 rounded-md">
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <>
        <div className="text-sm text-slate-500">Нет данных для отображения</div>
        {Table}
        {Cards}
      </>
    );
  }

  return (
    <>
      {Table}
      {Cards}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
