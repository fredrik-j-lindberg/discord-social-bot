ALTER TABLE "member_emojis" ADD COLUMN "isAnimated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_emojis" ADD COLUMN "recordUpdatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "member_emojis" ADD COLUMN "recordCreatedAt" timestamp DEFAULT now() NOT NULL;