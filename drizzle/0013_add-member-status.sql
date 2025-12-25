CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'departed');--> statement-breakpoint
ALTER TABLE "member_data" ADD COLUMN "status" "member_status" DEFAULT 'active' NOT NULL;