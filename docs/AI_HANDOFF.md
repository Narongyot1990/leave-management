# AI Handoff Notes

This file is optimized for the next AI or engineer who needs to make changes quickly without re-learning the repo.

## Start Here

Open these files first:

1. `docs/PROJECT_STRUCTURE.md`
2. `docs/CURRENT_ARCHITECTURE.md`
3. `src/services/leave.domain.ts`
4. `src/services/auth.domain.ts`
5. `src/middleware.ts`

## Current Session Baseline

Updated on 2026-06-08 before starting new project work.

- Repo path: `D:\projects\ITL\drivers`
- Project name in `package.json`: `drivers`
- Git remote: `https://github.com/Narongyot1990/fls-driver.git`
- Current branch: `master`, aligned with `origin/master`
- Latest `git pull --ff-only origin master`: `Already up to date`
- Vercel CLI is installed and logged in as `narongyot1990`
- Local tracked files were clean before documentation updates
- Existing untracked temporary logs: `.tmp-next-dev.err.log`, `.tmp-next-dev.out.log`, `.tmp-next-start.err.log`, `.tmp-next-start.out.log`

Verified baseline:

1. `npm run test` passed: 6 test files, 36 tests
2. `npm run build` passed with Next.js 16.1.6
3. Build warning remains: `src/middleware.ts` convention is deprecated in Next 16 and should eventually migrate to `proxy`

Note for future AI sessions:

- If test startup fails with `spawn EPERM` inside the sandbox, rerun `npm run test` outside the sandbox. This was a sandbox/process-spawn issue, not a test failure.
- Do not print `.env.local` values. It contains JWT, MongoDB, Vercel/OIDC, and project token values.

## Current Source Of Truth For Leave Logic

- list/review/cancel/create logic: `src/services/leave.domain.ts`
- list endpoints: `src/app/api/leave/route.ts`
- review/cancel endpoint: `src/app/api/leave/[id]/route.ts`
- leader approval UI: `src/app/leader/approve/page.tsx`
- calendar UI: `src/app/dashboard/page.tsx`
- date-span helpers: `src/lib/leave-calendar.ts`
- shared leave/session types: `src/lib/app-types.ts`

## Recent Important Changes

### 1. Leader branch scope no longer trusts JWT branch blindly

Leader leave visibility now resolves branch from the database in `leave.domain.ts`.

Why:

- leader records can be updated while old JWTs still exist
- relying only on token branch caused empty approval lists

### 2. Leave request `userId` was normalized

Historical leave data previously mixed `string` and `ObjectId`.

Current safety measures:

- service queries still normalize mixed `$in` filters
- migration script exists in `scripts/migrate-leave-userids.mjs`

Before changing leave schema assumptions again:

1. run `npm run audit:leave-userids`
2. inspect results
3. migrate only if needed

### 3. Dashboard calendar now uses date keys

The dashboard previously relied on inline `Date` comparisons. It now uses `src/lib/leave-calendar.ts`.

Rule:

- do not reintroduce direct `Date` comparisons for day-span rendering unless timezone behavior is explicitly tested

## Current Data Model Reality

- `users` is the main personnel collection
- `leaders` still exists as a compatibility path for password login
- `admin_root` is still a special-case identity
- `LeaveRequest.userId` schema is `Mixed` to tolerate legacy data that may be stored as either `ObjectId` or string
- branch comparisons should be treated case-insensitively where the existing services already do so

This means a bug can be:

- a data problem
- a query scope problem
- a stale session payload problem

Always check all three before assuming only frontend or only database.

## Current High-Leverage Files By Task

### If leave approval is broken

- `src/services/leave.domain.ts`
- `src/app/leader/approve/page.tsx`
- `src/app/admin/approve/page.tsx`
- `src/lib/pusher.ts`

### If the dashboard calendar is wrong

- `src/app/dashboard/page.tsx`
- `src/lib/leave-calendar.ts`
- `src/lib/thai-holidays.ts`

### If admin branch filtering is wrong

- `src/hooks/useAdminBranchScope.ts`
- `src/app/admin/*`
- `src/services/branches.domain.ts`

### If login/session flow is wrong

- `src/services/auth.domain.ts`
- `src/lib/jwt-auth.ts`
- `src/lib/api-auth.ts`
- `src/middleware.ts`

### If leave form or history is wrong

- `src/app/leave/page.tsx`
- `src/app/leave/_hooks/useLeaveFormController.ts`
- `src/app/leave/_hooks/useLeaveHistoryController.ts`
- `src/app/leave/_lib/leaveApiClient.ts`
- `src/lib/validations/leave.schema.ts`

### If attendance is wrong

- `src/services/attendance.domain.ts`
- `src/app/api/attendance/route.ts`
- `src/app/api/attendance/correction/route.ts`
- `src/app/leader/attendance/page.tsx`
- `src/app/leader/attendance/hooks/useAttendanceController.ts`

### If tasks are wrong

- `src/services/tasks.domain.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/admin/tasks/page.tsx`
- `src/app/leader/tasks/page.tsx`
- `src/app/tasks/page.tsx`

## Suggested Refactor Targets Later

These are not blockers, but they are good cleanup candidates:

- centralize repeated `/api/auth/me` page bootstrapping into a reusable hook
- reduce duplicated local interfaces in history and management pages
- replace `src/middleware.ts` with `proxy` when the team is ready for Next 16 cleanup
- keep migrating shared UI response types into `src/lib/app-types.ts`

## Verification Checklist Before Push

For leave/auth/dashboard changes:

1. `npm run build`
2. `npm run test`
3. `npm run audit:leave-userids`

For DB-sensitive leave changes:

1. confirm `LeaveRequest.userId` shape
2. confirm branch-scoped counts in MongoDB
3. confirm leader session branch in `/api/auth/me`

## Do Not Assume

- do not assume `leaders` collection is unused
- do not assume JWT branch is current
- do not assume calendar bugs are backend bugs
- do not assume leave visibility issues mean data is missing

Inspect the query, session, and stored document shape together.
