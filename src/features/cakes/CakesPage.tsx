import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor from '../../components/SimpleItemsEditor'
import SimpleAddItemSheet, { type SimpleItemDraft } from '../../components/SimpleAddItemSheet'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import { iosUi } from '../../styles/ios'
import { uploadToImgbb } from '../../lib/uploadToImgbb'

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

function createEmptyDraft(): SimpleItemDraft {
  return {
    name: '',
    price: '',
    description: '',
    imageUrl: '',
  }
}

export default function CakesPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [addingItem, setAddingItem] = React.useState(false)
  const [newItemDraft, setNewItemDraft] = React.useState<SimpleItemDraft>(createEmptyDraft())
  const [newItemImageFile, setNewItemImageFile] = React.useState<File | null>(null)
  const [newItemImagePreviewUrl, setNewItemImagePreviewUrl] = React.useState('')

  const addDialogFileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFormRef = React.useRef<HTMLFormElement>(null)

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

  React.useEffect(() => {
    if (!newItemImageFile) {
      setNewItemImagePreviewUrl('')
      return
    }
    const nextPreviewUrl = URL.createObjectURL(newItemImageFile)
    setNewItemImagePreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [newItemImageFile])

  function openAddDialog() {
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

      setRows((prev) => [
        ...prev,
        {
          _key: `item_${prev.length + 1}`,
          name: draft.name.trim(),
          price,
          image: imageUrl,
          description,
        },
      ])
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
    <div className="space-y-4 pb-2" style={{ fontFamily: iosFontFamily }}>
      <section className={`${iosPanel} p-3 md:p-4`}>
        <div className="flex items-center gap-2">
          <div className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7]">
            Торты
          </div>
          <button
            className={`${iosPrimaryButton} md:min-w-[132px] ml-auto`}
            onClick={openAddDialog}
          >
            Добавить блюдо
          </button>
        </div>
      </section>
      <SimpleItemsEditor
        rows={rows}
        setRows={setRows}
        onDeleteRow={deleteRow}
        enableImageUpload={true}
        iosStyles={true}
      />
      <SimpleAddItemSheet
        open={isAddDialogOpen}
        onDismiss={closeAddDialog}
        title="Новое блюдо"
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
