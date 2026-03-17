import mongoose, { type QueryFilter } from "mongoose";
import { Attendance, type IAttendance } from "@/models/Attendance";
import {
  AttendanceCorrection,
  type CorrectionStatus,
  type IAttendanceCorrection,
} from "@/models/AttendanceCorrection";
import { Leader } from "@/models/Leader";
import { User } from "@/models/User";
import { CHANNELS, triggerPusher } from "@/lib/pusher";
import { getBangkokTime } from "@/lib/date-utils";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api-errors";
import type { TokenPayload } from "@/lib/jwt-auth";
import type {
  AttendanceCorrectionCreateInput,
  AttendanceCorrectionQueryInput,
  AttendanceCorrectionReviewInput,
  AttendanceQueryInput,
  ClockInInput,
  PatchAttendanceInput,
} from "@/lib/validations/attendance.schema";

type AttendanceType = "in" | "out";
type AttendanceActor = Pick<TokenPayload, "userId" | "role" | "branch">;
type AttendanceRecord = {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  type: AttendanceType;
  branch: string;
  location: { lat: number; lon: number };
  distance: number;
  isInside: boolean;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type AttendanceCorrectionRecord = {
  _id: string;
  userId: string;
  userName: string;
  type: AttendanceType;
  category: "correction" | "offsite";
  requestedTime: Date;
  reason: string;
  status: CorrectionStatus;
  location: { lat: number; lon: number };
  distance: number;
  branch: string;
  offsiteLocation?: string;
  approvedBy?: unknown;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

type UnifiedAttendanceRecord =
  | (AttendanceRecord & { eventType: "actual" })
  | (AttendanceCorrectionRecord & { eventType: "correction"; timestamp: Date });

type DateRange = { start: Date; end: Date };

class AttendanceRepository {
  async findMany(query: QueryFilter<IAttendance>, limit: number): Promise<AttendanceRecord[]> {
    const records = await Attendance.find(query).sort({ timestamp: -1 }).limit(limit).lean();
    return records.map(mapAttendanceRecord);
  }

  async findLatest(userId: string): Promise<AttendanceRecord | null> {
    const record = await Attendance.findOne({ userId }).sort({ timestamp: -1 }).lean();
    return record ? mapAttendanceRecord(record) : null;
  }

  async findLatestWithin(userId: string, since: Date): Promise<AttendanceRecord | null> {
    const record = await Attendance.findOne({
      userId,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .lean();

    return record ? mapAttendanceRecord(record) : null;
  }

  async findLastClockInBefore(
    query: QueryFilter<IAttendance>,
    before: Date,
  ): Promise<AttendanceRecord | null> {
    const record = await Attendance.findOne({
      ...query,
      type: "in",
      timestamp: { $lt: before },
    })
      .sort({ timestamp: -1 })
      .lean();

    return record ? mapAttendanceRecord(record) : null;
  }

  async findMatchingClockOut(userId: string, start: Date, end: Date): Promise<AttendanceRecord | null> {
    const record = await Attendance.findOne({
      userId,
      type: "out",
      timestamp: { $gt: start, $lt: end },
    }).lean();

    return record ? mapAttendanceRecord(record) : null;
  }

  async create(input: {
    userId: string;
    userName: string;
    userImage?: string;
    type: AttendanceType;
    branch: string;
    location: { lat: number; lon: number };
    distance: number;
    isInside: boolean;
    timestamp: Date;
  }): Promise<AttendanceRecord> {
    const record = await Attendance.create(input);
    return mapAttendanceRecord(record.toObject());
  }

  async updateById(id: string, update: Partial<Pick<AttendanceRecord, "timestamp" | "type" | "branch">>) {
    const record = await Attendance.findByIdAndUpdate(id, update, { new: true }).lean();
    return record ? mapAttendanceRecord(record) : null;
  }

  async findById(id: string): Promise<AttendanceRecord | null> {
    const record = await Attendance.findById(id).lean();
    return record ? mapAttendanceRecord(record) : null;
  }

  async deleteById(id: string) {
    await Attendance.findByIdAndDelete(id);
  }
}

class AttendanceCorrectionRepository {
  async findMany(
    query: QueryFilter<IAttendanceCorrection>,
    limit: number,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<AttendanceCorrectionRecord[]> {
    const records = await AttendanceCorrection.find(query).sort(sort).limit(limit).lean();
    return records.map(mapCorrectionRecord);
  }

  async findPendingDuplicate(userId: string, type: AttendanceType, category: "correction" | "offsite") {
    const record = await AttendanceCorrection.findOne({
      userId,
      type,
      category,
      status: "pending",
    }).lean();

    return record ? mapCorrectionRecord(record) : null;
  }

  async findById(id: string): Promise<AttendanceCorrectionRecord | null> {
    const record = await AttendanceCorrection.findById(id).lean();
    return record ? mapCorrectionRecord(record) : null;
  }

  async create(input: {
    userId: string;
    userName: string;
    type: AttendanceType;
    category: "correction" | "offsite";
    requestedTime: Date;
    reason: string;
    location: { lat: number; lon: number };
    distance: number;
    branch: string;
    offsiteLocation?: string;
  }): Promise<AttendanceCorrectionRecord> {
    const record = await AttendanceCorrection.create({
      ...input,
      status: "pending",
    });
    return mapCorrectionRecord(record.toObject());
  }

  async updateReview(
    id: string,
    input: {
      status: "approved" | "rejected";
      approvedBy: string;
      approvedAt: Date;
      rejectedReason?: string;
    },
  ): Promise<AttendanceCorrectionRecord | null> {
    const correction = await AttendanceCorrection.findByIdAndUpdate(
      id,
      {
        status: input.status,
        approvedBy: input.approvedBy,
        approvedAt: input.approvedAt,
        rejectedReason: input.rejectedReason,
      },
      { new: true },
    ).lean();

    return correction ? mapCorrectionRecord(correction) : null;
  }

  async deleteById(id: string) {
    await AttendanceCorrection.findByIdAndDelete(id);
  }

  async deleteMatchingForRecord(input: {
    userId: string;
    type: AttendanceType;
    timestamp: Date;
  }) {
    const timeBufferMs = 1000;
    const now = getBangkokTime();
    await AttendanceCorrection.deleteMany({
      userId: input.userId,
      type: input.type,
      requestedTime: {
        $gte: new Date(input.timestamp.getTime() - timeBufferMs),
        $lte: new Date(input.timestamp.getTime() + timeBufferMs),
      },
    });
  }
}

const attendanceRepository = new AttendanceRepository();
const correctionRepository = new AttendanceCorrectionRepository();

export class AttendanceService {
  static getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusMeters = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    return earthRadiusMeters * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  static async listAttendance(actor: AttendanceActor, params: AttendanceQueryInput) {
    const scopedQuery = buildAttendanceScope(actor, params);
    const queryWithDateRange = await withDateRange(scopedQuery, params);
    const limit = actor.role === "admin" && params.range === "month" ? 2000 : 500;

    const [attendanceRecords, corrections] = await Promise.all([
      attendanceRepository.findMany(queryWithDateRange, limit),
      correctionRepository.findMany(buildCorrectionScope(queryWithDateRange, actor.role), 100, {
        requestedTime: -1,
      }),
    ]);

    const unified: UnifiedAttendanceRecord[] = [
      ...attendanceRecords.map((record) => ({ ...record, eventType: "actual" as const })),
      ...corrections.map((record) => ({
        ...record,
        eventType: "correction" as const,
        timestamp: record.requestedTime,
      })),
    ];

    return unified.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  }

  static async clockAction(userId: string, input: ClockInInput) {
    const now = getBangkokTime();
    const lastRecord = await attendanceRepository.findLatestWithin(
      userId,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );

    enforceClockSequence(input.type, lastRecord);

    const distance = input.branchLocation
      ? this.getDistance(
          input.location.lat,
          input.location.lon,
          input.branchLocation.lat,
          input.branchLocation.lon,
        )
      : Number.POSITIVE_INFINITY;

    const identity = await resolveIdentity(userId);
    const record = await attendanceRepository.create({
      userId,
      userName: identity.userName,
      userImage: identity.userImage,
      type: input.type,
      branch: input.branchCode,
      location: input.location,
      distance,
      isInside: distance <= (input.radius ?? 50) + 5,
      timestamp: now,
    });

    await publishAttendanceEvent(record);
    return record;
  }

  static async deleteRecord(id: string, actor: AttendanceActor) {
    const attendanceRecord = await attendanceRepository.findById(id);
    if (attendanceRecord) {
      assertCanManageRecord(actor, attendanceRecord.userId);
      await attendanceRepository.deleteById(id);
      await correctionRepository.deleteMatchingForRecord({
        userId: attendanceRecord.userId,
        type: attendanceRecord.type,
        timestamp: attendanceRecord.timestamp,
      });
      return;
    }

    const correctionRecord = await correctionRepository.findById(id);
    if (!correctionRecord) {
      throw notFound("Record not found");
    }

    assertCanManageRecord(actor, correctionRecord.userId);
    await correctionRepository.deleteById(id);
  }

  static async updateRecord(actor: AttendanceActor, input: PatchAttendanceInput) {
    if (actor.role !== "admin") {
      throw forbidden("Only admins can edit records");
    }

    const update: Partial<Pick<AttendanceRecord, "timestamp" | "type" | "branch">> = {};
    if (input.timestamp) update.timestamp = new Date(input.timestamp);
    if (input.type) update.type = input.type;
    if (input.branch) update.branch = input.branch;

    const record = await attendanceRepository.updateById(input.id, update);
    if (!record) {
      throw notFound("Record not found");
    }

    await publishAttendanceEvent(record);
    return record;
  }

  static async listCorrections(actor: AttendanceActor, query: AttendanceCorrectionQueryInput) {
    if (actor.role !== "leader" && actor.role !== "admin") {
      throw forbidden("Unauthorized");
    }

    const filter: QueryFilter<IAttendanceCorrection> = {};
    if (actor.role === "leader") {
      filter.userId = actor.userId;
    }
    if (actor.role === "admin" && query.status) {
      filter.status = query.status;
    }

    return correctionRepository.findMany(filter, 100);
  }

  static async createCorrection(actor: AttendanceActor, input: AttendanceCorrectionCreateInput) {
    const duplicate = await correctionRepository.findPendingDuplicate(
      actor.userId,
      input.type,
      input.category,
    );

    if (duplicate) {
      throw conflict(buildDuplicateCorrectionMessage(input.type, input.category));
    }

    if (input.category !== "offsite") {
      const lastRecord = await attendanceRepository.findLatest(actor.userId);
      enforceClockSequence(input.type, lastRecord);
    }

    const identity = await resolveIdentity(actor.userId);
    const correction = await correctionRepository.create({
      userId: actor.userId,
      userName: identity.userName,
      type: input.type,
      category: input.category,
      requestedTime: new Date(input.requestedTime),
      reason: input.reason,
      location: input.location,
      distance: input.distance,
      branch: input.branch,
      offsiteLocation: input.offsiteLocation,
    });

    await triggerPusher(CHANNELS.USERS, "new-correction-request", { correction });
    return correction;
  }

  static async reviewCorrection(actor: AttendanceActor, input: AttendanceCorrectionReviewInput) {
    if (actor.role !== "admin") {
      throw forbidden("Only admins can approve corrections");
    }

    const current = await correctionRepository.findById(input.id);
    if (!current) {
      throw notFound("Correction request not found");
    }
    if (current.status !== "pending") {
      throw conflict("Request already processed");
    }

    const correction = await correctionRepository.updateReview(input.id, {
      status: input.status,
      approvedBy: actor.userId,
      approvedAt: getBangkokTime(),
      rejectedReason: input.rejectedReason,
    });

    if (!correction) {
      throw notFound("Correction request not found");
    }

    if (correction.status === "approved") {
      const identity = await resolveIdentity(correction.userId);
      const record = await attendanceRepository.create({
        userId: correction.userId,
        userName: correction.userName,
        userImage: identity.userImage,
        type: correction.type,
        branch: correction.branch,
        location: correction.location,
        distance: correction.distance,
        isInside: true,
        timestamp: correction.requestedTime,
      });

      await publishAttendanceEvent(record);
    }

    return correction;
  }
}

function mapAttendanceRecord(record: Partial<IAttendance> & { _id?: mongoose.Types.ObjectId | string }): AttendanceRecord {
  return {
    _id: String(record._id),
    userId: String(record.userId),
    userName: String(record.userName),
    userImage: record.userImage,
    type: record.type as AttendanceType,
    branch: String(record.branch),
    location: {
      lat: Number(record.location?.lat),
      lon: Number(record.location?.lon),
    },
    distance: Number(record.distance),
    isInside: Boolean(record.isInside),
    timestamp: new Date(record.timestamp as Date),
    createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
  };
}

function mapCorrectionRecord(
  record: Partial<IAttendanceCorrection> & { _id?: mongoose.Types.ObjectId | string },
): AttendanceCorrectionRecord {
  return {
    _id: String(record._id),
    userId: String(record.userId),
    userName: String(record.userName),
    type: record.type as AttendanceType,
    category: record.category as "correction" | "offsite",
    requestedTime: new Date(record.requestedTime as Date),
    reason: String(record.reason),
    status: record.status as CorrectionStatus,
    location: {
      lat: Number(record.location?.lat),
      lon: Number(record.location?.lon),
    },
    distance: Number(record.distance),
    branch: String(record.branch),
    offsiteLocation: record.offsiteLocation,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt ? new Date(record.approvedAt) : undefined,
    rejectedReason: record.rejectedReason,
    createdAt: new Date(record.createdAt as Date),
    updatedAt: new Date(record.updatedAt as Date),
  };
}

function buildAttendanceScope(actor: AttendanceActor, params: AttendanceQueryInput): QueryFilter<IAttendance> {
  const query: QueryFilter<IAttendance> = {};

  if (actor.role === "driver") {
    query.userId = actor.userId;
    return query;
  }

  if (actor.role === "leader") {
    if (params.userId) {
      query.userId = params.userId;
    } else if (actor.branch) {
      query.branch = new RegExp(`^${escapeRegExp(actor.branch)}$`, "i");
    }
    return query;
  }

  if (params.userId) query.userId = params.userId;
  if (params.branch) query.branch = params.branch;
  if (params.userName) query.userName = new RegExp(escapeRegExp(params.userName), "i");

  return query;
}

function buildCorrectionScope(
  query: QueryFilter<IAttendance>,
  role: AttendanceActor["role"],
): QueryFilter<IAttendanceCorrection> {
  const correctionQuery: QueryFilter<IAttendanceCorrection> = {
    status: { $ne: "approved" },
  };

  if (query.userId) correctionQuery.userId = query.userId;
  if (query.branch && role === "admin" && typeof query.branch === "string") {
    correctionQuery.branch = query.branch;
  }
  if (query.timestamp) {
    correctionQuery.requestedTime = query.timestamp as QueryFilter<IAttendanceCorrection>["requestedTime"];
  }

  return correctionQuery;
}

async function withDateRange(query: QueryFilter<IAttendance>, params: AttendanceQueryInput) {
  const resolved = { ...query };

  if (params.startDate && params.endDate) {
    resolved.timestamp = {
      $gte: startOfDay(params.startDate),
      $lte: endOfDay(params.endDate),
    };
    return resolved;
  }

  if (!params.date) {
    return resolved;
  }

  const range = buildDateRange(params.date, params.range);
  if (params.range !== "day") {
    resolved.timestamp = { $gte: range.start, $lte: range.end };
    return resolved;
  }

  const lastClockInBefore = await attendanceRepository.findLastClockInBefore(resolved, range.start);
  if (!lastClockInBefore) {
    resolved.timestamp = { $gte: range.start, $lte: range.end };
    return resolved;
  }

  const matchingClockOut = await attendanceRepository.findMatchingClockOut(
    lastClockInBefore.userId,
    lastClockInBefore.timestamp,
    range.start,
  );

  resolved.timestamp = matchingClockOut
    ? { $gte: range.start, $lte: range.end }
    : { $gte: lastClockInBefore.timestamp, $lte: range.end };

  return resolved;
}

function buildDateRange(date: string, range: AttendanceQueryInput["range"]): DateRange {
  const baseDate = parseLocalDate(date);

  if (range === "month") {
    return {
      start: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  if (range === "week") {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - baseDate.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw badRequest("Invalid date format");
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function startOfDay(value: string) {
  const date = parseLocalDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string) {
  const date = parseLocalDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function enforceClockSequence(type: AttendanceType, lastRecord: AttendanceRecord | null) {
  if (type === "in" && lastRecord?.type === "in") {
    throw conflict("You are already clocked in. Clock out before clocking in again.");
  }

  if (type === "out" && (!lastRecord || lastRecord.type === "out")) {
    throw conflict("Clock-in record is required before clocking out.");
  }
}

function assertCanManageRecord(actor: AttendanceActor, ownerUserId: string) {
  if (actor.role !== "admin" && actor.userId !== ownerUserId) {
    throw forbidden("You can only manage your own attendance records");
  }
}

async function resolveIdentity(userId: string) {
  if (userId === "admin_root") {
    return { userName: "ITL Administrator", userImage: undefined };
  }

  if (mongoose.Types.ObjectId.isValid(userId)) {
    const [user, leader] = await Promise.all([User.findById(userId).lean(), Leader.findById(userId).lean()]);
    const person = user ?? leader;
    if (person) {
      const personRecord = person as unknown as Record<string, unknown>;
      return {
        userName: (typeof personRecord.name === "string" && personRecord.name) || asOptionalString(personRecord.lineDisplayName) || "Unknown",
        userImage: asOptionalString(personRecord.lineProfileImage),
      };
    }
  }

  const [user, leader] = await Promise.all([
    User.findOne({ lineUserId: userId }).lean(),
    Leader.findOne({ email: userId }).lean(),
  ]);
  const person = user ?? leader;
  const personRecord = (person ?? {}) as Record<string, unknown>;

  return {
    userName: (typeof personRecord.name === "string" && personRecord.name) || asOptionalString(personRecord.lineDisplayName) || "Unknown",
    userImage: asOptionalString(personRecord.lineProfileImage),
  };
}

async function publishAttendanceEvent(record: Pick<AttendanceRecord, "userId" | "userName" | "type" | "timestamp">) {
  await triggerPusher(CHANNELS.USERS, "leader-attendance", {
    record: {
      userId: record.userId,
      userName: record.userName,
      type: record.type,
      timestamp: record.timestamp,
    },
  });
}

function buildDuplicateCorrectionMessage(type: AttendanceType, category: "correction" | "offsite") {
  if (category === "offsite") {
    return "An offsite attendance request is already pending approval.";
  }

  return type === "in"
    ? "A clock-in correction is already pending approval."
    : "A clock-out correction is already pending approval.";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
