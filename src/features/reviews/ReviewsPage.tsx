import React from 'react';
import { getReviews, appendToArrayFile, putFile } from '../../lib/api';
import Loader from '../../components/Loader/Loader';
import WebApp from '@twa-dev/sdk';
import { iosUi } from '../../styles/ios';

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
      `Вы действительно хотите удалить отзыв ${name}? Это действие безвозвратно!`,
      (confirmed) => {
        if (confirmed) onDelete(idx);
      },
    );
  };

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    )
  }

  const iosFontFamily = iosUi.fontFamily
  const iosPanel = iosUi.panel
  const iosInput = iosUi.input
  const iosLabel = iosUi.label
  const iosPrimaryButton = iosUi.primaryButton
  const iosDangerButton = iosUi.dangerButton

  return (
    <div className="space-y-6" style={{ fontFamily: iosFontFamily }}>
      <form
        onSubmit={onAdd}
        className={`flex flex-col gap-3 p-4 ${iosPanel}`}>
        <div className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#f2f2f7]">
          Добавить отзыв
        </div>
        <div className={iosLabel}>Имя</div>
        <input
          className={iosInput}
          placeholder="Имя"
          value={form.name}
          onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
        />
        <div className={iosLabel}>Текст</div>
        <textarea
          className={`${iosInput} h-24 resize-y`}
          placeholder="Текст"
          value={form.reviewText}
          onChange={(e) => setForm((v) => ({ ...v, reviewText: e.target.value }))}
        />
        <div className={iosLabel}>Оценка</div>
        <input
          type="number"
          min={1}
          max={5}
          className={iosInput}
          placeholder="Оценка 1-5"
          value={form.rating}
          onChange={(e) => setForm((v) => ({ ...v, rating: Number(e.target.value) }))}
        />
        <div className={iosLabel}>Фото (опционально)</div>
        <input
          className={iosInput}
          placeholder="Ссылка на фото (опц.)"
          value={form.image}
          onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))}
        />
        <button className={`${iosPrimaryButton} mt-1 w-full`}>
          Добавить
        </button>
      </form>

      <div className="grid gap-3">
        {list.map((r, idx) => (
          <div
            key={idx}
            className={`${iosPanel} p-4 text-[#111827] dark:text-[#f2f2f7]`}>
            <div className="flex items-center gap-2">
              <div className="text-[18px] leading-6 font-semibold tracking-[-0.01em]">
                {r.name}{' '}
                <span className="text-xs text-[#6b7280] dark:text-[#8e8e93] font-medium">({r.rating})</span>
              </div>
            </div>
            {r.image ? (
              <img
                src={r.image}
                alt=""
                className="w-44 rounded-2xl border border-black/10 dark:border-white/10 mt-3"
              />
            ) : null}
            <div className="my-3 text-[15px] leading-6 whitespace-pre-wrap text-[#374151] dark:text-[#e5e7eb]">
              {r.reviewText}
            </div>
              <button
                className={`${iosDangerButton} w-full`}
                onClick={() => confirmDelete(idx)}
                title="Удалить отзыв">
                Удалить
              </button>
          </div>
        ))}
      </div>
    </div>
  );
}
