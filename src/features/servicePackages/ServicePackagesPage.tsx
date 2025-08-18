import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor from '../../components/SimpleItemsEditor'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'

// Унифицированная строка редактора (поддержим лишние поля, чтобы не потерять их при сохранении)
type Row = {
  _key?: string
  id?: number
  name: string
  price?: number
  image?: string | string[]
  description?: string[] // packages: includes[]; extras: note -> [string]
  // поля, которые не редактируем в этом простом редакторе, но сохраним как есть
  cost?: string
  note?: string
}

type ServicePackagesObj = {
  packages?: any[]
  extras?: any[]
}

function toRows(obj: ServicePackagesObj) {
  const pkgs: Row[] = Array.isArray(obj?.packages)
    ? obj.packages.map((v: any, idx: number) => ({
        _key: v?.id ? String(v.id) : `pkg_${idx + 1}`,
        id: v?.id,
        name: v?.name ?? '',
        price: typeof v?.price === 'number' ? v.price : Number(v?.price ?? 0),
        image: Array.isArray(v?.images) ? v.images : (Array.isArray(v?.image) ? v.image : (typeof v?.image === 'string' ? v.image : (typeof v?.images === 'string' ? v.images : ''))),
        description: Array.isArray(v?.includes) ? v.includes : [],
        cost: typeof v?.cost === 'string' ? v.cost : undefined,
      }))
    : []

  const extras: Row[] = Array.isArray(obj?.extras)
    ? obj.extras.map((v: any, idx: number) => ({
        _key: v?.id ? String(v.id) : `extra_${idx + 1}`,
        id: v?.id,
        name: v?.name ?? '',
        price: typeof v?.price === 'number' ? v.price : Number(v?.price ?? 0),
        image: Array.isArray(v?.images) ? v.images : (Array.isArray(v?.image) ? v.image : (typeof v?.image === 'string' ? v.image : (typeof v?.images === 'string' ? v.images : ''))),
        // note (string) -> description[0]
        description: typeof v?.note === 'string' && v.note.length > 0 ? [v.note] : [],
        cost: typeof v?.cost === 'string' ? v.cost : undefined,
        note: typeof v?.note === 'string' ? v.note : undefined,
      }))
    : []

  return { pkgs, extras }
}

function fromRows(pkgs: Row[], extras: Row[]): ServicePackagesObj {
  const packages = pkgs.map((r, idx) => {
    const imagesOrImage = Array.isArray(r.image)
      ? { images: (r.image as string[]).map(s => String(s)).filter(Boolean) }
      : { image: typeof r.image === 'string' ? r.image : '' }

    return {
      id: typeof r.id === 'number' ? r.id : generateId(idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      includes: Array.isArray(r.description) ? r.description : [],
      ...(r.cost ? { cost: r.cost } : {}),
      ...imagesOrImage,
    }
  })

  const extrasArr = extras.map((r, idx) => {
    const imagesOrImage = Array.isArray(r.image)
      ? { images: (r.image as string[]).map(s => String(s)).filter(Boolean) }
      : { image: typeof r.image === 'string' ? r.image : '' }

    return {
      id: typeof r.id === 'number' ? r.id : generateId(1000 + idx),
      name: r.name ?? '',
      price: typeof r.price === 'number' ? r.price : Number(r.price ?? 0),
      // description[] -> note (многострочный текст объединим через \n)
      note: Array.isArray(r.description) ? r.description.join('\n') : (r.note ?? ''),
      ...(r.cost ? { cost: r.cost } : {}),
      ...imagesOrImage,
    }
  })

  return { packages, extras: extrasArr }
}

function generateId(seed: number): number {
  return Number(String(Date.now()).slice(-6)) + seed
}

export default function ServicePackagesPage() {
  const [pkgs, setPkgs] = React.useState<Row[]>([])
  const [extras, setExtras] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = (await getFile('/servicePackages')) as ServicePackagesObj
        const { pkgs, extras } = toRows(data)
        setPkgs(pkgs)
        setExtras(extras)
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const addPkg = () => {
    WebApp.HapticFeedback.impactOccurred('heavy')
    setPkgs(prev => [...prev, { name: '', price: 0, image: '', description: [] }])
  }
  const delPkg = (idx: number) => setPkgs(prev => prev.filter((_, i) => i !== idx))

  const addExtra = () => {
    WebApp.HapticFeedback.impactOccurred('heavy')
    setExtras(prev => [...prev, { name: '', price: 0, image: '', description: [] }])
  }
  const delExtra = (idx: number) => setExtras(prev => prev.filter((_, i) => i !== idx))

  async function onSave() {
    setSaving(true)
    try {
      const payload = fromRows(pkgs, extras)
      await putFile('servicePackages.json', payload)
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Пакеты услуг</div>
        <button onClick={addPkg} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Пакет</button>
      </div>

      <SimpleItemsEditor rows={pkgs} setRows={setPkgs} onDeleteRow={delPkg} enableImageUpload={true} />

      <div className="flex items-center gap-2 pt-4">
        <div className="font-semibold">Дополнительно</div>
        <button onClick={addExtra} className="ml-auto px-3 py-1.5 rounded-md bg-mainBtn text-white">+ Услуга</button>
      </div>

      <SimpleItemsEditor rows={extras} setRows={setExtras} onDeleteRow={delExtra} enableImageUpload={true} />
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
