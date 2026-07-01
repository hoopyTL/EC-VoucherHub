-- TV4 full admin scope: content management and immutable audit trail.

CREATE TABLE "content_items" (
    "id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "display_from" TIMESTAMPTZ(6),
    "display_to" TIMESTAMPTZ(6),
    "author_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(128),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_items_type_idx" ON "content_items"("type");
CREATE INDEX "content_items_status_idx" ON "content_items"("status");
CREATE INDEX "content_items_author_user_id_idx" ON "content_items"("author_user_id");

CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "content_items" ADD CONSTRAINT "content_items_status_check" CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_type_check" CHECK (type IN ('banner', 'announcement', 'policy', 'faq'));
