'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { 
  CameraIcon,
  XMarkIcon,
  ArrowPathIcon,
  PhotoIcon,
  AdjustmentsHorizontalIcon,
  TagIcon
} from '@heroicons/react/24/outline'

interface ScannedDocument {
  id: string
  name: string
  pages: DocumentPage[]
  created_at: string
  case_id?: string
  client_id?: string
  tags: string[]
  file_size: number
  status: 'processing' | 'ready' | 'failed'
}

interface DocumentPage {
  id: string
  image_url: string
  processed_url?: string
  page_number: number
  detected_text?: string
  confidence_score?: number
  corrections: {
    rotation: number
    crop: {
      x: number
      y: number
      width: number
      height: number
    }
    brightness: number
    contrast: number
    auto_enhance: boolean
  }
}

interface CameraCapture {
  blob: Blob
  url: string
  timestamp: number
}

export default function DocumentScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [captures, setCaptures] = useState<CameraCapture[]>([])
  const [currentDocument, setCurrentDocument] = useState<ScannedDocument | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedPage, setSelectedPage] = useState<DocumentPage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [selectedCase, setSelectedCase] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Camera stream management
  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      if (!isScanning) return

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch (error) {
        console.error('Failed to start camera:', error)
        alert('Camera access denied or not available')
        setIsScanning(false)
      }
    }

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }

    if (isScanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isScanning])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const capture: CameraCapture = {
          blob,
          url,
          timestamp: Date.now()
        }

        setCaptures(prev => [...prev, capture])

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }

        // Play camera sound effect
        const audio = new Audio('/sounds/camera-shutter.mp3')
        audio.play().catch(() => {
          // Ignore if sound fails to play
        })
      }
    }, 'image/jpeg', 0.9)
  }

  const removeCapture = (index: number) => {
    setCaptures(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].url)
      updated.splice(index, 1)
      return updated
    })
  }

  const selectFromGallery = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        const capture: CameraCapture = {
          blob: file,
          url,
          timestamp: Date.now()
        }
        setCaptures(prev => [...prev, capture])
      }
    })

    // Clear the input
    event.target.value = ''
  }

  const processDocument = async () => {
    if (captures.length === 0) return

    setIsProcessing(true)

    try {
      const pages: DocumentPage[] = captures.map((capture, index) => ({
        id: `page_${index + 1}`,
        image_url: capture.url,
        page_number: index + 1,
        corrections: {
          rotation: 0,
          crop: { x: 0, y: 0, width: 100, height: 100 },
          brightness: 0,
          contrast: 0,
          auto_enhance: true
        }
      }))

      // Simulate OCR processing
      for (let i = 0; i < pages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate processing time
        
        // Mock OCR results
        pages[i].detected_text = `This is sample extracted text from page ${i + 1}. In a real implementation, this would be the actual text detected from the image using OCR technology.`
        pages[i].confidence_score = Math.random() * 0.3 + 0.7 // 70-100% confidence
        pages[i].processed_url = pages[i].image_url // In reality, this would be the enhanced image
      }

      const document: ScannedDocument = {
        id: Date.now().toString(),
        name: documentName || `Scanned Document ${new Date().toLocaleDateString()}`,
        pages,
        created_at: new Date().toISOString(),
        case_id: selectedCase || undefined,
        client_id: selectedClient || undefined,
        tags: [...tags],
        file_size: captures.reduce((total, capture) => total + capture.blob.size, 0),
        status: 'ready'
      }

      setCurrentDocument(document)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to process document:', error)
      alert('Failed to process document. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveDocument = async () => {
    if (!currentDocument) return

    try {
      // In a real implementation, this would upload to the server
      const formData = new FormData()
      
      formData.append('name', currentDocument.name)
      formData.append('case_id', currentDocument.case_id || '')
      formData.append('client_id', currentDocument.client_id || '')
      formData.append('tags', JSON.stringify(currentDocument.tags))
      
      currentDocument.pages.forEach((page, index) => {
        const capture = captures[index]
        if (capture) {
          formData.append(`page_${index}`, capture.blob, `page_${index + 1}.jpg`)
        }
      })

      console.log('Document saved:', currentDocument)
      
      // Save to localStorage for demo
      const savedDocs = JSON.parse(localStorage.getItem('scanned-documents') || '[]')
      savedDocs.unshift(currentDocument)
      localStorage.setItem('scanned-documents', JSON.stringify(savedDocs))

      // Reset state
      setCaptures([])
      setCurrentDocument(null)
      setShowPreview(false)
      setIsScanning(false)
      setDocumentName('')
      setSelectedCase('')
      setSelectedClient('')
      setTags([])

      alert('Document saved successfully!')
    } catch (error) {
      console.error('Failed to save document:', error)
      alert('Failed to save document. Please try again.')
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const enhancePage = (pageId: string) => {
    // Simulate image enhancement
    console.log('Enhancing page:', pageId)
    // In reality, this would apply AI-powered image enhancement
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Document Scanner</h1>
                <p className="text-sm text-gray-500">
                  {captures.length > 0 ? `${captures.length} page(s) captured` : 'Scan documents'}
                </p>
              </div>
            </div>

            {captures.length > 0 && !isProcessing && (
              <button
                onClick={processDocument}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 px-4 text-sm font-medium transition-colors"
              >
                Process
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      {isScanning && (
        <div className="relative h-screen-safe bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* Camera Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Top Controls */}
            <div className="flex-1 flex items-start justify-between p-4">
              <button
                onClick={() => setIsScanning(false)}
                className="bg-black/50 text-white rounded-full p-3 backdrop-blur-sm"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              
              <div className="bg-black/50 text-white rounded-full px-4 py-2 backdrop-blur-sm">
                <span className="text-sm font-medium">{captures.length} captured</span>
              </div>
            </div>

            {/* Document Guide */}
            <div className="flex-1 flex items-center justify-center">
              <div className="border-2 border-white/50 rounded-lg w-80 h-56 relative">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-white"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-white"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-white"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-white"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm bg-black/50 px-3 py-1 rounded backdrop-blur-sm">
                    Align document within frame
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-center p-8 space-x-8">
              <button
                onClick={selectFromGallery}
                className="bg-white/20 text-white rounded-full p-4 backdrop-blur-sm"
              >
                <PhotoIcon className="h-6 w-6" />
              </button>

              <button
                onClick={capturePhoto}
                className="bg-white rounded-full p-6 shadow-lg active:scale-95 transition-transform"
              >
                <CameraIcon className="h-8 w-8 text-gray-900" />
              </button>

              <button
                onClick={() => {/* Switch camera */}}
                className="bg-white/20 text-white rounded-full p-4 backdrop-blur-sm"
              >
                <ArrowPathIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {showPreview && currentDocument && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
                
                <h2 className="text-lg font-semibold text-gray-900">Preview Document</h2>
                
                <button
                  onClick={saveDocument}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 px-4 text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="bg-gray-100 border-b border-gray-200 p-2">
              <div className="flex space-x-2 overflow-x-auto">
                {currentDocument.pages.map((page, _index) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className={`flex-shrink-0 w-16 h-20 border-2 rounded overflow-hidden relative ${
                      selectedPage?.id === page.id ? 'border-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    <Image
                      src={page.image_url}
                      alt={`Page ${page.page_number}`}
                      className="w-full h-full object-cover"
                      fill
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Main Preview */}
            <div className="flex-1 bg-gray-900 p-4 overflow-auto">
              {selectedPage && (
                <div className="max-w-lg mx-auto">
                  <div className="relative w-full aspect-[3/4]">
                    <Image
                      src={selectedPage.image_url}
                      alt={`Page ${selectedPage.page_number}`}
                      className="w-full rounded-lg shadow-lg object-contain"
                      fill
                      sizes="(max-width: 768px) 100vw, 512px"
                    />
                  </div>
                  
                  {/* Page Controls */}
                  <div className="mt-4 flex justify-center space-x-4">
                    <button
                      onClick={() => enhancePage(selectedPage.id)}
                      className="bg-white/20 text-white rounded-lg py-2 px-4 text-sm font-medium backdrop-blur-sm"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 inline mr-2" />
                      Enhance
                    </button>
                    
                    <button className="bg-white/20 text-white rounded-lg py-2 px-4 text-sm font-medium backdrop-blur-sm">
                      <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                      Rotate
                    </button>
                  </div>

                  {/* OCR Text */}
                  {selectedPage.detected_text && (
                    <div className="mt-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <h3 className="text-white font-medium mb-2">Extracted Text</h3>
                      <p className="text-white/80 text-sm">{selectedPage.detected_text}</p>
                      <div className="mt-2 text-white/60 text-xs">
                        Confidence: {Math.round((selectedPage.confidence_score || 0) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      {!isScanning && !showPreview && (
        <div className="p-4 space-y-6">
          {/* Captured Pages */}
          {captures.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Captured Pages</h2>
              <div className="grid grid-cols-3 gap-3">
                {captures.map((capture, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full h-24">
                      <Image
                        src={capture.url}
                        alt={`Capture ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        fill
                        sizes="96px"
                      />
                    </div>
                    <button
                      onClick={() => removeCapture(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Metadata */}
          {captures.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Enter document name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Case
                    </label>
                    <select
                      value={selectedCase}
                      onChange={(e) => setSelectedCase(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select case...</option>
                      <option value="case1">Smith vs. Smith</option>
                      <option value="case2">TechStartup Inc.</option>
                      <option value="case3">Estate Planning - Williams</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select client...</option>
                      <option value="client1">John Smith</option>
                      <option value="client2">TechStartup Inc.</option>
                      <option value="client3">Mary Williams</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={addTag}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-3"
                    >
                      <TagIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setIsScanning(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-4 px-6 font-medium text-lg flex items-center justify-center space-x-3 transition-colors"
            >
              <CameraIcon className="h-6 w-6" />
              <span>Scan Document</span>
            </button>

            <button
              onClick={selectFromGallery}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-3 px-6 font-medium flex items-center justify-center space-x-3 transition-colors"
            >
              <PhotoIcon className="h-5 w-5" />
              <span>Choose from Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Document</h3>
              <p className="text-gray-600 text-sm">
                Enhancing images and extracting text...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}