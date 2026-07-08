-- CreateTable
CREATE TABLE "GoalColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetCommits" INTEGER,
    "targetPRs" INTEGER,
    "targetIssues" INTEGER,
    "deadline" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "githubIssueUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "GoalColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("completed", "createdAt", "deadline", "description", "githubIssueUrl", "id", "targetCommits", "targetIssues", "targetPRs", "title", "userId") SELECT "completed", "createdAt", "deadline", "description", "githubIssueUrl", "id", "targetCommits", "targetIssues", "targetPRs", "title", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
