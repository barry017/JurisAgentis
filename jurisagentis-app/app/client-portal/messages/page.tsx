/**
 * Client Portal - Secure Messaging
 * 
 * Encrypted messaging system for attorney-client privileged communications
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserCircleIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Message {
  id: string
  threadId: string
  from: {
    id: string
    name: string
    role: 'client' | 'attorney' | 'paralegal' | 'assistant'
    avatar?: string
  }
  to: {
    id: string
    name: string
    role: 'client' | 'attorney' | 'paralegal' | 'assistant'
    avatar?: string
  }
  subject?: string
  content: string
  timestamp: string
  isRead: boolean
  isEncrypted: boolean
  isPrivileged: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  attachments?: {
    id: string
    name: string
    size: string
    type: string
  }[]
  replyTo?: string
  matterId?: string
  matterTitle?: string
  category: 'general' | 'document_review' | 'scheduling' | 'billing' | 'urgent'
}

interface MessageThread {
  id: string
  subject: string
  participants: {
    id: string
    name: string
    role: 'client' | 'attorney' | 'paralegal' | 'assistant'
  }[]
  lastMessage: Message
  unreadCount: number
  isPrivileged: boolean
  matterId?: string
  matterTitle?: string
  createdAt: string
  updatedAt: string
}

const mockCurrentUser = {
  id: 'client-1',
  name: 'John Smith',
  role: 'client' as const,
  email: 'john.smith@example.com'
}

const mockMessages: Message[] = [
  {
    id: '1',
    threadId: 'thread-1',
    from: { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney' },
    to: { id: 'client-1', name: 'John Smith', role: 'client' },
    subject: 'Trust Documents Ready for Review',
    content: 'Hi John,\n\nI\'ve completed the draft of your family trust documents. Please review the attached agreement and let me know if you have any questions or need any modifications.\n\nThe documents include:\n- Revocable Living Trust Agreement\n- Pour-over Will\n- Healthcare Power of Attorney\n- Financial Power of Attorney\n\nPlease review these at your earliest convenience so we can schedule a signing appointment.\n\nBest regards,\nSarah',
    timestamp: '2025-01-12T14:30:00Z',
    isRead: false,
    isEncrypted: true,
    isPrivileged: true,
    priority: 'high',
    attachments: [
      { id: '1', name: 'Trust_Agreement_Draft_v3.2.pdf', size: '2.4 MB', type: 'PDF' },
      { id: '2', name: 'Pour_Over_Will_Draft.pdf', size: '1.1 MB', type: 'PDF' }
    ],
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    category: 'document_review'
  },
  {
    id: '2',
    threadId: 'thread-1',
    from: { id: 'client-1', name: 'John Smith', role: 'client' },
    to: { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney' },
    content: 'Thank you Sarah. I\'ll review these documents this weekend and get back to you with any questions by Monday.',
    timestamp: '2025-01-12T16:45:00Z',
    isRead: true,
    isEncrypted: true,
    isPrivileged: true,
    priority: 'normal',
    replyTo: '1',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    category: 'document_review'
  },
  {
    id: '3',
    threadId: 'thread-2',
    from: { id: 'paralegal-1', name: 'Maria Rodriguez', role: 'paralegal' },
    to: { id: 'client-1', name: 'John Smith', role: 'client' },
    subject: 'Asset Inventory Reminder',
    content: 'Hi John,\n\nJust a friendly reminder to complete the asset inventory worksheet we sent last week. This information is crucial for properly drafting your trust documents.\n\nIf you need any help or have questions about any section, please don\'t hesitate to reach out.\n\nThanks!',
    timestamp: '2025-01-10T10:15:00Z',
    isRead: true,
    isEncrypted: true,
    isPrivileged: true,
    priority: 'normal',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    category: 'general'
  }
]

const mockThreads: MessageThread[] = [
  {
    id: 'thread-1',
    subject: 'Trust Documents Ready for Review',
    participants: [
      { id: 'client-1', name: 'John Smith', role: 'client' },
      { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney' }
    ],
    lastMessage: mockMessages[1],
    unreadCount: 1,
    isPrivileged: true,
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    createdAt: '2025-01-12T14:30:00Z',
    updatedAt: '2025-01-12T16:45:00Z'
  },
  {
    id: 'thread-2',
    subject: 'Asset Inventory Reminder',
    participants: [
      { id: 'client-1', name: 'John Smith', role: 'client' },
      { id: 'paralegal-1', name: 'Maria Rodriguez', role: 'paralegal' }
    ],
    lastMessage: mockMessages[2],
    unreadCount: 0,
    isPrivileged: true,
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    createdAt: '2025-01-10T10:15:00Z',
    updatedAt: '2025-01-10T10:15:00Z'
  }
]

export default function ClientMessagesPage() {
  const router = useRouter()
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [threads, setThreads] = useState<MessageThread[]>(mockThreads)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [filteredThreads, setFilteredThreads] = useState<MessageThread[]>(mockThreads)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filter threads based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = threads.filter(thread =>
        thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        thread.matterTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredThreads(filtered)
    } else {
      setFilteredThreads(threads)
    }
  }, [searchQuery, threads])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedThread])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    
    if (priority === 'normal') return null
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </span>
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'attorney':
        return '⚖️'
      case 'paralegal':
        return '📋'
      case 'assistant':
        return '📞'
      case 'client':
        return '👤'
      default:
        return '👤'
    }
  }

  const getThreadMessages = (threadId: string) => {
    return messages.filter(msg => msg.threadId === threadId).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      threadId: selectedThread.id,
      from: mockCurrentUser,
      to: selectedThread.participants.find(p => p.id !== mockCurrentUser.id)!,
      content: newMessage,
      timestamp: new Date().toISOString(),
      isRead: true,
      isEncrypted: true,
      isPrivileged: true,
      priority: 'normal',
      replyTo: undefined,
      matterId: selectedThread.matterId,
      matterTitle: selectedThread.matterTitle,
      category: 'general'
    }

    setMessages([...messages, message])
    setNewMessage('')

    // Update thread's last message
    const updatedThread = {
      ...selectedThread,
      lastMessage: message,
      updatedAt: message.timestamp
    }
    
    setThreads(threads.map(t => t.id === selectedThread.id ? updatedThread : t))
    setSelectedThread(updatedThread)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Secure Messages
                </h1>
                <p className="text-gray-600 mt-1 flex items-center">
                  <LockClosedIcon className="h-4 w-4 mr-1" />
                  Attorney-client privileged communications
                </p>
              </div>
            </div>
            
            <button className="btn-primary flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Message
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow h-[calc(100vh-200px)] flex">
          {/* Sidebar - Message Threads */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedThread?.id === thread.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate flex-1">
                      {thread.subject}
                    </h3>
                    {thread.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs text-gray-500">
                      {getRoleIcon(thread.lastMessage.from.role)} {thread.lastMessage.from.name}
                    </span>
                    {thread.isPrivileged && (
                      <LockClosedIcon className="h-3 w-3 text-green-600" />
                    )}
                    {getPriorityBadge(thread.lastMessage.priority)}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {thread.lastMessage.content}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {thread.matterTitle}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(thread.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedThread ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedThread.subject}
                      </h2>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          {selectedThread.participants.map(p => 
                            `${getRoleIcon(p.role)} ${p.name}`
                          ).join(' • ')}
                        </span>
                        {selectedThread.isPrivileged && (
                          <span className="inline-flex items-center text-xs text-green-600">
                            <LockClosedIcon className="h-3 w-3 mr-1" />
                            Privileged
                          </span>
                        )}
                      </div>
                      {selectedThread.matterTitle && (
                        <div className="text-sm text-gray-500 mt-1">
                          Matter: {selectedThread.matterTitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {getThreadMessages(selectedThread.id).map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.from.id === mockCurrentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl ${
                        message.from.id === mockCurrentUser.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      } rounded-lg p-3`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs opacity-75">
                            {getRoleIcon(message.from.role)} {message.from.name}
                          </span>
                          <span className="text-xs opacity-75">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        {message.subject && (
                          <div className="font-medium text-sm mb-2">
                            {message.subject}
                          </div>
                        )}
                        
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-opacity-20 border-white">
                            {message.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                                <PaperClipIcon className="h-3 w-3" />
                                <span>{attachment.name}</span>
                                <span className="opacity-75">({attachment.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            {message.isEncrypted && (
                              <LockClosedIcon className="h-3 w-3 opacity-75" />
                            )}
                            {getPriorityBadge(message.priority)}
                          </div>
                          
                          {message.from.id === mockCurrentUser.id && (
                            <div className="flex items-center space-x-1">
                              {message.isRead ? (
                                <CheckBadgeIcon className="h-3 w-3 opacity-75" />
                              ) : (
                                <CheckIcon className="h-3 w-3 opacity-75" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                    
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your secure message..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                    </div>
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <LockClosedIcon className="h-3 w-3 text-green-600" />
                      <span>Messages are encrypted and attorney-client privileged</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No Thread Selected */
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <ChatBubbleLeftEllipsisIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a message thread to start viewing your secure communications</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}