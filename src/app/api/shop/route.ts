// app/api/shop/route.ts - Shop System

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// GET - Get shop items
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const type = searchParams.get('type') || 'all';
    const season = searchParams.get('season');

    const where: any = {};
    
    if (category !== 'all') {
      where.category = category;
    }
    
    if (type !== 'all') {
      where.type = type;
    }
    
    if (season) {
      where.season = season;
    }

    // Only show available items
    where.OR = [
      { isLimited: false },
      {
        AND: [
          { isLimited: true },
          { stock: { gt: 0 } },
          { expiresAt: { gte: new Date() } },
        ],
      },
    ];

    const shopItems = await db.shopItem.findMany({
      where,
      orderBy: [
        { rarity: 'desc' },
        { coinPrice: 'asc' },
      ],
    });

    // Get user's inventory to mark owned items
    const inventory = await db.inventoryItem.findMany({
      where: { userId: decoded.userId },
      select: { itemId: true },
    });

    const ownedItemIds = new Set(inventory.map(i => i.itemId));

    const itemsWithOwnership = shopItems.map(item => ({
      ...item,
      isOwned: ownedItemIds.has(item.id),
    }));

    return NextResponse.json({ items: itemsWithOwnership });
  } catch (error) {
    console.error('Get shop items error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch shop items' },
      { status: 500 }
    );
  }
}

// POST - Purchase item
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { message: 'Item ID required' },
        { status: 400 }
      );
    }

    // Get item
    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ message: 'Item not found' }, { status: 404 });
    }

    // Check if already owned
    const existing = await db.inventoryItem.findUnique({
      where: {
        userId_itemId: {
          userId: decoded.userId,
          itemId: item.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Item already owned' },
        { status: 400 }
      );
    }

    // Get user's ghost profile
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    // Check if user has enough coins
    if (item.coinPrice && ghostProfile.coins < item.coinPrice) {
      return NextResponse.json(
        { message: 'Not enough coins' },
        { status: 400 }
      );
    }

    // Check if user has enough XP (for XP-priced items)
    if (item.xpPrice && ghostProfile.totalXP < item.xpPrice) {
      return NextResponse.json(
        { message: 'Not enough XP' },
        { status: 400 }
      );
    }

    // Check premium requirement
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (item.isPremium && user?.plan !== 'pro') {
      return NextResponse.json(
        { message: 'Premium subscription required' },
        { status: 403 }
      );
    }

    // Check limited item stock
    if (item.isLimited) {
      if (item.stock === null || item.stock <= 0) {
        return NextResponse.json(
          { message: 'Item out of stock' },
          { status: 400 }
        );
      }

      if (item.expiresAt && item.expiresAt < new Date()) {
        return NextResponse.json(
          { message: 'Item expired' },
          { status: 400 }
        );
      }
    }

    // Perform purchase transaction
    await db.$transaction(async (tx) => {
      // Deduct currency
      const updateData: any = {};
      if (item.coinPrice) {
        updateData.coins = { decrement: item.coinPrice };
      }
      if (item.xpPrice) {
        updateData.totalXP = { decrement: item.xpPrice };
      }

      await tx.ghostProfile.update({
        where: { userId: decoded.userId },
        data: updateData,
      });

      // Add to inventory
      await tx.inventoryItem.create({
        data: {
          userId: decoded.userId,
          itemId: item.id,
        },
      });

      // Decrement stock if limited
      if (item.isLimited && item.stock !== null) {
        await tx.shopItem.update({
          where: { id: item.id },
          data: { stock: { decrement: 1 } },
        });
      }

      // Award XP for purchase (5 XP per purchase)
      await tx.xPHistory.create({
        data: {
          userId: decoded.userId,
          amount: 5,
          reason: `Purchased: ${item.name}`,
          category: 'shop',
        },
      });
    });

    return NextResponse.json({
      message: 'Purchase successful',
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
      },
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { message: 'Purchase failed' },
      { status: 500 }
    );
  }
}

// ============================================
// app/api/inventory/route.ts - Inventory System
// ============================================

export async function GET_INVENTORY(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    const where: any = { userId: decoded.userId };
    
    if (type !== 'all') {
      where.item = { type };
    }

    const inventory = await db.inventoryItem.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: {
        acquiredAt: 'desc',
      },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// PUT - Equip/Unequip item
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { inventoryItemId, action } = await request.json();

    if (!inventoryItemId || !action) {
      return NextResponse.json(
        { message: 'Inventory item ID and action required' },
        { status: 400 }
      );
    }

    const inventoryItem = await db.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        userId: decoded.userId,
      },
      include: { item: true },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { message: 'Item not found in inventory' },
        { status: 404 }
      );
    }

    if (action === 'equip') {
      // Unequip other items of same type
      await db.inventoryItem.updateMany({
        where: {
          userId: decoded.userId,
          item: { type: inventoryItem.item.type },
          isEquipped: true,
        },
        data: { isEquipped: false },
      });

      // Equip this item
      await db.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { isEquipped: true },
      });

      // Update ghost profile based on item type
      const ghostProfile = await db.ghostProfile.findUnique({
        where: { userId: decoded.userId },
      });

      if (ghostProfile) {
        const updateData: any = {};
        
        if (inventoryItem.item.type === 'accessory') {
          const accessories = ghostProfile.accessories || [];
          if (!accessories.includes(inventoryItem.item.name)) {
            updateData.accessories = [...accessories, inventoryItem.item.name];
          }
        } else if (inventoryItem.item.type === 'room_item') {
          const roomItems = ghostProfile.roomItems || [];
          if (!roomItems.includes(inventoryItem.item.name)) {
            updateData.roomItems = [...roomItems, inventoryItem.item.name];
          }
        } else if (inventoryItem.item.type === 'ghost_skin') {
          updateData.avatarStyle = inventoryItem.item.name;
        }

        if (Object.keys(updateData).length > 0) {
          await db.ghostProfile.update({
            where: { userId: decoded.userId },
            data: updateData,
          });
        }
      }

      return NextResponse.json({
        message: 'Item equipped',
        item: inventoryItem.item,
      });
    } else if (action === 'unequip') {
      await db.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { isEquipped: false },
      });

      // Remove from ghost profile
      const ghostProfile = await db.ghostProfile.findUnique({
        where: { userId: decoded.userId },
      });

      if (ghostProfile) {
        const updateData: any = {};
        
        if (inventoryItem.item.type === 'accessory') {
          const accessories = ghostProfile.accessories || [];
          updateData.accessories = accessories.filter(
            a => a !== inventoryItem.item.name
          );
        } else if (inventoryItem.item.type === 'room_item') {
          const roomItems = ghostProfile.roomItems || [];
          updateData.roomItems = roomItems.filter(
            r => r !== inventoryItem.item.name
          );
        }

        if (Object.keys(updateData).length > 0) {
          await db.ghostProfile.update({
            where: { userId: decoded.userId },
            data: updateData,
          });
        }
      }

      return NextResponse.json({
        message: 'Item unequipped',
      });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Equip/unequip error:', error);
    return NextResponse.json(
      { message: 'Action failed' },
      { status: 500 }
    );
  }
}