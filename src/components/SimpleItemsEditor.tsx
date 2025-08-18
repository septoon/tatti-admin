import React from 'react'

export type Item = {
  name: string
  price?: number
  image?: string | string[]
  description?: string[]
}

type Props = {
  rows: Item[]
  setRows: React.Dispatch<React.SetStateAction<Item[]>>
  onDeleteRow?: (idx: number) => void
  showName?: boolean
  showPrice?: boolean
  showImage?: boolean
  showDescription?: boolean
  enableImageUpload?: boolean // кнопка заглушена
}

export default function SimpleItemsEditor({
  rows,
  setRows,
  onDeleteRow,
  showName = true,
  showPrice = true,
  showImage = true,
  showDescription = true,
  enableImageUpload = false,
}: Props) {
  const update = (i: number, patch: Partial<Item>) => {
    setRows(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      next[i] = { ...(next[i] || { name: '', price: 0, image: '', description: [] }), ...patch }
      return next
    })
  }

  const renderImageInputs = (row: Item, i: number) => {
    const makeButton = (key?: React.Key) => (
      enableImageUpload ? (
        <button
          key={`btn-${String(key ?? i)}`}
          type="button"
          className="px-2 py-1 border rounded opacity-50 cursor-not-allowed"
          title="Загрузка отключена"
          disabled
        >
          📷
        </button>
      ) : null
    )

    // Массив ссылок
    if (Array.isArray(row.image)) {
      return (
        <>
          {row.image.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2 mt-1 first:mt-0">
              <input
                className="border rounded px-2 py-1 w-full"
                value={val}
                onChange={e => {
                  const arr = Array.isArray(row.image) ? [...row.image] : []
                  arr[idx] = e.target.value
                  update(i, { image: arr })
                }}
              />
              {makeButton(idx)}
            </div>
          ))}
        </>
      )
    }

    // Одна ссылка (строка)
    return (
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-2 py-1 w-full"
          value={typeof row.image === 'string' ? row.image : ''}
          onChange={e => update(i, { image: e.target.value })}
        />
        {makeButton()}
      </div>
    )
  }

  // ---------- Desktop table ----------
  const Table = (
    <div className="hidden md:block overflow-auto border rounded">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {showName && <th className="text-left p-2 w-64">Название</th>}
            {showPrice && <th className="text-left p-2 w-28">Цена</th>}
            {showImage && <th className="text-left p-2 w-72">Картинка (URL)</th>}
            {showDescription && <th className="text-left p-2">Описание (по строкам)</th>}
            <th className="w-28 p-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t align-top">
              {showName && (
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={row.name ?? ''}
                    onChange={e => update(i, { name: e.target.value })}
                  />
                </td>
              )}
              {showPrice && (
                <td className="p-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-28"
                    value={Number(row.price ?? 0)}
                    onChange={e => update(i, { price: Number(e.target.value) })}
                  />
                </td>
              )}
              {showImage && (
                <td className="p-2">
                  {renderImageInputs(row, i)}
                </td>
              )}
              {showDescription && (
                <td className="p-2">
                  <textarea
                    className="border rounded px-2 py-1 w-full h-28"
                    value={(row.description ?? []).join('\n')}
                    onChange={e => update(i, { description: e.target.value.split('\n').filter(Boolean) })}
                  />
                </td>
              )}
              <td className="p-2 text-right">
                <button
                  onClick={() => onDeleteRow?.(i)}
                  className="text-red-600 border border-red-600 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white transition"
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ---------- Mobile cards ----------
  const Cards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((row, i) => (
        <div key={i} className="border rounded p-3 space-y-2">
          {showName && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Название</div>
              <input className="border rounded px-2 py-1 w-full" value={row.name ?? ''} onChange={e => update(i, { name: e.target.value })} />
            </div>
          )}
          {showPrice && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Цена</div>
              <input type="number" className="border rounded px-2 py-1 w-full" value={Number(row.price ?? 0)} onChange={e => update(i, { price: Number(e.target.value) })} />
            </div>
          )}
          {showImage && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Картинка (URL)</div>
              {renderImageInputs(row, i)}
            </div>
          )}
          {showDescription && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Описание (по строкам)</div>
              <textarea className="border rounded px-2 py-1 w-full h-28" value={(row.description ?? []).join('\n')} onChange={e => update(i, { description: e.target.value.split('\n').filter(Boolean) })} />
            </div>
          )}
          <div className="pt-2 text-right">
            <button onClick={() => onDeleteRow?.(i)} className="text-red-600 border border-red-600 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white transition">Удалить</button>
          </div>
        </div>
      ))}
    </div>
  )

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <>
        <div className="text-sm text-slate-500">Нет данных для отображения</div>
        {Table}
        {Cards}
      </>
    )
  }

  return (
    <>
      {Table}
      {Cards}
    </>
  )
}
