CREATE TABLE "notification_campaign_selections" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_campaign_selections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_campaign_selections_campaign_id_idx"
ON "notification_campaign_selections"("campaign_id");

CREATE INDEX "notification_campaign_selections_contact_id_idx"
ON "notification_campaign_selections"("contact_id");

CREATE UNIQUE INDEX "notification_campaign_selections_campaign_id_contact_id_key"
ON "notification_campaign_selections"("campaign_id", "contact_id");

CREATE UNIQUE INDEX "notification_recipients_campaign_id_contact_id_key"
ON "notification_recipients"("campaign_id", "contact_id");

ALTER TABLE "notification_campaign_selections"
ADD CONSTRAINT "notification_campaign_selections_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_campaign_selections"
ADD CONSTRAINT "notification_campaign_selections_contact_id_fkey"
FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
