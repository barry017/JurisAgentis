/**
 * Real-time Messaging Center
 * 
 * Secure client-attorney communication with real-time messaging
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PhoneIcon,
  VideoCameraIcon as VideoIcon, // VideoCameraIcon is the correct name
  DocumentIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

interface Message {
  id: string
  threadId: string
  senderId: string
  senderName: string
  senderType: 'attorney' | 'client' | 'staff' | 'system'
  content: string
  timestamp: string
  isRead: boolean
  attachments?: {
    id: string
    name: string
    type: string
    size: number
    url: string
  }[]
  replyTo?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isEncrypted: boolean
  deliveryStatus: 'sent' | 'delivered' | 'read'
}

interface MessageThread {
  id: string
  participants: {
    id: string
    name: string
    type: 'attorney' | 'client' | 'staff'
    avatar?: string
    online: boolean
    lastSeen?: string
  }[]
  subject: string
  lastMessage: Message
  unreadCount: number
  isPinned: boolean
  isArchived: boolean
  matter?: {
    id: string
    title: string
  }
  client?: {
    id: string
    name: string
  }
  isPrivileged: boolean
  createdAt: string
  updatedAt: string
}

// Mock data
const mockThreads: MessageThread[] = [
  {
    id: '1',
    participants: [
      { id: 'attorney-1', name: 'Sarah Johnson', type: 'attorney', online: true },
      { id: 'client-1', name: 'John Smith', type: 'client', online: false, lastSeen: '2025-01-13T10:30:00Z' }
    ],
    subject: 'Trust Document Review',
    lastMessage: {
      id: 'msg-1',
      threadId: '1',
      senderId: 'client-1',
      senderName: 'John Smith',
      senderType: 'client',
      content: 'I have reviewed the trust documents and have a few questions about the funding process.',
      timestamp: '2025-01-13T14:30:00Z',
      isRead: false,
      priority: 'high',
      isEncrypted: true,
      deliveryStatus: 'delivered'
    },
    unreadCount: 3,
    isPinned: true,
    isArchived: false,
    matter: { id: '1', title: 'Smith Family Estate Planning' },
    client: { id: '1', name: 'John Smith' },
    isPrivileged: true,
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-13T14:30:00Z'
  },
  {
    id: '2',
    participants: [
      { id: 'attorney-1', name: 'Sarah Johnson', type: 'attorney', online: true },
      { id: 'client-2', name: 'Maria Rodriguez', type: 'client', online: true }
    ],
    subject: 'Will Execution Appointment',
    lastMessage: {
      id: 'msg-2',
      threadId: '2',
      senderId: 'attorney-1',
      senderName: 'Sarah Johnson',
      senderType: 'attorney',
      content: 'Perfect! I\'ll schedule the will signing for Friday at 2:00 PM. Please bring valid photo ID.',
      timestamp: '2025-01-13T13:15:00Z',
      isRead: true,
      priority: 'normal',
      isEncrypted: true,
      deliveryStatus: 'read'
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    matter: { id: '2', title: 'Rodriguez Family Will' },
    client: { id: '2', name: 'Maria Rodriguez' },
    isPrivileged: true,
    createdAt: '2025-01-11T15:20:00Z',
    updatedAt: '2025-01-13T13:15:00Z'
  },
  {
    id: '3',
    participants: [
      { id: 'attorney-1', name: 'Sarah Johnson', type: 'attorney', online: true },
      { id: 'staff-1', name: 'Michael Chen', type: 'staff', online: false, lastSeen: '2025-01-13T12:00:00Z' }
    ],
    subject: 'Case File Organization',
    lastMessage: {
      id: 'msg-3',
      threadId: '3',
      senderId: 'staff-1',
      senderName: 'Michael Chen',
      senderType: 'staff',
      content: 'All documents have been scanned and organized in the DMS. Ready for client review.',
      timestamp: '2025-01-13T12:00:00Z',
      isRead: true,
      priority: 'normal',
      isEncrypted: false,
      deliveryStatus: 'read'
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isPrivileged: false,
    createdAt: '2025-01-13T11:30:00Z',
    updatedAt: '2025-01-13T12:00:00Z'
  }
]

const mockMessages: Message[] = [
  {
    id: 'msg-1-1',
    threadId: '1',
    senderId: 'attorney-1',
    senderName: 'Sarah Johnson',
    senderType: 'attorney',
    content: 'Good afternoon, John. I hope you\'ve had a chance to review the trust documents I sent over. Please let me know if you have any questions or concerns.',
    timestamp: '2025-01-13T09:00:00Z',
    isRead: true,
    priority: 'normal',
    isEncrypted: true,
    deliveryStatus: 'read',
    attachments: [
      { id: '1', name: 'Trust_Agreement_v3.2.pdf', type: 'application/pdf', size: 2457600, url: '/documents/trust-agreement.pdf' }
    ]
  },
  {
    id: 'msg-1-2',
    threadId: '1',
    senderId: 'client-1',
    senderName: 'John Smith',
    senderType: 'client',
    content: 'Thank you for the documents. I\'ve reviewed them with my wife and we have a few questions about the funding process and asset transfers.',
    timestamp: '2025-01-13T11:30:00Z',
    isRead: true,
    priority: 'normal',
    isEncrypted: true,
    deliveryStatus: 'read'
  },
  {
    id: 'msg-1-3',
    threadId: '1',
    senderId: 'client-1',
    senderName: 'John Smith',
    senderType: 'client',
    content: 'Specifically, we\'re wondering about the timeline for transferring our real estate holdings into the trust. Should we do this before or after the trust is fully executed?',
    timestamp: '2025-01-13T11:32:00Z',
    isRead: true,
    priority: 'high',
    isEncrypted: true,
    deliveryStatus: 'read'
  },
  {
    id: 'msg-1-4',
    threadId: '1',
    senderId: 'client-1',
    senderName: 'John Smith',
    senderType: 'client',
    content: 'Also, do we need to update our investment accounts immediately, or can that wait until after the initial trust setup is complete?',
    timestamp: '2025-01-13T14:30:00Z',
    isRead: false,
    priority: 'high',
    isEncrypted: true,
    deliveryStatus: 'delivered'
  }
]

export default function MessagesPage() {
  const _router = useRouter()
  const [threads, setThreads] = useState<MessageThread[]>(mockThreads)
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(mockThreads[0])
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [_showFilters, _setShowFilters] = useState(false)
  const [_isComposing, _setIsComposing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize message input
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto'
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + 'px'
    }
  }, [newMessage])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      threadId: selectedThread.id,
      senderId: 'attorney-1',
      senderName: 'Sarah Johnson',
      senderType: 'attorney',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'normal',
      isEncrypted: true,
      deliveryStatus: 'sent'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Update thread's last message
    setThreads(prev => prev.map(thread => 
      thread.id === selectedThread.id 
        ? { ...thread, lastMessage: message, updatedAt: message.timestamp }
        : thread
    ))

    // Focus back on input
    messageInputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getSenderAvatar = (senderType: string) => {
    const colors = {
      attorney: 'bg-blue-500',
      client: 'bg-green-500',
      staff: 'bg-purple-500',
      system: 'bg-gray-500'
    }
    return colors[senderType as keyof typeof colors] || 'bg-gray-500'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-500'
  }

  const filteredThreads = threads.filter(thread => 
    !searchQuery || 
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChatBubbleLeftRightIcon className="h-8 w-8 mr-3 text-blue-600" />
                Secure Messaging
              </h1>
              <p className="text-gray-600 mt-2">
                Attorney-client privileged communications with end-to-end encryption
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsComposing(true)}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Message
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
          {/* Threads Sidebar */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          getSenderAvatar(thread.participants.find(p => p.type === 'client')?.type || 'client')
                        }`}>
                          {thread.client?.name.charAt(0) || 'U'}
                        </div>
                        {thread.participants.some(p => p.online) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium truncate ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {thread.subject}
                          </p>
                          {thread.isPinned && (
                            <StarIcon className="h-3 w-3 text-yellow-500" />
                          )}
                          {thread.isPrivileged && (
                            <ExclamationTriangleIcon className="h-3 w-3 text-red-500" title="Attorney-Client Privileged" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {thread.client?.name} • {thread.matter?.title}
                        </p>
                      </div>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
                        {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate mr-2 ${thread.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {thread.lastMessage.content}
                    </p>
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs ${getPriorityColor(thread.lastMessage.priority)}`}>
                        {thread.lastMessage.priority !== 'normal' && (
                          <>•</>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(thread.lastMessage.timestamp)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedThread ? (
              <>
                {/* Messages Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        getSenderAvatar(selectedThread.participants.find(p => p.type === 'client')?.type || 'client')
                      }`}>
                        {selectedThread.client?.name.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedThread.subject}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedThread.client?.name} • {selectedThread.matter?.title}
                          {selectedThread.isPrivileged && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Privileged
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <PhoneIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <VideoIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.filter(msg => msg.threadId === selectedThread.id).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'attorney-1' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        message.senderId === 'attorney-1' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      } rounded-lg px-4 py-2`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {message.senderName}
                          </span>
                          <div className="flex items-center space-x-1">
                            {message.priority !== 'normal' && (
                              <span className={`text-xs ${
                                message.senderId === 'attorney-1' ? 'text-blue-200' : getPriorityColor(message.priority)
                              }`}>
                                {message.priority.toUpperCase()}
                              </span>
                            )}
                            {message.isEncrypted && (
                              <span className="text-xs opacity-75" title="End-to-end encrypted">🔒</span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-opacity-20">
                            {message.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                                <DocumentIcon className="h-4 w-4" />
                                <span className="truncate">{attachment.name}</span>
                                <span className="opacity-75">
                                  ({(attachment.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <span className="text-xs opacity-75">
                            {formatTimestamp(message.timestamp)}
                          </span>
                          {message.senderId === 'attorney-1' && (
                            <div className="flex items-center space-x-1">
                              {message.deliveryStatus === 'read' && (
                                <div className="flex">
                                  <CheckIcon className="h-3 w-3 opacity-75" />
                                  <CheckIcon className="h-3 w-3 -ml-1 opacity-75" />
                                </div>
                              )}
                              {message.deliveryStatus === 'delivered' && (
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
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full max-h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <PaperClipIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    🔒 All messages are end-to-end encrypted and attorney-client privileged
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                  <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}