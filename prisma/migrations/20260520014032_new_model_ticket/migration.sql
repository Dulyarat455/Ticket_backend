/*
  Warnings:

  - You are about to drop the column `impactId` on the `Ticket` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Ticket] DROP CONSTRAINT [Ticket_impactId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Ticket] DROP COLUMN [impactId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
