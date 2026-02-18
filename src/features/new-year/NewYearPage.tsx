import React from 'react'
import { HiOutlineCamera } from 'react-icons/hi'
import { MainButton } from '@twa-dev/sdk/react'
import WebApp from '@twa-dev/sdk'
import Loader from '../../components/Loader/Loader'
import { getFile, putFile } from '../../lib/api'
import SimpleAddItemSheet, { type SimpleItemDraft } from '../../components/SimpleAddItemSheet'
import { iosUi } from '../../styles/ios'
import { uploadToImgbb } from '../../lib/uploadToImgbb'

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

function createEmptyDraft(): SimpleItemDraft {
  return {
    name: '',
    price: '',
    description: '',
    imageUrl: '',
  }
}

export default function NewYearPage() {
  const [items, setItems] = React.useState<NewYearItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [addingItem, setAddingItem] = React.useState(false)
  const [newItemDraft, setNewItemDraft] = React.useState<SimpleItemDraft>(createEmptyDraft())
  const [newItemImageFile, setNewItemImageFile] = React.useState<File | null>(null)
  const [newItemImagePreviewUrl, setNewItemImagePreviewUrl] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFormRef = React.useRef<HTMLFormElement>(null)
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

  React.useEffect(() => {
    if (!newItemImageFile) {
      setNewItemImagePreviewUrl('')
      return
    }
    const nextPreviewUrl = URL.createObjectURL(newItemImageFile)
    setNewItemImagePreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [newItemImageFile])

  const updateItem = (id: string, patch: Partial<NewYearItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

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

      setItems((prev) => [
        ...prev,
        {
          key: `item_${prev.length + 1}`,
          id: generateId(prev.length),
          title: draft.name.trim(),
          price,
          description,
          images: imageUrl ? [{ id: 'img-1', url: imageUrl }] : [],
          imageField: 'image',
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
      const url = await uploadToImgbb(file)
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
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    )
  }

  const iosFontFamily = iosUi.fontFamily
  const iosPanel = iosUi.panel
  const iosInputCompact = iosUi.inputCompact
  const iosLabel = iosUi.label
  const iosPrimaryButton = iosUi.primaryButtonLarge
  const iosDangerButton = iosUi.dangerButton

  return (
    <div className="space-y-4 pb-2" style={{ fontFamily: iosFontFamily }}>
      <section className={`${iosPanel} p-3 md:p-4`}>
        <div className="flex items-center gap-2">
          <div className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7]">
            Новый Год
          </div>
          <button
            className={`${iosPrimaryButton} md:min-w-[132px] ml-auto`}
            onClick={openAddDialog}
          >
            Добавить блюдо
          </button>
        </div>
      </section>

      <div className={`overflow-auto hidden md:block ${iosPanel}`}>
        <table className="min-w-[900px] w-full text-sm text-[#111827] dark:text-[#f2f2f7]">
          <thead className="bg-white/70 dark:bg-[#2c2c2e]/70">
            <tr className="text-[11px] uppercase tracking-[0.04em] text-[#6b7280] dark:text-[#8e8e93]">
              <th className="text-left p-3 w-36 font-semibold">Категория</th>
              <th className="text-left p-3 w-64 font-semibold">Название</th>
              <th className="text-left p-3 w-24 font-semibold">Цена</th>
              <th className="text-left p-3 font-semibold">Описание (по строкам)</th>
              <th className="text-left p-3 w-64 font-semibold">Картинка</th>
              <th className="text-left p-3 w-32 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="p-3">
                  <input className={`${iosInputCompact} opacity-80`} value="Новый Год" readOnly />
                </td>
                <td className="p-3">
                  <input
                    className={iosInputCompact}
                    value={it.title}
                    onChange={(e) => updateItem(it.id, { title: e.target.value })}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className={iosInputCompact}
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                  />
                </td>
                <td className="p-3">
                  <textarea
                    className={`${iosInputCompact} h-24 resize-y`}
                    value={it.description.join('\n')}
                    onChange={(e) =>
                      updateItem(it.id, {
                        description: e.target.value.split('\n').filter((line) => line.trim().length),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="space-y-2">
                    <input
                      className={iosInputCompact}
                      value={it.images?.[0]?.url ?? ''}
                      onChange={(e) =>
                        updateItem(it.id, { images: [{ id: 'img-1', url: e.target.value }] })
                      }
                    />
                    {(it.images?.[0]?.url ?? '').trim() ? (
                      <button
                        type="button"
                        className="relative inline-block group"
                        onClick={() => triggerPickImage(it.id)}
                      >
                        <img
                          src={it.images?.[0]?.url ?? ''}
                          alt={it.title}
                          className="h-16 w-24 object-cover rounded-xl border border-black/10 dark:border-white/10"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/25 opacity-0 group-hover:opacity-100 transition">
                          <HiOutlineCamera className="text-white" />
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerPickImage(it.id)}
                        className="h-16 w-24 rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-white dark:bg-[#2c2c2e] text-[11px] text-[#6b7280] dark:text-[#8e8e93] flex flex-col items-center justify-center gap-1"
                      >
                        <HiOutlineCamera className="text-base" />
                        Загрузить
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => confirm(it.id)}
                    className={iosDangerButton}
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
            className={`${iosPanel} p-4 space-y-3`}
          >
            <div className="space-y-1">
              <div className={iosLabel}>Категория</div>
              <input
                className={`${iosInputCompact} opacity-80`}
                value="Новый Год"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <div className={iosLabel}>Название</div>
              <input
                className={iosInputCompact}
                value={it.title}
                onChange={(e) => updateItem(it.id, { title: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <div className={iosLabel}>Цена</div>
                <input
                  type="number"
                  className={iosInputCompact}
                  value={it.price}
                  onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className={iosLabel}>Картинка (URL)</div>
                <input
                  className={iosInputCompact}
                  value={it.images?.[0]?.url ?? ''}
                  onChange={(e) =>
                    updateItem(it.id, { images: [{ id: 'img-1', url: e.target.value }] })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className={iosLabel}>Картинка (нажмите, чтобы загрузить)</div>
              <div className="relative group">
                {(it.images?.[0]?.url ?? '').trim() ? (
                  <>
                    <img
                      src={it.images?.[0]?.url ?? ''}
                      alt={it.title}
                      className="max-h-28 w-full object-cover rounded-2xl border border-black/10 dark:border-white/10 cursor-pointer"
                      onClick={() => triggerPickImage(it.id)}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition"
                      onClick={() => triggerPickImage(it.id)}
                    >
                      <HiOutlineCamera className="text-white text-2xl" />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full h-28 rounded-2xl border border-dashed border-black/20 dark:border-white/20 bg-white dark:bg-[#2c2c2e] text-[#8e8e93] flex flex-col items-center justify-center gap-2"
                    onClick={() => triggerPickImage(it.id)}
                  >
                    <HiOutlineCamera className="text-3xl" />
                    <span className="text-sm">Загрузить фото</span>
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className={iosLabel}>Описание (по строкам)</div>
              <textarea
                className={`${iosInputCompact} h-28 resize-y`}
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
                className={`${iosDangerButton} w-full`}
                title="Удалить блюдо"
              >
                Удалить блюдо
              </button>
            </div>
          </div>
        ))}
      </div>

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
