ALTER TABLE "member_data" ADD COLUMN "messageCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_data" ADD COLUMN "latestMessageAt" date;--> statement-breakpoint
ALTER TABLE "member_data" ADD COLUMN "reactionCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_data" ADD COLUMN "latestReactionAt" date;