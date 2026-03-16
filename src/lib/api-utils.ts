import { NextRequest, NextResponse } from 'next/server';
import dbConnect from './mongodb';
import { requireAuth } from './api-auth';
import { ZodError } from 'zod';

type HandlerContext = {
  payload: any;
  req: NextRequest;
};

type ApiHandlerOptions = {
  requireAuth?: boolean;
  allowedRoles?: string[];
};

export function apiHandler(
  handler: (ctx: HandlerContext) => Promise<NextResponse>,
  options: ApiHandlerOptions = { requireAuth: true }
) {
  return async (req: NextRequest) => {
    try {
      // 1. Database Connection
      await dbConnect();

      // 2. Authentication & Authorization
      let payload = null;
      if (options.requireAuth) {
        const authResult = requireAuth(req);
        if ('error' in authResult) return authResult.error;
        
        payload = authResult.payload;

        // Role Check
        if (options.allowedRoles && !options.allowedRoles.includes(payload.role)) {
          return NextResponse.json(
            { error: `Forbidden: Allowed roles are ${options.allowedRoles.join(', ')}` },
            { status: 403 }
          );
        }
      }

      // 3. Execute Handler
      return await handler({ payload, req });

    } catch (error: any) {
      console.error('[API_ERROR]', error);

      // Zod Validation Error handling
      if (error instanceof ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({ path: e.path, message: e.message }))
        }, { status: 400 });
      }

      // Generic Error handling
      return NextResponse.json({
        success: false,
        error: error.message || 'Internal server error'
      }, { status: error.status || 500 });
    }
  };
}
