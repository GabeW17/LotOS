'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { backgroundColor: '#2d7a4f', color: '#fff', border: 'none' },
  secondary: { backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #e8ebe6' },
  danger: { backgroundColor: '#dc3545', color: '#fff', border: 'none' },
  ghost: { backgroundColor: 'transparent', color: '#1a1a1a', border: 'none' },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 13 },
  md: { padding: '7px 16px', fontSize: 13 },
  lg: { padding: '10px 20px', fontSize: 14 },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', disabled, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={className}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 500,
          borderRadius: 7,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          lineHeight: '20px',
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
