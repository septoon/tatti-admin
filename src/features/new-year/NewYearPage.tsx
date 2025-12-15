import React from 'react'
import axios from 'axios'
import { HiOutlineCamera } from 'react-icons/hi'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import Loader from '../../components/Loader/Loader'
import { getFile, putFile } from '../../lib/api'

type ImageEntry = { id: string; url: string }

type ImageField = 'image' | 'images'

type NewYearItem = {
  key: string
  id: string
  title: string
  price: number
  description: string[]
  images: ImageEntry[]
  imageField: ImageField
}

function generateId(seed = 0): string {
  return `${Date.now()}-${seed}`
}

function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeImageSource(value: any): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeImageSource(entry)).filter(Boolean)
  }
  if (value && typeof value === 'object') {
    if (typeof value.url === 'string') return [value.url.trim()]
    if (typeof value.image === 'string') return [value.image.trim()]
    if (Array.isArray(value.image)) return normalizeImageSource(value.image)
    if (Array.isArray(value.images)) return normalizeImageSource(value.images)
    if (typeof value.images === 'string') return normalizeImageSource(value.images)
    return []
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    const first = trimmed[0]
    if (first === '[' || first === '{' || first === '"' || first === "'") {
      try {
        const parsed = JSON.parse(trimmed)
        return normalizeImageSource(parsed)
      } catch {
        // ignore parse error, fall through to returning the trimmed string
      }
    }
    const stripQuotes =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    return [stripQuotes ? trimmed.slice(1, -1).trim() : trimmed]
  }
  return []
}

function mapRawToItems(raw: any): NewYearItem[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw).map(([key, value]: [string, any], idx) => {
    const imageField: ImageField = typeof value?.image === 'string' ? 'image' : 'images'
    const images = normalizeImageSource(value?.images ?? value?.image).map((url, imageIdx) => ({
      id: `img-${idx}-${imageIdx}`,
      url,
    }))
    return {
      key,
      id: String(value?.id ?? generateId(idx)),
      title: value?.name ?? '',
      price: typeof value?.price === 'number' ? value.price : Number(value?.price ?? 0),
      description: Array.isArray(value?.description) ? value.description : [],
      images,
      imageField,
    }
  })
}

function mapItemsToRaw(items: NewYearItem[]): Record<string, any> {
  const out: Record<string, any> = {}
  items.forEach((item, idx) => {
    const key = item.key?.trim() || slugify(item.title) || `item_${idx + 1}`
    const urls = (item.images ?? []).filter((img) => img.url.trim()).map((img) => img.url.trim())
    out[key] = {
      id: Number(item.id) || Number(generateId(idx)),
      name: item.title ?? '',
      price: typeof item.price === 'number' ? item.price : Number(item.price ?? 0),
      description: Array.isArray(item.description) ? item.description : [],
    }

    if (item.imageField === 'image') {
      out[key].image = urls[0] ?? ''
      if (urls.length > 1) out[key].images = urls
    } else {
      out[key].images = urls
    }
  })
  return out
}

export default function NewYearPage() {
  const [items, setItems] = React.useState<NewYearItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFile('/new-year')
        setItems(mapRawToItems(data))
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateItem = (id: string, patch: Partial<NewYearItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const addRow = () => {
    WebApp.HapticFeedback.impactOccurred('heavy')
    const newId = generateId(items.length)
    setItems((prev) => [
      ...prev,
      {
        key: `item_${prev.length + 1}`,
        id: newId,
        title: '',
        price: 0,
        description: [],
        images: [],
        imageField: 'image',
      },
    ])
  }

  const confirm = (id: string) => {
    const item = items.find((i) => i.id === id)
    const name = item?.title && item.title.trim() !== '' ? item.title : 'новое блюдо'
    WebApp.HapticFeedback.impactOccurred('heavy')
    WebApp.showConfirm(
      `Вы действительно хотите удалить ${name}? Это действие безвозвратно!`,
      (confirmed) => {
        if (confirmed) deleteItem(id)
      },
    )
  }

  function triggerPickImage(id: string) {
    setUploadingId(id)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadingId) return
    try {
      setSaving(true)
      const formData = new FormData()
      formData.append('image', file)
      const apiKey = process.env.REACT_APP_IMGBB_KEY
      if (!apiKey) throw new Error('Не задан REACT_APP_IMGBB_KEY')
      const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`
      const resp = await axios.post(imgbbUrl, formData)
      const url: string | undefined = resp?.data?.data?.url
      if (!url) throw new Error('ImgBB вернул пустой URL')
      updateItem(uploadingId, {
        images: [{ id: 'img-1', url }],
      })
    } catch (err: any) {
      console.error(err)
      alert('Ошибка загрузки изображения')
    } finally {
      setSaving(false)
      setUploadingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function onSave() {
    setSaving(true)
    try {
      const payload = mapItemsToRaw(items)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Новый Год</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">
          + Строка
        </button>
      </div>

      <div className="overflow-auto rounded-md hidden md:block">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2 w-36">Категория</th>
              <th className="text-left p-2 w-64">Название</th>
              <th className="text-left p-2 w-24">Цена</th>
              <th className="text-left p-2">Описание (по строкам)</th>
              <th className="text-left p-2 w-64">Картинка</th>
              <th className="text-left p-2 w-32">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  <input className="rounded-md px-2 py-1 w-full" value="Новый Год" readOnly />
                </td>
                <td className="p-2">
                  <input
                    className="rounded-md px-2 py-1 w-full"
                    value={it.title}
                    onChange={(e) => updateItem(it.id, { title: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="rounded-md px-2 py-1 w-24"
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                  />
                </td>
                <td className="p-2">
                  <textarea
                    className="rounded-md px-2 py-1 w-full h-24"
                    value={it.description.join('\n')}
                    onChange={(e) =>
                      updateItem(it.id, {
                        description: e.target.value.split('\n').filter((line) => line.trim().length),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <button
                    onClick={() => confirm(it.id)}
                    className="px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                    title="Удалить блюдо"
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
        {items.map((it) => (
          <div
            key={it.id}
            className="shadow-lg rounded-xl bg-white text-gray dark:text-ligt dark:bg-darkCard p-3 mb-4 space-y-3"
          >
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Категория</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value="Новый Год"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Название</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={it.title}
                onChange={(e) => updateItem(it.id, { title: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <div className="text-xs text-slate-500">Цена</div>
                <input
                  type="number"
                  className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                  value={it.price}
                  onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs text-slate-500">Картинка (URL)</div>
                <input
                  className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                  value={it.images?.[0]?.url ?? ''}
                  onChange={(e) =>
                    updateItem(it.id, { images: [{ id: 'img-1', url: e.target.value }] })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка (нажмите, чтобы загрузить)</div>
              <div className="relative group">
                <img
                  src={it.images?.[0]?.url ?? ''}
                  alt={it.title}
                  className="max-h-28 w-full object-cover rounded-xl cursor-pointer"
                  onClick={() => triggerPickImage(it.id)}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => triggerPickImage(it.id)}
                >
                  <HiOutlineCamera className="text-white text-2xl" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Описание (по строкам)</div>
              <textarea
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full h-28"
                value={it.description.join('\n')}
                onChange={(e) =>
                  updateItem(it.id, {
                    description: e.target.value.split('\n').filter((line) => line.trim().length),
                  })
                }
              />
            </div>
            <div className="pt-1">
              <button
                onClick={() => confirm(it.id)}
                className="w-full px-3 py-2 rounded-md bg-red text-white"
                title="Удалить блюдо"
              >
                Удалить блюдо
              </button>
            </div>
          </div>
        ))}
      </div>

      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
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
