export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-slate-200 border-t-vesta-red ${className}`} />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
