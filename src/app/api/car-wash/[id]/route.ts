import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { del } from '@vercel/blob';
import dbConnect from '@/lib/mongodb';
import { CarWashActivity, IComment } from '@/models/CarWashActivity';
import { requireAuth } from '@/lib/api-auth';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// GET single activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    await dbConnect();

    const activity = await CarWashActivity.findById(id)
      .populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier')
      .populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier')
      .populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier')
      .populate('markedBy', 'lineDisplayName name surname');

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Manual population for admin_root
    const adminRootProfile = {
      _id: 'admin_root',
      name: 'ITL',
      surname: 'Administrator',
      lineDisplayName: 'ITL Administrator',
      role: 'admin',
      status: 'active',
    };

    const obj = activity.toObject();
    if (obj.userId === 'admin_root') obj.userId = adminRootProfile;
    if (obj.likes && obj.likes.length > 0) {
      obj.likes = obj.likes.map((l: any) => l === 'admin_root' ? adminRootProfile : l);
    }
    if (obj.comments && obj.comments.length > 0) {
      obj.comments = obj.comments.map((c: any) => {
        if (c.userId === 'admin_root') c.userId = adminRootProfile;
        return c;
      });
    }
    if (obj.markedBy === 'admin_root') obj.markedBy = adminRootProfile;

    return NextResponse.json({ success: true, activity: obj });
  } catch (error) {
    console.error('Get Activity Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — update caption, or perform actions (like, comment, mark)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { payload } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    await dbConnect();

    const activity = await CarWashActivity.findById(id);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // --- LIKE / UNLIKE ---
    if (action === 'like') {
      const { visitorId } = body;
      if (!visitorId) {
        return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
      }

      const alreadyLiked = activity.likes.some(
        (lid: mongoose.Types.ObjectId) => lid.toString() === visitorId
      );

      if (alreadyLiked) {
        activity.likes = activity.likes.filter(
          (lid: mongoose.Types.ObjectId) => lid.toString() !== visitorId
        );
      } else {
        activity.likes.push(visitorId);
      }

      await activity.save();
      await activity.populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

      await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });

      return NextResponse.json({ success: true, activity });
    }

    // --- COMMENT ---
    if (action === 'comment') {
      const { visitorId, text } = body;
      if (!visitorId || !text) {
        return NextResponse.json({ error: 'visitorId and text are required' }, { status: 400 });
      }

      const commentData: any = {
        text,
        createdAt: new Date(),
      };

      if (visitorId === 'admin_root') {
        commentData.userId = 'admin_root';
      } else {
        commentData.userId = new mongoose.Types.ObjectId(visitorId);
      }

      activity.comments.push(commentData as IComment);

      await activity.save();
      await activity.populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

      await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });

      return NextResponse.json({ success: true, activity });
    }

    // --- DELETE COMMENT ---
    if (action === 'deleteComment') {
      const { commentId, visitorId } = body;
      if (!commentId) {
        return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
      }

      const comment = (activity.comments as unknown as { id: (id: string) => IComment | undefined }).id(commentId);
      if (!comment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      // Only comment owner or leader can delete
      const isOwner = comment.userId.toString() === visitorId;
      const isLeader = payload.role === 'leader' || payload.role === 'admin';
      if (!isOwner && !isLeader) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      (activity.comments as unknown as { pull: (query: object) => void }).pull({ _id: commentId });
      await activity.save();
      await activity.populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

      await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });

      return NextResponse.json({ success: true, activity });
    }

    // --- MARK (leader only) ---
    if (action === 'mark') {
      if (payload.role !== 'leader' && payload.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: Management access required' }, { status: 403 }) } as any;
      }

      const { leaderId } = body;
      activity.marked = !activity.marked;
      activity.markedBy = activity.marked ? leaderId : undefined;
      activity.markedAt = activity.marked ? new Date() : undefined;

      await activity.save();
      await activity.populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier');
      await activity.populate('markedBy', 'lineDisplayName name surname');

      await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });

      return NextResponse.json({ success: true, activity });
    }

    // --- EDIT caption/activityDate/activityTime ---
    const { visitorId, caption, activityDate, activityTime } = body;
    const isOwner = activity.userId.toString() === visitorId;
    const isLeader = payload.role === 'leader' || payload.role === 'admin';

    if (!isOwner && !isLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (caption !== undefined) activity.caption = caption;
    if (activityDate !== undefined) activity.activityDate = new Date(activityDate);
    if (activityTime !== undefined) activity.activityTime = activityTime;

    await activity.save();
    await activity.populate('userId', 'lineDisplayName lineProfileImage name surname performanceTier');
    await activity.populate('likes', 'lineDisplayName lineProfileImage name surname performanceTier');
    await activity.populate('comments.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

    await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Update Activity Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { payload } = authResult;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitorId');

    await dbConnect();

    const activity = await CarWashActivity.findById(id);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const isOwner = activity.userId.toString() === visitorId;
    const isLeader = payload.role === 'leader' || payload.role === 'admin';

    if (!isOwner && !isLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try to delete blob images
    if (activity.imageUrls && activity.imageUrls.length > 0) {
      for (const url of activity.imageUrls) {
        try {
          await del(url, { token: process.env.itl_READ_WRITE_TOKEN });
        } catch (blobErr) {
          console.error('Blob delete error (non-fatal):', blobErr);
        }
      }
    }

    await CarWashActivity.findByIdAndDelete(id);

    await triggerPusher(CHANNELS.CAR_WASH, EVENTS.DELETE_ACTIVITY, { activityId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Activity Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
