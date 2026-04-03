interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-white ${className}`}
      style={{
        border: '1px solid #e8ebe6',
        borderRadius: 10,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
