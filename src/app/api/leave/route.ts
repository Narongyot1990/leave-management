import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-utils";
import { badRequest } from "@/lib/api-errors";
import { LeaveService } from "@/services/leave.domain";
import { CreateLeaveSchema, LeaveQuerySchema } from "@/lib/validations/leave.schema";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async ({ req, payload }) => {
  if (!payload) {
    throw badRequest("Missing auth payload");
  }

  const { searchParams } = new URL(req.url);
  const query = LeaveQuerySchema.parse(Object.fromEntries(searchParams));

  if (query.limit !== undefined || query.page !== undefined) {
    const result = await LeaveService.listPaginated(payload, query);
    const response = NextResponse.json({ success: true, ...result });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  const requests = await LeaveService.list(payload, query);

  const response = NextResponse.json({ success: true, requests });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
});

export const POST = apiHandler(async ({ req, payload }) => {
  if (!payload) {
    throw badRequest("Missing auth payload");
  }

  const body = await req.json();
  const input = CreateLeaveSchema.parse(body);
  const result = await LeaveService.create(payload, input);
  return NextResponse.json({ success: true, ...result });
});
