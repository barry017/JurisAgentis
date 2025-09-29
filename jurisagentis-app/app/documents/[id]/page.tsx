/**
 * Document Detail Page - View and manage individual document
 * T072: Document detail and editing page using new components
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { VersionHistory } from '@/components/documents/VersionHistory'
import { AccessControl } from '@/components/documents/AccessControl'
import { ShareDialog } from '@/components/documents/ShareDialog'
import { 
  FileText, 
  ArrowLeft,
  Edit,
  Download,
  Share,
  Eye,
  Clock,
  Shield,
  History,
  Users,
  Settings,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { 
  Document, 
  DocumentStatus,
  DocumentConfidentialityLevel
} from '@jurisagentis/document-management'

const statusLabels: Record<DocumentStatus, string> = {
  'draft': 'Draft',
  'review': 'Under Review', 
  'ready_for_signature': 'Ready for Signature',
  'pending_signature': 'Pending Signature',
  'executed': 'Executed',
  'completed': 'Completed',
  'archived': 'Archived'
}

const getStatusColor = (status: DocumentStatus): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800'
    case 'review': return 'bg-yellow-100 text-yellow-800'
    case 'ready_for_signature': return 'bg-blue-100 text-blue-800'
    case 'pending_signature': return 'bg-orange-100 text-orange-800'
    case 'executed': return 'bg-green-100 text-green-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'archived': return 'bg-gray-100 text-gray-600'
  }
}

const getConfidentialityColor = (level: DocumentConfidentialityLevel): string => {
  switch (level) {
    case 'public': return 'bg-green-100 text-green-800'
    case 'internal': return 'bg-blue-100 text-blue-800'
    case 'client_confidential': return 'bg-yellow-100 text-yellow-800'
    case 'attorney_client_privileged': return 'bg-red-100 text-red-800'
  }
}

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') // 'view' or 'edit'
  
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'versions' | 'access' | 'shares'>('overview')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(mode === 'edit')

  // Fetch document data
  const fetchDocument = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/documents/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch document')
      }
      
      const data = await response.json()
      setDocument(data.document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
      console.error('Error fetching document:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle document save
  const handleSave = async (content: string, metadata: Partial<Document>) => {
    if (!document) return
    
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metadata,
          content
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save document')
      }
      
      const data = await response.json()
      setDocument(data.document)
    } catch (error) {
      console.error('Error saving document:', error)
      throw error
    }
  }

  // Handle version creation
  const handleVersionCreate = async (changeDescription: string) => {
    if (!document) return
    
    try {
      const response = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: document.file_path,
          file_name: document.title + '.pdf',
          file_size: 1024, // Mock size
          file_hash: `hash_${Date.now()}`,
          change_summary: changeDescription
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create version')
      }
      
      // Refresh document
      fetchDocument()
    } catch (error) {
      console.error('Error creating version:', error)
      throw error
    }
  }

  // Handle version restore
  const handleVersionRestore = async (versionId: string) => {
    try {
      // Implementation would call version restore API
      console.log('Restoring version:', versionId)
    } catch (error) {
      console.error('Error restoring version:', error)
      throw error
    }
  }

  // Handle share
  const handleShare = async (shareData: any) => {
    if (!document) return
    
    try {
      const response = await fetch(`/api/documents/${document.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create share')
      }
      
      setShareDialogOpen(false)
    } catch (error) {
      console.error('Error sharing document:', error)
      throw error
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (!authLoading && user) {
      fetchDocument()
    }
  }, [authLoading, user, params.id])

  // Set initial tab based on mode
  useEffect(() => {
    if (mode === 'edit') {
      setActiveTab('editor')
      setIsEditing(true)
    }
  }, [mode])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading document</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <Button onClick={() => router.push('/documents')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Document not found</h3>
            <p className="mt-1 text-sm text-gray-500">The document you're looking for doesn't exist.</p>
            <div className="mt-6">
              <Button onClick={() => router.push('/documents')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/documents')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-3 text-indigo-600" />
                  {document.title}
                </h1>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge className={getStatusColor(document.status)}>
                    {statusLabels[document.status]}
                  </Badge>
                  <Badge className={getConfidentialityColor(document.confidentiality_level)}>
                    {document.confidentiality_level.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setActiveTab('editor')
                  setIsEditing(!isEditing)
                }}
              >
                {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => setShareDialogOpen(true)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="editor">
                  {isEditing ? 'Editor' : 'Content'}
                </TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="shares">Shares</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {document.description && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <p className="mt-1 text-sm text-gray-900">{document.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Document Type</Label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">
                          {document.document_type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Matter ID</Label>
                        <p className="mt-1 text-sm text-gray-900">{document.matter_id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Created</Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(document.created_at).toLocaleDateString()} at{' '}
                          {new Date(document.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Updated</Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(document.updated_at).toLocaleDateString()} at{' '}
                          {new Date(document.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {document.tags && document.tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Tags</Label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {document.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="editor" className="mt-6">
                <Card className="h-[800px]">
                  <DocumentEditor
                    document={document}
                    onSave={handleSave}
                    onVersionCreate={handleVersionCreate}
                    onShare={() => setShareDialogOpen(true)}
                    onAccessControl={() => setActiveTab('access')}
                    readOnly={!isEditing}
                    showCollaborators={true}
                    showComments={true}
                    autoSave={true}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="versions" className="mt-6">
                <VersionHistory
                  documentId={document.id}
                  onVersionRestore={handleVersionRestore}
                  onVersionDownload={async (versionId) => {
                    console.log('Downloading version:', versionId)
                  }}
                  onVersionPreview={(versionId) => {
                    console.log('Previewing version:', versionId)
                  }}
                  onCreateBranch={async (fromVersionId, branchName) => {
                    console.log('Creating branch:', branchName, 'from:', fromVersionId)
                  }}
                  showComparison={true}
                  allowRestore={true}
                />
              </TabsContent>

              <TabsContent value="access" className="mt-6">
                <AccessControl
                  documentId={document.id}
                  currentUserId={user.uid}
                  onAccessUpdate={() => {
                    // Refresh document or access data
                  }}
                  showInheritance={true}
                />
              </TabsContent>

              <TabsContent value="shares" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>External Shares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">
                      Document shares will be displayed here. Click "Share" to create a new share.
                    </p>
                    <Button 
                      onClick={() => setShareDialogOpen(true)}
                      className="mt-4"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Create Share
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Confidentiality Level</Label>
                    <Badge className={`mt-1 ${getConfidentialityColor(document.confidentiality_level)}`}>
                      {document.confidentiality_level.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {document.requires_signature && (
                    <div className="flex items-center space-x-2 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Requires Signature</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-gray-600">
                      {new Date(document.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Last Modified</p>
                    <p className="text-gray-600">
                      {new Date(document.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  {document.due_date && (
                    <div>
                      <p className="font-medium">Due Date</p>
                      <p className="text-gray-600">
                        {new Date(document.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('versions')}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('access')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      {document && (
        <ShareDialog
          documentId={document.id}
          documentTitle={document.title}
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          onShare={handleShare}
        />
      )}
    </div>
  )
}