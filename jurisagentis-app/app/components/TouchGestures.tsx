'use client'

import { useState, useRef, useCallback } from 'react'

// Touch gesture types and interfaces
interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right'
  distance: number
  velocity: number
  duration: number
}

interface PinchGesture {
  scale: number
  center: TouchPoint
  velocity: number
}

interface LongPressGesture {
  point: TouchPoint
  duration: number
}

interface TouchGestureOptions {
  onSwipe?: (gesture: SwipeGesture) => void
  onPinch?: (gesture: PinchGesture) => void
  onLongPress?: (gesture: LongPressGesture) => void
  onDoubleTap?: (point: TouchPoint) => void
  swipeThreshold?: number
  pinchThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
}

// Hook for touch gesture recognition
export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onSwipe,
    onPinch,
    onLongPress,
    onDoubleTap,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    longPressDelay = 500,
    doubleTapDelay = 300
  } = options

  const touchStartRef = useRef<TouchPoint[]>([])
  const lastTapRef = useRef<TouchPoint | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialDistanceRef = useRef<number>(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }))
    
    touchStartRef.current = touches

    // Handle long press
    if (touches.length === 1 && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (onLongPress) {
          onLongPress({
            point: touches[0],
            duration: longPressDelay
          })
          
          // Haptic feedback for long press
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50])
          }
        }
      }, longPressDelay)
    }

    // Handle pinch start
    if (touches.length === 2) {
      const distance = Math.sqrt(
        Math.pow(touches[1].x - touches[0].x, 2) + 
        Math.pow(touches[1].y - touches[0].y, 2)
      )
      initialDistanceRef.current = distance
    }

    // Prevent default to handle gestures
    if (touches.length > 1) {
      e.preventDefault()
    }
  }, [onLongPress, longPressDelay])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinch && initialDistanceRef.current > 0) {
      const touches = Array.from(e.touches)
      const currentDistance = Math.sqrt(
        Math.pow(touches[1].clientX - touches[0].clientX, 2) + 
        Math.pow(touches[1].clientY - touches[0].clientY, 2)
      )
      
      const scale = currentDistance / initialDistanceRef.current
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch({
          scale,
          center: {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
            timestamp: Date.now()
          },
          velocity: 0 // Could calculate this based on previous frames
        })
      }
    }

    // Prevent default scrolling during multi-touch
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, [onPinch, pinchThreshold])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      timestamp: Date.now()
    }

    const touchStart = touchStartRef.current[0]
    if (!touchStart) return

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = touchEnd.timestamp - touchStart.timestamp

    // Handle swipe gesture
    if (distance > swipeThreshold && onSwipe) {
      const velocity = distance / duration
      let direction: SwipeGesture['direction']

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      onSwipe({
        direction,
        distance,
        velocity,
        duration
      })

      // Haptic feedback for swipe
      if ('vibrate' in navigator) {
        navigator.vibrate(30)
      }
    }

    // Handle double tap
    else if (distance < 20 && duration < 300 && onDoubleTap) {
      const now = Date.now()
      
      if (lastTapRef.current && 
          now - lastTapRef.current.timestamp < doubleTapDelay &&
          Math.abs(touchEnd.x - lastTapRef.current.x) < 50 &&
          Math.abs(touchEnd.y - lastTapRef.current.y) < 50) {
        
        onDoubleTap(touchEnd)
        lastTapRef.current = null
        
        // Haptic feedback for double tap
        if ('vibrate' in navigator) {
          navigator.vibrate([25, 25, 25])
        }
      } else {
        lastTapRef.current = touchEnd
      }
    }

    // Reset refs
    touchStartRef.current = []
    initialDistanceRef.current = 0
  }, [onSwipe, onDoubleTap, swipeThreshold, doubleTapDelay])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}

