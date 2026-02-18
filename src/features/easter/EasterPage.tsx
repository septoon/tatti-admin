import React from 'react'
import { getFile, putFile } from '../../lib/api'
import SimpleItemsEditor, { type Item } from '../../components/SimpleItemsEditor'
import SimpleAddItemSheet, { type SimpleItemDraft } from '../../components/SimpleAddItemSheet'
import Loader from '../../components/Loader/Loader'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import { iosUi } from '../../styles/ios'
import { uploadToImgbb } from '../../lib/uploadToImgbb'

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

function createEmptyDraft(): SimpleItemDraft {
  return {
    name: '',
    price: '',
    description: '',
    imageUrl: '',
  }
}

export default function EasterPage() {
  const [rows, setRows] = React.useState<Item[]>([])
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
        const data = await getFile('/easter')
        setRows(easterObjectToRows(data))
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
            Пасха
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
        submitLabel="Добавить блюдо"
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
      <MainButton text={saving ? 'Сохранение...' : 'Сохранить'} onClick={onSave} disabled={saving} />
    </div>
  )
}
