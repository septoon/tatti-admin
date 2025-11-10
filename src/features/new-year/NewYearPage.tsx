import React from 'react'
import axios from 'axios'
import { HiOutlineCamera } from 'react-icons/hi'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import Loader from '../../components/Loader/Loader'
import { getFile, putFile } from '../../lib/api'

const getWebApp = () => (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined)

type Row = {
  _key?: string
  id?: number
  name: string
  price?: number
  image?: string
  description?: string[]
}

const stripMatchingQuotes = (input: string): string => {
  if (input.length < 2) return input
  const first = input[0]
  const last = input[input.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return input.slice(1, -1).trim()
  }
  return input
}

const tryParseImageJson = (candidate: string): any | null => {
  const first = candidate[0]
  const looksLikeJson = first === '[' || first === '{' || first === '"' || first === "'"
  if (!looksLikeJson) return null
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

const normalizeImageString = (value: any): string => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeImageString(entry)
      if (normalized) return normalized
    }
    return ''
  }
  if (value && typeof value === 'object') {
    if (typeof value.url === 'string') return value.url.trim()
    if (typeof value.image === 'string') return value.image.trim()
    if (Array.isArray(value.image)) return normalizeImageString(value.image)
    if (Array.isArray(value.images)) return normalizeImageString(value.images)
    if (typeof value.images === 'string') return normalizeImageString(value.images)
    return ''
  }
  if (typeof value === 'string') {
    let candidate = value.trim()
    if (!candidate) return ''

    for (let i = 0; i < 3; i += 1) {
      const parsed = tryParseImageJson(candidate)
      if (parsed !== null) {
        return normalizeImageString(parsed)
      }
      const stripped = stripMatchingQuotes(candidate)
      if (stripped === candidate) break
      candidate = stripped
    }

    return candidate
  }
  return ''
}

function newYearObjectToRows(obj: any): Row[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, v]: any) => {
    const priceFromWeights = Array.isArray(v?.weights) && v.weights.length > 0 ? Number(v.weights[0]?.price ?? 0) : undefined
    return {
      _key: key,
      id: v?.id,
      name: v?.name ?? '',
      price: typeof v?.price === 'number' ? v.price : (priceFromWeights ?? Number(v?.price ?? 0)),
      image: normalizeImageString(v?.image ?? v?.images),
      description: Array.isArray(v?.description) ? v.description : [],
    }
  })
}

