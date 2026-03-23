-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateTable
CREATE TABLE "game_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "score" INTEGER NOT NULL,
    "result" "GameResult" NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "coinsEarned" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_history_userId_idx" ON "game_history"("userId");

-- CreateIndex
CREATE INDEX "game_history_gameType_idx" ON "game_history"("gameType");

-- CreateIndex
CREATE INDEX "game_history_playedAt_idx" ON "game_history"("playedAt");

-- AddForeignKey
ALTER TABLE "game_history" ADD CONSTRAINT "game_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
