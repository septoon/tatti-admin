
import { Category, Item, NormalizedMenu } from './types'

export function slugifyRu(input: string) {
  const map: Record<string, string> = {
    'ё':'yo','й':'y','ц':'ts','у':'u','к':'k','е':'e','н':'n','г':'g','ш':'sh','щ':'sch','з':'z','х':'h','ъ':'',
    'ф':'f','ы':'y','в':'v','а':'a','п':'p','р':'r','о':'o','л':'l','д':'d','ж':'zh','э':'e','я':'ya','ч':'ch',
    'с':'s','м':'m','и':'i','т':'t','ь':'','б':'b','ю':'yu'
  }
  return input.toLowerCase().replace(/[а-яё]/g, ch => map[ch] ?? ch).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function normalizeMenuLegacy(raw: any): NormalizedMenu {
  if (!raw || typeof raw !== 'object') throw new Error('Unexpected legacy format')

  const categoryNames = Object.keys(raw)
  const categories: Category[] = categoryNames.map((name, idx) => ({
    id: slugifyRu(name),
    name,
    sortOrder: idx + 1,
    isHidden: false,
  }))

  const items: Item[] = categoryNames.flatMap((catName) => {
    const catId = slugifyRu(catName)
    const arr: any[] = Array.isArray(raw[catName]) ? raw[catName] : []
    return arr.map((it: any, idx: number) => ({
      id: `${catId}-${it.id ?? idx}`,
      externalId: typeof it.id === 'number' ? it.id : undefined,
      title: String(it.name ?? ''),
      description: Array.isArray(it.description) ? it.description : [],
      categoryId: catId,
      price: Number(it.price ?? 0),
      images: it.image ? [{ id: `img-${catId}-${it.id ?? idx}`, url: String(it.image), alt: String(it.name ?? '') }] : [],
      available: true,
      featured: false,
      sortOrder: Number(it.id ?? idx),
      status: 'published',
    }))
  })

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    currency: 'RUB',
    categories,
    items,
  }
}

export function denormalizeToLegacy(data: NormalizedMenu): any {
  const out: Record<string, any[]> = {}
  const catsById = new Map(data.categories.map(c => [c.id, c.name]))
  for (const item of data.items) {
    const catName = catsById.get(item.categoryId) || item.categoryId
    if (!out[catName]) out[catName] = []
    out[catName].push({
      id: item.externalId ?? Number(item.sortOrder ?? 0),
      name: item.title,
      price: item.price,
      description: item.description,
      image: item.images?.[0]?.url ?? ''
    })
  }
  return out
}
