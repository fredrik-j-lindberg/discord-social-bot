CREATE TABLE "guild_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"config" jsonb,
	"recordUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"recordCreatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_configs_id_unique" UNIQUE("id"),
	CONSTRAINT "guild_configs_guildId_unique" UNIQUE("guildId")
);
