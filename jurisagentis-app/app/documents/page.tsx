/**
 * Documents Page - Document Management System  
 * T071: Main document management dashboard using DocumentList component
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { DocumentList } from '@/components/documents/DocumentList'
import { ShareDialog } from '@/components/documents/ShareDialog'
import { AccessControl } from '@/components/documents/AccessControl'
import { 
  FileText,
  AlertCircle
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Document } from '@jurisagentis/document-management'

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [accessControlOpen, setAccessControlOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Handle document actions
  const handleDocumentSelect = (document: Document) => {
    router.push(`/documents/${document.id}`)
  }

  const handleDocumentEdit = (document: Document) => {
    router.push(`/documents/${document.id}?mode=edit`)
  }

  const handleDocumentShare = (document: Document) => {
    setSelectedDocument(document)
    setShareDialogOpen(true)
  }

  const handleDocumentDelete = async (document: Document) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.title}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      try {
        // Call delete API
        const response = await fetch(`/api/documents/${document.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // Refresh the document list
          window.location.reload()
        } else {
          throw new Error('Failed to delete document')
        }
      } catch (error) {
        console.error('Error deleting document:', error)
        alert('Failed to delete document. Please try again.')
      }
    }
  }

  const handleAccessControl = (document: Document) => {
    setSelectedDocument(document)
    setAccessControlOpen(true)
  }

  const handleShare = async (shareData: any) => {
    if (!selectedDocument) return
    
    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create share')
      }
      
      // Close dialog and show success
      setShareDialogOpen(false)
      alert('Document shared successfully!')
    } catch (error) {
      console.error('Error sharing document:', error)
      alert('Failed to share document. Please try again.')
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="h-8 w-8 mr-3 text-indigo-600" />
              Documents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your legal documents and files
            </p>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DocumentList
          onDocumentSelect={handleDocumentSelect}
          onDocumentEdit={handleDocumentEdit}
          onDocumentShare={handleDocumentShare}
          onDocumentDelete={handleDocumentDelete}
          showFilters={true}
          showPagination={true}
          showViewToggle={true}
        />
      </div>

      {/* Share Dialog */}
      {selectedDocument && (
        <ShareDialog
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false)
            setSelectedDocument(null)
          }}
          onShare={handleShare}
        />
      )}

      {/* Access Control Dialog */}
      {selectedDocument && (
        <Dialog open={accessControlOpen} onOpenChange={setAccessControlOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AccessControl
              documentId={selectedDocument.id}
              currentUserId={user.uid}
              onAccessUpdate={() => {
                // Refresh or update as needed
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}