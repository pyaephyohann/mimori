-- Devices that agreed to receive Mimori's native notifications. Purely
-- additive: one new table, no existing row, column or index is touched.
--
-- The endpoint is unique because a browser profile or installed app keeps one
-- push subscription; re-subscribing (a permission re-grant, a renewed expiry)
-- updates that same row instead of adding a second device.

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
