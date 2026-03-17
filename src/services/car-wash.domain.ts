import mongoose, { type QueryFilter } from "mongoose";
import { getBangkokTime } from "@/lib/date-utils";
import { del, put } from "@vercel/blob";
import { badRequest, forbidden, notFound } from "@/lib/api-errors";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";
import type { TokenPayload } from "@/lib/jwt-auth";
import {
  CarWashActivity,
  type ICarWashActivity,
  type IComment,
} from "@/models/CarWashActivity";
import type {
  CarWashQueryInput,
  CommentActivityInput,
  CreateCarWashInput,
  DeleteActivityInput,
  DeleteCommentInput,
  EditActivityInput,
  LikeActivityInput,
  MarkActivityInput,
} from "@/lib/validations/car-wash.schema";

type CarWashActor = Pick<TokenPayload, "userId" | "role">;
type CarWashRecord = Record<string, unknown>;

const ADMIN_ROOT_PROFILE = {
  _id: "admin_root",
  name: "ITL",
  surname: "Administrator",
  lineDisplayName: "ITL Administrator",
  role: "admin",
  status: "active",
};

class CarWashRepository {
  async findMany(query: QueryFilter<ICarWashActivity>, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const total = await CarWashActivity.countDocuments(query);
    const activities = await CarWashActivity.find(query)
      .populate("userId", "lineDisplayName lineProfileImage name surname employeeId performanceTier")
      .populate("likes", "lineDisplayName lineProfileImage name surname performanceTier")
      .populate("comments.userId", "lineDisplayName lineProfileImage name surname performanceTier")
      .populate("markedBy", "lineDisplayName name surname")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      activities: activities.map(normalizeActivity),
      total,
      hasMore: skip + activities.length < total,
    };
  }

  async count(query: QueryFilter<ICarWashActivity>) {
    return CarWashActivity.countDocuments(query);
  }

  async findById(id: string) {
    const activity = await CarWashActivity.findById(id)
      .populate("userId", "lineDisplayName lineProfileImage name surname performanceTier")
      .populate("likes", "lineDisplayName lineProfileImage name surname performanceTier")
      .populate("comments.userId", "lineDisplayName lineProfileImage name surname performanceTier")
      .populate("markedBy", "lineDisplayName name surname")
      .lean();

    return activity ? normalizeActivity(activity) : null;
  }

  async findDocumentById(id: string) {
    return CarWashActivity.findById(id);
  }
}

const repository = new CarWashRepository();

export class CarWashService {
  static async list(query: CarWashQueryInput) {
    const filter = buildCarWashFilter(query);
    if (query.countOnly === "true") {
      return { total: await repository.count(filter) };
    }

    return repository.findMany(filter, query.page, query.limit);
  }

  static async getById(id: string) {
    const activity = await repository.findById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    return activity;
  }

  static async create(input: CreateCarWashInput, images: File[]) {
    if (images.length === 0) {
      throw badRequest("At least one image is required");
    }

    const imageUrls: string[] = [];
    for (const image of images) {
      const filename = `car-wash/${input.userId}/${Date.now()}-${image.name}`;
      const blob = await put(filename, image, {
        access: "private",
        addRandomSuffix: true,
        token: process.env.itl_READ_WRITE_TOKEN,
      });
      imageUrls.push(blob.url);
    }

    const activity = await CarWashActivity.create({
      userId: toMixedUserId(input.userId),
      activityType: input.activityType,
      imageUrls,
      caption: input.caption,
      activityDate: parseLocalDate(input.activityDate),
      activityTime: input.activityTime,
    });

    await activity.populate("userId", "lineDisplayName lineProfileImage name surname employeeId");
    await triggerPusher(CHANNELS.CAR_WASH, EVENTS.NEW_ACTIVITY, { activityId: activity._id.toString() });

    return normalizeActivity(activity.toObject());
  }

  static async toggleLike(id: string, input: LikeActivityInput) {
    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    const alreadyLiked = activity.likes.some((entry) => entry.toString() === input.visitorId);
    if (alreadyLiked) {
      activity.likes = activity.likes.filter((entry) => entry.toString() !== input.visitorId);
    } else {
      activity.likes.push(toMixedUserId(input.visitorId));
    }

    await activity.save();
    return this.refreshAndPublish(id);
  }

  static async addComment(id: string, input: CommentActivityInput) {
    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    activity.comments.push({
      userId: toMixedUserId(input.visitorId),
      text: input.text,
      createdAt: getBangkokTime(),
    } as IComment);

    await activity.save();
    return this.refreshAndPublish(id);
  }

