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

export default function MenuPage() {
  const [data, setData] = React.useState<NormalizedMenu | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('all');
  const [query, setQuery] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = React.useState<string>('');

  const fileInputRef = React.useRef<HTMLInputElement>(null)
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

  function addItemToCategory(categoryId: string) {
    if (!data || !categoryId) return
    const externalId = getNextExternalId(data.items)
    const sortOrder = getNextSortOrder(data.items, categoryId)
    const newItem: Item = {
      id: `${categoryId}-${externalId}-${Date.now()}`,
      externalId,
      title: '',
      description: [],
      categoryId,
      price: 0,
      images: [],
      available: true,
      featured: false,
      sortOrder,
      status: 'published',
    }
    setData({
      ...data,
      items: [...data.items, newItem],
    })
    setFilter(categoryId)
    setQuery('')
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

  function getCategoryHintUrl(item: Item): string | undefined {
    if (!data) return undefined
    const sameCategory = data.items.find(
      (entry) =>
        entry.id !== item.id &&
        entry.categoryId === item.categoryId &&
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
        categoryHintUrl: getCategoryHintUrl(item),
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
      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-gray-300 dark:border-dark px-2 py-2 w-full"
          value={newItemCategoryId}
          onChange={(e) => setNewItemCategoryId(e.target.value)}
        >
          {cats.map((c) => (
            <option key={`new-item-${c.id}`} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-2 rounded-md bg-mainBtn text-white whitespace-nowrap"
          onClick={() => addItemToCategory(newItemCategoryId)}
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
              <div className="text-xs text-slate-500">Перемещение</div>
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
