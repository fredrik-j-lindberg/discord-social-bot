CREATE TABLE "member_role" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"memberId" uuid NOT NULL,
	"roleId" varchar(255) NOT NULL,
	"recordUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"recordCreatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_role_memberId_roleId_pk" PRIMARY KEY("memberId","roleId"),
	CONSTRAINT "member_role_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_memberId_member_data_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."member_data"("id") ON DELETE cascade ON UPDATE no action;