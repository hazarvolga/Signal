const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) throw new Error("DATABASE_URL must be set");

const connectionLimit = Number.parseInt(process.env.POOL_SMOKE_CONNECTION_LIMIT || "10", 10);
if (!Number.isInteger(connectionLimit) || connectionLimit < 2 || connectionLimit > 20) {
  throw new Error("POOL_SMOKE_CONNECTION_LIMIT must be between 2 and 20");
}

const databaseUrl = new URL(rawDatabaseUrl);
databaseUrl.searchParams.set("connection_limit", String(connectionLimit));
databaseUrl.searchParams.set("pool_timeout", "5");
databaseUrl.searchParams.set("application_name", "signal_pool_smoke");
process.env.DATABASE_URL = databaseUrl.toString();

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let monitoring = true;
let maximumConnections = 0;

const monitor = async () => {
  while (monitoring) {
    const rows = await prisma.$queryRaw`
      SELECT count(*)::int AS "count"
      FROM pg_stat_activity
      WHERE application_name = 'signal_pool_smoke'
    `;
    maximumConnections = Math.max(maximumConnections, Number(rows[0]?.count || 0));
    await sleep(5);
  }
};

try {
  const monitorPromise = monitor();
  await Promise.all(
    Array.from({ length: 50 }, () =>
      prisma.$queryRawUnsafe("SELECT pg_sleep(0.08)::text AS slept")
    )
  );
  monitoring = false;
  await monitorPromise;

  if (maximumConnections < 2) {
    throw new Error(`Pool smoke did not create concurrent connections: ${maximumConnections}`);
  }
  if (maximumConnections > connectionLimit) {
    throw new Error(`Pool exceeded connection_limit=${connectionLimit}: ${maximumConnections}`);
  }

  console.log(
    `Connection pool smoke passed: 50 concurrent queries, max=${maximumConnections}, limit=${connectionLimit}, pool_timeout=5s`
  );
} finally {
  monitoring = false;
  await prisma.$disconnect();
}