  static async deleteComment(actor: CarWashActor, id: string, input: DeleteCommentInput) {
    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    const commentDoc = (activity.comments as unknown as { id: (commentId: string) => IComment | null }).id(input.commentId);
    if (!commentDoc) {
      throw notFound("Comment not found");
    }

    const isOwner = commentDoc.userId.toString() === input.visitorId;
    const isManager = actor.role === "leader" || actor.role === "admin";
    if (!isOwner && !isManager) {
      throw forbidden("Forbidden");
    }

    (activity.comments as unknown as { pull: (condition: object) => void }).pull({ _id: input.commentId });
    await activity.save();
    return this.refreshAndPublish(id);
  }

  static async toggleMark(actor: CarWashActor, id: string, input: MarkActivityInput) {
    if (actor.role !== "leader" && actor.role !== "admin") {
      throw forbidden("Forbidden: Management access required");
    }

    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    activity.marked = !activity.marked;
    activity.markedBy = activity.marked ? toMixedUserId(input.leaderId) : undefined;
    activity.markedAt = activity.marked ? getBangkokTime() : undefined;

    await activity.save();
    return this.refreshAndPublish(id);
  }

  static async edit(actor: CarWashActor, id: string, input: EditActivityInput) {
    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    const isOwner = activity.userId.toString() === input.visitorId;
    const isManager = actor.role === "leader" || actor.role === "admin";
    if (!isOwner && !isManager) {
      throw forbidden("Forbidden");
    }

    if (input.caption !== undefined) activity.caption = input.caption;
    if (input.activityDate !== undefined) activity.activityDate = parseLocalDate(input.activityDate);
    if (input.activityTime !== undefined) activity.activityTime = input.activityTime;

    await activity.save();
    return this.refreshAndPublish(id);
  }

  static async remove(actor: CarWashActor, id: string, input: DeleteActivityInput) {
    const activity = await repository.findDocumentById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    const isOwner = activity.userId.toString() === input.visitorId;
    const isManager = actor.role === "leader" || actor.role === "admin";
    if (!isOwner && !isManager) {
      throw forbidden("Forbidden");
    }

    for (const url of activity.imageUrls ?? []) {
      try {
        await del(url, { token: process.env.itl_READ_WRITE_TOKEN });
      } catch (error) {
        console.error("Blob delete error (non-fatal):", error);
      }
    }

    await CarWashActivity.findByIdAndDelete(id);
    await triggerPusher(CHANNELS.CAR_WASH, EVENTS.DELETE_ACTIVITY, { activityId: id });
  }

  private static async refreshAndPublish(id: string) {
    const activity = await repository.findById(id);
    if (!activity) {
      throw notFound("Activity not found");
    }

    await triggerPusher(CHANNELS.CAR_WASH, EVENTS.UPDATE_ACTIVITY, { activityId: id });
    return activity;
  }
}

function buildCarWashFilter(query: CarWashQueryInput): QueryFilter<ICarWashActivity> {
  const filter: QueryFilter<ICarWashActivity> = {};

  if (query.userId) filter.userId = query.userId;
  if (query.activityType) filter.activityType = query.activityType;
  if (query.marked === "true") filter.marked = true;

  if (query.startDate || query.endDate) {
    filter.activityDate = {};
    if (query.startDate) {
      (filter.activityDate as Record<string, unknown>).$gte = parseLocalDate(query.startDate);
    }
    if (query.endDate) {
      const end = parseLocalDate(query.endDate);
      end.setHours(23, 59, 59, 999);
      (filter.activityDate as Record<string, unknown>).$lte = end;
    }
  }

  return filter;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toMixedUserId(value: string) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;
}

function normalizeActivity(activity: unknown): CarWashRecord {
  const normalized = { ...(activity as Record<string, unknown>) };

  if (normalized.userId === "admin_root") normalized.userId = ADMIN_ROOT_PROFILE;

  if (Array.isArray(normalized.likes)) {
    normalized.likes = normalized.likes.map((entry) => (entry === "admin_root" ? ADMIN_ROOT_PROFILE : entry));
  }

  if (Array.isArray(normalized.comments)) {
    normalized.comments = normalized.comments.map((comment) => {
      if (comment && typeof comment === "object" && (comment as Record<string, unknown>).userId === "admin_root") {
        return { ...(comment as Record<string, unknown>), userId: ADMIN_ROOT_PROFILE };
      }
      return comment;
    });
  }

  if (normalized.markedBy === "admin_root") normalized.markedBy = ADMIN_ROOT_PROFILE;

  return normalized;
}
