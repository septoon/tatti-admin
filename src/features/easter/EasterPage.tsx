import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor, { type Item } from '../../components/SimpleItemsEditor'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'

function easterObjectToRows(obj: any): Item[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, v]: any) => {
    // price: если есть weights[], берём первую цену, иначе обычную price
    const priceFromWeights = Array.isArray(v?.weights) && v.weights.length > 0 ? Number(v.weights[0]?.price ?? 0) : undefined
    return {
      _key: key,
      id: v?.id,
      name: v?.name ?? '',
      price: typeof v?.price === 'number' ? v.price : (priceFromWeights ?? Number(v?.price ?? 0)),
      image: Array.isArray(v?.image) ? v.image : (typeof v?.image === 'string' ? v.image : ''),
      description: Array.isArray(v?.description) ? v.description : [],
    }
  })
}

// Массив строк редактора -> объект формата easter.json
// ВНИМАНИЕ: здесь мы сохраняем простую плоскую цену `price`. 
// Если раньше был weights[], он будет заменён на `price` (одна цена).
function rowsToEasterObject(rows: Item[]): Record<string, any> {
  const out: Record<string, any> = {}
  rows.forEach((r, idx) => {
    const key = (r._key && r._key.trim()) || slugify(r.name) || `item_${idx + 1}`
    out[key] = {
      id: typeof r.id === 'number' ? r.id : generateId(idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      description: Array.isArray(r.description) ? r.description : [],
      image: Array.isArray(r.image) ? r.image : (typeof r.image === 'string' ? r.image : ''),
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

export default function EasterPage() {
  const [rows, setRows] = React.useState<Item[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFile('/easter')
        setRows(easterObjectToRows(data))
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
      const payload = rowsToEasterObject(rows)
      await putFile('easter.json', payload)
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
        <div className="font-semibold">Пасха</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Строка</button>
      </div>
      <SimpleItemsEditor rows={rows} setRows={setRows} onDeleteRow={deleteRow} enableImageUpload={true} />
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
