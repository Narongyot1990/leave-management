import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireSuperuser } from '@/lib/api-auth';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

const DEFAULT_BRANCHES = [
  { code: 'AYA', name: 'AYA', description: '', location: null, active: true },
  { code: 'CBI', name: 'CBI', description: '', location: null, active: true },
  { code: 'RA2', name: 'RA2', description: '', location: null, active: true },
  { code: 'KSN', name: 'KSN', description: '', location: null, active: true },
  { code: 'BBT', name: 'BBT', description: '', location: null, active: true },
];

let branchesCache: Array<{ code: string; name: string; description?: string; location?: { lat: number; lon: number } | null; active: boolean }> | null = null;

// GET /api/branches - Get all active branches (public)
export async function GET(request: NextRequest) {
  try {
    if (branchesCache) {
      return NextResponse.json({ success: true, branches: branchesCache });
    }

    await dbConnect();

    const { default: mongoose } = await import('mongoose');
    
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections({ name: 'settings' }).toArray();
        
        if (collections.length > 0) {
          const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
            branches: [{
              code: String,
              name: String,
              description: String,
              location: {
                lat: Number,
                lon: Number,
              },
              active: Boolean,
            }],
          }, { collection: 'settings' }));
          
          const settings = await Settings.findOne();
          if (settings?.branches && settings.branches.length > 0) {
            branchesCache = settings.branches;
            return NextResponse.json({ success: true, branches: branchesCache });
          }
        }
      }
    }

    branchesCache = DEFAULT_BRANCHES;
    return NextResponse.json({ success: true, branches: DEFAULT_BRANCHES });
  } catch (error) {
    console.error('Get Branches Error:', error);
    return NextResponse.json({ success: true, branches: DEFAULT_BRANCHES });
  }
}

// POST /api/branches - Create new branch (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = requireSuperuser(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { code, name, description, location, active } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toString().toUpperCase().trim();

    await dbConnect();

    const { default: mongoose } = await import('mongoose');
    
    const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
      branches: [{
        code: String,
        name: String,
        description: String,
        location: {
          lat: Number,
          lon: Number,
        },
        active: Boolean,
      }],
    }, { collection: 'settings' }));

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({ branches: [] });
    }

    // Check if code already exists (case-insensitive)
    const exists = settings.branches.find((b: any) => b.code.toUpperCase() === normalizedCode);
    if (exists) {
      return NextResponse.json({ error: 'Branch code already exists' }, { status: 400 });
    }

    settings.branches.push({
      code: normalizedCode,
      name,
      description: description || '',
      location: location || null,
      active: active !== false,
    });

    await settings.save();
    branchesCache = null; // Clear cache
    
    // Trigger Pusher for real-time update
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_CREATED, { code: normalizedCode, name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create Branch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/branches - Update branch (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireSuperuser(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { code, name, description, location, active } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toString().toUpperCase().trim();

    await dbConnect();

    const { default: mongoose } = await import('mongoose');
    
    const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
      branches: [{
        code: String,
        name: String,
        description: String,
        location: {
          lat: Number,
          lon: Number,
        },
        active: Boolean,
      }],
    }, { collection: 'settings' }));

    const settings = await Settings.findOne();
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const branch = settings.branches.find((b: any) => b.code.toUpperCase() === normalizedCode);
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (name !== undefined) branch.name = name;
    if (description !== undefined) branch.description = description;
    if (location !== undefined) branch.location = location;
    if (active !== undefined) branch.active = active;

    await settings.save();
    branchesCache = null; // Clear cache
    
    // Trigger Pusher for real-time update
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_UPDATED, { code: normalizedCode });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Branch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/branches - Delete branch (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireSuperuser(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toString().toUpperCase().trim();

    await dbConnect();

    const { default: mongoose } = await import('mongoose');
    
    const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
      branches: [{
        code: String,
        name: String,
        description: String,
        location: {
          lat: Number,
          lon: Number,
        },
        active: Boolean,
      }],
    }, { collection: 'settings' }));

    const settings = await Settings.findOne();
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    settings.branches = settings.branches.filter((b: any) => b.code.toUpperCase() !== normalizedCode);
    await settings.save();
    branchesCache = null; // Clear cache
    
    // Trigger Pusher for real-time update
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_DELETED, { code: normalizedCode });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Branch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
