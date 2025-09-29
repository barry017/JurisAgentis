/**
 * Global Search Component
 * 
 * Quick search bar accessible from any page via keyboard shortcut
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MagnifyingGlassIcon,
  CommandLineIcon,
  XMarkIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface QuickSearchResult {
  id: string
  type: 'client' | 'matter' | 'document' | 'calendar'
  title: string
  subtitle?: string
  url: string
  relevanceScore: number
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isOpen) {
          // Open search - this would be handled by parent component
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose()
        setQuery('')
        setResults([])
        setSelectedIndex(-1)
      }

      // Arrow navigation
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(prev => prev <= 0 ? results.length - 1 : prev - 1)
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault()
          const result = results[selectedIndex]
          router.push(result.url)
          onClose()
          setQuery('')
          setResults([])
          setSelectedIndex(-1)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, router, onClose])

  // Perform quick search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results?.map((r: QuickSearchResult) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            subtitle: r.subtitle,
            url: r.url,
            relevanceScore: r.relevanceScore
          })) || [])
        }
      } catch (error) {
        console.error('Quick search error:', error)
        // Mock results for demo
        const mockResults: QuickSearchResult[] = [
          {
            id: '1',
            type: 'client',
            title: 'John Smith',
            subtitle: 'Individual Client - Estate Planning',
            url: '/clients/1',
            relevanceScore: 95
          },
          {
            id: '2',
            type: 'document',
            title: 'Smith Family Trust Agreement',
            subtitle: 'Trust Document - v3.2',
            url: '/documents/1',
            relevanceScore: 87
          }
        ].filter(result => 
          result.title.toLowerCase().includes(query.toLowerCase())
        )
        setResults(mockResults)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return UserIcon
      case 'matter': return BriefcaseIcon
      case 'document': return DocumentTextIcon
      case 'calendar': return CalendarIcon
      default: return DocumentTextIcon
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'text-blue-600 bg-blue-100'
      case 'matter': return 'text-green-600 bg-green-100'
      case 'document': return 'text-purple-600 bg-purple-100'
      case 'calendar': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Search Modal */}
      <div className="flex min-h-screen items-start justify-center p-4 text-center sm:p-0">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all sm:my-20">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Quick Search</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="px-6 py-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, matters, documents..."
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CommandLineIcon className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {results.length > 0 ? (
              <div className="px-2 pb-4">
                {results.map((result, index) => {
                  const TypeIcon = getTypeIcon(result.type)
                  const typeColor = getTypeColor(result.type)
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.url)
                        onClose()
                        setQuery('')
                        setResults([])
                        setSelectedIndex(-1)
                      }}
                      className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                        index === selectedIndex 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`rounded-lg p-2 ${typeColor}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="truncate text-xs text-gray-500">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {result.relevanceScore}%
                          </span>
                          <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : query.length >= 2 && !loading ? (
              <div className="px-6 py-8 text-center">
                <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  No results found for &quot;{query}&quot;
                </p>
              </div>
            ) : query.length < 2 ? (
              <div className="px-6 py-8 text-center">
                <CommandLineIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Type at least 2 characters to search
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <span>Press</span>
                  <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">⌘K</kbd>
                  <span>to open search anywhere</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <ArrowRightIcon className="mr-1 h-3 w-3" />
                    Enter to open
                  </span>
                  <span className="flex items-center">
                    <ClockIcon className="mr-1 h-3 w-3" />
                    ↑↓ to navigate
                  </span>
                </div>
                <button
                  onClick={() => {
                    router.push(`/search?q=${encodeURIComponent(query)}`)
                    onClose()
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View all results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}