-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastRoomJoinedCode" TEXT,
ADD COLUMN     "profilePicKey" TEXT,
ADD COLUMN     "profilePicUrl" TEXT,
ADD COLUMN     "totalRoomsJoined" INTEGER NOT NULL DEFAULT 0;
