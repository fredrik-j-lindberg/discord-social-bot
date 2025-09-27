CREATE TYPE "public"."context" AS ENUM('reaction', 'message');--> statement-breakpoint
CREATE TABLE "member_emojis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memberId" uuid NOT NULL,
	"emojiId" varchar(255),
	"emojiName" varchar(255) NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"messageAuthorUserId" varchar(255) NOT NULL,
	"messageId" varchar(255) NOT NULL,
	"isGuildEmoji" boolean NOT NULL,
	"context" "context" NOT NULL,
	CONSTRAINT "member_emojis_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "member_emojis" ADD CONSTRAINT "member_emojis_memberId_member_data_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."member_data"("id") ON DELETE no action ON UPDATE no action;