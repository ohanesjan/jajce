-- CreateEnum
CREATE TYPE "customer_stage" AS ENUM ('lead', 'subscriber', 'waiting_list', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "preferred_channel" AS ENUM ('email', 'viber', 'whatsapp', 'all');

-- CreateEnum
CREATE TYPE "preference_unit" AS ENUM ('week', 'month');

-- CreateEnum
CREATE TYPE "notification_frequency" AS ENUM ('instant', 'weekly', 'manual_only');

-- CreateEnum
CREATE TYPE "cost_category" AS ENUM (
  'feed',
  'supplements',
  'bedding_hygiene',
  'packaging',
  'transport',
  'labor_time',
  'utilities',
  'maintenance',
  'veterinary_medicine',
  'equipment_tools',
  'land_facility',
  'miscellaneous'
);

-- CreateEnum
CREATE TYPE "cost_type" AS ENUM ('direct', 'allocated');

-- CreateEnum
CREATE TYPE "cost_frequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "cost_source_type" AS ENUM ('manual', 'template');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('reserved', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "price_source" AS ENUM ('default', 'manual_override');

-- CreateEnum
CREATE TYPE "inventory_transaction_type" AS ENUM ('collected', 'reserved', 'released', 'sold', 'manual_adjustment');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('email', 'viber', 'whatsapp');

-- CreateEnum
CREATE TYPE "audience_type" AS ENUM ('subscribers', 'waiting_list', 'active_customers', 'selected_contacts');

-- CreateEnum
CREATE TYPE "notification_campaign_status" AS ENUM ('draft', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "admins" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
  "id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "is_subscriber" BOOLEAN NOT NULL DEFAULT false,
  "is_waiting_list" BOOLEAN NOT NULL DEFAULT false,
  "is_active_customer" BOOLEAN NOT NULL DEFAULT false,
  "email_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "phone_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "preferred_channel" "preferred_channel",
  "preferred_quantity" INTEGER,
  "preference_unit" "preference_unit",
  "notification_frequency" "notification_frequency",
  "customer_stage" "customer_stage" NOT NULL DEFAULT 'lead',
  "source" TEXT,
  "joined_waiting_list_at" TIMESTAMP(3),
  "became_customer_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "eggs_total_yield" INTEGER NOT NULL,
  "eggs_collected_for_sale" INTEGER NOT NULL,
  "eggs_used_other_purpose" INTEGER NOT NULL,
  "eggs_broken" INTEGER NOT NULL,
  "eggs_unusable_other" INTEGER NOT NULL,
  "chicken_count" INTEGER NOT NULL,
  "public_note" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_total_yield_non_negative_check"
CHECK ("eggs_total_yield" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_collected_for_sale_non_negative_check"
CHECK ("eggs_collected_for_sale" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_used_other_purpose_non_negative_check"
CHECK ("eggs_used_other_purpose" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_broken_non_negative_check"
CHECK ("eggs_broken" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_unusable_other_non_negative_check"
CHECK ("eggs_unusable_other" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_chicken_count_non_negative_check"
CHECK ("chicken_count" >= 0);

ALTER TABLE "daily_logs"
ADD CONSTRAINT "daily_logs_eggs_total_yield_formula_check"
CHECK (
  "eggs_total_yield" = "eggs_collected_for_sale"
  + "eggs_used_other_purpose"
  + "eggs_broken"
  + "eggs_unusable_other"
);

-- CreateTable
CREATE TABLE "cost_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "cost_category" NOT NULL,
  "cost_type" "cost_type" NOT NULL,
  "default_quantity" DECIMAL(10,2),
  "default_unit" TEXT,
  "default_unit_price" DECIMAL(10,2),
  "default_total_amount" DECIMAL(10,2) NOT NULL,
  "frequency" "cost_frequency" NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cost_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cost_templates"
ADD CONSTRAINT "cost_templates_default_quantity_non_negative_check"
CHECK ("default_quantity" IS NULL OR "default_quantity" >= 0);

ALTER TABLE "cost_templates"
ADD CONSTRAINT "cost_templates_default_unit_price_non_negative_check"
CHECK ("default_unit_price" IS NULL OR "default_unit_price" >= 0);

ALTER TABLE "cost_templates"
ADD CONSTRAINT "cost_templates_default_total_amount_non_negative_check"
CHECK ("default_total_amount" >= 0);

-- CreateTable
CREATE TABLE "cost_entries" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "category" "cost_category" NOT NULL,
  "cost_type" "cost_type" NOT NULL,
  "quantity" DECIMAL(10,2),
  "unit" TEXT,
  "unit_price" DECIMAL(10,2),
  "total_amount" DECIMAL(10,2) NOT NULL,
  "source_type" "cost_source_type" NOT NULL,
  "cost_template_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cost_entries"
ADD CONSTRAINT "cost_entries_quantity_non_negative_check"
CHECK ("quantity" IS NULL OR "quantity" >= 0);

ALTER TABLE "cost_entries"
ADD CONSTRAINT "cost_entries_unit_price_non_negative_check"
CHECK ("unit_price" IS NULL OR "unit_price" >= 0);

ALTER TABLE "cost_entries"
ADD CONSTRAINT "cost_entries_total_amount_non_negative_check"
CHECK ("total_amount" >= 0);

-- CreateTable
CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "target_fulfillment_date" DATE,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "total_price" DECIMAL(10,2) NOT NULL,
  "status" "order_status" NOT NULL,
  "fulfilled_at" TIMESTAMP(3),
  "price_source" "price_source" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_quantity_non_negative_check"
CHECK ("quantity" >= 0);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_unit_price_non_negative_check"
CHECK ("unit_price" >= 0);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_total_price_non_negative_check"
CHECK ("total_price" >= 0);

-- CreateTable
CREATE TABLE "inventory_transactions" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "inventory_transaction_type" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "daily_log_id" TEXT,
  "order_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_transactions"
ADD CONSTRAINT "inventory_transactions_quantity_by_type_check"
CHECK (
  (
    "type" IN ('collected', 'reserved', 'released', 'sold')
    AND "quantity" >= 0
  )
  OR (
    "type" = 'manual_adjustment'
  )
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "audience_type" "audience_type" NOT NULL,
  "sender_label" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "status" "notification_campaign_status" NOT NULL,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "destination" TEXT NOT NULL,
  "delivery_status" "delivery_status" NOT NULL,
  "sent_at" TIMESTAMP(3),
  "provider_message_id" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
  "key" TEXT NOT NULL,
  "value_json" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_is_active_idx" ON "admins"("is_active");

-- CreateIndex
CREATE INDEX "contacts_customer_stage_idx" ON "contacts"("customer_stage");

-- CreateIndex
CREATE INDEX "contacts_is_subscriber_idx" ON "contacts"("is_subscriber");

-- CreateIndex
CREATE INDEX "contacts_is_waiting_list_idx" ON "contacts"("is_waiting_list");

-- CreateIndex
CREATE INDEX "contacts_is_active_customer_idx" ON "contacts"("is_active_customer");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_date_key" ON "daily_logs"("date");

-- CreateIndex
CREATE INDEX "daily_logs_created_at_idx" ON "daily_logs"("created_at");

-- CreateIndex
CREATE INDEX "cost_templates_is_active_idx" ON "cost_templates"("is_active");

-- CreateIndex
CREATE INDEX "cost_templates_category_idx" ON "cost_templates"("category");

-- CreateIndex
CREATE INDEX "cost_templates_cost_type_idx" ON "cost_templates"("cost_type");

-- CreateIndex
CREATE INDEX "cost_templates_frequency_idx" ON "cost_templates"("frequency");

-- CreateIndex
CREATE INDEX "cost_templates_is_active_start_date_end_date_idx" ON "cost_templates"("is_active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "cost_entries_date_idx" ON "cost_entries"("date");

-- CreateIndex
CREATE INDEX "cost_entries_cost_type_idx" ON "cost_entries"("cost_type");

-- CreateIndex
CREATE INDEX "cost_entries_category_idx" ON "cost_entries"("category");

-- CreateIndex
CREATE INDEX "cost_entries_cost_template_id_idx" ON "cost_entries"("cost_template_id");

-- CreateIndex
CREATE INDEX "cost_entries_date_cost_type_idx" ON "cost_entries"("date", "cost_type");

-- CreateIndex
CREATE INDEX "orders_contact_id_idx" ON "orders"("contact_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_date_idx" ON "orders"("date");

-- CreateIndex
CREATE INDEX "orders_fulfilled_at_idx" ON "orders"("fulfilled_at");

-- CreateIndex
CREATE INDEX "orders_target_fulfillment_date_idx" ON "orders"("target_fulfillment_date");

-- CreateIndex
CREATE INDEX "orders_status_target_fulfillment_date_idx" ON "orders"("status", "target_fulfillment_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_date_idx" ON "inventory_transactions"("date");

-- CreateIndex
CREATE INDEX "inventory_transactions_type_idx" ON "inventory_transactions"("type");

-- CreateIndex
CREATE INDEX "inventory_transactions_daily_log_id_idx" ON "inventory_transactions"("daily_log_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_order_id_idx" ON "inventory_transactions"("order_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_type_date_idx" ON "inventory_transactions"("type", "date");

-- CreateIndex
CREATE INDEX "notification_campaigns_channel_idx" ON "notification_campaigns"("channel");

-- CreateIndex
CREATE INDEX "notification_campaigns_audience_type_idx" ON "notification_campaigns"("audience_type");

-- CreateIndex
CREATE INDEX "notification_campaigns_status_idx" ON "notification_campaigns"("status");

-- CreateIndex
CREATE INDEX "notification_campaigns_sent_at_idx" ON "notification_campaigns"("sent_at");

-- CreateIndex
CREATE INDEX "notification_recipients_campaign_id_idx" ON "notification_recipients"("campaign_id");

-- CreateIndex
CREATE INDEX "notification_recipients_contact_id_idx" ON "notification_recipients"("contact_id");

-- CreateIndex
CREATE INDEX "notification_recipients_delivery_status_idx" ON "notification_recipients"("delivery_status");

-- CreateIndex
CREATE INDEX "notification_recipients_campaign_id_delivery_status_idx" ON "notification_recipients"("campaign_id", "delivery_status");

-- AddForeignKey
ALTER TABLE "cost_entries"
ADD CONSTRAINT "cost_entries_cost_template_id_fkey"
FOREIGN KEY ("cost_template_id") REFERENCES "cost_templates"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"
ADD CONSTRAINT "orders_contact_id_fkey"
FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions"
ADD CONSTRAINT "inventory_transactions_daily_log_id_fkey"
FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions"
ADD CONSTRAINT "inventory_transactions_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients"
ADD CONSTRAINT "notification_recipients_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients"
ADD CONSTRAINT "notification_recipients_contact_id_fkey"
FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
