import { type QueryFilter } from "mongoose";
import { AttendanceCorrection, type IAttendanceCorrection } from "@/models/AttendanceCorrection";
import { LeaveRequest, type ILeaveRequest } from "@/models/LeaveRequest";
import { OtRequest, type IOtRequest } from "@/models/OtRequest";
import { Settings, type BranchSetting } from "@/models/Settings";
import { User, type IUser } from "@/models/User";
import { badRequest, conflict, notFound } from "@/lib/api-errors";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";
import type { TokenPayload } from "@/lib/jwt-auth";
import type {
  CountsQueryInput,
  CreateBranchInput,
  DeleteBranchInput,
  UpdateBranchInput,
} from "@/lib/validations/branch.schema";

const DEFAULT_BRANCHES: BranchSetting[] = [
  { code: "AYA", name: "AYA", description: "", location: { lat: 14.234071, lon: 100.693918 }, radius: 450, active: true },
  { code: "CBI", name: "CBI", description: "", location: null, radius: 50, active: true },
  { code: "RA2", name: "RA2", description: "", location: null, radius: 50, active: true },
  { code: "KSN", name: "KSN", description: "", location: null, radius: 50, active: true },
  { code: "BBT", name: "BBT", description: "", location: null, radius: 50, active: true },
];

type BranchActor = Pick<TokenPayload, "role" | "branch">;
type DashboardCounts = {
  pendingLeaves: number;
  pendingOt: number;
  pendingDrivers: number;
  totalLeaders: number;
  activeDrivers: number;
  pendingCorrections: number;
};

let branchesCache: BranchSetting[] | null = null;

class BranchSettingsRepository {
  async getOrCreate() {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ branches: DEFAULT_BRANCHES });
    }
    return settings;
  }

  async getAll() {
    const settings = await Settings.findOne().lean();
    return settings?.branches?.length ? settings.branches : null;
  }
}

const repository = new BranchSettingsRepository();

export class BranchesService {
  static async list() {
    if (branchesCache) {
      return branchesCache;
    }

    const branches = await repository.getAll();
    branchesCache = branches ?? DEFAULT_BRANCHES;
    return branchesCache;
  }

  static async create(input: CreateBranchInput) {
    const settings = await repository.getOrCreate();
    const code = normalizeBranchCode(input.code);

    const exists = settings.branches.some((branch) => normalizeBranchCode(branch.code) === code);
    if (exists) {
      throw conflict("Branch code already exists");
    }

    settings.branches.push({
      code,
      name: input.name,
      description: input.description ?? "",
      location: input.location ?? null,
      radius: input.radius ?? 50,
      active: input.active ?? true,
    });

    await settings.save();
    resetBranchesCache();
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_CREATED, { code, name: input.name });
  }

  static async update(input: UpdateBranchInput) {
    const settings = await repository.getOrCreate();
    const code = normalizeBranchCode(input.code);
    const branch = settings.branches.find((entry) => normalizeBranchCode(entry.code) === code);

    if (!branch) {
      throw notFound("Branch not found");
    }

    if (input.name !== undefined) branch.name = input.name;
    if (input.description !== undefined) branch.description = input.description;
    if (input.location !== undefined) branch.location = input.location;
    if (input.radius !== undefined) branch.radius = input.radius;
    if (input.active !== undefined) branch.active = input.active;

    await settings.save();
    resetBranchesCache();
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_UPDATED, { code });
  }

  static async remove(input: DeleteBranchInput) {
    const settings = await repository.getOrCreate();
    const code = normalizeBranchCode(input.code);
    const nextBranches = settings.branches.filter((entry) => normalizeBranchCode(entry.code) !== code);

    if (nextBranches.length === settings.branches.length) {
      throw notFound("Branch not found");
    }

    settings.branches = nextBranches;
    await settings.save();
    resetBranchesCache();
    await triggerPusher(CHANNELS.BRANCHES, EVENTS.BRANCH_DELETED, { code });
  }

  static async syncDefaults() {
    const settings = await repository.getOrCreate();

    for (const branchDefault of DEFAULT_BRANCHES) {
      const existing = settings.branches.find(
        (entry) => normalizeBranchCode(entry.code) === normalizeBranchCode(branchDefault.code),
      );

      if (existing) {
        existing.name = branchDefault.name;
        existing.description = branchDefault.description;
        existing.location = branchDefault.location;
        existing.radius = branchDefault.radius;
        existing.active = branchDefault.active;
      } else {
        settings.branches.push(branchDefault);
      }
    }

    await settings.save();
    resetBranchesCache();

    return settings.branches;
  }

  static async getCounts(actor: BranchActor, query: CountsQueryInput) {
    const filters = await buildDashboardFilters(actor, query.branch);

    if (query.type === "pending_leaves") {
      return { count: await LeaveRequest.countDocuments(filters.leaveFilter) };
    }

    if (query.type === "pending_drivers") {
      return { count: await User.countDocuments(filters.pendingDriverFilter) };
    }

    const [pendingLeaves, pendingOt, pendingDrivers, totalLeaders, activeDrivers, pendingCorrections] =
      await Promise.all([
        LeaveRequest.countDocuments(filters.leaveFilter),
        OtRequest.countDocuments(filters.otFilter),
        User.countDocuments(filters.pendingDriverFilter),
        User.countDocuments({ role: "leader" }),
        User.countDocuments({ role: "driver", status: "active" }),
        AttendanceCorrection.countDocuments(filters.correctionFilter),
      ]);

    const counts: DashboardCounts = {
      pendingLeaves,
      pendingOt,
      pendingDrivers,
      totalLeaders,
      activeDrivers,
      pendingCorrections,
    };

    return { counts };
  }
}

async function buildDashboardFilters(actor: BranchActor, filterBranch?: string) {
  const leaveFilter: QueryFilter<ILeaveRequest> = { status: "pending" };
  const otFilter: QueryFilter<IOtRequest> = { status: "pending" };
  let pendingDriverFilter: QueryFilter<IUser> = { role: "driver", status: "pending" };
  const correctionFilter: QueryFilter<IAttendanceCorrection> = { status: "pending" };

  const targetBranch = actor.role === "leader" ? actor.branch : filterBranch && filterBranch !== "all" ? filterBranch : undefined;

  if (targetBranch) {
    const branchUserIds = await findBranchUserIds(targetBranch);
    leaveFilter.userId = { $in: branchUserIds };
    otFilter.userId = { $in: branchUserIds };
    correctionFilter.branch = new RegExp(`^${escapeRegExp(targetBranch)}$`, "i");
    pendingDriverFilter = {
      role: "driver",
      status: "pending",
      $or: [
        { branch: new RegExp(`^${escapeRegExp(targetBranch)}$`, "i") },
        { branch: { $exists: false } },
        { branch: "" },
        { branch: null },
      ],
    };
  }

  return { leaveFilter, otFilter, pendingDriverFilter, correctionFilter };
}

async function findBranchUserIds(branch: string) {
  const users = await User.find({
    branch: new RegExp(`^${escapeRegExp(branch)}$`, "i"),
  })
    .select("_id")
    .lean();

  return users.map((user) => user._id);
}

function normalizeBranchCode(code: string) {
  const normalized = code.toUpperCase().trim();
  if (!normalized) {
    throw badRequest("Code is required");
  }
  return normalized;
}

function resetBranchesCache() {
  branchesCache = null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
