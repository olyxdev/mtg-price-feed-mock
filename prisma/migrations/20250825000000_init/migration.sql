-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "oracle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "set" TEXT,
    "set_name" TEXT,
    "rarity" TEXT NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "oracle_id" TEXT NOT NULL,
    "card_name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "volume" INTEGER,
    "is_corrupted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cards_oracle_id_idx" ON "cards"("oracle_id");

-- CreateIndex
CREATE INDEX "cards_name_idx" ON "cards"("name");

-- CreateIndex
CREATE INDEX "prices_timestamp_idx" ON "prices"("timestamp");

-- CreateIndex
CREATE INDEX "prices_card_id_idx" ON "prices"("card_id");

-- CreateIndex
CREATE INDEX "prices_oracle_id_idx" ON "prices"("oracle_id");

-- CreateIndex
CREATE INDEX "prices_source_idx" ON "prices"("source");

-- CreateIndex
CREATE INDEX "prices_card_id_source_idx" ON "prices"("card_id", "source");

-- CreateIndex
CREATE INDEX "prices_card_id_timestamp_idx" ON "prices"("card_id", "timestamp");

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;