import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor from '../../components/SimpleItemsEditor'
import SimpleAddItemSheet, { type SimpleItemDraft } from '../../components/SimpleAddItemSheet'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import { iosUi } from '../../styles/ios'
import { uploadToImgbb } from '../../lib/uploadToImgbb'

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

function createEmptyDraft(): SimpleItemDraft {
  return {
    name: '',
    price: '',
    description: '',
    imageUrl: '',
  }
}

export default function ServicePackagesPage() {
  const [pkgs, setPkgs] = React.useState<Row[]>([])
  const [extras, setExtras] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [addingItem, setAddingItem] = React.useState(false)
  const [addMode, setAddMode] = React.useState<'package' | 'extra'>('package')
  const [newItemDraft, setNewItemDraft] = React.useState<SimpleItemDraft>(createEmptyDraft())
  const [newItemImageFile, setNewItemImageFile] = React.useState<File | null>(null)
  const [newItemImagePreviewUrl, setNewItemImagePreviewUrl] = React.useState('')

  const addDialogFileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFormRef = React.useRef<HTMLFormElement>(null)

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

  React.useEffect(() => {
    if (!newItemImageFile) {
      setNewItemImagePreviewUrl('')
      return
    }
    const nextPreviewUrl = URL.createObjectURL(newItemImageFile)
    setNewItemImagePreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [newItemImageFile])

  function openAddDialog(mode: 'package' | 'extra') {
    setAddMode(mode)
    setNewItemDraft(createEmptyDraft())
    setNewItemImageFile(null)
    if (addDialogFileInputRef.current) addDialogFileInputRef.current.value = ''
    setIsAddDialogOpen(true)
  }

  function closeAddDialog() {
    setIsAddDialogOpen(false)
    setNewItemImageFile(null)
    if (addDialogFileInputRef.current) addDialogFileInputRef.current.value = ''
  }

  function triggerPickAddItemImage() {
    addDialogFileInputRef.current?.click()
  }

  function handleAddItemImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setNewItemImageFile(file)
  }

  async function addRowFromDraft(draft: SimpleItemDraft) {
    if (addingItem) return
    setAddingItem(true)
    try {
      WebApp.HapticFeedback.impactOccurred('heavy')
      const parsedPrice = Number(draft.price)
      const price = Number.isFinite(parsedPrice) ? parsedPrice : 0
      const description = draft.description
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      let imageUrl = draft.imageUrl.trim()
      if (newItemImageFile) {
        imageUrl = await uploadToImgbb(newItemImageFile)
      }

      const nextRow: Row = {
        name: draft.name.trim(),
        price,
        image: imageUrl,
        description,
      }

      if (addMode === 'package') {
        setPkgs((prev) => [...prev, nextRow])
      } else {
        setExtras((prev) => [...prev, nextRow])
      }
      closeAddDialog()
    } catch (e: any) {
      alert('Ошибка добавления: ' + (e?.message || 'unknown'))
    } finally {
      setAddingItem(false)
    }
  }

  async function onAddItemSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await addRowFromDraft(newItemDraft)
  }

  function onMainButtonClick() {
    if (isAddDialogOpen) {
      addDialogFormRef.current?.requestSubmit()
      return
    }
    void onSave()
  }

  const delPkg = (idx: number) => setPkgs(prev => prev.filter((_, i) => i !== idx))
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
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    )
  }

  const iosFontFamily = iosUi.fontFamily
  const iosPanel = iosUi.panel
  const iosPrimaryButton = iosUi.primaryButtonLarge

  return (
    <div className="space-y-6 pb-2" style={{ fontFamily: iosFontFamily }}>
      <section className={`${iosPanel} p-3 md:p-4`}>
        <div className="flex items-center gap-2">
          <div className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7]">
            Пакеты услуг
          </div>
          <button
            className={`${iosPrimaryButton} md:min-w-[132px] ml-auto`}
            onClick={() => openAddDialog('package')}
          >
            Добавить пакет
          </button>
        </div>
      </section>

      <SimpleItemsEditor
        rows={pkgs}
        setRows={setPkgs}
        onDeleteRow={delPkg}
        enableImageUpload={true}
        iosStyles={true}
      />

      <section className={`${iosPanel} p-3 md:p-4`}>
        <div className="flex items-center gap-2">
          <div className="text-[20px] leading-6 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7]">
            Дополнительно
          </div>
          <button
            className={`${iosPrimaryButton} md:min-w-[132px] ml-auto`}
            onClick={() => openAddDialog('extra')}
          >
            Добавить услугу
          </button>
        </div>
      </section>

      <SimpleItemsEditor
        rows={extras}
        setRows={setExtras}
        onDeleteRow={delExtra}
        enableImageUpload={true}
        iosStyles={true}
      />
      <SimpleAddItemSheet
        open={isAddDialogOpen}
        onDismiss={closeAddDialog}
        title={addMode === 'package' ? 'Новый пакет' : 'Новая услуга'}
        formRef={addDialogFormRef}
        onSubmit={onAddItemSubmit}
        draft={newItemDraft}
        onNameChange={(value) => setNewItemDraft((prev) => ({ ...prev, name: value }))}
        onPriceChange={(value) => setNewItemDraft((prev) => ({ ...prev, price: value }))}
        onDescriptionChange={(value) => setNewItemDraft((prev) => ({ ...prev, description: value }))}
        onImageUrlChange={(value) => setNewItemDraft((prev) => ({ ...prev, imageUrl: value }))}
        onPickImage={triggerPickAddItemImage}
        imageFile={newItemImageFile}
        imagePreviewUrl={newItemImagePreviewUrl}
        fileInputRef={addDialogFileInputRef}
        onImageChange={handleAddItemImageChange}
        submitting={addingItem}
      />
      <MainButton
        text={isAddDialogOpen ? (addingItem ? 'Добавление...' : 'Добавить') : (saving ? 'Сохранение...' : 'Сохранить')}
        onClick={onMainButtonClick}
        disabled={isAddDialogOpen ? addingItem : saving}
        progress={isAddDialogOpen ? addingItem : saving}
      />
    </div>
  )
}
