export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">LotOS</h1>
          <p className="text-muted mt-1">Dealership Operating System</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
