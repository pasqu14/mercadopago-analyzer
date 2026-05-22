-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "mp_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "net_amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "date" TIMESTAMP(3) NOT NULL,
    "merchant_name" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "payment_method" TEXT,
    "payment_type" TEXT,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cache" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "total_spend" DOUBLE PRECISION NOT NULL,
    "daily_average" DOUBLE PRECISION NOT NULL,
    "top_category" TEXT,
    "trend" DOUBLE PRECISION,
    "transaction_count" INTEGER NOT NULL,
    "ai_insight" TEXT,
    "ai_insight_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "new_payments" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_mp_id_key" ON "payments"("mp_id");
CREATE UNIQUE INDEX "categories_payment_id_key" ON "categories"("payment_id");
CREATE UNIQUE INDEX "analytics_cache_period_key" ON "analytics_cache"("period");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
