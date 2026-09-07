import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-utils";
import { badRequest } from "@/lib/api-errors";
import { OtService } from "@/services/ot.domain";
import { BatchApproveOtSchema } from "@/lib/validations/ot.schema";

export const dynamic = "force-dynamic";

export const POST = apiHandler(
  async ({ req, payload }) => {
    if (!payload) {
      throw badRequest("Missing auth payload");
    }

    const body = await req.json();
    const input = BatchApproveOtSchema.parse(body);
    const result = await OtService.batchApprove(payload, input);
    return NextResponse.json({ success: true, ...result });
  },
  { requireAuth: true, allowedRoles: ["leader", "admin"] },
);
