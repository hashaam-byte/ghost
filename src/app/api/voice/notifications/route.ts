import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
    }
  
    // POST - Create notification
    export async function POST_NOTIFICATION(request: NextRequest) {
      try {
        const decoded = getUserFromToken(request);
        if (!decoded) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const { type, title, message, data, actionLabel, actionUrl } = await request.json();
    
        const notification = await db.notification.create({
          data: {
            userId: decoded.userId,
            type,
            title,
            message,
            data: data || {},
            actionLabel,
            actionUrl,
          },
        });
    
        // TODO: Send push notification via Firebase/OneSignal
    
        return NextResponse.json({ success: true, notification });
      } catch (error) {
        console.error('Notification error:', error);
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
      }
    }

    // GET - Get user notifications
    export async function GET_NOTIFICATIONS(request: NextRequest) {
      try {
        const decoded = getUserFromToken(request);
        if (!decoded) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unread') === 'true';
    
        const where: any = { userId: decoded.userId };
        if (unreadOnly) where.isRead = false;
    
        const notifications = await db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
    
        return NextResponse.json({ success: true, notifications });
      } catch (error) {
        console.error('Get notifications error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }
    }
    
    // PATCH - Mark notification as read
    export async function PATCH_NOTIFICATION(request: NextRequest) {
      try {
        const decoded = getUserFromToken(request);
        if (!decoded) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const { notificationId } = await request.json();
    
        await db.notification.update({
          where: { id: notificationId },
          data: { isRead: true },
        });
    
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Mark notification error:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
    }
