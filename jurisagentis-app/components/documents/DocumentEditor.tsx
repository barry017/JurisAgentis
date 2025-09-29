/**
 * Document Editor Component - Collaborative document editing
 * T067: Collaborative document editing component for Document Management System
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Save,
  Eye,
  EyeOff,
  Users,
  MessageSquare,
  History,
  Settings,
  Download,
  Share,
  Lock,
  Unlock,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Document, DocumentStatus } from '@jurisagentis/document-management'

interface DocumentEditorProps {
  document: Document
  onSave?: (content: string, metadata: Partial<Document>) => Promise<void>
  onVersionCreate?: (changeDescription: string) => Promise<void>
  onComment?: (content: string, selection?: { start: number, end: number }) => Promise<void>
  onShare?: () => void
  onPreview?: () => void
  onAccessControl?: () => void
  readOnly?: boolean
  showCollaborators?: boolean
  showComments?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
}

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  cursor_position?: number
  last_seen: Date
  status: 'active' | 'idle' | 'offline'
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  created_at: Date
  position: {
    start: number
    end: number
  }
  resolved: boolean
  replies?: Comment[]
}

interface EditorState {
  content: string
  title: string
  status: DocumentStatus
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  isAutoSaving: boolean
  collaborators: Collaborator[]
  comments: Comment[]
  selectedText: { start: number, end: number } | null
  cursorPosition: number
}

const statusOptions: Array<{ value: DocumentStatus, label: string, color: string }> = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ready_for_signature', label: 'Ready for Signature', color: 'bg-blue-100 text-blue-800' },
  { value: 'pending_signature', label: 'Pending Signature', color: 'bg-orange-100 text-orange-800' },
  { value: 'executed', label: 'Executed', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' }
]

export function DocumentEditor({
  document,
  onSave,
  onVersionCreate,
  onComment,
  onShare,
  onPreview,
  onAccessControl,
  readOnly = false,
  showCollaborators = true,
  showComments = true,
  autoSave = true,
  autoSaveInterval = 30000 // 30 seconds
}: DocumentEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>()
  
  const [editorState, setEditorState] = useState<EditorState>({
    content: document.content || '',
    title: document.title,
    status: document.status,
    lastSaved: null,
    hasUnsavedChanges: false,
    isAutoSaving: false,
    collaborators: [],
    comments: [],
    selectedText: null,
    cursorPosition: 0
  })
  
  const [showPreview, setShowPreview] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState<'collaborators' | 'comments' | 'history'>('comments')
  const [newComment, setNewComment] = useState('')

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!editorState.hasUnsavedChanges || readOnly || !onSave) return
    
    setEditorState(prev => ({ ...prev, isAutoSaving: true }))
    
    try {
      await onSave(editorState.content, {
        title: editorState.title,
        status: editorState.status
      })
      
      setEditorState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        isAutoSaving: false,
        lastSaved: new Date()
      }))
    } catch (error) {
      console.error('Auto-save failed:', error)
      setEditorState(prev => ({ ...prev, isAutoSaving: false }))
    }
  }, [editorState.content, editorState.title, editorState.status, editorState.hasUnsavedChanges, readOnly, onSave])

  // Set up auto-save interval
  useEffect(() => {
    if (autoSave && !readOnly) {
      autoSaveIntervalRef.current = setInterval(performAutoSave, autoSaveInterval)
      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current)
        }
      }
    }
  }, [autoSave, readOnly, performAutoSave, autoSaveInterval])

  // Manual save
  const handleSave = async () => {
    if (!onSave || readOnly) return
    
    try {
      await onSave(editorState.content, {
        title: editorState.title,
        status: editorState.status
      })
      
      setEditorState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }))
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  // Content change handler
  const handleContentChange = (newContent: string) => {
    setEditorState(prev => ({
      ...prev,
      content: newContent,
      hasUnsavedChanges: true
    }))
    
    // Update cursor position
    if (editorRef.current) {
      setEditorState(prev => ({
        ...prev,
        cursorPosition: editorRef.current?.selectionStart || 0
      }))
    }
  }

  // Title change handler
  const handleTitleChange = (newTitle: string) => {
    setEditorState(prev => ({
      ...prev,
      title: newTitle,
      hasUnsavedChanges: true
    }))
  }

  // Status change handler
  const handleStatusChange = (newStatus: DocumentStatus) => {
    setEditorState(prev => ({
      ...prev,
      status: newStatus,
      hasUnsavedChanges: true
    }))
  }

  // Text selection handler
  const handleTextSelection = () => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart
      const end = editorRef.current.selectionEnd
      
      if (start !== end) {
        setEditorState(prev => ({
          ...prev,
          selectedText: { start, end }
        }))
      } else {
        setEditorState(prev => ({
          ...prev,
          selectedText: null,
          cursorPosition: start
        }))
      }
    }
  }

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !onComment) return
    
    try {
      await onComment(newComment, editorState.selectedText || undefined)
      setNewComment('')
      setEditorState(prev => ({ ...prev, selectedText: null }))
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  // Format text (basic formatting)
  const formatText = (command: string, value?: string) => {
    if (!editorRef.current || readOnly) return
    
    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    
    let formattedText = selectedText
    
    switch (command) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `<u>${selectedText}</u>`
        break
      case 'list':
        formattedText = `- ${selectedText}`
        break
      case 'orderedList':
        formattedText = `1. ${selectedText}`
        break
      case 'quote':
        formattedText = `> ${selectedText}`
        break
      case 'link':
        formattedText = `[${selectedText}](${value || 'url'})`
        break
    }
    
    const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end)
    handleContentChange(newContent)
    
    // Restore focus and update selection
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + formattedText.length)
    }, 0)
  }

  // Create new version
  const handleCreateVersion = async () => {
    if (!onVersionCreate) return
    
    const changeDescription = prompt('Describe the changes in this version:')
    if (changeDescription) {
      try {
        await onVersionCreate(changeDescription)
      } catch (error) {
        console.error('Failed to create version:', error)
      }
    }
  }

  // Mock collaborators for demo
  useEffect(() => {
    if (showCollaborators) {
      setEditorState(prev => ({
        ...prev,
        collaborators: [
          {
            id: '1',
            name: 'Sarah Chen',
            email: 'sarah@example.com',
            cursor_position: 150,
            last_seen: new Date(),
            status: 'active'
          },
          {
            id: '2',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            cursor_position: 0,
            last_seen: new Date(Date.now() - 300000),
            status: 'idle'
          }
        ]
      }))
    }
  }, [showCollaborators])

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4 flex-1">
          <Input
            value={editorState.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold border-none shadow-none p-0 h-auto"
            placeholder="Document title"
            readOnly={readOnly}
          />
          
          <Select
            value={editorState.status}
            onValueChange={handleStatusChange}
            disabled={readOnly}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <Badge className={option.color}>
                      {option.label}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          {/* Save Status */}
          <div className="text-sm text-gray-500">
            {editorState.isAutoSaving ? (
              <span>Saving...</span>
            ) : editorState.hasUnsavedChanges ? (
              <span>Unsaved changes</span>
            ) : editorState.lastSaved ? (
              <span>Saved {editorState.lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>

          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!editorState.hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateVersion}
          >
            <History className="h-4 w-4 mr-2" />
            Version
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAccessControl}>
                {readOnly ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                Access Control
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <EyeOff className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {!readOnly && !showPreview && (
        <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
          <Button variant="ghost" size="sm" onClick={() => formatText('bold')}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('italic')}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('underline')}>
            <Underline className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <Button variant="ghost" size="sm" onClick={() => formatText('list')}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('orderedList')}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('quote')}>
            <Quote className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <Button variant="ghost" size="sm" onClick={() => formatText('link', prompt('Enter URL:') || '')}>
            <Link className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />
          
          {editorState.selectedText && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('comments')}
              className="ml-auto"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          )}
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Content */}
        <div className="flex-1 flex flex-col">
          {showPreview ? (
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-4xl mx-auto prose prose-lg">
                {editorState.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph || <br />}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <Textarea
              ref={editorRef}
              value={editorState.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder="Start writing your document..."
              className="flex-1 border-none resize-none focus:ring-0 p-6 font-mono text-sm leading-relaxed"
              readOnly={readOnly}
            />
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l bg-gray-50">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments
                </TabsTrigger>
                <TabsTrigger value="collaborators">
                  <Users className="h-4 w-4 mr-2" />
                  People
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="p-4 space-y-4">
                {/* Add Comment */}
                {editorState.selectedText && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Add Comment</CardTitle>
                      <p className="text-xs text-gray-500">
                        Selected: "{editorState.content.substring(editorState.selectedText.start, editorState.selectedText.end)}"
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add your comment..."
                        className="mb-2"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditorState(prev => ({ ...prev, selectedText: null }))}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                        >
                          Comment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments List */}
                <div className="space-y-3">
                  {editorState.comments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No comments yet</p>
                  ) : (
                    editorState.comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                              {comment.author.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">{comment.author.name}</span>
                                <span className="text-xs text-gray-500">
                                  {comment.created_at.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="collaborators" className="p-4 space-y-4">
                <div className="space-y-3">
                  {editorState.collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                        {collaborator.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{collaborator.name}</p>
                        <p className="text-xs text-gray-500">{collaborator.email}</p>
                      </div>
                      <Badge 
                        variant={collaborator.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {collaborator.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="p-4">
                <p className="text-gray-500 text-sm">Document history will appear here</p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}