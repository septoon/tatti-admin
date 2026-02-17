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

  const usedLocalIds = new Set<string>()
  const items: Item[] = categoryNames.flatMap((catName) => {
    const catId = slugifyRu(catName)
    const arr: any[] = Array.isArray(raw[catName]) ? raw[catName] : []
    return arr.map((it: any, idx: number) => {
      const externalIdRaw = Number(it?.id)
      const externalId = Number.isFinite(externalIdRaw) ? externalIdRaw : undefined
      const baseId = `${catId}-${externalId ?? idx}`
      let localId = baseId
      let suffix = 1
      while (usedLocalIds.has(localId)) {
        localId = `${baseId}-${suffix}`
        suffix += 1
      }
      usedLocalIds.add(localId)

      const sortOrderRaw = Number(it?.sortOrder)
      const sortOrder = Number.isFinite(sortOrderRaw)
        ? sortOrderRaw
        : Number.isFinite(Number(it?.id))
          ? Number(it.id)
          : idx + 1

      return {
        id: localId,
        externalId,
        title: String(it.name ?? ''),
        description: Array.isArray(it.description) ? it.description : [],
        categoryId: catId,
        price: Number(it.price ?? 0),
        images: it.image
          ? [{ id: `img-${localId}`, url: String(it.image), alt: String(it.name ?? '') }]
          : [],
        available: true,
        featured: false,
        sortOrder,
        status: 'published',
      }
    })
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
  const sortedCategories = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const catsById = new Map(sortedCategories.map(c => [c.id, c.name]))

  const existingNumericIds = data.items
    .map((item) => Number(item.externalId))
    .filter((value) => Number.isFinite(value))
  let nextGeneratedId = existingNumericIds.length > 0 ? Math.max(...existingNumericIds) : 0
  const getNextGeneratedId = () => {
    nextGeneratedId += 1
    return nextGeneratedId
  }

  const compareItems = (a: Item, b: Item) => {
    const sa = Number(a.sortOrder ?? 0)
    const sb = Number(b.sortOrder ?? 0)
    if (sa !== sb) return sa - sb
    return a.id.localeCompare(b.id)
  }

  const categoryIds = [
    ...sortedCategories.map((c) => c.id),
    ...Array.from(
      new Set(
        data.items
          .map((item) => item.categoryId)
          .filter((categoryId) => !sortedCategories.some((category) => category.id === categoryId)),
      ),
    ),
  ]

  for (const categoryId of categoryIds) {
    const catName = catsById.get(categoryId) || categoryId
    const catItems = data.items
      .filter((item) => item.categoryId === categoryId)
      .sort(compareItems)

    const usedIdsInCategory = new Set<number>()
    out[catName] = catItems.map((item) => {
      const currentExternalId = Number(item.externalId)
      let legacyId = Number.isFinite(currentExternalId) ? currentExternalId : getNextGeneratedId()
      if (usedIdsInCategory.has(legacyId)) {
        legacyId = getNextGeneratedId()
      }
      usedIdsInCategory.add(legacyId)

      return {
        id: legacyId,
        name: item.title,
        price: item.price,
        description: item.description,
        image: item.images?.[0]?.url ?? ''
      }
    })
  }

  return out
}
