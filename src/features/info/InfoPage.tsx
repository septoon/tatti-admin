import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor from '../../components/SimpleItemsEditor'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'

// Строка редактора для INFO (используем только image, остальные поля игнорируются при сохранении)
type Row = {
  image?: string
  name?: string
  price?: number
  description?: string[]
}

// Объект info.json -> массив для редактора
function infoObjectToRows(obj: any): Row[] {
  const images: string[] = Array.isArray(obj?.info?.images) ? obj.info.images : []
  return images.map((url: string) => ({ image: url, name: '', price: 0, description: [] }))
}

// Массив редактора -> объект info.json
function rowsToInfoObject(rows: Row[]): any {
  const images = (Array.isArray(rows) ? rows : [])
    .map((r) => (typeof r.image === 'string' ? r.image.trim() : ''))
    .filter(Boolean)
  return { info: { images } }
}

export default function InfoPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFile('/info')
        setRows(infoObjectToRows(data))
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const addRow = () => setRows((prev) => [...prev, { image: '', name: '', price: 0, description: [] }])
  const deleteRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx))

  async function onSave() {
    setSaving(true)
    try {
      const payload = rowsToInfoObject(rows)
      await putFile('info.json', payload)
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
        <div className="font-semibold">Инфо</div>
        <button onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Картинка</button>
      </div>
      {/* Используем универсальный редактор, но фактически редактируем только поле image */}
      <SimpleItemsEditor rows={rows} setRows={setRows} onDeleteRow={deleteRow} enableImageUpload={true} />
      <div className="text-xs text-slate-500">Совет: редактируй только колонку <b>Картинка (URL)</b>. Остальные поля будут проигнорированы при сохранении.</div>
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
