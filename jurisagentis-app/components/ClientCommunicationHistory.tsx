/**
 * Client Communication History Component
 * Displays message threads and individual messages for a specific client
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  ArrowPathIcon
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
  lastMessage: Message | null
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

interface ClientCommunicationHistoryProps {
  clientId: string
  clientName: string
}

export default function ClientCommunicationHistory({ clientId, clientName }: ClientCommunicationHistoryProps) {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')

  // Fetch message threads for client
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/messages?type=threads&clientId=${clientId}`)
        const data = await response.json()

        if (data.success) {
          setThreads(data.threads || [])
        } else {
          setError('Failed to load communication history')
        }
      } catch {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchThreads()
  }, [clientId])

  // Fetch messages for selected thread
  const loadMessages = async (thread: MessageThread) => {
    try {
      setLoadingMessages(true)
      setSelectedThread(thread)

      const response = await fetch(`/api/messages?threadId=${thread.id}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages || [])
      } else {
        setError('Failed to load messages')
      }
    } catch {
      setError('Network error occurred')
    } finally {
      setLoadingMessages(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getSenderTypeIcon = (senderType: string) => {
    switch (senderType) {
      case 'attorney': return '👨‍💼'
      case 'client': return '👤'
      case 'staff': return '👥'
      case 'system': return '🤖'
      default: return '👤'
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading communication history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Communications</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary flex items-center mx-auto"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-blue-600" />
          Communication History
        </h3>
        <button className="btn-primary flex items-center text-sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Message
        </button>
      </div>

      {threads.length === 0 ? (
        <div className="card">
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Communications Yet</h3>
            <p className="text-gray-600 mb-4">
              No message threads found for {clientName}. Start a conversation to begin tracking communications.
            </p>
            <button className="btn-primary">
              Start Conversation
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Threads List */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Message Threads ({threads.length})</h4>
            <div className="space-y-3">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedThread?.id === thread.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => loadMessages(thread)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900 truncate">{thread.subject}</h5>
                        {thread.isPinned && (
                          <span className="text-yellow-500">📌</span>
                        )}
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      {thread.matter && (
                        <p className="text-sm text-gray-600">Matter: {thread.matter.title}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(thread.updatedAt)}
                    </div>
                  </div>

                  {thread.lastMessage && (
                    <div className="flex items-start space-x-2">
                      <span className="text-sm">
                        {getSenderTypeIcon(thread.lastMessage.senderType)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          <span className="font-medium">{thread.lastMessage.senderName}:</span>{' '}
                          {thread.lastMessage.content}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {thread.lastMessage.attachments && thread.lastMessage.attachments.length > 0 && (
                            <PaperClipIcon className="h-3 w-3 text-gray-400" />
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(thread.lastMessage.priority)}`}>
                            {thread.lastMessage.priority}
                          </span>
                          {thread.lastMessage.isEncrypted && (
                            <span className="text-xs text-green-600">🔒</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {thread.participants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center space-x-1">
                          <span className="text-xs">
                            {getSenderTypeIcon(participant.type)}
                          </span>
                          <span className="text-xs text-gray-600">{participant.name}</span>
                          {participant.online && (
                            <span className="h-2 w-2 bg-green-400 rounded-full"></span>
                          )}
                          {index < thread.participants.length - 1 && (
                            <span className="text-gray-400">,</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadMessages(thread)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages View */}
          <div className="lg:col-span-1">
            {selectedThread ? (
              <div className="border rounded-lg">
                {/* Thread Header */}
                <div className="border-b border-gray-200 p-4 bg-gray-50 rounded-t-lg">
                  <h5 className="font-medium text-gray-900">{selectedThread.subject}</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedThread.participants.map(p => p.name).join(', ')}
                  </p>
                </div>

                {/* Messages */}
                <div className="p-4 max-h-96 overflow-y-auto space-y-4">
                  {loadingMessages ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No messages in this thread</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderType === 'client' ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderType === 'client'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {getSenderTypeIcon(message.senderType)} {message.senderName}
                            </span>
                            <div className="flex items-center space-x-1 ml-2">
                              {message.priority !== 'normal' && (
                                <span className={`text-xs px-1 rounded ${getPriorityColor(message.priority)}`}>
                                  {message.priority}
                                </span>
                              )}
                              {message.isEncrypted && (
                                <span className="text-xs">🔒</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex items-center space-x-2 text-xs p-2 bg-white bg-opacity-20 rounded"
                                >
                                  <PaperClipIcon className="h-3 w-3" />
                                  <span className="truncate">{attachment.name}</span>
                                  <span>({(attachment.size / 1024).toFixed(1)}KB)</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-75">
                              {formatTimestamp(message.timestamp)}
                            </span>
                            <div className="flex items-center space-x-1 text-xs opacity-75">
                              <ClockIcon className="h-3 w-3" />
                              <span>{message.deliveryStatus}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 input-field text-sm"
                      disabled
                    />
                    <button className="btn-primary text-sm px-3 py-2" disabled>
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Message composition coming soon
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Thread</h4>
                <p className="text-gray-600">Choose a message thread to view the conversation history</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}