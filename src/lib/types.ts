
export interface Category {
  id: string
  name: string
  sortOrder: number
  isHidden?: boolean
}
export interface ImageObj { id: string; url: string; alt?: string }
export interface Item {
  id: string
  externalId?: number
  title: string
  description: string[]
  categoryId: string
  price: number
  images: ImageObj[]
  available?: boolean
  featured?: boolean
  sortOrder?: number
  status?: 'draft' | 'published' | 'archived'
}
export interface NormalizedMenu {
  version: number
  lastUpdated: string
  currency: 'RUB'
  categories: Category[]
  items: Item[]
}
