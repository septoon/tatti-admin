import React from 'react';
import { getMenu, saveMenu, uploadMenuImage } from '../../lib/api';
import type { NormalizedMenu, Item } from '../../lib/types';
import WebApp from '@twa-dev/sdk';
import Loader from '../../components/Loader/Loader';
import { MainButton } from '@twa-dev/sdk/react';
import { IoSearch } from 'react-icons/io5';
import { HiOutlineCamera } from 'react-icons/hi';
import { convertImageToWebp } from '../../lib/imageToWebp';
import AddItemSheet from './components/AddItemSheet';
import { iosUi } from '../../styles/ios';

function compareItems(a: Item, b: Item) {
  const sa = Number(a.sortOrder ?? 0)
  const sb = Number(b.sortOrder ?? 0)
  if (sa !== sb) return sa - sb
  return a.id.localeCompare(b.id)
}

type NewItemDraft = {
  categoryId: string
  title: string
  price: string
  description: string
}

function createEmptyDraft(categoryId: string): NewItemDraft {
  return {
    categoryId,
    title: '',
    price: '',
    description: '',
  }
}

export default function MenuPage() {
  const [data, setData] = React.useState<NormalizedMenu | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('all');
  const [query, setQuery] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = React.useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newItemDraft, setNewItemDraft] = React.useState<NewItemDraft>(createEmptyDraft(''))
  const [newItemImageFile, setNewItemImageFile] = React.useState<File | null>(null)
  const [newItemImagePreviewUrl, setNewItemImagePreviewUrl] = React.useState<string>('')
  const [addingItem, setAddingItem] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFileInputRef = React.useRef<HTMLInputElement>(null)
  const addDialogFormRef = React.useRef<HTMLFormElement>(null)
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const apply = () => {
      const scheme = WebApp.colorScheme; // 'light' | 'dark'
      document.documentElement.setAttribute('data-color-scheme', scheme);
    };
    apply();
    WebApp.onEvent('themeChanged', apply);
    return () => WebApp.offEvent('themeChanged', apply);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getMenu();
        setData(res);
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки меню');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cats = React.useMemo(
    () => (data ? [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [data],
  )

  React.useEffect(() => {
    if (!cats.length) {
      setNewItemCategoryId('')
      setNewItemDraft(createEmptyDraft(''))
      setNewItemImageFile(null)
      return
    }
    setNewItemCategoryId((prev) => {
      if (prev && cats.some((cat) => cat.id === prev)) return prev
      return cats[0].id
    })
  }, [cats])

  React.useEffect(() => {
    if (filter !== 'all') setNewItemCategoryId(filter)
  }, [filter])

  React.useEffect(() => {
    if (!isAddDialogOpen) return
    setNewItemDraft((prev) => {
      if (prev.categoryId && cats.some((cat) => cat.id === prev.categoryId)) return prev
      const fallbackCategoryId = newItemCategoryId || cats[0]?.id || ''
      return { ...prev, categoryId: fallbackCategoryId }
    })
  }, [cats, isAddDialogOpen, newItemCategoryId])

  React.useEffect(() => {
    if (!newItemImageFile) {
      setNewItemImagePreviewUrl('')
      return
    }
    const nextPreviewUrl = URL.createObjectURL(newItemImageFile)
    setNewItemImagePreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [newItemImageFile])

  const categoryPositions = React.useMemo(() => {
    const positions = new Map<string, { index: number; total: number }>()
    if (!data) return positions

    const grouped = new Map<string, Item[]>()
    for (const item of data.items) {
      if (!grouped.has(item.categoryId)) grouped.set(item.categoryId, [])
      grouped.get(item.categoryId)!.push(item)
    }
    for (const entries of grouped.values()) {
      const ordered = [...entries].sort(compareItems)
      ordered.forEach((item, index) => {
        positions.set(item.id, { index, total: ordered.length })
      })
    }
    return positions
  }, [data])

  function getCatName(id: string) {
    const f = cats.find((c) => c.id === id);
    return f ? f.name : '';
  }

  function getNextExternalId(items: Item[]): number {
    let maxExternalId = 0
    for (const item of items) {
      const value = Number(item.externalId)
      if (Number.isFinite(value)) maxExternalId = Math.max(maxExternalId, value)
    }
    return maxExternalId + 1
  }

  function getNextSortOrder(items: Item[], categoryId: string): number {
    let maxSortOrder = 0
    for (const item of items) {
      if (item.categoryId !== categoryId) continue
      const value = Number(item.sortOrder ?? 0)
      if (Number.isFinite(value)) maxSortOrder = Math.max(maxSortOrder, value)
    }
    return maxSortOrder + 1
  }

  function normalizeCategorySortOrder(items: Item[], categoryId: string): Item[] {
    const ordered = items.filter((item) => item.categoryId === categoryId).sort(compareItems)
    const nextSortMap = new Map(ordered.map((item, index) => [item.id, index + 1]))
    return items.map((item) =>
      item.categoryId === categoryId ? { ...item, sortOrder: nextSortMap.get(item.id) ?? 0 } : item,
    )
  }

  function updateItem(id: string, patch: Partial<Item>) {
    if (!data) return;
    setData({
      ...data,
      items: data.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  }

  function deleteItem(id: string) {
    if (!data) return;
    setData({
      ...data,
      items: data.items.filter((it) => it.id !== id),
    });
  }

  function openAddDialog() {
    if (!newItemCategoryId) return
    setNewItemDraft(createEmptyDraft(newItemCategoryId))
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

  async function addItemFromDraft(draft: NewItemDraft) {
    if (!data || !draft.categoryId || addingItem) return
    setAddingItem(true)
    try {
      const externalId = getNextExternalId(data.items)
      const sortOrder = getNextSortOrder(data.items, draft.categoryId)
      const parsedPrice = Number(draft.price)
      const price = Number.isFinite(parsedPrice) ? parsedPrice : 0
      const description = draft.description
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      let images: Item['images'] = []
      if (newItemImageFile) {
        const webpFile = await convertImageToWebp(newItemImageFile)
        const uploadedUrl = await uploadMenuImage({
          webpFile,
          categoryHintUrl: getCategoryHintUrl(draft.categoryId),
          fileStem: `image-${String(externalId)}`,
        })
        images = [{ id: `img-${draft.categoryId}-${externalId}`, url: uploadedUrl }]
      }

      const newItem: Item = {
        id: `${draft.categoryId}-${externalId}-${Date.now()}`,
        externalId,
        title: draft.title.trim(),
        description,
        categoryId: draft.categoryId,
        price,
        images,
        available: true,
        featured: false,
        sortOrder,
        status: 'published',
      }
      setData({
        ...data,
        items: [...data.items, newItem],
      })
      setFilter(draft.categoryId)
      setQuery('')
      setNewItemCategoryId(draft.categoryId)
      closeAddDialog()
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Ошибка добавления товара'
      alert(message)
    } finally {
      setAddingItem(false)
    }
  }

  async function onAddItemSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await addItemFromDraft(newItemDraft)
  }

  function onMainButtonClick() {
    if (isAddDialogOpen) {
      addDialogFormRef.current?.requestSubmit()
      return
    }
    void onSave()
  }

  function moveItemWithinCategory(id: string, direction: -1 | 1) {
    if (!data) return
    const current = data.items.find((item) => item.id === id)
    if (!current) return

    const inCategory = data.items.filter((item) => item.categoryId === current.categoryId).sort(compareItems)
    const index = inCategory.findIndex((item) => item.id === id)
    if (index < 0) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= inCategory.length) return

    const reordered = [...inCategory]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    const nextSortMap = new Map(reordered.map((item, itemIndex) => [item.id, itemIndex + 1]))

    setData({
      ...data,
      items: data.items.map((item) =>
        item.categoryId === current.categoryId
          ? { ...item, sortOrder: nextSortMap.get(item.id) ?? item.sortOrder }
          : item,
      ),
    })
  }

  function moveItemToCategory(id: string, targetCategoryId: string) {
    if (!data || !targetCategoryId) return
    const current = data.items.find((item) => item.id === id)
    if (!current || current.categoryId === targetCategoryId) return

    const hasIdConflict =
      typeof current.externalId === 'number' &&
      data.items.some(
        (item) =>
          item.id !== id &&
          item.categoryId === targetCategoryId &&
          typeof item.externalId === 'number' &&
          item.externalId === current.externalId,
      )

    const nextExternalId = hasIdConflict ? getNextExternalId(data.items) : current.externalId
    const targetSortOrder = getNextSortOrder(
      data.items.filter((item) => item.id !== id),
      targetCategoryId,
    )

    let nextItems = data.items.map((item) =>
      item.id === id
        ? {
            ...item,
            categoryId: targetCategoryId,
            sortOrder: targetSortOrder,
            externalId: nextExternalId,
          }
        : item,
    )
    nextItems = normalizeCategorySortOrder(nextItems, current.categoryId)
    nextItems = normalizeCategorySortOrder(nextItems, targetCategoryId)

    setData({
      ...data,
      items: nextItems,
    })
  }

  function triggerPickImage(id: string) {
    setUploadingId(id)
    fileInputRef.current?.click()
  }

  function getCategoryHintUrl(categoryId: string, excludeItemId?: string): string | undefined {
    if (!data) return undefined
    const sameCategory = data.items.find(
      (entry) =>
        entry.id !== excludeItemId &&
        entry.categoryId === categoryId &&
        (entry.images?.[0]?.url ?? '').trim().length > 0,
    )
    if (sameCategory?.images?.[0]?.url) return sameCategory.images[0].url

    const anyCategory = data.items.find((entry) => (entry.images?.[0]?.url ?? '').trim().length > 0)
    return anyCategory?.images?.[0]?.url
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const currentUploadingId = uploadingId
    if (!file || !currentUploadingId || !data) return
    try {
      setSaving(true)
      const item = data.items.find((it) => it.id === currentUploadingId)
      if (!item) throw new Error('Не найден товар для загрузки')

      const oldImageUrl = item?.images?.[0]?.url?.trim() ?? ''
      const webpFile = await convertImageToWebp(file)
      const fileStem = `image-${String(item.externalId ?? item.sortOrder ?? item.id)}`
      const uploadedUrl = await uploadMenuImage({
        webpFile,
        oldImageUrl: oldImageUrl || undefined,
        categoryHintUrl: getCategoryHintUrl(item.categoryId, item.id),
        fileStem,
      })
      const imageId = item?.images?.[0]?.id ?? `img-${item.id}`
      updateItem(currentUploadingId, { images: [{ id: imageId, url: uploadedUrl }] })
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Ошибка загрузки изображения'
      alert(message)
    } finally {
      setSaving(false)
      setUploadingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirm = (id: string) => {
    const item = data?.items.find((i) => i.id === id);
    const name = item?.title && item.title.trim() !== '' ? item.title : 'новое блюдо';
    WebApp.HapticFeedback.impactOccurred('heavy');
    WebApp.showConfirm(
      `Вы действительно хотите удалить ${name}? Это действие безвозвратно!`,
      (confirmed) => {
        if (confirmed) deleteItem(id);
      },
    );
  };

  async function onSave() {
    if (!data) return;
    setSaving(true);
    try {
      await saveMenu(data);
      alert('Изменения сохранены');
    } catch (e: any) {
      alert('Ошибка сохранения: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    )
  }
  if (!data) return null;

  const q = query.trim().toLowerCase();
  const items = data.items
    .filter((it) => (filter === 'all' ? true : it.categoryId === filter))
    .filter((it) => (q === '' ? true : it.title?.toLowerCase().includes(q)))
    .sort(compareItems);

  function renameCategory(catId: string, newName: string) {
    if (!data) return;
    setData({
      ...data,
      categories: data.categories.map((c) => (c.id === catId ? { ...c, name: newName } : c)),
    });
  }

  const iosFontFamily = iosUi.fontFamily
  const iosPanel = iosUi.panel
  const iosInput = iosUi.input
  const iosInputCompact = iosUi.inputCompact
  const iosLabel = iosUi.label
  const iosPrimaryButton = iosUi.primaryButtonLarge
  const iosSubtleButton = iosUi.subtleButton
  const iosDangerButton = iosUi.dangerButton

  return (
    <div className="space-y-4 pb-2" style={{ fontFamily: iosFontFamily }}>
      <section className={`${iosPanel} p-3 md:p-4 space-y-3`}>
        <div className="relative">
          <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93] text-lg" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className={`${iosInput} pl-11`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <select
            className={iosInput}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Все категории</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className={`${iosPrimaryButton} md:min-w-[132px]`}
            onClick={openAddDialog}
            disabled={!newItemCategoryId}
          >
            Добавить блюдо
          </button>
        </div>
      </section>

      <div className={`hidden md:block overflow-auto ${iosPanel}`}>
        <table className="min-w-[980px] w-full text-sm text-[#111827] dark:text-[#f2f2f7]">
          <thead className="bg-white/70 dark:bg-[#2c2c2e]/70">
            <tr className="text-[11px] uppercase tracking-[0.04em] text-[#6b7280] dark:text-[#8e8e93]">
              <th className="text-left p-3 w-36 font-semibold">Категория</th>
              <th className="text-left p-3 w-64 font-semibold">Название</th>
              <th className="text-left p-3 w-28 font-semibold">Цена</th>
              <th className="text-left p-3 font-semibold">Описание (по строкам)</th>
              <th className="text-left p-3 w-64 font-semibold">Картинка</th>
              <th className="text-left p-3 w-72 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {items.map((it) => {
              const position = categoryPositions.get(it.id)
              const canMoveUp = (position?.index ?? 0) > 0
              const canMoveDown = (position?.index ?? 0) < (position?.total ?? 1) - 1
              const imageUrl = it.images?.[0]?.url ?? ''

              return (
                <tr key={it.id} className="align-top">
                  <td className="p-3">
                    <input
                      className={iosInputCompact}
                      value={getCatName(it.categoryId)}
                      onChange={(e) => renameCategory(it.categoryId, e.target.value)}
                    />
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
                        updateItem(it.id, { description: e.target.value.split('\n').filter(Boolean) })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="space-y-2">
                      <input
                        className={iosInputCompact}
                        value={imageUrl}
                        onChange={(e) =>
                          updateItem(it.id, {
                            images: [{ id: it.images?.[0]?.id ?? `img-${it.id}`, url: e.target.value }],
                          })
                        }
                      />
                      {imageUrl ? (
                        <button
                          type="button"
                          className="relative inline-block group"
                          onClick={() => triggerPickImage(it.id)}
                        >
                          <img
                            src={imageUrl}
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
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveItemWithinCategory(it.id, -1)}
                          disabled={!canMoveUp}
                          className={iosSubtleButton}
                          title="Поднять выше"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveItemWithinCategory(it.id, 1)}
                          disabled={!canMoveDown}
                          className={iosSubtleButton}
                          title="Опустить ниже"
                        >
                          ↓
                        </button>
                      </div>
                      <select
                        className={iosInputCompact}
                        value={it.categoryId}
                        onChange={(e) => moveItemToCategory(it.id, e.target.value)}
                      >
                        {cats.map((cat) => (
                          <option key={`move-${it.id}-${cat.id}`} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => confirm(it.id)}
                        className={`${iosDangerButton} w-full`}
                        title="Удалить блюдо"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {items.map((it) => {
          const position = categoryPositions.get(it.id)
          const canMoveUp = (position?.index ?? 0) > 0
          const canMoveDown = (position?.index ?? 0) < (position?.total ?? 1) - 1
          const imageUrl = it.images?.[0]?.url ?? ''
          const imageId = it.images?.[0]?.id ?? `img-${it.id}`

          return (
            <div key={it.id} className={`${iosPanel} p-4 space-y-3`}>
              <div className="space-y-1">
                <div className={iosLabel}>Категория</div>
                <input
                  className={iosInputCompact}
                  value={getCatName(it.categoryId)}
                  onChange={(e) => renameCategory(it.categoryId, e.target.value)}
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

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <div className={iosLabel}>Цена</div>
                  <input
                    type="number"
                    className={iosInputCompact}
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <div className={iosLabel}>Картинка (URL)</div>
                  <input
                    className={iosInputCompact}
                    value={imageUrl}
                    onChange={(e) =>
                      updateItem(it.id, { images: [{ id: imageId, url: e.target.value }] })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className={iosLabel}>Картинка (нажмите, чтобы загрузить)</div>
                <button
                  type="button"
                  className="relative group w-full aspect-square overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e]"
                  onClick={() => triggerPickImage(it.id)}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={it.title}
                        className="h-full w-full object-cover cursor-pointer"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                        <HiOutlineCamera className="text-white text-2xl" />
                      </span>
                    </>
                  ) : (
                    <span className="h-full w-full flex flex-col items-center justify-center gap-2 text-[#8e8e93] border-2 border-dashed border-black/15 dark:border-white/20 rounded-2xl">
                      <HiOutlineCamera className="text-3xl" />
                      <span className="text-sm">Загрузить фото</span>
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <div className={iosLabel}>Описание (по строкам)</div>
                <textarea
                  className={`${iosInputCompact} h-28 resize-y`}
                  value={it.description.join('\n')}
                  onChange={(e) =>
                    updateItem(it.id, { description: e.target.value.split('\n').filter(Boolean) })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className={iosLabel}>Перемещение</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveItemWithinCategory(it.id, -1)}
                    disabled={!canMoveUp}
                    className={`${iosSubtleButton} flex-1`}
                    title="Поднять выше"
                  >
                    ↑ Выше
                  </button>
                  <button
                    onClick={() => moveItemWithinCategory(it.id, 1)}
                    disabled={!canMoveDown}
                    className={`${iosSubtleButton} flex-1`}
                    title="Опустить ниже"
                  >
                    ↓ Ниже
                  </button>
                </div>
                <div className={iosLabel}>Сменить категорию</div>
                <select
                  className={iosInputCompact}
                  value={it.categoryId}
                  onChange={(e) => moveItemToCategory(it.id, e.target.value)}
                >
                  {cats.map((cat) => (
                    <option key={`move-mobile-${it.id}-${cat.id}`} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
          )
        })}
      </div>

      <AddItemSheet
        open={isAddDialogOpen}
        onDismiss={closeAddDialog}
        formRef={addDialogFormRef}
        onSubmit={onAddItemSubmit}
        cats={cats}
        draft={newItemDraft}
        onCategoryChange={(value) => setNewItemDraft((prev) => ({ ...prev, categoryId: value }))}
        onTitleChange={(value) => setNewItemDraft((prev) => ({ ...prev, title: value }))}
        onPriceChange={(value) => setNewItemDraft((prev) => ({ ...prev, price: value }))}
        onDescriptionChange={(value) => setNewItemDraft((prev) => ({ ...prev, description: value }))}
        addingItem={addingItem}
        onPickImage={triggerPickAddItemImage}
        imageFile={newItemImageFile}
        imagePreviewUrl={newItemImagePreviewUrl}
        fileInputRef={addDialogFileInputRef}
        onImageChange={handleAddItemImageChange}
      />
      <MainButton
        text={isAddDialogOpen ? (addingItem ? 'Добавление...' : 'Добавить') : (saving ? 'Сохранение...' : 'Сохранить')}
        onClick={onMainButtonClick}
        disabled={isAddDialogOpen ? addingItem : saving}
        progress={isAddDialogOpen ? addingItem : saving}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
