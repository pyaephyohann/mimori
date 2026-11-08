-- Collections are the existing "Folder" model: pinning, a cover photo, and the
-- photos placed in each collection. Purely additive — no existing row, table or
-- column is dropped, renamed or rewritten.

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "coverPhotoId" TEXT;

-- CreateTable
CREATE TABLE "CollectionPhoto" (
    "folderId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionPhoto_pkey" PRIMARY KEY ("folderId","photoId")
);

-- CreateIndex
CREATE INDEX "Folder_pinned_createdAt_idx" ON "Folder"("pinned", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionPhoto_folderId_position_idx" ON "CollectionPhoto"("folderId", "position");

-- CreateIndex
CREATE INDEX "CollectionPhoto_photoId_idx" ON "CollectionPhoto"("photoId");

-- AddForeignKey
ALTER TABLE "CollectionPhoto" ADD CONSTRAINT "CollectionPhoto_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
