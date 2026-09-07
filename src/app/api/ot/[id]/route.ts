import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-utils";
import { badRequest } from "@/lib/api-errors";
import { OtService } from "@/services/ot.domain";
import { CancelOtSchema, ReviewOtSchema } from "@/lib/validations/ot.schema";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return apiHandler(async ({ req, payload }) => {
    if (!payload) {
      throw badRequest("Missing auth payload");
    }

    const { searchParams } = new URL(req.url);
    const input = CancelOtSchema.parse({ userId: searchParams.get("userId") ?? undefined });
    const result = await OtService.cancel(payload, id, input);
    return NextResponse.json(result);
  })(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return apiHandler(async ({ req, payload }) => {
    if (!payload) {
      throw badRequest("Missing auth payload");
    }

    const body = await req.json();
    const input = ReviewOtSchema.parse(body);
    const result = await OtService.review(payload, id, input);
    return NextResponse.json({ success: true, request: result });
  })(request);
}
