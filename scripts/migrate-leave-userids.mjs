import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { MongoClient, ObjectId } from "mongodb";

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

function parseArgs(argv) {
  const options = {
    write: false,
    envFile: ".env.local",
    sampleSize: 10,
  };

  for (const arg of argv) {
    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.write = false;
      continue;
    }

    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length);
      continue;
    }

    if (arg.startsWith("--sample=")) {
      const sampleSize = Number(arg.slice("--sample=".length));
      if (Number.isFinite(sampleSize) && sampleSize > 0) {
        options.sampleSize = Math.floor(sampleSize);
      }
    }
  }

  return options;
}

function loadEnvFile(envFile) {
  const resolvedPath = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Env file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  return resolvedPath;
}

async function collectAudit(db, sampleSize) {
  const leaves = db.collection("leaverequests");
  const users = db.collection("users");
  const leaders = db.collection("leaders");

  const [totalLeaves, pendingLeaves, userIdTypeSummary, pendingTypeSummary, rawStringLeaves, pendingByBranch, userLeaders, legacyLeaders] =
    await Promise.all([
      leaves.countDocuments({}),
      leaves.countDocuments({ status: "pending" }),
      leaves
        .aggregate([
          { $project: { userIdType: { $type: "$userId" } } },
          { $group: { _id: "$userIdType", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ])
        .toArray(),
      leaves
        .aggregate([
          { $match: { status: "pending" } },
          { $project: { userIdType: { $type: "$userId" } } },
          { $group: { _id: "$userIdType", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ])
        .toArray(),
      leaves
        .find(
          { userId: { $type: "string" } },
          { projection: { _id: 1, userId: 1, status: 1, leaveType: 1, createdAt: 1 } },
        )
        .sort({ createdAt: -1 })
        .toArray(),
      leaves
        .aggregate([
          { $match: { status: "pending" } },
          {
            $addFields: {
              userObjId: {
                $cond: [
                  { $eq: [{ $type: "$userId" }, "objectId"] },
                  "$userId",
                  {
                    $cond: [
                      {
                        $and: [
                          { $eq: [{ $type: "$userId" }, "string"] },
                          { $regexMatch: { input: "$userId", regex: OBJECT_ID_PATTERN } },
                        ],
                      },
                      { $toObjectId: "$userId" },
                      null,
                    ],
                  },
                ],
              },
            },
          },
          { $lookup: { from: "users", localField: "userObjId", foreignField: "_id", as: "user" } },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$user.branch",
              count: { $sum: 1 },
              unresolvedUser: {
                $sum: {
                  $cond: [{ $eq: ["$user", null] }, 1, 0],
                },
              },
            },
          },
          { $sort: { count: -1, _id: 1 } },
        ])
        .toArray(),
      users
        .aggregate([
          { $match: { role: { $in: ["leader", "admin"] } } },
          { $group: { _id: { role: "$role", branch: "$branch", status: "$status" }, count: { $sum: 1 } } },
          { $sort: { "_id.role": 1, "_id.branch": 1 } },
        ])
        .toArray(),
      leaders
        .aggregate([
          { $group: { _id: { role: "$role", branch: "$branch" }, count: { $sum: 1 } } },
          { $sort: { "_id.role": 1, "_id.branch": 1 } },
        ])
        .toArray(),
    ]);

  const convertibleLeaves = [];
  const skippedLeaves = [];

  for (const leave of rawStringLeaves) {
    if (typeof leave.userId !== "string") {
      skippedLeaves.push({
        ...leave,
        reason: "userId is not a string",
      });
      continue;
    }

    if (!OBJECT_ID_PATTERN.test(leave.userId)) {
      skippedLeaves.push({
        ...leave,
        reason: "userId is not a 24-char ObjectId string",
      });
      continue;
    }

    const user = await users.findOne(
      { _id: new ObjectId(leave.userId) },
      { projection: { _id: 1, branch: 1, role: 1, status: 1, lineDisplayName: 1, name: 1, surname: 1 } },
    );

    convertibleLeaves.push({
      _id: leave._id,
      userId: leave.userId,
      status: leave.status,
      leaveType: leave.leaveType,
      createdAt: leave.createdAt,
      userFound: Boolean(user),
      user,
    });
  }

  return {
    totalLeaves,
    pendingLeaves,
    userIdTypeSummary,
    pendingTypeSummary,
    pendingByBranch,
    userLeaders,
    legacyLeaders,
    convertibleLeaves,
    skippedLeaves,
    convertibleResolutionSummary: {
      userFound: convertibleLeaves.filter((leave) => leave.userFound).length,
      userMissing: convertibleLeaves.filter((leave) => !leave.userFound).length,
    },
    sampleConvertibleLeaves: convertibleLeaves.slice(0, sampleSize),
    sampleSkippedLeaves: skippedLeaves.slice(0, sampleSize),
  };
}

async function migrateUserIds(db, convertibleLeaves) {
  const leaves = db.collection("leaverequests");
  if (convertibleLeaves.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const operations = convertibleLeaves.map((leave) => ({
    updateOne: {
      filter: { _id: leave._id, userId: leave.userId },
      update: { $set: { userId: new ObjectId(leave.userId) } },
    },
  }));

  return leaves.bulkWrite(operations, { ordered: false });
}

function formatSummary(audit, mode, envPath, dbName) {
  return {
    mode,
    envFile: envPath,
    database: dbName,
    totals: {
      totalLeaves: audit.totalLeaves,
      pendingLeaves: audit.pendingLeaves,
      convertibleStringUserIds: audit.convertibleLeaves.length,
      skippedStringUserIds: audit.skippedLeaves.length,
    },
    convertibleResolutionSummary: audit.convertibleResolutionSummary,
    userIdTypes: audit.userIdTypeSummary,
    pendingUserIdTypes: audit.pendingTypeSummary,
    pendingByBranch: audit.pendingByBranch,
    leadersInUsers: audit.userLeaders,
    leadersInLegacyCollection: audit.legacyLeaders,
    sampleConvertibleLeaves: audit.sampleConvertibleLeaves,
    sampleSkippedLeaves: audit.sampleSkippedLeaves,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envPath = loadEnvFile(options.envFile);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(`MONGODB_URI is not set after loading ${envPath}`);
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();

  try {
    const db = client.db();
    const auditBefore = await collectAudit(db, options.sampleSize);

    console.log(JSON.stringify(formatSummary(auditBefore, options.write ? "write" : "dry-run", envPath, db.databaseName), null, 2));

    if (!options.write) {
      return;
    }

    const writeResult = await migrateUserIds(db, auditBefore.convertibleLeaves);
    const auditAfter = await collectAudit(db, options.sampleSize);

    console.log(
      JSON.stringify(
        {
          writeResult: {
            matchedCount: writeResult.matchedCount,
            modifiedCount: writeResult.modifiedCount,
          },
          after: formatSummary(auditAfter, "post-write", envPath, db.databaseName),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
