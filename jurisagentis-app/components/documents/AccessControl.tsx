/**
 * Access Control Component - Permission management UI for documents
 * T069: Access control component for Document Management System
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Share,
  Key,
  Clock,
  User,
  Users,
  Mail,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

interface AccessControlProps {
  documentId: string
  currentUserId: string
  onAccessUpdate?: () => void
  showInheritance?: boolean
  readOnly?: boolean
}

interface AccessRecord {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_avatar?: string
  access_level: 'view' | 'comment' | 'edit' | 'manage'
  permissions: {
    can_view: boolean
    can_download: boolean
    can_comment: boolean
    can_edit: boolean
    can_share: boolean
    can_manage: boolean
    can_approve: boolean
  }
  granted_by: string
  granted_at: Date
  expires_at?: Date
  access_reason?: string
  status: 'active' | 'expired' | 'revoked'
  last_accessed?: Date
}

interface UserSearchResult {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  department?: string
}

const accessLevels = [
  {
    value: 'view',
    label: 'Viewer',
    description: 'Can view and download the document',
    permissions: {
      can_view: true,
      can_download: true,
      can_comment: false,
      can_edit: false,
      can_share: false,
      can_manage: false,
      can_approve: false
    }
  },
  {
    value: 'comment',
    label: 'Commenter',
    description: 'Can view, download, and add comments',
    permissions: {
      can_view: true,
      can_download: true,
      can_comment: true,
      can_edit: false,
      can_share: false,
      can_manage: false,
      can_approve: false
    }
  },
  {
    value: 'edit',
    label: 'Editor',
    description: 'Can view, download, comment, and edit content',
    permissions: {
      can_view: true,
      can_download: true,
      can_comment: true,
      can_edit: true,
      can_share: false,
      can_manage: false,
      can_approve: false
    }
  },
  {
    value: 'manage',
    label: 'Manager',
    description: 'Full access including sharing and user management',
    permissions: {
      can_view: true,
      can_download: true,
      can_comment: true,
      can_edit: true,
      can_share: true,
      can_manage: true,
      can_approve: true
    }
  }
]

export function AccessControl({
  documentId,
  currentUserId,
  onAccessUpdate,
  showInheritance = true,
  readOnly = false
}: AccessControlProps) {
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('view')
  const [customPermissions, setCustomPermissions] = useState(accessLevels[0].permissions)
  const [expirationDate, setExpirationDate] = useState('')
  const [accessReason, setAccessReason] = useState('')
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'inheritance'>('users')

  // Fetch access records
  const fetchAccessRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/documents/${documentId}/access`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch access records')
      }
      
      const data = await response.json()
      
      // Mock data for demonstration
      const mockAccessRecords: AccessRecord[] = [
        {
          id: '1',
          user_id: currentUserId,
          user_name: 'You',
          user_email: 'current.user@example.com',
          access_level: 'manage',
          permissions: accessLevels[3].permissions,
          granted_by: 'system',
          granted_at: new Date('2024-01-01'),
          status: 'active',
          access_reason: 'Document owner'
        },
        {
          id: '2',
          user_id: '2',
          user_name: 'Sarah Chen',
          user_email: 'sarah.chen@example.com',
          access_level: 'edit',
          permissions: accessLevels[2].permissions,
          granted_by: currentUserId,
          granted_at: new Date('2024-01-15'),
          expires_at: new Date('2024-12-31'),
          status: 'active',
          access_reason: 'Collaborating on document review',
          last_accessed: new Date('2024-01-20')
        },
        {
          id: '3',
          user_id: '3',
          user_name: 'Mike Johnson',
          user_email: 'mike.johnson@example.com',
          access_level: 'comment',
          permissions: accessLevels[1].permissions,
          granted_by: currentUserId,
          granted_at: new Date('2024-01-10'),
          status: 'active',
          access_reason: 'Client review and feedback'
        }
      ]
      
      setAccessRecords(data.access_records || mockAccessRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access records')
      console.error('Error fetching access records:', err)
    } finally {
      setLoading(false)
    }
  }

  // Search users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }
    
    try {
      // Mock user search results
      const mockUsers: UserSearchResult[] = [
        {
          id: '4',
          name: 'Alice Smith',
          email: 'alice.smith@example.com',
          role: 'Attorney',
          department: 'Corporate Law'
        },
        {
          id: '5',
          name: 'Bob Wilson',
          email: 'bob.wilson@example.com',
          role: 'Paralegal',
          department: 'Litigation'
        },
        {
          id: '6',
          name: 'Carol Davis',
          email: 'carol.davis@example.com',
          role: 'Legal Assistant',
          department: 'Family Law'
        }
      ].filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      )
      
      setUserSearchResults(mockUsers)
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  // Grant access
  const handleGrantAccess = async () => {
    if (!selectedUser) return
    
    try {
      const accessData = {
        user_id: selectedUser.id,
        access_level: selectedAccessLevel,
        permissions: useCustomPermissions ? customPermissions : 
          accessLevels.find(level => level.value === selectedAccessLevel)?.permissions,
        expires_at: expirationDate || undefined,
        access_reason: accessReason || undefined
      }
      
      const response = await fetch(`/api/documents/${documentId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to grant access')
      }
      
      // Reset form and refresh
      setShowAddDialog(false)
      setSelectedUser(null)
      setSelectedAccessLevel('view')
      setExpirationDate('')
      setAccessReason('')
      setUseCustomPermissions(false)
      fetchAccessRecords()
      onAccessUpdate?.()
      
    } catch (error) {
      console.error('Error granting access:', error)
    }
  }

  // Revoke access
  const handleRevokeAccess = async (accessId: string) => {
    const confirmed = window.confirm('Are you sure you want to revoke this access?')
    if (!confirmed) return
    
    try {
      const response = await fetch(`/api/documents/${documentId}/access/${accessId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to revoke access')
      }
      
      fetchAccessRecords()
      onAccessUpdate?.()
    } catch (error) {
      console.error('Error revoking access:', error)
    }
  }

  // Update permissions
  const handleUpdatePermissions = (permission: keyof typeof customPermissions, value: boolean) => {
    setCustomPermissions(prev => ({
      ...prev,
      [permission]: value
    }))
  }

  useEffect(() => {
    fetchAccessRecords()
  }, [documentId])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const getStatusIcon = (status: AccessRecord['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'expired':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'revoked':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'view':
        return 'bg-blue-100 text-blue-800'
      case 'comment':
        return 'bg-green-100 text-green-800'
      case 'edit':
        return 'bg-yellow-100 text-yellow-800'
      case 'manage':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-2">Loading access controls...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading access controls: {error}</p>
            <Button onClick={fetchAccessRecords} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Access Control
            </CardTitle>
            
            {!readOnly && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Grant Access
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Grant Document Access</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* User Search */}
                    <div>
                      <label className="block text-sm font-medium mb-2">User</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search users by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {userSearchResults.length > 0 && (
                        <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <div
                              key={user.id}
                              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                                selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                              onClick={() => setSelectedUser(user)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{user.name}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-500">{user.role} - {user.department}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedUser && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                              {selectedUser.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{selectedUser.name}</p>
                              <p className="text-xs text-gray-600">{selectedUser.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(null)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Access Level */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Access Level</label>
                      <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {accessLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div>
                                <div className="font-medium">{level.label}</div>
                                <div className="text-xs text-gray-500">{level.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Permissions */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={useCustomPermissions}
                        onCheckedChange={setUseCustomPermissions}
                      />
                      <label className="text-sm font-medium">Custom permissions</label>
                    </div>

                    {useCustomPermissions && (
                      <div className="grid grid-cols-2 gap-3 p-4 border rounded-md">
                        {Object.entries(customPermissions).map(([permission, value]) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) => handleUpdatePermissions(permission as any, checked)}
                            />
                            <label className="text-sm">
                              {permission.replace('can_', '').replace('_', ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expiration */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiration Date (Optional)</label>
                      <Input
                        type="datetime-local"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                      />
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Access Reason (Optional)</label>
                      <Textarea
                        placeholder="Why is this access being granted?"
                        value={accessReason}
                        onChange={(e) => setAccessReason(e.target.value)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleGrantAccess}
                        disabled={!selectedUser}
                      >
                        Grant Access
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList>
              <TabsTrigger value="users">
                <User className="h-4 w-4 mr-2" />
                Users ({accessRecords.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                <Users className="h-4 w-4 mr-2" />
                Groups
              </TabsTrigger>
              {showInheritance && (
                <TabsTrigger value="inheritance">
                  <Settings className="h-4 w-4 mr-2" />
                  Inheritance
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {accessRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No access records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accessRecords.map((record) => (
                    <Card key={record.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                              {record.user_name.charAt(0)}
                            </div>
                            
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium">{record.user_name}</h4>
                                {getStatusIcon(record.status)}
                              </div>
                              <p className="text-sm text-gray-500">{record.user_email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getAccessLevelColor(record.access_level)}>
                                  {accessLevels.find(l => l.value === record.access_level)?.label}
                                </Badge>
                                {record.expires_at && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expires {new Date(record.expires_at).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="text-right text-sm text-gray-500">
                              <p>Granted {new Date(record.granted_at).toLocaleDateString()}</p>
                              {record.last_accessed && (
                                <p>Last used {new Date(record.last_accessed).toLocaleDateString()}</p>
                              )}
                            </div>
                            
                            {!readOnly && record.user_id !== currentUserId && (
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Edit access dialog would go here
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeAccess(record.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {record.access_reason && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-600">
                              <strong>Reason:</strong> {record.access_reason}
                            </p>
                          </div>
                        )}
                        
                        {/* Permissions breakdown */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(record.permissions).map(([permission, granted]) => (
                              granted && (
                                <Badge key={permission} variant="secondary" className="text-xs">
                                  {permission.replace('can_', '').replace('_', ' ')}
                                </Badge>
                              )
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Group access management coming soon</p>
              </div>
            </TabsContent>

            {showInheritance && (
              <TabsContent value="inheritance" className="space-y-4">
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Access inheritance settings coming soon</p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}