-- Tags were historically global. Keep ambiguous legacy rows read-only
-- (organizationId = NULL) and safely assign tags used by a single tenant.
ALTER TABLE "Tag" ADD COLUMN "organizationId" TEXT;

UPDATE "Tag" AS tag
SET "organizationId" = scoped."organizationId"
FROM (
    SELECT contact_tag."B" AS "tagId", MIN(contact."organizationId") AS "organizationId"
    FROM "_ContactToTag" AS contact_tag
    JOIN "Contact" AS contact ON contact.id = contact_tag."A"
    GROUP BY contact_tag."B"
    HAVING COUNT(DISTINCT contact."organizationId") = 1
) AS scoped
WHERE tag.id = scoped."tagId";

CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");
CREATE UNIQUE INDEX "Tag_name_organizationId_key" ON "Tag"("name", "organizationId");

ALTER TABLE "Tag"
ADD CONSTRAINT "Tag_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
