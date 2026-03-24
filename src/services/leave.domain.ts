import mongoose, { type QueryFilter } from "mongoose";
import { conflict, forbidden, notFound, badRequest } from "@/lib/api-errors";
import type { TokenPayload } from "@/lib/jwt-auth";
import type {
  CancelLeaveInput,
  CreateLeaveInput,
  LeaveQueryInput,
  ReviewLeaveInput,
} from "@/lib/validations/leave.schema";
import { LeaveRequest, type ILeaveRequest, type LeaveStatus, type LeaveType } from "@/models/LeaveRequest";
import { User, type IUser } from "@/models/User";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";

type LeaveActor = Pick<TokenPayload, "userId" | "role" | "branch">;
type QuotaKey = "vacationDays" | "sickDays" | "personalDays";
type LeaveRecord = {
  _id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string | mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserSummary = {
  _id: string;
  name?: string;
  surname?: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  employeeId?: string;
  phone?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  branch?: string;
  role?: string;
  status?: string;
};

type PopulatedLeaveRecord = Omit<LeaveRecord, "userId" | "approvedBy"> & {
  userId: string | UserSummary;
  approvedBy?: string | UserSummary;
};

type QuotaSummary = Pick<IUser, "vacationDays" | "sickDays" | "personalDays">;

class LeaveRepository {
  async findMany(query: QueryFilter<ILeaveRequest>) {
    const requests = await LeaveRequest.find(query)
      .populate("userId", "lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel branch")
      .populate("approvedBy", "name surname lineDisplayName lineProfileImage performanceTier branch role")
      .sort({ createdAt: -1 })
      .lean();

    return requests.map((request) => {
      // Handle "admin_root" special case AFTER populate - replace with admin profile object
      const approvedBy = request.approvedBy;
      if (approvedBy && typeof approvedBy === 'object' && (approvedBy as any)._id === "admin_root") {
        return {
          ...request,
          approvedBy: getAdminRootProfile(),
        };
      }
      return request;
    });
  }

  async findById(id: string) {
    const request = await LeaveRequest.findById(id).lean();
    return request ? mapLeaveRequest(request) : null;
  }

  async findByIdWithUser(id: string) {
    const request = await LeaveRequest.findById(id).populate("userId").lean();
    return request ? request : null;
  }

  async findOverlap(userId: string, start: Date, end: Date) {
    const request = await LeaveRequest.findOne({
      userId,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean();

    return request ? mapLeaveRequest(request) : null;
  }

  async create(input: {
    userId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    reason: string;
  }) {
    const request = await LeaveRequest.create({
      ...input,
      status: "pending",
    });

    await request.populate("userId", "lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel");
    return mapPopulatedLeaveRequest(request.toObject());
  }

  async updateStatus(
    id: string,
    input: {
      status: "approved" | "rejected" | "cancelled";
      approvedBy?: string | mongoose.Types.ObjectId;
      approvedAt?: Date;
      rejectedReason?: string;
    },
  ) {
    const request = await LeaveRequest.findByIdAndUpdate(
      id,
      {
        status: input.status,
        approvedBy: input.approvedBy,
        approvedAt: input.approvedAt,
        rejectedReason: input.rejectedReason,
      },
      { new: true },
    )
      .populate("userId", "lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel branch")
      .populate("approvedBy", "name surname lineDisplayName lineProfileImage performanceTier branch role")
      .lean();

    return request ? mapPopulatedLeaveRequest(request) : null;
  }
}

const leaveRepository = new LeaveRepository();

export class LeaveService {
  static async list(actor: LeaveActor, query: LeaveQueryInput) {
    const filter = await buildLeaveScope(actor, query);
    const requests = await leaveRepository.findMany(filter);

    return requests.map((request) => ({
      ...request,
      approvedBy: request.approvedBy === "admin_root" ? getAdminRootProfile() : request.approvedBy,
    }));
  }

  static async create(actor: LeaveActor, input: CreateLeaveInput) {
    await assertCanSubmitLeave(actor, input.userId);

    const user = await User.findById(input.userId).lean();
    if (!user) {
      throw notFound("User not found");
    }
    if (!user.name || !user.surname) {
      throw badRequest("Please complete your profile first", { code: "PROFILE_INCOMPLETE" });
    }
    if (user.status !== "active") {
      throw badRequest("Your account is pending approval. Please wait for leader to activate.", {
        code: "USER_NOT_ACTIVE",
      });
    }

    const start = parseLocalDate(input.startDate);
    const end = parseLocalDate(input.endDate);
    const leaveDays = getInclusiveLeaveDays(start, end);

    const overlap = await leaveRepository.findOverlap(input.userId, start, end);
    if (overlap) {
      throw conflict("You already have a leave request for these dates", { code: "OVERLAPPING_LEAVE" });
    }

    assertSufficientQuota(user, input.leaveType, leaveDays);

    const request = await leaveRepository.create({
      userId: input.userId,
      leaveType: input.leaveType,
      startDate: start,
      endDate: end,
      reason: input.reason,
    });

    await triggerPusher(CHANNELS.LEAVE_REQUESTS, EVENTS.NEW_LEAVE, {
      id: request._id,
      leaveType: request.leaveType,
      userName: extractDisplayName(request.userId),
    });

    return {
      request,
      remainingQuota: getProjectedQuota(user, input.leaveType, leaveDays, "subtract"),
    };
  }

  static async cancel(actor: LeaveActor, id: string, input: CancelLeaveInput) {
    const leaveRequest = await leaveRepository.findById(id);
    if (!leaveRequest) {
      throw notFound("Leave request not found");
    }

    if (leaveRequest.userId !== input.userId || actor.userId !== input.userId) {
      throw forbidden("Unauthorized");
    }

    if (leaveRequest.status === "rejected" || leaveRequest.status === "cancelled") {
      throw badRequest("Cannot cancel this leave request");
    }

    if (leaveRequest.status === "approved") {
      await adjustQuotaForLeave(input.userId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, "add");
    }

    const updated = await leaveRepository.updateStatus(id, { status: "cancelled" });
    if (!updated) {
      throw notFound("Leave request not found");
    }

    await triggerPusher(CHANNELS.LEAVE_REQUESTS, EVENTS.LEAVE_CANCELLED, {
      id: updated._id,
      userId: input.userId,
    });
    await triggerPusher(CHANNELS.DASHBOARD, EVENTS.LEAVE_CANCELLED, { id: updated._id });

    const user = await User.findById(input.userId).lean();
    return {
      success: true,
      message: "Leave request cancelled",
      remainingQuota: user ? getQuotaSummary(user) : undefined,
    };
  }

  static async review(actor: LeaveActor, id: string, input: ReviewLeaveInput) {
    if (actor.role !== "leader" && actor.role !== "admin") {
      throw forbidden("Forbidden");
    }

    const leaveRequest = await leaveRepository.findByIdWithUser(id);
    if (!leaveRequest) {
      throw notFound("Leave request not found");
    }

    const driverBranch = extractBranch(leaveRequest.userId);
    if (actor.role === "leader" && actor.branch && driverBranch?.toLowerCase() !== actor.branch.toLowerCase()) {
      throw forbidden("Cannot approve leave requests outside your branch");
    }

    if (input.status === "approved") {
      const driverId = extractUserId(leaveRequest.userId);
      await adjustQuotaForLeave(driverId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, "subtract");
    }

    const approverId = actor.userId;
    const approvedBy = mongoose.Types.ObjectId.isValid(approverId)
      ? new mongoose.Types.ObjectId(approverId)
      : approverId;

    const updated = await leaveRepository.updateStatus(id, {
      status: input.status,
      approvedBy,
      approvedAt: new Date(),
      rejectedReason: input.status === "rejected" ? input.rejectedReason : undefined,
    });

    if (!updated) {
      throw notFound("Leave request not found");
    }

    const driverUserId = typeof updated.userId === "string" ? updated.userId : updated.userId._id;
    await triggerPusher(CHANNELS.LEAVE_REQUESTS, EVENTS.LEAVE_STATUS_CHANGED, {
      id: updated._id,
      status: updated.status,
      driverUserId,
    });
    await triggerPusher(CHANNELS.DASHBOARD, EVENTS.LEAVE_STATUS_CHANGED, {
      id: updated._id,
      status: updated.status,
    });

    return updated;
  }
}

async function buildLeaveScope(actor: LeaveActor, query: LeaveQueryInput) {
  const filter: QueryFilter<ILeaveRequest> = {};

  if (actor.role === "driver") {
    if (actor.branch) {
      const branchUserIds = await getBranchUserIds(actor.branch, actor.userId);
      filter.userId = { $in: branchUserIds };
    } else if (mongoose.Types.ObjectId.isValid(actor.userId)) {
      filter.userId = actor.userId;
    }
  } else if (actor.role === "leader" && actor.branch) {
    filter.userId = { $in: await getBranchUserIds(actor.branch, actor.userId) };
  } else if (actor.role === "admin" && query.branch && query.branch !== "all") {
    filter.userId = { $in: await getBranchUserIds(query.branch) };
  }

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.status) {
    filter.status = query.status;
  }
  // Leaders and Admins should see ALL statuses when not filtering by specific user
  // Don't default to "approved" - they need to see pending requests to approve them

  return filter;
}

async function assertCanSubmitLeave(actor: LeaveActor, targetUserId: string) {
  if (actor.role === "driver" && actor.userId !== targetUserId) {
    throw forbidden("Drivers can only submit leave for themselves");
  }

  if (actor.role === "leader") {
    const targetUser = await User.findById(targetUserId).select("branch").lean();
    if (!targetUser) {
      throw notFound("Target user not found");
    }

    if (!actor.branch || actor.branch.toLowerCase() !== (targetUser.branch ?? "").toLowerCase()) {
      throw forbidden("Leaders can only submit leave for drivers in their branch");
    }
  }
}

async function getBranchUserIds(branch: string, authUserId?: string) {
  const branchUsers = await User.find({
    branch: { $regex: new RegExp(`^${escapeRegExp(branch)}$`, "i") },
  })
    .select("_id")
    .lean();

  const ids = branchUsers.map((user) => user._id);
  if (authUserId && mongoose.Types.ObjectId.isValid(authUserId)) {
    ids.push(new mongoose.Types.ObjectId(authUserId));
  }

  return dedupeObjectIds(ids);
}

function dedupeObjectIds(ids: mongoose.Types.ObjectId[]) {
  const unique = new Map<string, mongoose.Types.ObjectId>();
  for (const id of ids) {
    unique.set(id.toString(), id);
  }
  return Array.from(unique.values());
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw badRequest("Invalid date format");
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getInclusiveLeaveDays(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function assertSufficientQuota(user: Pick<IUser, QuotaKey>, leaveType: LeaveType, leaveDays: number) {
  const quotaKey = getQuotaKey(leaveType);
  if (!quotaKey) return;

  if (user[quotaKey] < leaveDays) {
    throw badRequest("Insufficient leave quota", { code: "INSUFFICIENT_QUOTA", leaveType, leaveDays });
  }
}

async function adjustQuotaForLeave(
  userId: string,
  leaveType: LeaveType,
  startDate: Date,
  endDate: Date,
  direction: "add" | "subtract",
) {
  const quotaKey = getQuotaKey(leaveType);
  if (!quotaKey) return;

  const user = await User.findById(userId).lean();
  if (!user) {
    throw notFound("User not found");
  }

  const leaveDays = getInclusiveLeaveDays(new Date(startDate), new Date(endDate));
  const nextValue =
    direction === "add"
      ? user[quotaKey] + leaveDays
      : Math.max(0, user[quotaKey] - leaveDays);

  await User.findByIdAndUpdate(userId, { [quotaKey]: nextValue });
}

function getProjectedQuota(user: Pick<IUser, QuotaKey>, leaveType: LeaveType, leaveDays: number, direction: "add" | "subtract") {
  const next = getQuotaSummary(user);
  const quotaKey = getQuotaKey(leaveType);
  if (!quotaKey) return next;

  next[quotaKey] =
    direction === "add"
      ? next[quotaKey] + leaveDays
      : Math.max(0, next[quotaKey] - leaveDays);

  return next;
}

function getQuotaSummary(user: Pick<IUser, QuotaKey>): QuotaSummary {
  return {
    vacationDays: user.vacationDays,
    sickDays: user.sickDays,
    personalDays: user.personalDays,
  };
}

function getQuotaKey(leaveType: LeaveType): QuotaKey | null {
  switch (leaveType) {
    case "vacation":
      return "vacationDays";
    case "sick":
      return "sickDays";
    case "personal":
      return "personalDays";
    default:
      return null;
  }
}

function mapLeaveRequest(record: Partial<ILeaveRequest> & { _id?: mongoose.Types.ObjectId | string }): LeaveRecord {
  return {
    _id: String(record._id),
    userId: String(record.userId),
    leaveType: record.leaveType as LeaveType,
    startDate: new Date(record.startDate as Date),
    endDate: new Date(record.endDate as Date),
    reason: String(record.reason),
    status: record.status as LeaveStatus,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt ? new Date(record.approvedAt) : undefined,
    rejectedReason: record.rejectedReason,
    createdAt: new Date(record.createdAt as Date),
    updatedAt: new Date(record.updatedAt as Date),
  };
}

function mapPopulatedLeaveRequest(record: unknown): PopulatedLeaveRecord {
  const source = record as Record<string, unknown>;
  return {
    _id: String(source._id),
    userId: mapReference(source.userId),
    leaveType: source.leaveType as LeaveType,
    startDate: new Date(source.startDate as Date),
    endDate: new Date(source.endDate as Date),
    reason: String(source.reason),
    status: source.status as LeaveStatus,
    approvedBy: mapOptionalReference(source.approvedBy),
    approvedAt: source.approvedAt ? new Date(source.approvedAt as Date) : undefined,
    rejectedReason: typeof source.rejectedReason === "string" ? source.rejectedReason : undefined,
    createdAt: new Date(source.createdAt as Date),
    updatedAt: new Date(source.updatedAt as Date),
  };
}

function mapReference(value: unknown): string | UserSummary {
  if (!value || typeof value !== "object") {
    return String(value);
  }

  const record = value as Record<string, unknown>;
  return {
    _id: String(record._id),
    name: asOptionalString(record.name),
    surname: asOptionalString(record.surname),
    lineDisplayName: asOptionalString(record.lineDisplayName),
    lineProfileImage: asOptionalString(record.lineProfileImage),
    employeeId: asOptionalString(record.employeeId),
    phone: asOptionalString(record.phone),
    performanceTier: asOptionalString(record.performanceTier),
    performancePoints: typeof record.performancePoints === "number" ? record.performancePoints : undefined,
    performanceLevel: typeof record.performanceLevel === "number" ? record.performanceLevel : undefined,
    branch: asOptionalString(record.branch),
    role: asOptionalString(record.role),
    status: asOptionalString(record.status),
  };
}

function mapOptionalReference(value: unknown): string | UserSummary | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === "admin_root") {
    return "admin_root";
  }

  return mapReference(value);
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getAdminRootProfile(): UserSummary {
  return {
    _id: "admin_root",
    name: "ITL",
    surname: "Administrator",
    lineDisplayName: "ITL",
    lineProfileImage: null, // No avatar for admin
    role: "admin",
    status: "active",
  };
}

function extractDisplayName(value: string | UserSummary) {
  return typeof value === "string" ? value : value.lineDisplayName || value.name || "Unknown";
}

function extractUserId(value: unknown) {
  if (!value || typeof value !== "object") {
    return String(value);
  }

  return String((value as Record<string, unknown>)._id);
}

function extractBranch(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const branch = (value as Record<string, unknown>).branch;
  return typeof branch === "string" ? branch : undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
