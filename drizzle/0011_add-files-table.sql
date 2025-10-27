CREATE TABLE "item_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itemId" uuid NOT NULL,
	"tagId" uuid NOT NULL,
	"recordUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"recordCreatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_tags_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "member_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(1024) NOT NULL,
	"contentType" varchar(255),
	"url" varchar(2048) NOT NULL,
	"sizeInBytes" integer NOT NULL,
	"memberId" uuid NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"recordUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"recordCreatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_files_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar(4000),
	"recordUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"recordCreatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_guildId_name_type_pk" PRIMARY KEY("guildId","name","type"),
	CONSTRAINT "tags_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;