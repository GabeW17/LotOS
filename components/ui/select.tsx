'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={className}
          style={{
            width: '100%',
            border: error ? '1px solid #dc3545' : '1px solid #e8ebe6',
            borderRadius: 7,
            backgroundColor: '#fff',
            padding: '8px 12px',
            fontSize: 14,
            color: '#1a1a1a',
            outline: 'none',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p style={{ marginTop: 4, fontSize: 13, color: '#dc3545' }}>{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
