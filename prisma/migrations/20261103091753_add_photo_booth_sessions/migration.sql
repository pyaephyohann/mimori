-- CreateTable
CREATE TABLE "PhotoboothSession" (
    "id" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL,
    "layout" TEXT NOT NULL,
    "borderKey" TEXT NOT NULL,
    "backgroundKey" TEXT,
    "caption" TEXT,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "printDate" TEXT,
    "spacing" INTEGER NOT NULL,
    "borderWidth" INTEGER NOT NULL,
    "stickers" JSONB,
    "printPhotoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoboothSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoboothShot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoboothShot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoboothSession_createdAt_idx" ON "PhotoboothSession"("createdAt");

-- CreateIndex
CREATE INDEX "PhotoboothSession_printPhotoId_idx" ON "PhotoboothSession"("printPhotoId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoboothShot_sessionId_position_key" ON "PhotoboothShot"("sessionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoboothShot_photoId_key" ON "PhotoboothShot"("photoId");

-- AddForeignKey
ALTER TABLE "PhotoboothSession" ADD CONSTRAINT "PhotoboothSession_printPhotoId_fkey" FOREIGN KEY ("printPhotoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoboothShot" ADD CONSTRAINT "PhotoboothShot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhotoboothSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoboothShot" ADD CONSTRAINT "PhotoboothShot_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
