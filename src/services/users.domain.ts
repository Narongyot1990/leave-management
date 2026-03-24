import { type QueryFilter, type UpdateQuery } from "mongoose";
import { badRequest, forbidden, notFound } from "@/lib/api-errors";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";
import type { TokenPayload } from "@/lib/jwt-auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { SubstituteRecord } from "@/models/SubstituteRecord";
import { User, type IUser } from "@/models/User";
import type {
  DeleteUserInput,
  UpdateUserInput,
  UserByIdInput,
  UserListQueryInput,
} from "@/lib/validations/user.schema";

type UserActor = Pick<TokenPayload, "userId" | "role" | "branch">;

export class UsersService {
  static async list(actor: UserActor, query: UserListQueryInput) {
    if (query.id) {
      const user = await User.findById(query.id).select(baseUserSelect()).lean();
      return user ? [user] : [];
    }

    const filter = buildUserListFilter(actor, query);
    return User.find(filter).select(baseUserSelect()).sort({ createdAt: -1 }).lean();
  }

  static async getById(_actor: UserActor, input: UserByIdInput) {
    const user = await User.findById(input.id).select(
      "lineDisplayName lineProfileImage name surname phone employeeId branch status performanceTier performancePoints performanceLevel vacationDays sickDays personalDays lastSeen isOnline",
    ).lean();

    if (!user) {
      throw notFound("User not found");
    }

    return user;
  }

  static async update(actor: UserActor, input: UpdateUserInput) {
    const updateData: UpdateQuery<IUser> = {};

    if (actor.role === "driver") {
      if (input.userId !== actor.userId) {
        throw forbidden("Drivers can only update their own profile");
      }

      if (
        input.status !== undefined ||
        input.role !== undefined ||
        input.branch !== undefined ||
        input.vacationDays !== undefined ||
        input.sickDays !== undefined ||
        input.personalDays !== undefined ||
        input.performanceTier !== undefined ||
        input.employeeId !== undefined
      ) {
        throw forbidden("Not allowed to update these fields");
      }
    }

    if (input.name !== undefined) updateData.name = input.name;
    if (input.surname !== undefined) updateData.surname = input.surname;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.linePublicId !== undefined) updateData.linePublicId = input.linePublicId ?? undefined;

    if (actor.role === "leader" || actor.role === "admin") {
      if (input.employeeId !== undefined) updateData.employeeId = input.employeeId;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.vacationDays !== undefined) updateData.vacationDays = input.vacationDays;
      if (input.sickDays !== undefined) updateData.sickDays = input.sickDays;
      if (input.personalDays !== undefined) updateData.personalDays = input.personalDays;
      if (input.performanceTier !== undefined) updateData.performanceTier = input.performanceTier;
      if (input.branch !== undefined) updateData.branch = input.branch ?? undefined;
    }

    if (input.role !== undefined) {
      if (actor.role !== "admin") {
        throw forbidden("Only admins can assign roles");
      }
      if (input.userId === actor.userId) {
        throw forbidden("Cannot change your own role");
      }
      updateData.role = input.role;
    }

    // Leader: ต้องเป็นคนในสาขาเดียวกัน หรือเป็นตัวเอง
    if (actor.role === "leader") {
      const targetUser = await User.findById(input.userId).lean();
      if (!targetUser) {
        throw notFound("User not found");
      }
      
      // Leader ไม่สามารถแก้ไข Leader หรือ Admin คนอื่นได้
      if (targetUser.role === "leader" || targetUser.role === "admin") {
        throw forbidden("Leaders cannot modify other Leaders or Admins");
      }
      
      // Leader สามารถแก้ไขได้ทุก field สำหรับคนในสาขาตัวเอง
      // (ไม่ต้องเช็ค branch เพิ่มเพราะถือว่า leader ดูแลทุกคนในสาขา)
    }

    const user = await User.findByIdAndUpdate(input.userId, updateData, { new: true }).lean();
    if (!user) {
      throw notFound("User not found");
    }

    if (input.status === "active") {
      await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_ACTIVATED, { userId: input.userId });
    }
    if (input.role !== undefined || input.status !== undefined) {
      await triggerPusher(`user-${input.userId}`, EVENTS.FORCE_LOGOUT, { reason: "role_or_status_changed" });
    }
    await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_UPDATED, { userId: input.userId });

    return {
      id: user._id,
      lineUserId: user.lineUserId,
      linePublicId: user.linePublicId,
      lineDisplayName: user.lineDisplayName,
      lineProfileImage: user.lineProfileImage,
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      employeeId: user.employeeId,
      status: user.status,
      vacationDays: user.vacationDays,
      sickDays: user.sickDays,
      personalDays: user.personalDays,
      performanceTier: user.performanceTier,
      performancePoints: user.performancePoints,
      performanceLevel: user.performanceLevel,
      branch: user.branch,
    };
  }

  static async remove(actor: UserActor, input: DeleteUserInput) {
    const user = await User.findById(input.id).lean();
    if (!user) {
      throw notFound("User not found");
    }
    if (user.status !== "pending") {
      throw badRequest("Can only delete pending users");
    }
    
    // Check permissions
    if (actor.role === "leader") {
      // Leader can only delete users in their branch
      if (!actor.branch || actor.branch.toLowerCase() !== (user.branch ?? "").toLowerCase()) {
        throw forbidden("Leaders can only delete users in their branch");
      }
    } else if (actor.role !== "admin") {
      throw forbidden("Only admins and leaders can delete users");
    }

    await SubstituteRecord.deleteMany({ userId: input.id });
    await LeaveRequest.deleteMany({ userId: input.id });
    await User.findByIdAndDelete(input.id);
    await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_DELETED, { userId: input.id });
  }
}

function buildUserListFilter(actor: UserActor, query: UserListQueryInput): QueryFilter<IUser> {
  const filter: QueryFilter<IUser> = {};
  if (query.role) filter.role = query.role;

  if (actor.role === "driver") {
    if (query.branch) {
      filter.branch = query.branch;
      filter.status = "active";
    } else {
      filter._id = actor.userId;
    }
  } else if (actor.role === "leader") {
    if (actor.branch) {
      filter.$or = [
        { branch: new RegExp(`^${escapeRegExp(actor.branch)}$`, "i") },
        { branch: { $exists: false } },
        { branch: "" },
        { branch: null },
      ];
    }
  } else if (actor.role === "admin" && query.branch && query.branch !== "all") {
    filter.$or = [
      { branch: new RegExp(`^${escapeRegExp(query.branch)}$`, "i") },
      { branch: { $exists: false } },
      { branch: "" },
      { branch: null },
    ];
  }

  if (query.status) filter.status = query.status;
  if (query.activeOnly === "true") filter.status = "active";
  return filter;
}

function baseUserSelect() {
  return "lineUserId linePublicId lineDisplayName lineProfileImage name surname phone employeeId branch status role vacationDays sickDays personalDays performanceTier performancePoints performanceLevel lastSeen isOnline createdAt";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
