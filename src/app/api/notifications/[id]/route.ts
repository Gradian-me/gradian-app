// Notifications API Route - Individual notification operations
// Handles GET, PUT, DELETE for a specific notification

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Load notifications from notifications.json file
 */
function loadNotifications(): any[] {
  try {
    const notificationsPath = path.join(process.cwd(), 'data', 'notifications.json');
    if (fs.existsSync(notificationsPath)) {
      const fileContents = fs.readFileSync(notificationsPath, 'utf-8');
      const notifications = JSON.parse(fileContents);
      return Array.isArray(notifications) ? notifications : [];
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading notifications.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  
  return [];
}

/**
 * Save notifications to notifications.json file
 */
function saveNotifications(notifications: any[]): void {
  try {
    const notificationsPath = path.join(process.cwd(), 'data', 'notifications.json');
    fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error saving notifications: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * GET - Get a specific notification by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notifications = loadNotifications();
    const notification = notifications.find((n: any) => n.id === id);
    
    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: `Notification with ID ${id} not found`,
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notification',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a notification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const notifications = loadNotifications();
    const index = notifications.findIndex((n: any) => n.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Notification with ID ${id} not found`,
        },
        { status: 404 }
      );
    }
    
    const original = notifications[index];
    
    // Fields that should NOT trigger updatedAt change
    const metadataFields = ['isRead', 'readAt', 'acknowledgedAt'];
    
    // Check if any data fields (non-metadata) have changed
    const dataFields = ['title', 'message', 'type', 'category', 'priority', 'metadata', 'assignedTo', 'actionUrl', 'createdBy', 'interactionType'];
    const hasDataChanged = dataFields.some(field => {
      // Check if field exists in body and is different from original
      if (field in body) {
        const originalValue = JSON.stringify(original[field]);
        const newValue = JSON.stringify(body[field]);
        return originalValue !== newValue;
      }
      return false;
    });
    
    // Preserve readAt if it already exists - once set, never change it
    const existingReadAt = original.readAt;
    
    // Update the notification
    const updated = {
      ...notifications[index],
      ...body,
      id, // Ensure ID doesn't change
    };
    
    // Always preserve readAt if it was already set - never change it once set
    if (existingReadAt) {
      updated.readAt = existingReadAt;
    }
    
    // Only update updatedAt if actual data fields have changed
    if (hasDataChanged) {
      updated.updatedAt = new Date().toISOString();
    } else if (original.updatedAt) {
      // Preserve existing updatedAt if no data fields changed
      updated.updatedAt = original.updatedAt;
    }
    
    // When marking as unread, only isRead is changed, readAt is preserved
    // (Don't delete readAt when marking as unread)
    
    // Ensure interactionType defaults to canRead
    if (!updated.interactionType) {
      updated.interactionType = 'canRead';
    }
    
    notifications[index] = updated;
    
    // Save updated notifications
    saveNotifications(notifications);
    
    return NextResponse.json({
      success: true,
      data: notifications[index],
      message: 'Notification updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notifications = loadNotifications();
    const filtered = notifications.filter((n: any) => n.id !== id);
    
    if (filtered.length === notifications.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Notification with ID ${id} not found`,
        },
        { status: 404 }
      );
    }
    
    // Save updated notifications
    saveNotifications(filtered);
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      },
      { status: 500 }
    );
  }
}

