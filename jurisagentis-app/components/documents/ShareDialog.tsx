/**
 * Share Dialog Component - Secure sharing interface for documents
 * T070: Document sharing component for Document Management System
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  Share2,
  Copy,
  Mail,
  Link,
  Eye,
  Download,
  MessageSquare,
  CheckCircle,
  Key,
  Clock,
  Shield,
  Users,
  Globe,
  QrCode,
  Settings,
  Trash2,
  Edit,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface ShareDialogProps {
  documentId: string
  documentTitle: string
  isOpen: boolean
  onClose: () => void
  onShare?: (shareData: ShareData) => Promise<void>
  currentShares?: DocumentShare[]
}

interface ShareData {
  recipient_email: string
  share_type: 'client_portal' | 'external_link' | 'email_attachment' | 'secure_download'
  permissions: {
    can_view: boolean
    can_download: boolean
    can_comment: boolean
    can_approve: boolean
    can_print?: boolean
  }
  expires_in_hours?: number
  custom_message?: string
  require_password?: boolean
  password?: string
  apply_watermark?: boolean
  max_views?: number
  max_downloads?: number
}

interface DocumentShare {
  id: string
  recipient_email: string
  share_type: string
  shared_url: string
  permissions: ShareData['permissions']
  created_at: Date
  expires_at?: Date
  views_count: number
  downloads_count: number
  max_views?: number
  max_downloads?: number
  status: 'active' | 'expired' | 'revoked'
  last_accessed?: Date
  watermark_applied: boolean
  password_protected: boolean
}

const shareTypes = [
  {
    value: 'client_portal',
    label: 'Client Portal',
    description: 'Secure access through the client portal',
    icon: <Shield className="h-4 w-4" />,
    recommended: true
  },
  {
    value: 'secure_download',
    label: 'Secure Download Link',
    description: 'Time-limited download link with tracking',
    icon: <Download className="h-4 w-4" />,
    recommended: true
  },
  {
    value: 'external_link',
    label: 'External Link',
    description: 'Direct link for external sharing',
    icon: <ExternalLink className="h-4 w-4" />,
    recommended: false
  },
  {
    value: 'email_attachment',
    label: 'Email Attachment',
    description: 'Send document as encrypted email attachment',
    icon: <Mail className="h-4 w-4" />,
    recommended: false
  }
]

const expirationOptions = [
  { value: 1, label: '1 hour' },
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
  { value: 720, label: '30 days' },
  { value: 0, label: 'Never expires' }
]

export function ShareDialog({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onShare,
  currentShares = []
}: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new')
  const [shareData, setShareData] = useState<ShareData>({
    recipient_email: '',
    share_type: 'client_portal',
    permissions: {
      can_view: true,
      can_download: false,
      can_comment: false,
      can_approve: false,
      can_print: false
    },
    expires_in_hours: 168, // 1 week
    custom_message: '',
    require_password: false,
    password: '',
    apply_watermark: true,
    max_views: undefined,
    max_downloads: undefined
  })
  
  const [shares, setShares] = useState<DocumentShare[]>(currentShares)
  const [loading, setLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Update shares when prop changes
  useEffect(() => {
    setShares(currentShares)
  }, [currentShares])

  // Handle share creation
  const handleCreateShare = async () => {
    if (!shareData.recipient_email || !onShare) return
    
    setLoading(true)
    try {
      await onShare(shareData)
      
      // Reset form
      setShareData({
        recipient_email: '',
        share_type: 'client_portal',
        permissions: {
          can_view: true,
          can_download: false,
          can_comment: false,
          can_approve: false,
          can_print: false
        },
        expires_in_hours: 168,
        custom_message: '',
        require_password: false,
        password: '',
        apply_watermark: true
      })
      
      // Switch to existing shares tab
      setActiveTab('existing')
      
    } catch (error) {
      console.error('Error creating share:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle permission change
  const handlePermissionChange = (permission: keyof ShareData['permissions'], value: boolean) => {
    setShareData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }))
  }

  // Copy link to clipboard
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(link)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Revoke share
  const handleRevokeShare = async (shareId: string) => {
    const confirmed = window.confirm('Are you sure you want to revoke this share?')
    if (!confirmed) return
    
    try {
      // API call to revoke share
      const response = await fetch(`/api/documents/${documentId}/shares/${shareId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setShares(prev => prev.filter(share => share.id !== shareId))
      }
    } catch (error) {
      console.error('Error revoking share:', error)
    }
  }

  // Generate QR code (mock implementation)
  const generateQRCode = (url: string) => {
    // In a real implementation, this would generate an actual QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`
  }

  const getShareTypeInfo = (type: string) => {
    return shareTypes.find(t => t.value === type) || shareTypes[0]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-orange-100 text-orange-800'
      case 'revoked':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Share "{documentTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New Share</TabsTrigger>
            <TabsTrigger value="existing">
              Existing Shares ({shares.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Share Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Email</Label>
                  <Input
                    id="recipient"
                    type="email"
                    placeholder="recipient@example.com"
                    value={shareData.recipient_email}
                    onChange={(e) => setShareData(prev => ({ 
                      ...prev, 
                      recipient_email: e.target.value 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="shareType">Share Type</Label>
                  <Select
                    value={shareData.share_type}
                    onValueChange={(value) => setShareData(prev => ({ 
                      ...prev, 
                      share_type: value as ShareData['share_type']
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shareTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            {type.icon}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span>{type.label}</span>
                                {type.recommended && (
                                  <Badge variant="secondary" className="text-xs">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expiration">Expiration</Label>
                  <Select
                    value={shareData.expires_in_hours?.toString() || '0'}
                    onValueChange={(value) => setShareData(prev => ({ 
                      ...prev, 
                      expires_in_hours: parseInt(value) || undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expirationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Custom Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message..."
                    value={shareData.custom_message}
                    onChange={(e) => setShareData(prev => ({ 
                      ...prev, 
                      custom_message: e.target.value 
                    }))}
                  />
                </div>
              </div>

              {/* Permissions & Security */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Permissions</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.permissions.can_view}
                        onCheckedChange={(checked) => handlePermissionChange('can_view', checked)}
                        disabled
                      />
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <Label>View document</Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.permissions.can_download}
                        onCheckedChange={(checked) => handlePermissionChange('can_download', checked)}
                      />
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <Label>Download document</Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.permissions.can_comment}
                        onCheckedChange={(checked) => handlePermissionChange('can_comment', checked)}
                      />
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4" />
                        <Label>Add comments</Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.permissions.can_approve}
                        onCheckedChange={(checked) => handlePermissionChange('can_approve', checked)}
                      />
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4" />
                        <Label>Approve document</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Security Options</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.apply_watermark}
                        onCheckedChange={(checked) => setShareData(prev => ({ 
                          ...prev, 
                          apply_watermark: checked 
                        }))}
                      />
                      <Label>Apply watermark</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shareData.require_password}
                        onCheckedChange={(checked) => setShareData(prev => ({ 
                          ...prev, 
                          require_password: checked 
                        }))}
                      />
                      <Label>Require password</Label>
                    </div>
                    
                    {shareData.require_password && (
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={shareData.password}
                        onChange={(e) => setShareData(prev => ({ 
                          ...prev, 
                          password: e.target.value 
                        }))}
                      />
                    )}
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="p-0 h-auto"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Options
                  </Button>
                  
                  {showAdvanced && (
                    <div className="space-y-3 mt-2">
                      <div>
                        <Label htmlFor="maxViews">Max Views</Label>
                        <Input
                          id="maxViews"
                          type="number"
                          placeholder="Unlimited"
                          value={shareData.max_views || ''}
                          onChange={(e) => setShareData(prev => ({ 
                            ...prev, 
                            max_views: parseInt(e.target.value) || undefined
                          }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="maxDownloads">Max Downloads</Label>
                        <Input
                          id="maxDownloads"
                          type="number"
                          placeholder="Unlimited"
                          value={shareData.max_downloads || ''}
                          onChange={(e) => setShareData(prev => ({ 
                            ...prev, 
                            max_downloads: parseInt(e.target.value) || undefined
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateShare}
                disabled={!shareData.recipient_email || loading}
              >
                {loading ? 'Creating...' : 'Create Share'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            {shares.length === 0 ? (
              <div className="text-center py-8">
                <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shares created yet</p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('new')}
                  className="mt-2"
                >
                  Create First Share
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => {
                  const typeInfo = getShareTypeInfo(share.share_type)
                  
                  return (
                    <Card key={share.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {typeInfo.icon}
                              <h4 className="font-medium">{share.recipient_email}</h4>
                              <Badge className={getStatusColor(share.status)}>
                                {share.status}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Type: {typeInfo.label}</p>
                              <p>Created: {new Date(share.created_at).toLocaleDateString()}</p>
                              {share.expires_at && (
                                <p>Expires: {new Date(share.expires_at).toLocaleDateString()}</p>
                              )}
                              <p>
                                Views: {share.views_count}
                                {share.max_views && ` / ${share.max_views}`}
                                {' • '}
                                Downloads: {share.downloads_count}
                                {share.max_downloads && ` / ${share.max_downloads}`}
                              </p>
                            </div>
                            
                            {/* Permissions */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(share.permissions).map(([permission, granted]) => (
                                granted && (
                                  <Badge key={permission} variant="secondary" className="text-xs">
                                    {permission.replace('can_', '').replace('_', ' ')}
                                  </Badge>
                                )
                              ))}
                            </div>
                            
                            {/* Security indicators */}
                            <div className="flex items-center space-x-3 mt-2">
                              {share.password_protected && (
                                <div className="flex items-center text-xs text-blue-600">
                                  <Key className="h-3 w-3 mr-1" />
                                  Password protected
                                </div>
                              )}
                              {share.watermark_applied && (
                                <div className="flex items-center text-xs text-green-600">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Watermarked
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(share.shared_url)}
                            >
                              {copiedLink === share.shared_url ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const qrUrl = generateQRCode(share.shared_url)
                                window.open(qrUrl, '_blank')
                              }}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeShare(share.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Share URL */}
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                          {share.shared_url}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}