/**
 * Aida Command Interface - Sophisticated command system for legal practice management
 * Implements FR-030 to FR-044: Command interface with auto-complete and contextual understanding
 */

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  PaperAirplaneIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  // MagnifyingGlassIcon,
  // ClockIcon,
  SparklesIcon,
  DocumentTextIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'

// Command interface types implementing FR-030 to FR-044
interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  type: 'client' | 'attorney' | 'staff' | 'related_party' | 'external'
  relationship?: string
  aliases?: string[]
  context?: {
    active_cases?: string[]
    recent_communications?: string[]
    preferences?: {
      communication_method?: 'email' | 'phone' | 'text'
      tone?: 'professional' | 'casual' | 'formal'
    }
  }
}

interface CommandSuggestion {
  id: string
  command: string
  description: string
  category: 'email' | 'call' | 'text' | 'schedule' | 'document' | 'case'
  parameters?: string[]
  examples?: string[]
}

interface ParsedCommand {
  type: 'email' | 'call' | 'text' | 'schedule' | 'document' | 'case' | 'unknown'
  contact?: Contact
  message?: string
  documentType?: string      // For document commands
  templateName?: string      // For template creation
  parameters: {
    sendImmediately?: boolean  // -si
    useTemplate?: string       // -t "template_name"
    saveDraft?: boolean        // -d
    urgent?: boolean           // -u
    copy?: string[]            // -cc email1,email2
    blind_copy?: string[]      // -bcc email1,email2
    subject?: string           // -s "subject"
    followUp?: string          // -f "2 days"
    reviewMode?: boolean       // -r (review before generation)
    generateForm?: boolean     // -f (generate intake form for missing data)
  }
  raw: string
  isValid: boolean
  errors?: string[]
}

interface AidaCommandInterfaceProps {
  onCommandExecute: (command: ParsedCommand) => Promise<void>
  contacts?: Contact[]
  className?: string
}

