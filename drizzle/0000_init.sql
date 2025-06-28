CREATE TABLE IF NOT EXISTS "member_data" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"displayName" varchar(255),
	"firstName" varchar(255),
	"birthday" date,
	"phoneNumber" varchar(255),
	"email" varchar(255),
	"height" integer,
	"switchFriendCode" varchar(255),
	CONSTRAINT "member_data_guildId_userId_pk" PRIMARY KEY("guildId","userId"),
	CONSTRAINT "member_data_id_unique" UNIQUE("id")
);