function rowsToNewYearObject(rows: Row[]): Record<string, any> {
  const out: Record<string, any> = {}
  rows.forEach((r, idx) => {
    const key = (r._key && r._key.trim()) || slugify(r.name) || `item_${idx + 1}`
    out[key] = {
      id: typeof r.id === 'number' ? r.id : generateId(idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      description: Array.isArray(r.description) ? r.description : [],
      image: typeof r.image === 'string' ? r.image.trim() : '',
    }
  })
  return out
}

function slugify(s: string): string {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateId(seed: number): number {
  return Number(String(Date.now()).slice(-6)) + seed
}

export default function NewYearPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadIndex, setUploadIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFile('/new-year')
        setRows(newYearObjectToRows(data))
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const addRow = () => {
    WebApp.HapticFeedback.impactOccurred('heavy')
    setRows(prev => [
      ...prev,
      { _key: `item_${prev.length + 1}`, name: '', price: 0, image: '', description: [] }
    ])
  }

  const deleteRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  const confirmDelete = (idx: number) => {
    const item = rows[idx]
    const name = item?.name && item.name.trim() !== '' ? item.name : 'новое блюдо'
    const wa = getWebApp()

    if (!wa) {
      if (typeof window !== 'undefined' && window.confirm(`Вы действительно хотите удалить ${name}? Это действие безвозвратно!`)) {
        deleteRow(idx)
      }
      return
    }

    try { wa.HapticFeedback?.impactOccurred?.('heavy') } catch {}
    wa.showConfirm(`Вы действительно хотите удалить ${name}? Это действие безвозвратно!`, (confirmed: boolean) => {
      if (confirmed) deleteRow(idx)
    })
  }

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...(next[idx] ?? { name: '', price: 0, image: '', description: [] }), ...patch }
      return next
    })
  }

  const triggerPickImage = (idx: number) => {
    setUploadIndex(idx)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || uploadIndex === null) return
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      const apiKey = process.env.REACT_APP_IMGBB_KEY
      if (!apiKey) throw new Error('Не задан REACT_APP_IMGBB_KEY')
      const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`
      const resp = await axios.post(imgbbUrl, formData)
      const url: string | undefined = resp?.data?.data?.url
      if (!url) throw new Error('ImgBB вернул пустой URL')
      updateRow(uploadIndex, { image: url })
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки изображения')
    } finally {
      setUploading(false)
      setUploadIndex(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function onSave() {
    setSaving(true)
    try {
      const payload = rowsToNewYearObject(rows)
      await putFile('new-year.json', payload)
      alert('Изменения сохранены')
    } catch (e: any) {
      alert('Ошибка сохранения: ' + (e?.message || 'unknown'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const busy = saving || uploading

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Новый Год</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Строка</button>
      </div>

      {!rows.length && <div className="text-sm text-slate-500">Нет данных для отображения</div>}

      <div className="hidden md:block overflow-auto rounded-md">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2 w-64">Название</th>
              <th className="text-left p-2 w-24">Цена</th>
              <th className="text-left p-2 w-72">Картинка</th>
              <th className="text-left p-2">Описание (по строкам)</th>
              <th className="text-left p-2 w-28">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row._key ?? idx} className="border-t align-top">
                <td className="p-2">
                  <input
                    className="rounded-md px-2 py-1 w-full"
                    value={row.name ?? ''}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="rounded-md px-2 py-1 w-24"
                    value={Number(row.price ?? 0)}
                    onChange={(e) => updateRow(idx, { price: Number(e.target.value) })}
                  />
                </td>
                <td className="p-2">
                  <div className="space-y-2">
                    <input
                      className="rounded-md px-2 py-1 w-full"
                      value={row.image ?? ''}
                      onChange={(e) => updateRow(idx, { image: e.target.value })}
                    />
                    <div className="relative inline-block group">
                      {row.image ? (
                        <img
                          src={row.image}
                          alt={row.name}
                          className="h-24 w-32 object-cover rounded border cursor-pointer"
                          onClick={() => triggerPickImage(idx)}
                        />
                      ) : (
                        <div
                          className="h-24 w-32 flex items-center justify-center rounded border bg-slate-50 text-xs text-slate-400 cursor-pointer"
                          onClick={() => triggerPickImage(idx)}
                        >
                          Нет изображения
                        </div>
                      )}
                      <div
                        className="absolute inset-0 flex items-center justify-center rounded bg-black/30 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => triggerPickImage(idx)}
                      >
                        <HiOutlineCamera className="text-white" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <textarea
                    className="rounded-md px-2 py-1 w-full h-28"
                    value={(row.description ?? []).join('\n')}
                    onChange={(e) => updateRow(idx, { description: e.target.value.split('\n').filter(Boolean) })}
                  />
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => confirmDelete(idx)}
                    className="px-2 py-1 rounded-md border text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row, idx) => (
          <div key={row._key ?? idx} className="rounded-xl p-3 space-y-3 bg-white dark:bg-darkCard text-gray dark:text-ligt shadow-lg">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Название</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={row.name ?? ''}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Цена</div>
              <input
                type="number"
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={Number(row.price ?? 0)}
                onChange={(e) => updateRow(idx, { price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={row.image ?? ''}
                onChange={(e) => updateRow(idx, { image: e.target.value })}
              />
              <div className="relative group">
                {row.image ? (
                  <img
                    src={row.image}
                    alt={row.name}
                    className="max-h-32 w-full object-cover rounded-xl cursor-pointer border"
                    onClick={() => triggerPickImage(idx)}
                  />
                ) : (
                  <div
                    className="max-h-32 w-full flex items-center justify-center rounded-xl border bg-slate-50 text-xs text-slate-400 cursor-pointer"
                    onClick={() => triggerPickImage(idx)}
                  >
                    Нет изображения
                  </div>
                )}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => triggerPickImage(idx)}
                >
                  <HiOutlineCamera className="text-white text-2xl" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Описание (по строкам)</div>
              <textarea
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full h-28"
                value={(row.description ?? []).join('\n')}
                onChange={(e) => updateRow(idx, { description: e.target.value.split('\n').filter(Boolean) })}
              />
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => confirmDelete(idx)}
                className="w-full px-3 py-2 rounded-md bg-red text-white"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <MainButton text={busy ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={busy} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
