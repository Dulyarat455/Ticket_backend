BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ProjectMember] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [userId] INT NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [timeStmp] DATETIME2 NOT NULL CONSTRAINT [ProjectMember_timeStmp_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ProjectMember_status_df] DEFAULT 'use',
    CONSTRAINT [ProjectMember_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
