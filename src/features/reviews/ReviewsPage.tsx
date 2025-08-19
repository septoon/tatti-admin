import React from 'react';
import { getReviews, appendToArrayFile, putFile } from '../../lib/api';
import Loader from '../../components/Loader/Loader';
import WebApp from '@twa-dev/sdk';

export default function ReviewsPage() {
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({ name: '', reviewText: '', rating: 5, image: '' });

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getReviews();
        setList(data);
      } catch (e: any) {
        setError(e?.message || 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    WebApp.HapticFeedback.impactOccurred('medium');
    const created = await appendToArrayFile('reviews.json', form);
    setList((prev) => [...prev, created]);
    setForm({ name: '', reviewText: '', rating: 5, image: '' });
  }

  async function onDelete(idx: number) {
    // optimistic update
    const prev = list;
    const next = prev.filter((_, i) => i !== idx);
    setList(next);
    WebApp.HapticFeedback.impactOccurred('heavy');
    try {
      await putFile('reviews.json', next);
    } catch (e: any) {
      // rollback on error
      setList(prev);
      alert('Не удалось удалить: ' + (e?.message || 'unknown'));
    }
  }

  const confirmDelete = (idx: number) => {
    const review = list[idx];
    const name = review?.name && review.name.trim() !== '' ? review.name : 'отзыв';
    WebApp.HapticFeedback.impactOccurred('heavy');
    WebApp.showConfirm(
      `Вы действительно хотите удалить ${name}? Это действие безвозвратно!`,
      (confirmed) => {
        if (confirmed) onDelete(idx);
      },
    );
  };

  if (loading) return <Loader />;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onAdd}
        className="flex flex-col gap-2 p-3 rounded-xl shadow-lg bg-white dark:bg-darkCard text-gray dark:text-ligth">
        <div className="font-semibold">Добавить отзыв</div>
        <input
          className="rounded-md border border-gray-300 dark:border-dark px-2 py-1"
          placeholder="Имя"
          value={form.name}
          onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
        />
        <textarea
          className="rounded-md border border-gray-300 dark:border-dark px-2 py-1 h-24"
          placeholder="Текст"
          value={form.reviewText}
          onChange={(e) => setForm((v) => ({ ...v, reviewText: e.target.value }))}
        />
        <input
          type="number"
          min={1}
          max={5}
          className="rounded-md border border-gray-300 dark:border-dark px-2 py-1"
          placeholder="Оценка 1-5"
          value={form.rating}
          onChange={(e) => setForm((v) => ({ ...v, rating: Number(e.target.value) }))}
        />
        <input
          className="rounded-md border border-gray-300 dark:border-dark px-2 py-1"
          placeholder="Ссылка на фото (опц.)"
          value={form.image}
          onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))}
        />
        <button className="self-start mt-2 px-3 py-1.5 w-full rounded-md bg-mainBtn text-white">
          Добавить
        </button>
      </form>

      <div className="grid gap-3">
        {list.map((r, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 shadow-lg bg-white dark:bg-darkCard text-gray dark:text-ligth dark:bg-darkCard">
            <div className="flex items-center gap-2">
              <div className="font-semibold">
                {r.name} <span className="text-xs text-slate-500">({r.rating})</span>
              </div>
              <button
                className="ml-auto bg-red text-white px-2 py-0.5 opacity-70 rounded-md"
                onClick={() => confirmDelete(idx)}
                title="Удалить отзыв">
                Удалить
              </button>
            </div>
            {r.image ? <img src={r.image} alt="" className="w-40 rounded mt-2" /> : null}
            <div className="mt-2 text-sm whitespace-pre-wrap">{r.reviewText}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
