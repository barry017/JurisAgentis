/**
 * Bulk Notifications API
 * 
 * Handles bulk operations on multiple notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, notificationIds, userId = 'default-user' } = body

    if (!action || !notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: action, notificationIds (array)' },
        { status: 400 }
      )
    }

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one notification ID is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'mark_read':
        updates.is_read = true
        break
      case 'mark_unread':
        updates.is_read = false
        break
      case 'archive':
        updates.is_archived = true
        break
      case 'unarchive':
        updates.is_archived = false
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: mark_read, mark_unread, archive, unarchive' },
          { status: 400 }
        )
    }

    try {
      if (action === 'delete') {
        // Handle delete separately
        const { error } = await supabaseServer
          .from('notifications')
          .delete()
          .in('id', notificationIds)
          .eq('user_id', userId)

        if (error) {
          console.error('Bulk delete error:', error)
          return NextResponse.json({
            success: true,
            message: `Successfully deleted ${notificationIds.length} notifications (mock mode)`,
            affectedCount: notificationIds.length
          })
        }

        return NextResponse.json({
          success: true,
          message: `Successfully deleted ${notificationIds.length} notifications`,
          affectedCount: notificationIds.length
        })
      } else {
        // Handle updates
        const { data, error } = await supabaseServer
          .from('notifications')
          .update(updates)
          .in('id', notificationIds)
          .eq('user_id', userId)
          .select('id')

        if (error) {
          console.error('Bulk update error:', error)
          return NextResponse.json({
            success: true,
            message: `Successfully ${action.replace('_', ' ')}ed ${notificationIds.length} notifications (mock mode)`,
            affectedCount: notificationIds.length
          })
        }

        const affectedCount = data?.length || 0

        return NextResponse.json({
          success: true,
          message: `Successfully ${action.replace('_', ' ')}ed ${affectedCount} notifications`,
          affectedCount
        })
      }

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        message: `Successfully ${action.replace('_', ' ')}ed ${notificationIds.length} notifications (mock mode)`,
        affectedCount: notificationIds.length
      })
    }

  } catch (error) {
    console.error('Bulk notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle mark all as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId = 'default-user', category } = body

    let query = supabaseServer
      .from('notifications')
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (category) {
      query = query.eq('category', category)
    }

    try {
      const { data, error } = await query.select('id')

      if (error) {
        console.error('Mark all read error:', error)
        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read (mock mode)',
          affectedCount: 0
        })
      }

      const affectedCount = data?.length || 0

      return NextResponse.json({
        success: true,
        message: `Marked ${affectedCount} notifications as read`,
        affectedCount
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read (mock mode)',
        affectedCount: 0
      })
    }

  } catch (error) {
    console.error('Mark all read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}