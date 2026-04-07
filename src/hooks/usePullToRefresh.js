import { useRef, useState, useCallback } from 'react'

const THRESHOLD = 64   // px of pull needed to trigger refresh
const MAX_PULL = 80    // px cap on visual stretch

export function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pulling = useRef(false)

  const onTouchStart = useCallback((e) => {
    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = false
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) {
      pulling.current = true
      // Rubber-band feel: resistance increases as you pull further
      const distance = Math.min(dy * 0.45, MAX_PULL)
      setPullDistance(distance)
    } else {
      setPullDistance(0)
    }
  }, [refreshing])

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current || startY.current === null) {
      startY.current = null
      return
    }
    startY.current = null
    pulling.current = false

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.6)  // hold indicator while loading
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, onRefresh])

  return {
    pullDistance,
    refreshing,
    isTriggered: pullDistance >= THRESHOLD,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
