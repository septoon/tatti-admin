import React from 'react';
import { getMenu, saveMenu, uploadMenuImage } from '../../lib/api';
import type { NormalizedMenu, Item } from '../../lib/types';
import WebApp from '@twa-dev/sdk';
import Loader from '../../components/Loader/Loader';
import { MainButton } from '@twa-dev/sdk/react';
import { IoSearch } from 'react-icons/io5';
import { HiOutlineCamera } from 'react-icons/hi';
import { convertImageToWebp } from '../../lib/imageToWebp';

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
    price: '0',
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
  if (error) return <div className="p-4 text-red-600">{error}</div>;
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

  return (
    <div className="space-y-4">
      <div className="relative w-full mb-6">
        <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 text-xl" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full p-2 pl-10 bg-light dark:bg-dark border-b border-gray-500 dark:border-darkCard focus:border-0"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-gray-300 dark:border-dark w-full px-2 py-3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Все категории</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-end">
        <button
          className="px-3 py-2 rounded-md bg-mainBtn text-white whitespace-nowrap disabled:opacity-50"
          onClick={openAddDialog}
          disabled={!newItemCategoryId}
        >
          + Товар
        </button>
      </div>

      {/* Desktop table */}
      <div className="overflow-auto rounded-md hidden md:block">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2 w-36">Категория</th>
              <th className="text-left p-2 w-64">Название</th>
              <th className="text-left p-2 w-24">Цена</th>
              <th className="text-left p-2">Описание (по строкам)</th>
              <th className="text-left p-2 w-64">Картинка</th>
              <th className="text-left p-2 w-72">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const position = categoryPositions.get(it.id)
              const canMoveUp = (position?.index ?? 0) > 0
              const canMoveDown = (position?.index ?? 0) < (position?.total ?? 1) - 1
              const imageUrl = it.images?.[0]?.url ?? ''

              return (
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  <input
                    className="rounded-md px-2 py-1 w-full"
                    value={getCatName(it.categoryId)}
                    onChange={(e) => renameCategory(it.categoryId, e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="rounded-md px-2 py-1 w-full"
                    value={it.title}
                    onChange={(e) => updateItem(it.id, { title: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="rounded-md px-2 py-1 w-24"
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                  />
                </td>
                <td className="p-2">
                  <textarea
                    className="rounded-md px-2 py-1 w-full h-24"
                    value={it.description.join('\n')}
                    onChange={(e) =>
                      updateItem(it.id, { description: e.target.value.split('\n').filter(Boolean) })
                    }
                  />
                </td>
                <td className="p-2">
                  <div className="space-y-2">
                    <input
                      className="rounded-md px-2 py-1 w-full"
                      value={imageUrl}
                      onChange={(e) =>
                        updateItem(it.id, {
                          images: [{ id: it.images?.[0]?.id ?? `img-${it.id}`, url: e.target.value }],
                        })
                      }
                    />
                    {imageUrl ? (
                      <div className="relative inline-block group">
                        <img
                          src={imageUrl}
                          alt={it.title}
                          className="h-16 w-24 object-cover rounded cursor-pointer border"
                          onClick={() => triggerPickImage(it.id)}
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded bg-black/30 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => triggerPickImage(it.id)}
                        >
                          <HiOutlineCamera className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerPickImage(it.id)}
                        className="h-16 w-24 rounded border-2 border-dashed border-gray-300 text-xs text-slate-500 flex flex-col items-center justify-center gap-1"
                      >
                        <HiOutlineCamera className="text-base" />
                        Загрузить
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveItemWithinCategory(it.id, -1)}
                        disabled={!canMoveUp}
                        className="px-2 py-1 rounded border disabled:opacity-40"
                        title="Поднять выше"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItemWithinCategory(it.id, 1)}
                        disabled={!canMoveDown}
                        className="px-2 py-1 rounded border disabled:opacity-40"
                        title="Опустить ниже"
                      >
                        ↓
                      </button>
                    </div>
                    <select
                      className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
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
                      className="px-2 py-1 rounded border text-red-600 hover:bg-red-50 w-full"
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

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {items.map((it) => {
          const position = categoryPositions.get(it.id)
          const canMoveUp = (position?.index ?? 0) > 0
          const canMoveDown = (position?.index ?? 0) < (position?.total ?? 1) - 1
          const imageUrl = it.images?.[0]?.url ?? ''
          const imageId = it.images?.[0]?.id ?? `img-${it.id}`

          return (
          <div
            key={it.id}
            className="shadow-lg rounded-xl bg-white text-gray dark:text-ligt dark:bg-darkCard p-3 mb-4 space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Категория</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={getCatName(it.categoryId)}
                onChange={(e) => renameCategory(it.categoryId, e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">Название</div>
              <input
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                value={it.title}
                onChange={(e) => updateItem(it.id, { title: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <div className="text-xs text-slate-500">Цена</div>
                <input
                  type="number"
                  className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                  value={it.price}
                  onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs text-slate-500">Картинка (URL)</div>
                <input
                  className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full"
                  value={imageUrl}
                  onChange={(e) =>
                    updateItem(it.id, { images: [{ id: imageId, url: e.target.value }] })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка (нажмите, чтобы загрузить)</div>
              <button
                type="button"
                className="relative group w-full aspect-square overflow-hidden rounded-xl border border-gray-200"
                onClick={() => triggerPickImage(it.id)}
              >
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={it.title}
                      className="h-full w-full object-cover cursor-pointer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                      <HiOutlineCamera className="text-white text-2xl" />
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500 border-2 border-dashed border-gray-300 rounded-xl">
                    <HiOutlineCamera className="text-3xl" />
                    <span className="text-sm">Загрузить фото</span>
                  </div>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">Описание (по строкам)</div>
              <textarea
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 w-full h-28"
                value={it.description.join('\n')}
                onChange={(e) =>
                  updateItem(it.id, { description: e.target.value.split('\n').filter(Boolean) })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-500">Перемещение</div>
              <div className="flex gap-2">
                <button
                  onClick={() => moveItemWithinCategory(it.id, -1)}
                  disabled={!canMoveUp}
                  className="flex-1 px-3 py-2 rounded-md border disabled:opacity-40"
                  title="Поднять выше"
                >
                  ↑ Выше
                </button>
                <button
                  onClick={() => moveItemWithinCategory(it.id, 1)}
                  disabled={!canMoveDown}
                  className="flex-1 px-3 py-2 rounded-md border disabled:opacity-40"
                  title="Опустить ниже"
                >
                  ↓ Ниже
                </button>
              </div>
              <div className="text-sm text-slate-500">Сменить категорию</div>
              <select
                className="rounded-md border border-gray-300 dark:border-dark px-2 py-2 w-full"
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
                className="w-full px-3 py-2 rounded-md bg-red text-white"
                title="Удалить блюдо">
                Удалить блюдо
              </button>
            </div>
          </div>
          )
        })}
      </div>
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] p-3 flex items-end md:items-center md:justify-center">
          <form
            className="w-full md:max-w-2xl rounded-2xl border border-slate-700 bg-[#0f1720] text-white p-4 space-y-4 shadow-2xl"
            onSubmit={onAddItemSubmit}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Новый товар</h3>
              <button
                type="button"
                onClick={closeAddDialog}
                className="rounded-md border border-slate-600 px-2 py-1 text-sm text-slate-200"
                disabled={addingItem}
              >
                Закрыть
              </button>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300">Категория</div>
              <select
                className="rounded-md border border-slate-600 px-3 py-2 w-full bg-[#1f2a37]"
                value={newItemDraft.categoryId}
                onChange={(e) => setNewItemDraft((prev) => ({ ...prev, categoryId: e.target.value }))}
                required
              >
                {cats.map((c) => (
                  <option key={`modal-new-item-${c.id}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300">Название</div>
              <input
                className="rounded-md border border-slate-600 px-3 py-2 w-full bg-[#1f2a37]"
                value={newItemDraft.title}
                onChange={(e) => setNewItemDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Введите название"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-300">Цена</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="rounded-md border border-slate-600 px-3 py-2 w-full bg-[#1f2a37]"
                  value={newItemDraft.price}
                  onChange={(e) => setNewItemDraft((prev) => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-300">Картинка</div>
                <button
                  type="button"
                  onClick={triggerPickAddItemImage}
                  className="rounded-md border border-slate-600 px-3 py-2 w-full bg-[#1f2a37] text-left"
                  disabled={addingItem}
                >
                  Выбрать с устройства
                </button>
                <div className="text-xs text-slate-400 truncate">
                  {newItemImageFile ? newItemImageFile.name : 'Файл не выбран'}
                </div>
                <input
                  ref={addDialogFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddItemImageChange}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300">Превью</div>
              <button
                type="button"
                className="relative group w-full max-w-xs aspect-square overflow-hidden rounded-xl border border-slate-600 bg-[#1f2a37]"
                onClick={triggerPickAddItemImage}
                disabled={addingItem}
              >
                {newItemImagePreviewUrl ? (
                  <img
                    src={newItemImagePreviewUrl}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-400 border-2 border-dashed border-slate-600 rounded-xl">
                    <HiOutlineCamera className="text-3xl" />
                    <span className="text-sm">Нажмите, чтобы выбрать фото</span>
                  </div>
                )}
              </button>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300">Описание (по строкам)</div>
              <textarea
                className="rounded-md border border-slate-600 px-3 py-2 w-full bg-[#1f2a37] h-24"
                value={newItemDraft.description}
                onChange={(e) => setNewItemDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeAddDialog}
                className="px-3 py-2 rounded-md border border-slate-600 text-slate-200"
                disabled={addingItem}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-mainBtn text-white disabled:opacity-50"
                disabled={addingItem}
              >
                {addingItem ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </form>
        </div>
      )}
      <MainButton
        text={saving ? 'Сохранение...' : 'Сохранить'}
        onClick={onSave}
        disabled={saving}
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
