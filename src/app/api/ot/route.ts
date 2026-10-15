import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-utils";
import { badRequest } from "@/lib/api-errors";
import { OtService } from "@/services/ot.domain";
import { CreateOtSchema, OtQuerySchema } from "@/lib/validations/ot.schema";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async ({ req, payload }) => {
  if (!payload) {
    throw badRequest("Missing auth payload");
  }

  const { searchParams } = new URL(req.url);
  const query = OtQuerySchema.parse(Object.fromEntries(searchParams));

  if (query.limit !== undefined || query.page !== undefined) {
    const result = await OtService.listPaginated(payload, query);
    const response = NextResponse.json({ success: true, ...result });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  const requests = await OtService.list(payload, query);

  const response = NextResponse.json({ success: true, requests });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
});

export const POST = apiHandler(async ({ req, payload }) => {
  if (!payload) {
    throw badRequest("Missing auth payload");
  }

  const formData = await req.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) {
    throw badRequest("Photo is required", { code: "PHOTO_REQUIRED" });
  }

  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  const input = CreateOtSchema.parse({
    userId: formData.get("userId"),
    date: formData.get("date"),
    claimType: formData.get("claimType"),
    startTime: startTime ? startTime : undefined,
    endTime: endTime ? endTime : undefined,
    reason: formData.get("reason"),
  });
  const result = await OtService.create(payload, input, photo);
  return NextResponse.json({ success: true, ...result });
});
