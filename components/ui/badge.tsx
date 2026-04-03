type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    default: { backgroundColor: '#f3f3f3', color: '#666', border: '1px solid #e0e0e0' },
    success: { backgroundColor: '#e8f5ee', color: '#2d7a4f', border: '1px solid #c8e8d4' },
    warning: { backgroundColor: '#fef3e2', color: '#b45309', border: '1px solid #fde4b8' },
    danger: { backgroundColor: '#fde8e8', color: '#dc3545', border: '1px solid #f5c6c6' },
    info: { backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #ddd' },
  }

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{
        ...styles[variant],
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 5,
        lineHeight: '18px',
      }}
    >
      {children}
    </span>
  )
}
