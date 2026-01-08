"use client"

import { useState, useEffect } from "react"
import type { VendorItem } from "@/types/item"
import { getItems } from "@/utils/itemStorage"
import { ItemCard } from "./ItemCard"
import { PurchaseModal } from "./PurchaseModal"
import { ItemDetailsModal } from "./ItemDetailsModal"

export function ItemList() {
  const [items, setItems] = useState<VendorItem[]>([])
  const [selectedItem, setSelectedItem] = useState<VendorItem | null>(null)
  const [detailsItem, setDetailsItem] = useState<VendorItem | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  useEffect(() => {
    setItems(getItems())
  }, [])

  const handlePurchase = (item: VendorItem) => {
    setSelectedItem(item)
    setShowPurchaseModal(true)
  }

  const handleViewDetails = (item: VendorItem) => {
    setDetailsItem(item)
  }

  const handlePurchaseComplete = () => {
    // Don't close the modal automatically - let user close it manually
    // This allows them to see the transaction details and success message
    // The modal will close when user clicks the close button
  }

  const handleCloseDetails = () => {
    setDetailsItem(null)
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>No items for sale yet. Create your first item!</p>
      </div>
    )
  }

  return (
    <>
      <div className="item-list">
        <h2>Items for Sale</h2>
        <div className="items-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onPurchase={handlePurchase}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      </div>
      {detailsItem && (
        <ItemDetailsModal item={detailsItem} onClose={handleCloseDetails} />
      )}
      {selectedItem && showPurchaseModal && (
        <PurchaseModal
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null)
            setShowPurchaseModal(false)
          }}
          onComplete={handlePurchaseComplete}
        />
      )}
    </>
  )
}

