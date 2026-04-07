'use client'

import { useEffect, useState, useRef } from 'react'

interface Vehicle {
  id: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  price: number | null
  mileage: number | null
  color: string | null
  description: string | null
  photos: string[]
}

interface InventorySectionProps {
  apiUrl: string
  dealerId: string
}

export default function InventorySection({ apiUrl, dealerId }: InventorySectionProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${apiUrl}/api/inventory/public?dealer_id=${dealerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVehicles(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiUrl, dealerId])

  useEffect(() => {
    if (!selected) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selected])

  function formatPrice(price: number | null) {
    if (price == null) return 'Contact for price'
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  function formatMileage(mileage: number | null) {
    if (mileage == null) return ''
    return `${mileage.toLocaleString('en-US')} miles`
  }

  function title(v: Vehicle) {
    return [v.year, v.make, v.model].filter(Boolean).join(' ')
  }

  // Loading skeletons
  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                <div className="h-9 bg-gray-200 rounded animate-pulse w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Empty / error state
  if (vehicles.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">Check back soon — new inventory added weekly</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            {v.photos && v.photos.length > 0 ? (
              <img
                src={v.photos[0]}
                alt={title(v)}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 break-words">{title(v)}</h3>
              {v.trim && <p className="text-sm text-gray-500">{v.trim}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold text-gray-900">{formatPrice(v.price)}</span>
                {v.mileage != null && (
                  <span className="text-sm text-gray-500">{formatMileage(v.mileage)}</span>
                )}
              </div>
              <button
                onClick={() => setSelected(v)}
                className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          <div
            ref={modalRef}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-xl"
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Photos */}
            {selected.photos && selected.photos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-4">
                {selected.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`${title(selected)} photo ${i + 1}`}
                    className="h-48 sm:h-56 min-w-[16rem] sm:min-w-[20rem] rounded-lg object-cover flex-shrink-0"
                  />
                ))}
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{title(selected)}</h2>
            {selected.trim && <p className="text-gray-500 mt-1">{selected.trim}</p>}

            <div className="flex flex-wrap gap-4 mt-3">
              <span className="text-xl font-bold text-gray-900">{formatPrice(selected.price)}</span>
              {selected.mileage != null && (
                <span className="text-gray-500">{formatMileage(selected.mileage)}</span>
              )}
              {selected.color && (
                <span className="text-gray-500">{selected.color}</span>
              )}
            </div>

            {selected.description && (
              <p className="mt-4 text-gray-700 whitespace-pre-line">{selected.description}</p>
            )}

            <a
              href="tel:+15155522660"
              className="mt-6 block w-full rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Contact Austin
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
