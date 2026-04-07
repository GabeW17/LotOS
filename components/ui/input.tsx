'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%',
            border: error ? '1px solid #dc3545' : '1px solid #e8ebe6',
            borderRadius: 7,
            backgroundColor: '#fff',
            padding: '10px 12px',
            fontSize: 16,
            color: '#1a1a1a',
            outline: 'none',
          }}
          {...props}
        />
        {error && <p style={{ marginTop: 4, fontSize: 13, color: '#dc3545' }}>{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
