-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" VARCHAR(255) NOT NULL,
    "sandbox_id" VARCHAR(255),
    "task_id" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "unread_msg_count" INTEGER NOT NULL DEFAULT 0,
    "latest_msg" TEXT NOT NULL DEFAULT '',
    "latest_message_at" TIMESTAMP(3),
    "events" JSONB NOT NULL DEFAULT '[]',
    "files" JSONB NOT NULL DEFAULT '[]',
    "memories" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(255) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL DEFAULT '',
    "filepath" VARCHAR(255) NOT NULL DEFAULT '',
    "key" VARCHAR(255) NOT NULL DEFAULT '',
    "extension" VARCHAR(255) NOT NULL DEFAULT '',
    "mime_type" VARCHAR(255) NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL DEFAULT '',
    "email" VARCHAR(255) NOT NULL DEFAULT '',
    "password" VARCHAR(255) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
