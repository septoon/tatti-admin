import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor from '../../components/SimpleItemsEditor'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'

// Тип строки редактора: базовые поля + служебные
type Row = {
  _key?: string
  id?: number
  name: string
  price?: number
  image?: string | string[]
  description?: string[]
}

// Помощник: из объекта (как в cakes.json) -> массив для редактора
function cakesObjectToRows(obj: any): Row[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, v]: any) => {
    const image: string | string[] = Array.isArray(v?.images)
      ? (v.images as string[])
      : Array.isArray(v?.image)
        ? (v.image as string[])
        : (typeof v?.images === 'string')
          ? (v.images as string)
          : (typeof v?.image === 'string' ? (v.image as string) : '')

    return {
      _key: key,
      id: v?.id,
      name: v?.name ?? '',
      price: typeof v?.price === 'number' ? v.price : Number(v?.price ?? 0),
      image,
      description: Array.isArray(v?.description) ? v.description : [],
    }
  })
}

// Помощник: из массива редактора -> объект формата cakes.json
function rowsToCakesObject(rows: Row[]): Record<string, any> {
  const out: Record<string, any> = {}
  rows.forEach((r, idx) => {
    const key = (r._key && r._key.trim()) || slugify(r.name) || `item_${idx + 1}`
    const images: string[] = Array.isArray(r.image)
      ? (r.image as string[]).map(s => String(s)).filter(Boolean)
      : (r.image ? [String(r.image)] : [])

    out[key] = {
      id: typeof r.id === 'number' ? r.id : generateId(idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      description: Array.isArray(r.description) ? r.description : [],
      images,
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
  // простой стабильный генератор id для новых записей
  return Number(String(Date.now()).slice(-6)) + seed
}

export default function CakesPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFile('/cakes')
        setRows(cakesObjectToRows(data))
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const addRow = () => setRows(prev => [
    ...prev,
    { _key: `item_${prev.length + 1}`, name: '', price: 0, image: '', description: [] }
  ])

  const deleteRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  async function onSave() {
    setSaving(true)
    try {
      const payload = rowsToCakesObject(rows)
      await putFile('cakes.json', payload)
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
        <div className="font-semibold">Торты</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded border">+ Строка</button>
       </div>
      <SimpleItemsEditor rows={rows} setRows={setRows} onDeleteRow={deleteRow} enableImageUpload={true} />
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