export function AidaCommandInterface({ onCommandExecute, contacts = [], className = '' }: AidaCommandInterfaceProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<(Contact | CommandSuggestion)[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Mock contacts data (in production, this would come from API)
  const mockContacts: Contact[] = useMemo(() => [
    {
      id: '1',
      name: 'Andrea Barry',
      email: 'austi0293@gmail.com',
      phone: '(555) 123-4567',
      type: 'related_party',
      relationship: 'wife',
      aliases: ['my wife', 'andrea', 'wife'],
      context: {
        preferences: {
          communication_method: 'email',
          tone: 'casual'
        }
      }
    },
    {
      id: '2',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 987-6543',
      type: 'client',
      aliases: ['john', 'smith'],
      context: {
        active_cases: ['Estate Planning - Smith Family Trust'],
        preferences: {
          communication_method: 'email',
          tone: 'professional'
        }
      }
    },
    {
      id: '3',
      name: 'Johnny Miller',
      email: 'johnny.miller@law.com',
      phone: '(555) 456-7890',
      type: 'attorney',
      aliases: ['johnny', 'miller'],
      context: {
        preferences: {
          communication_method: 'email',
          tone: 'professional'
        }
      }
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah.williams@client.com',
      phone: '(555) 321-0987',
      type: 'client',
      aliases: ['sarah', 'williams'],
      context: {
        active_cases: ['Business Formation - Williams LLC'],
        preferences: {
          communication_method: 'phone',
          tone: 'professional'
        }
      }
    }
  ], [])

  const allContacts = useMemo(() => [...contacts, ...mockContacts], [contacts, mockContacts])

  // Command suggestions implementing FR-030 to FR-044
  const commandSuggestions: CommandSuggestion[] = useMemo(() => [
    {
      id: 'email-basic',
      command: '/email @contact "message"',
      description: 'Send email to contact with collaborative drafting',
      category: 'email',
      parameters: ['-si (send immediately)', '-t "template" (use template)', '-d (save draft)'],
      examples: [
        '/email @john-smith "Trust documents ready for review"',
        '/email @client -t "Welcome Email" -si',
        '/email @andrea "Running late, see you at dinner"'
      ]
    },
    {
      id: 'email-template',
      command: '/email @contact -t "template_name"',
      description: 'Send templated email with auto-send option',
      category: 'email',
      examples: [
        '/email @new-client -t "Welcome Email" -si',
        '/email @john-smith -t "Document Review Request"'
      ]
    },
    {
      id: 'call-schedule',
      command: '/call @contact',
      description: 'Schedule or initiate call with contact',
      category: 'call',
      examples: [
        '/call @john-smith',
        '/call @opposing-counsel "settlement discussion"'
      ]
    },
    {
      id: 'text-message',
      command: '/text @contact "message"',
      description: 'Send text message to contact',
      category: 'text',
      examples: [
        '/text @andrea "Running 10 minutes late"',
        '/text @client "Documents are ready for pickup"'
      ]
    },
    {
      id: 'document-generate',
      command: '/document @contact "document_type"',
      description: 'Generate legal document for client using AI',
      category: 'document',
      parameters: ['-t "template" (use specific template)', '-r (review mode)', '-f (generate intake form)'],
      examples: [
        '/document @john-smith "revocable trust"',
        '/document @married-couple "joint trust"',
        '/document @client "LLC formation" -r',
        '/document @john-smith "power of attorney" -f'
      ]
    },
    {
      id: 'document-template',
      command: '/document create-template "type"',
      description: 'Create new document template with AI assistance',
      category: 'document',
      examples: [
        '/document create-template "revocable trust"',
        '/document create-template "LLC operating agreement"'
      ]
    }
  ], [])

  // Parse command input implementing FR-031 and FR-032
  const parseCommand = useCallback((input: string): ParsedCommand => {
    const trimmed = input.trim()
    
    if (!trimmed.startsWith('/')) {
      return {
        type: 'unknown',
        parameters: {},
        raw: input,
        isValid: false,
        errors: ['Commands must start with /']
      }
    }

    // Extract command type
    const commandMatch = trimmed.match(/^\/(\w+)/)
    if (!commandMatch) {
      return {
        type: 'unknown',
        parameters: {},
        raw: input,
        isValid: false,
        errors: ['Invalid command format']
      }
    }

    const commandType = commandMatch[1] as ParsedCommand['type']
    
    // Extract @contact mention with fuzzy search support (FR-032)
    const contactMatch = trimmed.match(/@([a-zA-Z0-9\-_\s]+)/)
    let contact: Contact | undefined
    const contactErrors: string[] = []

    if (contactMatch) {
      const contactQuery = contactMatch[1].trim().toLowerCase()
      
      // Find matching contacts with fuzzy search
      const matchingContacts = allContacts.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(contactQuery)
        const emailMatch = c.email.toLowerCase().includes(contactQuery)
        const aliasMatch = c.aliases?.some(alias => alias.toLowerCase().includes(contactQuery))
        return nameMatch || emailMatch || aliasMatch
      })

      if (matchingContacts.length === 0) {
        contactErrors.push(`No contact found matching "${contactQuery}"`)
      } else if (matchingContacts.length > 1) {
        // Multiple matches - need clarification (FR-032)
        contactErrors.push(`Multiple contacts match "${contactQuery}": ${matchingContacts.map(c => c.name).join(', ')}`)
      } else {
        contact = matchingContacts[0]
      }
    }

    // Extract message content or document type
    const messageMatch = trimmed.match(/"([^"]*)"/)
    let message = messageMatch ? messageMatch[1] : undefined
    let documentType: string | undefined
    let templateName: string | undefined

    // Handle document commands specially
    if (commandType === 'document') {
      if (trimmed.includes('create-template')) {
        templateName = message
        message = undefined
      } else {
        documentType = message
        message = undefined
      }
    }

    // Extract parameters (FR-033)
    const parameters: ParsedCommand['parameters'] = {}
    
    if (trimmed.includes('-si')) parameters.sendImmediately = true
    if (trimmed.includes('-d')) parameters.saveDraft = true
    if (trimmed.includes('-u')) parameters.urgent = true
    if (trimmed.includes('-r')) parameters.reviewMode = true
    if (trimmed.includes('-f') && commandType === 'document') parameters.generateForm = true

    const templateMatch = trimmed.match(/-t\s+"([^"]+)"/)
    if (templateMatch) parameters.useTemplate = templateMatch[1]

    const subjectMatch = trimmed.match(/-s\s+"([^"]+)"/)
    if (subjectMatch) parameters.subject = subjectMatch[1]

    const ccMatch = trimmed.match(/-cc\s+([^\s]+)/)
    if (ccMatch) parameters.copy = ccMatch[1].split(',')

    const bccMatch = trimmed.match(/-bcc\s+([^\s]+)/)
    if (bccMatch) parameters.blind_copy = bccMatch[1].split(',')

    const followUpMatch = trimmed.match(/-f\s+"([^"]+)"/)
    if (followUpMatch && commandType !== 'document') parameters.followUp = followUpMatch[1]

    // Validate command
    const errors: string[] = [...contactErrors]
    
    if (['email', 'text'].includes(commandType) && !message && !parameters.useTemplate) {
      errors.push('Message content or template required')
    }

    if (commandType === 'email' && !contact) {
      errors.push('Contact required for email command')
    }

    if (commandType === 'document') {
      if (trimmed.includes('create-template')) {
        if (!templateName) {
          errors.push('Template name required for template creation')
        }
      } else {
        if (!contact) {
          errors.push('Contact required for document generation')
        }
        if (!documentType) {
          errors.push('Document type required (e.g., "revocable trust", "LLC formation")')
        }
      }
    }

    return {
      type: commandType,
      contact,
      message,
      documentType,
      templateName,
      parameters,
      raw: input,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }, [allContacts])

  // Generate suggestions based on current input (FR-031)
  const generateSuggestions = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase()
    
    if (!trimmed || !trimmed.startsWith('/')) {
      // Show command suggestions
      return commandSuggestions.slice(0, 5)
    }

    // Check if user is typing @contact
    const atIndex = trimmed.lastIndexOf('@')
    if (atIndex !== -1 && atIndex < trimmed.length - 1) {
      const contactQuery = trimmed.substring(atIndex + 1)
      
      // Filter contacts based on query
      const matchingContacts = allContacts.filter(contact => {
        const nameMatch = contact.name.toLowerCase().includes(contactQuery)
        const emailMatch = contact.email.toLowerCase().includes(contactQuery)
        const aliasMatch = contact.aliases?.some(alias => alias.toLowerCase().includes(contactQuery))
        return nameMatch || emailMatch || aliasMatch
      }).slice(0, 10)

      return matchingContacts
    }

    // Show relevant command suggestions based on what's typed
    const relevantCommands = commandSuggestions.filter(cmd => 
      cmd.command.toLowerCase().includes(trimmed) ||
      cmd.description.toLowerCase().includes(trimmed)
    )

    return relevantCommands.slice(0, 5)
  }, [allContacts, commandSuggestions])

  // Handle input changes
  useEffect(() => {
    const parsed = parseCommand(input)
    setParsedCommand(parsed)

    const newSuggestions = generateSuggestions(input)
    setSuggestions(newSuggestions)
    setShowSuggestions(newSuggestions.length > 0 && input.length > 0)
    setSelectedSuggestion(0)
  }, [input, parseCommand, generateSuggestions])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedSuggestion(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestion(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
        case 'Tab':
        case 'Enter':
          if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault()
            applySuggestion(suggestions[selectedSuggestion])
          }
          break
        case 'Escape':
          setShowSuggestions(false)
          break
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleExecuteCommand()
    }
  }

  // Apply selected suggestion
  const applySuggestion = (suggestion: Contact | CommandSuggestion) => {
    if ('email' in suggestion) {
      // It's a Contact
      const contact = suggestion as Contact
      const atIndex = input.lastIndexOf('@')
      if (atIndex !== -1) {
        const beforeAt = input.substring(0, atIndex + 1)
        const _afterContact = input.substring(input.lastIndexOf(' ', atIndex) === -1 ? input.length : input.lastIndexOf(' ', atIndex))
        setInput(`${beforeAt}${contact.name.toLowerCase().replace(/\s+/g, '-')} `)
      }
    } else {
      // It's a CommandSuggestion
      const command = suggestion as CommandSuggestion
      setInput(command.command + ' ')
    }
    
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Execute command
  const handleExecuteCommand = async () => {
    if (!parsedCommand || !parsedCommand.isValid || isProcessing) return

    setIsProcessing(true)
    
    try {
      await onCommandExecute(parsedCommand)
      setInput('') // Clear input after successful execution
    } catch (error) {
      console.error('Command execution failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Command Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CommandLineIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter Aida command: /email @contact &quot;message&quot; or start typing..."
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={isProcessing}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {isProcessing ? (
            <div className="pr-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <button
              onClick={handleExecuteCommand}
              disabled={!parsedCommand?.isValid}
              className={`mr-2 p-2 rounded-lg transition-colors ${
                parsedCommand?.isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Command Status */}
      {parsedCommand && (
        <div className="mt-2">
          {parsedCommand.isValid ? (
            <div className="flex items-center text-sm text-green-600">
              <SparklesIcon className="h-4 w-4 mr-1" />
              <span>
                {parsedCommand.type === 'email' && parsedCommand.contact && (
                  <>Ready to email {parsedCommand.contact.name}</>
                )}
                {parsedCommand.parameters.sendImmediately && (
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                    Send Immediately
                  </span>
                )}
                {parsedCommand.parameters.useTemplate && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Template: {parsedCommand.parameters.useTemplate}
                  </span>
                )}
              </span>
            </div>
          ) : parsedCommand.errors && (
            <div className="text-sm text-red-600">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <div>
                  {parsedCommand.errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={'email' in suggestion ? suggestion.id : suggestion.id}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedSuggestion ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => applySuggestion(suggestion)}
            >
              {'email' in suggestion ? (
                // Contact suggestion
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      suggestion.type === 'client' ? 'bg-green-100' :
                      suggestion.type === 'attorney' ? 'bg-blue-100' :
                      suggestion.type === 'staff' ? 'bg-purple-100' :
                      suggestion.type === 'related_party' ? 'bg-pink-100' :
                      'bg-gray-100'
                    }`}>
                      <UserIcon className={`h-4 w-4 ${
                        suggestion.type === 'client' ? 'text-green-600' :
                        suggestion.type === 'attorney' ? 'text-blue-600' :
                        suggestion.type === 'staff' ? 'text-purple-600' :
                        suggestion.type === 'related_party' ? 'text-pink-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {suggestion.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {suggestion.email}
                      {suggestion.relationship && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({suggestion.relationship})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      suggestion.type === 'client' ? 'bg-green-100 text-green-800' :
                      suggestion.type === 'attorney' ? 'bg-blue-100 text-blue-800' :
                      suggestion.type === 'staff' ? 'bg-purple-100 text-purple-800' :
                      suggestion.type === 'related_party' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ) : (
                // Command suggestion
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      {suggestion.category === 'email' && <EnvelopeIcon className="h-4 w-4 text-indigo-600" />}
                      {suggestion.category === 'call' && <PhoneIcon className="h-4 w-4 text-indigo-600" />}
                      {suggestion.category === 'text' && <ChatBubbleLeftRightIcon className="h-4 w-4 text-indigo-600" />}
                      {suggestion.category === 'document' && <DocumentTextIcon className="h-4 w-4 text-indigo-600" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-mono">
                      {suggestion.command}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {suggestion.description}
                    </p>
                    {suggestion.examples && suggestion.examples.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        Example: {suggestion.examples[0]}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}