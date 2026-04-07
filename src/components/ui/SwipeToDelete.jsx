import { useRef, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

const SNAP_THRESHOLD = 40   // px to pass before snapping open
const SNAP_WIDTH = 72       // px width of delete zone

export default function SwipeToDelete({ onDelete, children, disabled = false, silent = false }) {
  const [offset, setOffset] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const startX = useRef(null)
  const startY = useRef(null)
  const isHorizontal = useRef(false)

  const handleTouchStart = useCallback((e) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = false
  }, [disabled])

  const handleTouchMove = useCallback((e) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Decide gesture direction on first significant move
    if (!isHorizontal.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!isHorizontal.current) return

    // Swipe left to open, swipe right to close
    if (isOpen) {
      const raw = -SNAP_WIDTH + dx
      setOffset(Math.min(0, Math.max(-SNAP_WIDTH, raw)))
    } else {
      if (dx < 0) {
        setOffset(Math.max(-SNAP_WIDTH, dx))
      }
    }
  }, [isOpen])

  const handleTouchEnd = useCallback(() => {
    if (!isHorizontal.current) { startX.current = null; return }
    startX.current = null

    if (silent) {
      if (offset < -SNAP_THRESHOLD) {
        setOffset(0)
        handleDelete()
      } else {
        setOffset(0)
      }
      return
    }

    if (isOpen) {
      if (offset > -SNAP_WIDTH + SNAP_THRESHOLD) {
        setOffset(0); setIsOpen(false)
      } else {
        setOffset(-SNAP_WIDTH)
      }
    } else {
      if (offset < -SNAP_THRESHOLD) {
        setOffset(-SNAP_WIDTH); setIsOpen(true)
      } else {
        setOffset(0)
      }
    }
  }, [isOpen, offset, silent])

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete() }
    finally { setDeleting(false); setOffset(0); setIsOpen(false) }
  }

  // Close if tapping outside the row
  function handleContentTap() {
    if (isOpen) { setOffset(0); setIsOpen(false) }
  }

  return (
    <div className="relative overflow-hidden rounded-lg select-none">
      {/* Delete zone behind */}
      {silent ? (
        <div className="absolute inset-y-0 right-0" style={{ width: SNAP_WIDTH }} onClick={handleDelete} />
      ) : (
        <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-lg"
          style={{ width: SNAP_WIDTH }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full h-full flex items-center justify-center active:bg-red-600 transition-colors"
          >
            <Trash2 size={16} className="text-white" />
          </button>
        </div>
      )}

      {/* Swipeable content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: startX.current !== null ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentTap}
      >
        {children}
      </div>
    </div>
  )
}
