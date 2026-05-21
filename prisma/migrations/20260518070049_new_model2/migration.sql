BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [empNo] NVARCHAR(1000),
[rfId] NVARCHAR(1000),
[role] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'use';

-- CreateTable
CREATE TABLE [dbo].[Group] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Group_status_df] DEFAULT 'use',
    CONSTRAINT [Group_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Section] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Section_status_df] DEFAULT 'use',
    CONSTRAINT [Section_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MapGroupSectionUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [sectionId] INT NOT NULL,
    [groupId] INT NOT NULL,
    [userId] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [MapGroupSectionUser_status_df] DEFAULT 'use',
    CONSTRAINT [MapGroupSectionUser_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Project] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [userId] INT NOT NULL,
    [timeStmp] DATETIME2 NOT NULL CONSTRAINT [Project_timeStmp_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Project_status_df] DEFAULT 'use',
    CONSTRAINT [Project_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectStatus] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [state] NVARCHAR(1000) NOT NULL,
    [timeStmp] DATETIME2 NOT NULL CONSTRAINT [ProjectStatus_timeStmp_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ProjectStatus_status_df] DEFAULT 'use',
    CONSTRAINT [ProjectStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketNo] NVARCHAR(1000) NOT NULL,
    [area] NVARCHAR(1000) NOT NULL,
    [contact] NVARCHAR(1000) NOT NULL,
    [problemTitle] NVARCHAR(1000) NOT NULL,
    [problemDetail] NVARCHAR(1000) NOT NULL,
    [projectId] INT NOT NULL,
    [piority] NVARCHAR(1000) NOT NULL,
    [impactId] INT NOT NULL,
    [timeStmp] DATETIME2 NOT NULL CONSTRAINT [Ticket_timeStmp_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Ticket_status_df] DEFAULT 'use',
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Impact] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [timeStmp] DATETIME2 NOT NULL CONSTRAINT [Impact_timeStmp_df] DEFAULT CURRENT_TIMESTAMP,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Impact_status_df] DEFAULT 'use',
    CONSTRAINT [Impact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[MapGroupSectionUser] ADD CONSTRAINT [MapGroupSectionUser_sectionId_fkey] FOREIGN KEY ([sectionId]) REFERENCES [dbo].[Section]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MapGroupSectionUser] ADD CONSTRAINT [MapGroupSectionUser_groupId_fkey] FOREIGN KEY ([groupId]) REFERENCES [dbo].[Group]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MapGroupSectionUser] ADD CONSTRAINT [MapGroupSectionUser_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectStatus] ADD CONSTRAINT [ProjectStatus_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_impactId_fkey] FOREIGN KEY ([impactId]) REFERENCES [dbo].[Impact]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
