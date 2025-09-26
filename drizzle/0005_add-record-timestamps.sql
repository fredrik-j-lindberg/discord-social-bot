ALTER TABLE "member_data" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "member_data" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;