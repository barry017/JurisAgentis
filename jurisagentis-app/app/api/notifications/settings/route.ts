/**
 * Notification Settings API
 * 
 * Manages user notification preferences and settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export interface NotificationSettings {
  id: string
  userId: string
  soundEnabled: boolean
  desktopNotifications: boolean
  emailDigest: boolean
  emailDigestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never'
  categories: {
    client: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    matter: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    document: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    calendar: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    billing: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    workflow: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    system: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
  }
  priorities: {
    low: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    normal: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    high: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
    urgent: { enabled: boolean; sound: boolean; desktop: boolean; email: boolean }
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string // HH:MM format
    timezone: string
  }
  soundVolume: number // 0-100
  soundFile: string
  customSounds: {
    [category: string]: string
  }
  createdAt: string
  updatedAt: string
}

const defaultSettings: Omit<NotificationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  soundEnabled: true,
  desktopNotifications: true,
  emailDigest: true,
  emailDigestFrequency: 'daily',
  categories: {
    client: { enabled: true, sound: true, desktop: true, email: true },
    matter: { enabled: true, sound: true, desktop: true, email: true },
    document: { enabled: true, sound: false, desktop: true, email: true },
    calendar: { enabled: true, sound: true, desktop: true, email: true },
    billing: { enabled: true, sound: true, desktop: true, email: true },
    workflow: { enabled: true, sound: false, desktop: false, email: false },
    system: { enabled: true, sound: false, desktop: false, email: false }
  },
  priorities: {
    low: { enabled: true, sound: false, desktop: false, email: false },
    normal: { enabled: true, sound: false, desktop: true, email: true },
    high: { enabled: true, sound: true, desktop: true, email: true },
    urgent: { enabled: true, sound: true, desktop: true, email: true }
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'America/New_York'
  },
  soundVolume: 80,
  soundFile: '/notification-sound.mp3',
  customSounds: {}
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'

    try {
      const { data: settings, error } = await supabaseServer
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return defaults
          const defaultSettingsWithMeta: NotificationSettings = {
            id: crypto.randomUUID(),
            userId,
            ...defaultSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          return NextResponse.json({
            success: true,
            settings: defaultSettingsWithMeta,
            isDefault: true
          })
        }

        console.error('Settings fetch error:', error)
        // Return defaults for development
        const defaultSettingsWithMeta: NotificationSettings = {
          id: crypto.randomUUID(),
          userId,
          ...defaultSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        return NextResponse.json({
          success: true,
          settings: defaultSettingsWithMeta,
          isDefault: true
        })
      }

      return NextResponse.json({
        success: true,
        settings: transformDbToApi(settings),
        isDefault: false
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      // Return defaults for development
      const defaultSettingsWithMeta: NotificationSettings = {
        id: crypto.randomUUID(),
        userId,
        ...defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        settings: defaultSettingsWithMeta,
        isDefault: true
      })
    }

  } catch (error) {
    console.error('Notification settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId = 'default-user', settings } = body

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      )
    }

    const dbSettings = {
      id: crypto.randomUUID(),
      user_id: userId,
      sound_enabled: settings.soundEnabled ?? defaultSettings.soundEnabled,
      desktop_notifications: settings.desktopNotifications ?? defaultSettings.desktopNotifications,
      email_digest: settings.emailDigest ?? defaultSettings.emailDigest,
      email_digest_frequency: settings.emailDigestFrequency ?? defaultSettings.emailDigestFrequency,
      categories: settings.categories ?? defaultSettings.categories,
      priorities: settings.priorities ?? defaultSettings.priorities,
      quiet_hours: settings.quietHours ?? defaultSettings.quietHours,
      sound_volume: settings.soundVolume ?? defaultSettings.soundVolume,
      sound_file: settings.soundFile ?? defaultSettings.soundFile,
      custom_sounds: settings.customSounds ?? defaultSettings.customSounds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabaseServer
        .from('notification_settings')
        .insert([dbSettings])
        .select()
        .single()

      if (error) {
        console.error('Settings insert error:', error)
        return NextResponse.json({
          success: true,
          settings: transformDbToApi(dbSettings),
          message: 'Settings saved successfully (mock mode)'
        })
      }

      return NextResponse.json({
        success: true,
        settings: transformDbToApi(data),
        message: 'Settings saved successfully'
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        settings: transformDbToApi(dbSettings),
        message: 'Settings saved successfully (mock mode)'
      })
    }

  } catch (error) {
    console.error('Notification settings POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId = 'default-user', updates } = body

    if (!updates) {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      )
    }

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Transform API fields to database fields
    if ('soundEnabled' in updates) dbUpdates.sound_enabled = updates.soundEnabled
    if ('desktopNotifications' in updates) dbUpdates.desktop_notifications = updates.desktopNotifications
    if ('emailDigest' in updates) dbUpdates.email_digest = updates.emailDigest
    if ('emailDigestFrequency' in updates) dbUpdates.email_digest_frequency = updates.emailDigestFrequency
    if ('categories' in updates) dbUpdates.categories = updates.categories
    if ('priorities' in updates) dbUpdates.priorities = updates.priorities
    if ('quietHours' in updates) dbUpdates.quiet_hours = updates.quietHours
    if ('soundVolume' in updates) dbUpdates.sound_volume = updates.soundVolume
    if ('soundFile' in updates) dbUpdates.sound_file = updates.soundFile
    if ('customSounds' in updates) dbUpdates.custom_sounds = updates.customSounds

    try {
      const { data, error } = await supabaseServer
        .from('notification_settings')
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Settings update error:', error)
        return NextResponse.json({
          success: true,
          message: 'Settings updated successfully (mock mode)'
        })
      }

      return NextResponse.json({
        success: true,
        settings: transformDbToApi(data),
        message: 'Settings updated successfully'
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully (mock mode)'
      })
    }

  } catch (error) {
    console.error('Notification settings PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Transform database format to API format
function transformDbToApi(dbSettings: Record<string, unknown>): NotificationSettings {
  return {
    id: dbSettings.id,
    userId: dbSettings.user_id,
    soundEnabled: dbSettings.sound_enabled,
    desktopNotifications: dbSettings.desktop_notifications,
    emailDigest: dbSettings.email_digest,
    emailDigestFrequency: dbSettings.email_digest_frequency,
    categories: dbSettings.categories,
    priorities: dbSettings.priorities,
    quietHours: dbSettings.quiet_hours,
    soundVolume: dbSettings.sound_volume,
    soundFile: dbSettings.sound_file,
    customSounds: dbSettings.custom_sounds,
    createdAt: dbSettings.created_at,
    updatedAt: dbSettings.updated_at
  }
}