import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor, { type Item } from '../../components/SimpleItemsEditor'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'

type ImageValue = Item['image']

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

function normalizeImageInput(value: any): ImageValue {
  if (Array.isArray(value)) {
    const arr: string[] = []
    value.forEach((entry) => {
      const normalized = normalizeImageInput(entry)
      if (Array.isArray(normalized)) {
        arr.push(...normalized.filter((v) => typeof v === 'string' && v.trim().length > 0))
      } else if (typeof normalized === 'string' && normalized.trim().length > 0) {
        arr.push(normalized.trim())
      }
    })
    return arr
  }

  if (value && typeof value === 'object') {
    if (typeof value.url === 'string') return value.url.trim()
    if (Array.isArray(value.image)) return normalizeImageInput(value.image)
    if (typeof value.image === 'string') return value.image.trim()
    if (Array.isArray(value.images)) return normalizeImageInput(value.images)
    if (typeof value.images === 'string') return normalizeImageInput(value.images)
    return ''
  }

  if (typeof value === 'string') {
    let candidate = value.trim()
    if (!candidate) return ''

    for (let i = 0; i < 3; i += 1) {
      const parsed = tryParseImageJson(candidate)
      if (parsed !== null) {
        return normalizeImageInput(parsed)
      }
      const stripped = stripMatchingQuotes(candidate)
      if (stripped === candidate) break
      candidate = stripped
    }

    return candidate
  }

  return ''
}

const hasImage = (value: ImageValue): boolean =>
  Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0

const toImagesArray = (value: ImageValue): string[] => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim())
  return typeof value === 'string' && value.trim().length > 0 ? [value.trim()] : []
}

function newYearObjectToRows(obj: any): Item[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, v]: any) => {
    const priceFromWeights = Array.isArray(v?.weights) && v.weights.length > 0 ? Number(v.weights[0]?.price ?? 0) : undefined
    const normalizedImage = normalizeImageInput(v?.images ?? v?.image)
    return {
      _key: key,
      id: v?.id,
      name: v?.name ?? '',
      price: typeof v?.price === 'number' ? v.price : (priceFromWeights ?? Number(v?.price ?? 0)),
      image: hasImage(normalizedImage) ? normalizedImage : '',
      description: Array.isArray(v?.description) ? v.description : [],
    }
  })
}

function rowsToNewYearObject(rows: Item[]): Record<string, any> {
  const out: Record<string, any> = {}
  rows.forEach((r, idx) => {
    const key = (r._key && r._key.trim()) || slugify(r.name) || `item_${idx + 1}`
    const normalizedImage = normalizeImageInput(r.image)
    out[key] = {
      id: typeof r.id === 'number' ? r.id : generateId(idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      description: Array.isArray(r.description) ? r.description : [],
      image: typeof normalizedImage === 'string' ? normalizedImage : normalizedImage[0] ?? '',
      images: toImagesArray(normalizedImage),
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
  const [rows, setRows] = React.useState<Item[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Новый Год</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Строка</button>
      </div>
      <SimpleItemsEditor rows={rows} setRows={setRows} onDeleteRow={deleteRow} enableImageUpload={true} />
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
