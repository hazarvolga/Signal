import { Prisma, type PrismaClient } from "@prisma/client";

export type KeysetCursor = {
  createdAt: string;
  id: string;
};

type QueryClient = Pick<PrismaClient, "$queryRaw">;

function cursorClause(cursor?: KeysetCursor | null) {
  if (!cursor) return Prisma.empty;
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new TypeError("Invalid keyset cursor date");
  return Prisma.sql`AND ("createdAt", "id") < (${createdAt}, ${cursor.id})`;
}

function validateTake(take: number) {
  if (!Number.isInteger(take) || take < 1 || take > 251) {
    throw new RangeError("Keyset page size must be an integer between 1 and 251");
  }
}

export async function contactPageIds(
  prisma: QueryClient,
  organizationId: string,
  take: number,
  cursor?: KeysetCursor | null
): Promise<string[]> {
  validateTake(take);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Contact"
    WHERE "organizationId" = ${organizationId}
    ${cursorClause(cursor)}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${take}
  `);
  return rows.map(({ id }) => id);
}

export async function campaignPageIds(
  prisma: QueryClient,
  organizationId: string,
  take: number,
  cursor?: KeysetCursor | null
): Promise<string[]> {
  validateTake(take);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Campaign"
    WHERE "organizationId" = ${organizationId}
    ${cursorClause(cursor)}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${take}
  `);
  return rows.map(({ id }) => id);
}

export function restorePageOrder<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = rowsById.get(id);
    return row ? [row] : [];
  });
}
