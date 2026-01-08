import type { VendorItem } from "@/types/item"

const STORAGE_KEY = "x402-vendor-items"

export function saveItem(item: VendorItem): void {
  const items = getItems()
  items.push(item)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getItems(): VendorItem[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as VendorItem[]
  } catch {
    return []
  }
}

export function getItem(id: string): VendorItem | undefined {
  return getItems().find((item) => item.id === id)
}

export function deleteItem(id: string): void {
  const items = getItems().filter((item) => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

