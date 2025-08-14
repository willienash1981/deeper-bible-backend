-- CreateEnum
CREATE TYPE "public"."Testament" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('DEEPER_ANALYSIS', 'HISTORICAL_CONTEXT', 'SYMBOLIC_PATTERNS', 'CROSS_REFERENCE', 'THEOLOGICAL_THEMES');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Book" (
    "id" TEXT NOT NULL,
    "bookNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "testament" "public"."Testament" NOT NULL,
    "chapterCount" INTEGER NOT NULL,
    "bookOrder" INTEGER NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "dateWritten" TEXT,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verse" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "keywords" TEXT[],

    CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "reportType" "public"."ReportType" NOT NULL,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "rawContent" TEXT,
    "userId" TEXT,
    "tokens" INTEGER,
    "cost" DOUBLE PRECISION,
    "model" TEXT,
    "promptVersion" TEXT,
    "confidence" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER,
    "verse" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."History" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "chapter" INTEGER,
    "verse" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SymbolPattern" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "contexts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrossReference" (
    "id" TEXT NOT NULL,
    "sourceBook" TEXT NOT NULL,
    "sourceChapter" INTEGER NOT NULL,
    "sourceVerse" INTEGER NOT NULL,
    "targetBook" TEXT NOT NULL,
    "targetChapter" INTEGER NOT NULL,
    "targetVerse" INTEGER NOT NULL,
    "relationship" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CacheEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "ttl" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Book_bookNumber_key" ON "public"."Book"("bookNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Book_name_key" ON "public"."Book"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Book_abbr_key" ON "public"."Book"("abbr");

-- CreateIndex
CREATE INDEX "Book_bookNumber_idx" ON "public"."Book"("bookNumber");

-- CreateIndex
CREATE INDEX "Book_testament_idx" ON "public"."Book"("testament");

-- CreateIndex
CREATE INDEX "Book_bookOrder_idx" ON "public"."Book"("bookOrder");

-- CreateIndex
CREATE INDEX "Verse_bookId_chapter_idx" ON "public"."Verse"("bookId", "chapter");

-- CreateIndex
CREATE INDEX "Verse_keywords_idx" ON "public"."Verse"("keywords");

-- CreateIndex
CREATE UNIQUE INDEX "Verse_bookId_chapter_verseNumber_key" ON "public"."Verse"("bookId", "chapter", "verseNumber");

-- CreateIndex
CREATE INDEX "Report_bookId_chapter_idx" ON "public"."Report"("bookId", "chapter");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "public"."Report"("status");

-- CreateIndex
CREATE INDEX "Report_reportType_idx" ON "public"."Report"("reportType");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "public"."Report"("userId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "public"."Report"("createdAt");

-- CreateIndex
CREATE INDEX "Report_expiresAt_idx" ON "public"."Report"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_bookId_chapter_verseStart_verseEnd_reportType_key" ON "public"."Report"("bookId", "chapter", "verseStart", "verseEnd", "reportType");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "public"."Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_bookId_idx" ON "public"."Favorite"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_bookId_chapter_verse_key" ON "public"."Favorite"("userId", "bookId", "chapter", "verse");

-- CreateIndex
CREATE INDEX "History_userId_createdAt_idx" ON "public"."History"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "History_action_idx" ON "public"."History"("action");

-- CreateIndex
CREATE UNIQUE INDEX "SymbolPattern_symbol_key" ON "public"."SymbolPattern"("symbol");

-- CreateIndex
CREATE INDEX "SymbolPattern_category_idx" ON "public"."SymbolPattern"("category");

-- CreateIndex
CREATE INDEX "SymbolPattern_occurrences_idx" ON "public"."SymbolPattern"("occurrences");

-- CreateIndex
CREATE INDEX "CrossReference_sourceBook_sourceChapter_sourceVerse_idx" ON "public"."CrossReference"("sourceBook", "sourceChapter", "sourceVerse");

-- CreateIndex
CREATE INDEX "CrossReference_targetBook_targetChapter_targetVerse_idx" ON "public"."CrossReference"("targetBook", "targetChapter", "targetVerse");

-- CreateIndex
CREATE INDEX "CrossReference_relationship_idx" ON "public"."CrossReference"("relationship");

-- CreateIndex
CREATE UNIQUE INDEX "CrossReference_sourceBook_sourceChapter_sourceVerse_targetB_key" ON "public"."CrossReference"("sourceBook", "sourceChapter", "sourceVerse", "targetBook", "targetChapter", "targetVerse");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_key_key" ON "public"."CacheEntry"("key");

-- CreateIndex
CREATE INDEX "CacheEntry_key_idx" ON "public"."CacheEntry"("key");

-- CreateIndex
CREATE INDEX "CacheEntry_expiresAt_idx" ON "public"."CacheEntry"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."Verse" ADD CONSTRAINT "Verse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."History" ADD CONSTRAINT "History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
