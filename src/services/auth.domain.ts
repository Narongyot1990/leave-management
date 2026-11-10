import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { badRequest, notFound, unauthorized } from "@/lib/api-errors";
import {
  clearAuthCookies,
  generateAccessToken,
  generateRefreshToken,
  getCurrentUser,
  type TokenPayload,
} from "@/lib/jwt-auth";
import { User } from "@/models/User";
import { Leader } from "@/models/Leader";
import { CHANNELS, EVENTS, triggerPusher } from "@/lib/pusher";
import type {
  LeaderLoginInput,
  LeaderProfileUpdateInput,
  LineLoginInput,
} from "@/lib/validations/auth.schema";

type SessionUser = {
  id: string;
  email?: string;
  lineUserId?: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status?: string;
  role: "driver" | "leader" | "admin";
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  unpaidDays?: number;
  performanceTier?: string;
};

export class AuthService {
  static async loginWithLine(input: LineLoginInput) {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    const lineRedirectUri = input.redirectUri || process.env.LINE_REDIRECT_URI;

    if (!lineChannelId || !lineChannelSecret) {
      throw badRequest("Missing LINE credentials");
    }

    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: lineRedirectUri!,
        client_id: lineChannelId,
        client_secret: lineChannelSecret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw badRequest("Failed to get access token", tokenData);
    }

    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    let user = await User.findOne({ lineUserId: profile.userId });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        lineUserId: profile.userId,
        lineDisplayName: profile.displayName,
        lineProfileImage: profile.pictureUrl,
      });
      isNewUser = true;
    } else {
      user.lineDisplayName = profile.displayName;
      user.lineProfileImage = profile.pictureUrl;
      await user.save();
    }

    if (isNewUser) {
      await triggerPusher(CHANNELS.USERS, EVENTS.NEW_DRIVER, {
        userId: user._id.toString(),
        displayName: user.lineDisplayName,
      });
    }

    const payload: TokenPayload = {
      userId: user._id.toString(),
      role: user.role || "driver",
      branch: user.branch || undefined,
      status: user.status || "pending",
    };

    return {
      payload,
      user: {
        id: String(user._id),
        lineUserId: user.lineUserId,
        lineDisplayName: user.lineDisplayName,
        lineProfileImage: user.lineProfileImage,
        phone: user.phone,
        employeeId: user.employeeId,
        status: user.status,
        name: user.name,
        surname: user.surname,
        branch: user.branch,
        role: user.role || "driver",
      },
    };
  }

  static async loginLeader(input: LeaderLoginInput) {
    const adminEmail = process.env.ADMIN_EMAIL || "administrator@fls.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "itl@1234";

    if (input.email === adminEmail && input.password === adminPassword) {
      const payload: TokenPayload = {
        userId: "admin_root",
        email: "administrator@fls.com",
        role: "admin",
        status: "active",
      };

      return {
        payload,
        user: { id: "admin_root", email: "administrator@fls.com", name: "ITL Administrator", role: "admin" as const },
      };
    }

    const leader = await Leader.findOne({ email: input.email });
    if (!leader) {
      throw unauthorized("Invalid credentials");
    }

    const isValid = await bcrypt.compare(input.password, leader.password);
    if (!isValid) {
      throw unauthorized("Invalid credentials");
    }

    const payload: TokenPayload = {
      userId: leader._id.toString(),
      email: leader.email,
      role: leader.role || "leader",
      branch: leader.branch,
      status: "active",
    };

    return {
      payload,
      user: {
        id: String(leader._id),
        email: leader.email,
        name: leader.name,
        branch: leader.branch,
        role: leader.role || "leader",
      },
    };
  }

  static async getCurrentSession() {
    const payload = await getCurrentUser();
    if (!payload) {
      throw unauthorized("Not authenticated");
    }

    if (payload.userId === "admin_root") {
      return {
        id: "admin_root",
        email: "administrator@fls.com",
        name: "ITL Administrator",
        role: "admin" as const,
        status: "active",
      };
    }

    const user = await User.findById(payload.userId);
    if (user) {
      await User.findByIdAndUpdate(payload.userId, { lastSeen: new Date(), isOnline: true });
      return {
        id: String(user._id),
        lineUserId: user.lineUserId,
        lineDisplayName: user.lineDisplayName,
        lineProfileImage: user.lineProfileImage,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        employeeId: user.employeeId,
        branch: user.branch,
        status: user.status,
        role: user.role,
        vacationDays: user.vacationDays,
        sickDays: user.sickDays,
        personalDays: user.personalDays,
        unpaidDays: user.unpaidDays,
        performanceTier: user.performanceTier,
      } satisfies SessionUser;
    }

    if (payload.role === "leader" || payload.role === "admin") {
      const leader = await Leader.findById(payload.userId);
      if (leader) {
        return {
          id: String(leader._id),
          email: leader.email,
          name: leader.name,
          branch: leader.branch,
          role: leader.role || payload.role,
        } satisfies SessionUser;
      }
    }

    throw notFound("User not found in system");
  }

  static async logout() {
    const payload = await getCurrentUser();
    if (payload?.role === "driver" && payload.userId !== "admin_root") {
      await User.findByIdAndUpdate(payload.userId, { isOnline: false });
    }

    await clearAuthCookies();
  }

  static async updateLeaderProfile(input: LeaderProfileUpdateInput) {
    if (input.leaderId === "admin_root") {
      return {
        success: true,
        message: "Root administrator profile is managed via system configuration.",
        leader: { id: "admin_root", name: "ITL Administrator", role: "admin" },
      };
    }

    const userRecord = await User.findById(input.leaderId);
    if (userRecord) {
      if (input.name !== undefined) userRecord.name = input.name;
      if (input.surname !== undefined) userRecord.surname = input.surname;
      if (input.phone !== undefined) userRecord.phone = input.phone;
      if (input.employeeId !== undefined) userRecord.employeeId = input.employeeId;
      if (input.branch !== undefined) userRecord.branch = input.branch;
      if (input.role !== undefined) userRecord.role = input.role;
      await userRecord.save();

      return {
        id: String(userRecord._id),
        name: userRecord.name,
        surname: userRecord.surname,
        phone: userRecord.phone,
        employeeId: userRecord.employeeId,
        branch: userRecord.branch,
        role: userRecord.role,
      };
    }

    const leader = await Leader.findById(input.leaderId);
    if (!leader) {
      throw notFound("User not found");
    }

    if (input.name !== undefined) leader.name = input.name;
    if (input.branch !== undefined) leader.branch = input.branch;
    if (input.role !== undefined) leader.role = input.role;

    if (input.currentPassword && input.newPassword) {
      const isValid = await bcrypt.compare(input.currentPassword, leader.password);
      if (!isValid) {
        throw badRequest("Current password is incorrect");
      }
      leader.password = await bcrypt.hash(input.newPassword, 12);
    } else if (input.newPassword && !input.currentPassword) {
      throw badRequest("Current password is required");
    }

    await leader.save();
    return {
      id: String(leader._id),
      name: leader.name,
      branch: leader.branch,
      role: leader.role,
    };
  }

  static attachSessionCookies(response: NextResponse, payload: TokenPayload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
  }
}
