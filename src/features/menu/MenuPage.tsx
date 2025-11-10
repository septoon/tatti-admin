import React from 'react';
import { getMenu, saveMenu } from '../../lib/api';
import type { NormalizedMenu, Item } from '../../lib/types';
import WebApp from '@twa-dev/sdk';
import Loader from '../../components/Loader/Loader';
import { MainButton } from '@twa-dev/sdk/react';
import { IoSearch } from 'react-icons/io5';
import axios from 'axios';
import { HiOutlineCamera } from 'react-icons/hi';

export default function MenuPage() {
  const [data, setData] = React.useState<NormalizedMenu | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('all');
  const [query, setQuery] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);

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

  function triggerPickImage(id: string) {
    setUploadingId(id)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadingId) return
    try {
      // визуально покажем загрузку на выбранной карточке, переиспользуем saving
      setSaving(true)
      const formData = new FormData()
      formData.append('image', file)
      const apiKey = process.env.REACT_APP_IMGBB_KEY
      if (!apiKey) throw new Error('Не задан REACT_APP_IMGBB_KEY')
      const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`
      const resp = await axios.post(imgbbUrl, formData)
      const url: string | undefined = resp?.data?.data?.url
      if (!url) throw new Error('ImgBB вернул пустой URL')
      updateItem(uploadingId, { images: [{ id: 'img-1', url }] })
    } catch (err: any) {
      console.error(err)
      alert('Ошибка загрузки изображения')
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

  const cats = data.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  const q = query.trim().toLowerCase();
  const items = data.items
    .filter((it) => (filter === 'all' ? true : it.categoryId === filter))
    .filter((it) => (q === '' ? true : it.title?.toLowerCase().includes(q)))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  function getCatName(id: string) {
    const f = cats.find((c) => c.id === id);
    return f ? f.name : '';
  }

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
              <th className="text-left p-2 w-32">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
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
                      value={it.images?.[0]?.url ?? ''}
                      onChange={(e) =>
                        updateItem(it.id, { images: [{ id: 'img-1', url: e.target.value }] })
                      }
                    />
                    <div className="relative inline-block group">
                      <img
                        src={it.images?.[0]?.url ?? ''}
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
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => confirm(it.id)}
                    className="px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                    title="Удалить блюдо">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {items.map((it) => (
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
                  value={it.images?.[0]?.url ?? ''}
                  onChange={(e) =>
                    updateItem(it.id, { images: [{ id: 'img-1', url: e.target.value }] })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка (нажмите, чтобы загрузить)</div>
              <div className="relative group">
                <img
                  src={it.images?.[0]?.url ?? ''}
                  alt={it.title}
                  className='max-h-28 w-full object-cover rounded-xl cursor-pointer'
                  onClick={() => triggerPickImage(it.id)}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => triggerPickImage(it.id)}
                >
                  <HiOutlineCamera className="text-white text-2xl" />
                </div>
              </div>
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
            <div className="pt-1">
              <button
                onClick={() => confirm(it.id)}
                className="w-full px-3 py-2 rounded-md bg-red text-white"
                title="Удалить блюдо">
                Удалить блюдо
              </button>
            </div>
          </div>
        ))}
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
