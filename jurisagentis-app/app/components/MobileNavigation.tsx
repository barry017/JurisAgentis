'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  // Bars3Icon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeSolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  ClockIcon as ClockSolidIcon
} from '@heroicons/react/24/solid'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  activeIcon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface FloatingAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  action: () => void
}

export function MobileNavigation() {
  const pathname = usePathname()
  const [showFAB, setShowFAB] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Hide/show navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/mobile/dashboard',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon
    },
    {
      id: 'clients',
      label: 'Clients',
      href: '/mobile/clients',
      icon: UserGroupIcon,
      activeIcon: UserGroupSolidIcon,
      badge: 2
    },
    {
      id: 'cases',
      label: 'Cases',
      href: '/mobile/cases',
      icon: DocumentTextIcon,
      activeIcon: DocumentSolidIcon,
      badge: 5
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '/mobile/calendar',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon
    },
    {
      id: 'time',
      label: 'Time',
      href: '/mobile/time',
      icon: ClockIcon,
      activeIcon: ClockSolidIcon
    }
  ]

  const floatingActions: FloatingAction[] = [
    {
      id: 'new-case',
      label: 'New Case',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      action: () => {
        window.location.href = '/cases/new'
        setShowFAB(false)
      }
    },
    {
      id: 'scan-document',
      label: 'Scan Document',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      action: () => {
        window.location.href = '/documents/scan'
        setShowFAB(false)
      }
    },
    {
      id: 'quick-note',
      label: 'Quick Note',
      icon: DocumentTextIcon,
      color: 'bg-purple-500',
      action: () => {
        window.location.href = '/notes/new'
        setShowFAB(false)
      }
    },
    {
      id: 'start-timer',
      label: 'Start Timer',
      icon: ClockIcon,
      color: 'bg-orange-500',
      action: () => {
        // Start a quick timer
        const entry = {
          id: Date.now().toString(),
          case: 'General',
          client: 'Internal',
          description: 'Time tracking',
          startTime: new Date().toISOString(),
          isRunning: true
        }
        localStorage.setItem('active-time-entry', JSON.stringify(entry))
        window.dispatchEvent(new CustomEvent('timer-started', { detail: entry }))
        setShowFAB(false)
      }
    }
  ]

  const isActive = (href: string) => {
    if (href === '/mobile/dashboard') {
      return pathname === '/mobile/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom Navigation */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = active ? item.activeIcon : item.icon
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 relative transition-colors ${
                  active 
                    ? 'text-indigo-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                
                {active && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        {/* FAB Menu */}
        {showFAB && (
          <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom-2">
            {floatingActions.map((action, index) => {
              const Icon = action.icon
              return (
                <div
                  key={action.id}
                  className="flex items-center space-x-3 animate-in slide-in-from-right-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {action.label}
                  </span>
                  <button
                    onClick={action.action}
                    className={`${action.color} text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-110`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setShowFAB(!showFAB)}
          className={`bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all transform ${
            showFAB ? 'rotate-45 scale-110' : 'hover:scale-110'
          }`}
        >
          <PlusIcon className="h-6 w-6" />
        </button>

        {/* FAB Backdrop */}
        {showFAB && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setShowFAB(false)}
          />
        )}
      </div>

      {/* Quick Access Menu (Swipe Up) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl border-t border-gray-200 z-30 transition-transform duration-300 ${
          showFAB ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4">
          {/* Handle */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {floatingActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className={`${action.color} rounded-lg p-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Haptic Feedback for Touches */}
      <style jsx global>{`
        @media (hover: none) and (pointer: coarse) {
          .touch-feedback:active {
            transform: scale(0.95);
            transition: transform 0.1s ease;
          }
        }
      `}</style>
    </>
  )
}

// Hook for managing mobile navigation state
export function useMobileNavigation() {
  const [badges, setBadges] = useState({
    clients: 0,
    cases: 0,
    calendar: 0,
    time: 0
  })

  const updateBadge = (section: keyof typeof badges, count: number) => {
    setBadges(prev => ({ ...prev, [section]: count }))
  }

  return { badges, updateBadge }
}