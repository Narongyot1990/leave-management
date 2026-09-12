import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { MongoClient } from "mongodb";

function parseArgs(argv) {
  const options = {
    write: false,
    envFile: ".env.local",
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

async function collectAudit(db) {
  const otRequests = db.collection("otrequests");

  const [total, missingClaimType, claimTypeSummary] = await Promise.all([
    otRequests.countDocuments({}),
    otRequests.countDocuments({ claimType: { $exists: false } }),
    otRequests
      .aggregate([
        { $group: { _id: "$claimType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  return { total, missingClaimType, claimTypeSummary };
}

async function backfillClaimType(db) {
  const otRequests = db.collection("otrequests");
  return otRequests.updateMany(
    { claimType: { $exists: false } },
    { $set: { claimType: "ot" } },
  );
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
    const auditBefore = await collectAudit(db);

    console.log(JSON.stringify({
      mode: options.write ? "write" : "dry-run",
      envFile: envPath,
      database: db.databaseName,
      before: auditBefore,
    }, null, 2));

    if (!options.write) {
      return;
    }

    const writeResult = await backfillClaimType(db);
    const auditAfter = await collectAudit(db);

    console.log(JSON.stringify({
      writeResult: {
        matchedCount: writeResult.matchedCount,
        modifiedCount: writeResult.modifiedCount,
      },
      after: auditAfter,
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
