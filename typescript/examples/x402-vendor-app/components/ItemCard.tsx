"use client"

import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"

interface ItemCardProps {
  item: VendorItem
  onPurchase?: (item: VendorItem) => void
  onViewDetails?: (item: VendorItem) => void
}

export function ItemCard({ item, onPurchase, onViewDetails }: ItemCardProps) {
  return (
    <div className="item-card">
      {item.imageUrl && (
        <div className="item-image" onClick={() => onViewDetails?.(item)}>
          <img src={item.imageUrl} alt={item.name} />
        </div>
      )}
      <div className="item-content">
        <h3 onClick={() => onViewDetails?.(item)} style={{ cursor: "pointer" }}>
          {item.name}
        </h3>
        <p className="item-description">{item.description}</p>
        <div className="item-details">
          <div className="item-price">
            <strong>{formatPrice(item.price, item.paymentRequirements)}</strong>
          </div>
          <div className="item-meta">
            <span>Network: {item.paymentRequirements.network}</span>
            <span>Asset: {item.paymentRequirements.asset.slice(0, 10)}...</span>
          </div>
        </div>
        <div className="item-actions">
          {onViewDetails && (
            <button
              className="details-button"
              onClick={() => onViewDetails(item)}
            >
              View Details
            </button>
          )}
          {onPurchase && (
            <button
              className="purchase-button"
              onClick={() => onPurchase(item)}
            >
              Purchase
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

