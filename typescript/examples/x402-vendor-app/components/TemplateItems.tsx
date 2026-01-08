"use client"

import { useAccount } from "wagmi"
import { templateItems, createItemFromTemplate } from "@/utils/templateItems"
import { saveItem } from "@/utils/itemStorage"
import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"

interface TemplateItemsProps {
  onItemAdded: (item: VendorItem) => void
  defaultPayToAddress?: string
}

export function TemplateItems({ onItemAdded, defaultPayToAddress }: TemplateItemsProps) {
  const { address } = useAccount()

  const handleAddTemplate = (template: Omit<VendorItem, "id" | "createdAt">) => {
    if (!address) {
      alert("Please connect your wallet first to add items")
      return
    }

    // Use defaultPayToAddress from env if available, otherwise use connected wallet address
    const payTo = defaultPayToAddress || address
    const item = createItemFromTemplate(template, payTo)
    saveItem(item)
    onItemAdded(item)
  }

  return (
    <div className="template-items">
      <h3>Quick Add Templates</h3>
      <p className="template-description">
        Click any template below to instantly add it to your store:
      </p>
      <div className="template-grid">
        {templateItems.map((template, index) => (
          <div key={index} className="template-card">
            {template.imageUrl && (
              <div className="template-image">
                <img src={template.imageUrl} alt={template.name} />
              </div>
            )}
            <div className="template-content">
              <h4>{template.name}</h4>
              <p className="template-price">
                {formatPrice(template.price, template.paymentRequirements)}
              </p>
              <p className="template-desc">{template.description}</p>
              <button
                className="template-add-button"
                onClick={() => handleAddTemplate(template)}
                disabled={!address}
              >
                {address ? "Add to Store" : "Connect Wallet"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

