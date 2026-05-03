CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"code" varchar(120) NOT NULL,
	"label" varchar(160) NOT NULL,
	"path" varchar(240),
	"icon" varchar(80),
	"level" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "menus_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "policy_menus" (
	"policy_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_menus_policy_id_menu_id_pk" PRIMARY KEY("policy_id","menu_id")
);
--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_id_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_level_check" CHECK ("level" between 1 and 3);--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_level_check" CHECK (("level" = 1 AND "parent_id" IS NULL) OR ("level" in (2, 3) AND "parent_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "policy_menus" ADD CONSTRAINT "policy_menus_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_menus" ADD CONSTRAINT "policy_menus_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menus_parent_id_idx" ON "menus" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "menus_level_idx" ON "menus" USING btree ("level");--> statement-breakpoint
CREATE INDEX "menus_is_active_idx" ON "menus" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "menus_deleted_at_idx" ON "menus" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "policy_menus_menu_id_idx" ON "policy_menus" USING btree ("menu_id");