// Component for swipeable cards/items
interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: {
    icon: React.ComponentType<{ className?: string }>
    color: string
    label: string
  }
  rightAction?: {
    icon: React.ComponentType<{ className?: string }>
    color: string
    label: string
  }
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ''
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const gestures = useTouchGestures({
    onSwipe: (gesture) => {
      if (gesture.direction === 'left' && onSwipeLeft) {
        onSwipeLeft()
      } else if (gesture.direction === 'right' && onSwipeRight) {
        onSwipeRight()
      }
    }
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    gestures.onTouchStart(e.nativeEvent)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return

    const deltaX = touch.clientX - rect.left - rect.width / 2
    const maxTranslate = rect.width * 0.3

    setTranslateX(Math.max(-maxTranslate, Math.min(maxTranslate, deltaX)))
    gestures.onTouchMove(e.nativeEvent)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false)
    
    // Snap back to center
    setTimeout(() => setTranslateX(0), 100)
    
    gestures.onTouchEnd(e.nativeEvent)
  }

  const showLeftAction = translateX > 50 && leftAction
  const showRightAction = translateX < -50 && rightAction

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left Action */}
      {leftAction && (
        <div 
          className={`absolute left-0 top-0 bottom-0 flex items-center justify-center transition-all duration-200 ${
            showLeftAction ? 'w-20 opacity-100' : 'w-0 opacity-0'
          } ${leftAction.color}`}
        >
          <leftAction.icon className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Right Action */}
      {rightAction && (
        <div 
          className={`absolute right-0 top-0 bottom-0 flex items-center justify-center transition-all duration-200 ${
            showRightAction ? 'w-20 opacity-100' : 'w-0 opacity-0'
          } ${rightAction.color}`}
        >
          <rightAction.icon className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Main Card */}
      <div
        ref={cardRef}
        className="relative z-10 transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 100 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canPull, setCanPull] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const gestures = useTouchGestures({
    onSwipe: async (gesture) => {
      if (gesture.direction === 'down' && 
          gesture.distance > threshold && 
          canPull && 
          !isRefreshing) {
        
        setIsRefreshing(true)
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
        
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      }
    }
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop || 0
    setCanPull(scrollTop === 0)
    gestures.onTouchStart(e.nativeEvent)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (canPull && !isRefreshing) {
      const touch = e.touches[0]
      const startY = 0 // Would need to track this from touch start
      const currentY = touch.clientY
      const distance = Math.max(0, Math.min(threshold * 1.5, currentY - startY))
      setPullDistance(distance)
    }
    gestures.onTouchMove(e.nativeEvent)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isRefreshing) {
      setPullDistance(0)
    }
    gestures.onTouchEnd(e.nativeEvent)
  }

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
        style={{ 
          height: pullDistance,
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        <div className={`rounded-full p-2 ${
          pullDistance > threshold ? 'bg-green-500' : 'bg-gray-400'
        }`}>
          <div className={`w-6 h-6 border-2 border-white rounded-full ${
            isRefreshing ? 'animate-spin border-t-transparent' : ''
          }`} />
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Touch-optimized button component
interface TouchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const baseClasses = 'relative overflow-hidden font-medium transition-all duration-150 active:scale-95'
  
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg min-h-[44px]',
    md: 'px-4 py-3 text-base rounded-lg min-h-[48px]',
    lg: 'px-6 py-4 text-lg rounded-lg min-h-[52px]'
  }

  const disabledClasses = 'opacity-50 cursor-not-allowed'

  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true)
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
    if (!disabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? disabledClasses : ''}
        ${isPressed ? 'scale-95' : ''}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      disabled={disabled}
    >
      {/* Ripple effect */}
      <span 
        className={`absolute inset-0 bg-white/20 rounded-lg transition-opacity duration-150 ${
          isPressed ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      <span className="relative z-10">
        {children}
      </span>
    </button>
  )
}

// Global CSS for touch optimizations
export const TouchOptimizedStyles = () => (
  <style jsx global>{`
    /* Touch-friendly scrolling */
    * {
      -webkit-overflow-scrolling: touch;
    }

    /* Prevent text selection on touch elements */
    .no-select {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    /* Touch feedback for interactive elements */
    .touch-feedback {
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      transition: background-color 0.15s ease;
    }

    .touch-feedback:active {
      background-color: rgba(0, 0, 0, 0.05);
    }

    /* Smooth scrolling */
    .smooth-scroll {
      scroll-behavior: smooth;
    }

    /* Hide scrollbars on mobile while keeping functionality */
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }

    /* Touch-friendly form elements */
    input, textarea, select {
      font-size: 16px; /* Prevents zoom on iOS */
      min-height: 44px; /* Apple's minimum touch target */
    }

    /* Improved focus states for accessibility */
    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    /* Disable zoom on double-tap */
    * {
      touch-action: manipulation;
    }

    /* Allow pinch-zoom only on specific elements */
    .pinch-zoom {
      touch-action: pinch-zoom;
    }
  `}
</style>
)