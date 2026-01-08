"use client"

import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"

interface ItemDetailsModalProps {
  item: VendorItem
  onClose: () => void
}

export function ItemDetailsModal({ item, onClose }: ItemDetailsModalProps) {
  const requirements = item.paymentRequirements

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content item-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item.name}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {item.imageUrl && (
            <div className="item-detail-image">
              <img src={item.imageUrl} alt={item.name} />
            </div>
          )}
          
          <div className="item-detail-section">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          <div className="item-detail-section">
            <h3>Pricing</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Price:</span>
                <span className="detail-value">{formatPrice(item.price, requirements)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Amount (smallest unit):</span>
                <span className="detail-value">{item.price}</span>
              </div>
            </div>
          </div>

          <div className="item-detail-section">
            <h3>Payment Configuration</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Network:</span>
                <span className="detail-value">{requirements.network}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Payment Scheme:</span>
                <span className="detail-value">{requirements.scheme}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Asset Address:</span>
                <span className="detail-value code">{requirements.asset}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Asset Name:</span>
                <span className="detail-value">
                  {(requirements.extra as { name?: string })?.name || "N/A"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Pay To Address:</span>
                <span className="detail-value code">{requirements.payTo}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Max Timeout:</span>
                <span className="detail-value">{requirements.maxTimeoutSeconds} seconds</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">MIME Type:</span>
                <span className="detail-value">{requirements.mimeType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Resource URL:</span>
                <span className="detail-value code small">{requirements.resource}</span>
              </div>
            </div>
          </div>

          <div className="item-detail-section">
            <h3>Metadata</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Item ID:</span>
                <span className="detail-value code small">{item.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {requirements.extra && Object.keys(requirements.extra).length > 0 && (
            <div className="item-detail-section">
              <h3>Extra Details</h3>
              <pre className="extra-details">
                {JSON.stringify(requirements.extra, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="close-button-footer">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

