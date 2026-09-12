import mongoose, { type QueryFilter } from "mongoose";
import { put } from "@vercel/blob";
import { conflict, forbidden, notFound, badRequest } from "@/lib/api-errors";
import type { TokenPayload } from "@/lib/jwt-auth";
import type {
  BatchApproveOtInput,
  CancelOtInput,
  CreateOtInput,
  OtQueryInput,
  ReviewOtInput,
} from "@/lib/validations/ot.schema";
import { OtRequest, type IOtRequest, type OtClaimType, type OtStatus } from "@/models/OtRequest";
import { LeaveRequest } from "@/models/LeaveRequest";
import { User } from "@/models/User";
import { Leader } from "@/models/Leader";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";

const OT_BACKDATE_LIMIT_DAYS = 7;

type OtActor = Pick<TokenPayload, "userId" | "role" | "branch">;
type ResolvedOtActor = OtActor & {
  role: TokenPayload["role"];
  branch?: string;
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

type OtRecord = {
  _id: string;
  userId: string;
  date: Date;
  claimType: OtClaimType;
  reason: string;
  photoUrl: string;
  status: OtStatus;
  approvedBy?: string | mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

type PopulatedOtRecord = Omit<OtRecord, "userId" | "approvedBy"> & {
  userId: string | UserSummary;
  approvedBy?: string | UserSummary;
};

const USER_SUMMARY_SELECT =
  "lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel branch role status";

class OtRepository {
  async findMany(query: QueryFilter<IOtRequest>, options: { skip?: number; limit?: number } = {}) {
    let requestQuery = OtRequest.find(query)
      .populate("userId", USER_SUMMARY_SELECT)
      .sort({ date: -1, createdAt: -1 });

    if (options.skip !== undefined) {
      requestQuery = requestQuery.skip(options.skip);
    }
    if (options.limit !== undefined) {
      requestQuery = requestQuery.limit(options.limit);
    }

    const requests = await requestQuery.lean();
    const requestsWithApprovedBy = await attachApprovedBySummaries(requests);
    return requestsWithApprovedBy.map((request) => mapPopulatedOtRequest(request));
  }

  async count(query: QueryFilter<IOtRequest>) {
    return OtRequest.countDocuments(query);
  }

  async findById(id: string) {
    const request = await OtRequest.findById(id).lean();
    return request ? mapOtRequest(request) : null;
  }

  async findByIdWithUser(id: string) {
    const request = await OtRequest.findById(id).populate("userId").lean();
    return request ? request : null;
  }

  async findActiveByUserAndDate(userId: string, date: Date, claimType: OtClaimType) {
    const request = await OtRequest.findOne({
      userId,
      date,
      claimType,
      status: { $in: ["pending", "approved"] },
    }).lean();

    return request ? mapOtRequest(request) : null;
  }

  async create(input: { userId: string; date: Date; claimType: OtClaimType; reason: string; photoUrl: string }) {
    const request = await OtRequest.create({
      ...input,
      status: "pending",
    });

    await request.populate("userId", USER_SUMMARY_SELECT);
    return mapPopulatedOtRequest(request.toObject());
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
    const request = await OtRequest.findByIdAndUpdate(
      id,
      {
        status: input.status,
        approvedBy: input.approvedBy,
        approvedAt: input.approvedAt,
        rejectedReason: input.rejectedReason,
      },
      { new: true },
    )
      .populate("userId", USER_SUMMARY_SELECT)
      .lean();

    if (!request) {
      return null;
    }

    const [requestWithApprovedBy] = await attachApprovedBySummaries([request]);
    return mapPopulatedOtRequest(requestWithApprovedBy);
  }
}

const otRepository = new OtRepository();

export class OtService {
  static async list(actor: OtActor, query: OtQueryInput) {
    const resolvedActor = await resolveActorAccess(actor);
    const filter = await buildOtScope(resolvedActor, query);
    return otRepository.findMany(filter);
  }

  static async listPaginated(actor: OtActor, query: OtQueryInput) {
    const resolvedActor = await resolveActorAccess(actor);
    const filter = await buildOtScope(resolvedActor, query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      otRepository.findMany(filter, { skip, limit }),
      otRepository.count(filter),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + requests.length < total,
      },
    };
  }

  static async create(actor: OtActor, input: CreateOtInput, photo: File) {
    const resolvedActor = await resolveActorAccess(actor);
    await assertCanSubmitOt(resolvedActor, input.userId);

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

    const date = parseLocalDate(input.date);
    assertWithinBackdateWindow(date);

    const existing = await otRepository.findActiveByUserAndDate(input.userId, date, input.claimType);
    if (existing) {
      throw conflict("You already have a claim of this type for this date", { code: "DUPLICATE_OT" });
    }

    const approvedLeave = await LeaveRequest.findOne({
      userId: input.userId,
      status: "approved",
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).lean();
    if (approvedLeave) {
      throw conflict("Cannot request extra income on a day you have approved leave", { code: "OT_ON_LEAVE_DAY" });
    }

    const filename = `ot/${input.userId}/${Date.now()}-${photo.name}`;
    const blob = await put(filename, photo, {
      access: "private",
      addRandomSuffix: true,
      token: process.env.itl_READ_WRITE_TOKEN,
    });

    const request = await otRepository.create({
      userId: input.userId,
      date,
      claimType: input.claimType,
      reason: input.reason,
      photoUrl: blob.url,
    });

    await triggerPusher(CHANNELS.OT_REQUESTS, EVENTS.NEW_OT, {
      id: request._id,
      userName: extractDisplayName(request.userId),
    });

    return { request };
  }

  static async cancel(actor: OtActor, id: string, input: CancelOtInput) {
    const otRequest = await otRepository.findById(id);
    if (!otRequest) {
      throw notFound("OT request not found");
    }

    if (otRequest.userId !== input.userId || actor.userId !== input.userId) {
      throw forbidden("Unauthorized");
    }

    if (otRequest.status === "rejected" || otRequest.status === "cancelled") {
      throw badRequest("Cannot cancel this OT request");
    }

    const updated = await otRepository.updateStatus(id, { status: "cancelled" });
    if (!updated) {
      throw notFound("OT request not found");
    }

    await triggerPusher(CHANNELS.OT_REQUESTS, EVENTS.OT_CANCELLED, {
      id: updated._id,
      userId: input.userId,
    });
    await triggerPusher(CHANNELS.DASHBOARD, EVENTS.OT_CANCELLED, { id: updated._id });

    return { success: true, message: "OT request cancelled" };
  }

  static async review(actor: OtActor, id: string, input: ReviewOtInput) {
    const resolvedActor = await resolveActorAccess(actor);

    if (resolvedActor.role !== "leader" && resolvedActor.role !== "admin") {
      throw forbidden("Forbidden");
    }

    const otRequest = await otRepository.findByIdWithUser(id);
    if (!otRequest) {
      throw notFound("OT request not found");
    }

    assertActorCanReviewTarget(resolvedActor, otRequest.userId);

    const approverId = actor.userId;
    const approvedBy = mongoose.Types.ObjectId.isValid(approverId)
      ? new mongoose.Types.ObjectId(approverId)
      : approverId;

    const updated = await otRepository.updateStatus(id, {
      status: input.status,
      approvedBy,
      approvedAt: new Date(),
      rejectedReason: input.status === "rejected" ? input.rejectedReason : undefined,
    });

    if (!updated) {
      throw notFound("OT request not found");
    }

    const driverUserId = typeof updated.userId === "string" ? updated.userId : updated.userId._id;
    await triggerPusher(CHANNELS.OT_REQUESTS, EVENTS.OT_STATUS_CHANGED, {
      id: updated._id,
      status: updated.status,
      driverUserId,
    });
    await triggerPusher(CHANNELS.DASHBOARD, EVENTS.OT_STATUS_CHANGED, {
      id: updated._id,
      status: updated.status,
    });

    return updated;
  }

  static async batchApprove(actor: OtActor, input: BatchApproveOtInput) {
    const resolvedActor = await resolveActorAccess(actor);

    if (resolvedActor.role !== "leader" && resolvedActor.role !== "admin") {
      throw forbidden("Forbidden");
    }

    const approvedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const id of input.ids) {
      try {
        const updated = await OtService.review(actor, id, { status: "approved" });
        approvedIds.push(updated._id);
      } catch {
        skippedIds.push(id);
      }
    }

    return { approvedIds, skippedIds };
  }
}

async function buildOtScope(actor: OtActor, query: OtQueryInput) {
  const filter: QueryFilter<IOtRequest> = {};
  if (query.claimType) {
    filter.claimType = query.claimType;
  }

  if (actor.role === "driver") {
    filter.userId = actor.userId;
    if (query.status) {
      filter.status = query.status;
    }
  } else if (actor.role === "leader") {
    const actorBranch = await resolveActorBranch(actor);
    if (actorBranch) {
      const branchUserIds = await getBranchUserIds(actorBranch);
      const branchUserIdKeys = new Set(branchUserIds.map((id) => id.toString()));
      if (query.userId) {
        if (!branchUserIdKeys.has(query.userId)) {
          throw forbidden("Cannot view OT history outside your branch");
        }
        filter.userId = query.userId;
      } else {
        filter.userId = { $in: branchUserIds };
      }
      if (query.status) {
        filter.status = query.status;
      }
    } else if (query.status) {
      filter.status = query.status;
      if (query.userId) {
        filter.userId = query.userId;
      }
    } else if (query.userId) {
      filter.userId = query.userId;
    }
  } else if (actor.role === "admin") {
    if (query.userId) {
      filter.userId = query.userId;
    } else if (query.branch && query.branch !== "all") {
      filter.userId = { $in: await getBranchUserIds(query.branch) };
    }
    if (query.status) {
      filter.status = query.status;
    }
  }
  return filter;
}

async function assertCanSubmitOt(actor: OtActor, targetUserId: string) {
  if (actor.role === "driver" && actor.userId !== targetUserId) {
    throw forbidden("Drivers can only submit OT for themselves");
  }

  if (actor.role === "leader") {
    const actorBranch = await resolveActorBranch(actor);
    const targetUser = await User.findById(targetUserId).select("branch").lean();
    if (!targetUser) {
      throw notFound("Target user not found");
    }

    if (!actorBranch || actorBranch.toLowerCase() !== (targetUser.branch ?? "").toLowerCase()) {
      throw forbidden("Leaders can only submit OT for drivers in their branch");
    }
  }
}

function assertActorCanReviewTarget(actor: ResolvedOtActor, targetUser: unknown) {
  if (actor.role !== "leader") {
    return;
  }

  const driverBranch = extractBranch(targetUser);
  const actorBranch = actor.branch;
  if (actorBranch && driverBranch?.toLowerCase() !== actorBranch.toLowerCase()) {
    throw forbidden("Cannot approve OT requests outside your branch");
  }
}

function assertWithinBackdateWindow(date: Date) {
  const today = startOfToday();
  if (date.getTime() > today.getTime()) {
    throw badRequest("Cannot request OT for a future date", { code: "OT_DATE_IN_FUTURE" });
  }

  const earliestAllowed = new Date(today);
  earliestAllowed.setDate(earliestAllowed.getDate() - OT_BACKDATE_LIMIT_DAYS);
  if (date.getTime() < earliestAllowed.getTime()) {
    throw badRequest(`Cannot request OT more than ${OT_BACKDATE_LIMIT_DAYS} days in the past`, {
      code: "OT_DATE_TOO_OLD",
    });
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

async function getBranchUserIds(branch: string) {
  const branchUsers = await User.find({
    branch: { $options: "i", $regex: `^${escapeRegExp(branch)}$` },
  })
    .select("_id")
    .lean();

  return branchUsers.map((user) => user._id);
}

async function attachApprovedBySummaries<T extends { approvedBy?: unknown }>(records: T[]) {
  const approverIds = Array.from(
    new Set(
      records
        .map((record) => extractReferenceId(record.approvedBy))
        .filter((value): value is string => Boolean(value) && value !== "admin_root"),
    ),
  );

  if (approverIds.length === 0) {
    return records.map((record) => {
      const approverId = extractReferenceId(record.approvedBy);
      if (approverId === "admin_root") {
        return {
          ...record,
          approvedBy: getAdminRootProfile(),
        };
      }
      return record;
    });
  }

  const objectIds = approverIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const [users, leaders] = await Promise.all([
    objectIds.length > 0
      ? User.find({ _id: { $in: objectIds } }).select(USER_SUMMARY_SELECT).lean()
      : Promise.resolve([]),
    objectIds.length > 0
      ? Leader.find({ _id: { $in: objectIds } }).select("name branch role").lean()
      : Promise.resolve([]),
  ]);

  const userMap = new Map<string, UserSummary>();
  for (const user of users) {
    userMap.set(String(user._id), mapReference(user) as UserSummary);
  }

  const leaderMap = new Map<string, UserSummary>();
  for (const leader of leaders) {
    leaderMap.set(String(leader._id), {
      _id: String(leader._id),
      name: leader.name,
      lineDisplayName: leader.name,
      branch: leader.branch,
      role: leader.role,
      status: "active",
    });
  }

  return records.map((record) => {
    const approverId = extractReferenceId(record.approvedBy);
    if (!approverId) {
      return record;
    }

    if (approverId === "admin_root") {
      return {
        ...record,
        approvedBy: getAdminRootProfile(),
      };
    }

    return {
      ...record,
      approvedBy: userMap.get(approverId) ?? leaderMap.get(approverId) ?? approverId,
    };
  });
}

async function resolveActorBranch(actor: OtActor) {
  const resolvedActor = await resolveActorAccess(actor);
  return resolvedActor.branch;
}

async function resolveActorAccess(actor: OtActor): Promise<ResolvedOtActor> {
  if (!mongoose.Types.ObjectId.isValid(actor.userId)) {
    return {
      ...actor,
      role: actor.role,
      branch: actor.branch,
    };
  }

  const user = await User.findById(actor.userId).select("role branch").lean();
  if (user) {
    return {
      ...actor,
      role: user.role ?? actor.role,
      branch: user.branch ?? actor.branch,
    };
  }

  const leader = await Leader.findById(actor.userId).select("role branch").lean();
  if (leader) {
    return {
      ...actor,
      role: (leader.role as TokenPayload["role"]) ?? actor.role,
      branch: leader.branch ?? actor.branch,
    };
  }

  return {
    ...actor,
    role: actor.role,
    branch: actor.branch,
  };
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw badRequest("Invalid date format");
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function mapOtRequest(record: Partial<IOtRequest> & { _id?: mongoose.Types.ObjectId | string }): OtRecord {
  return {
    _id: String(record._id),
    userId: String(record.userId),
    date: new Date(record.date as Date),
    claimType: (record.claimType as OtClaimType) || "ot",
    reason: String(record.reason),
    photoUrl: String(record.photoUrl),
    status: record.status as OtStatus,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt ? new Date(record.approvedAt) : undefined,
    rejectedReason: record.rejectedReason,
    createdAt: new Date(record.createdAt as Date),
    updatedAt: new Date(record.updatedAt as Date),
  };
}

function mapPopulatedOtRequest(record: unknown): PopulatedOtRecord {
  const source = record as Record<string, unknown>;
  return {
    _id: String(source._id),
    userId: mapReference(source.userId),
    date: new Date(source.date as Date),
    claimType: (source.claimType as OtClaimType) || "ot",
    reason: String(source.reason),
    photoUrl: String(source.photoUrl),
    status: source.status as OtStatus,
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

function extractReferenceId(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id?: unknown })._id);
  }

  return undefined;
}

function getAdminRootProfile(): UserSummary {
  return {
    _id: "admin_root",
    name: "ITL",
    surname: "Administrator",
    lineDisplayName: "ITL",
    lineProfileImage: undefined,
    role: "admin",
    status: "active",
  };
}

function extractDisplayName(value: string | UserSummary) {
  return typeof value === "string" ? value : value.lineDisplayName || value.name || "Unknown";
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
