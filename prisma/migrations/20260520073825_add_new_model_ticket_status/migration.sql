BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[TicketStatus] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [state] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TicketStatus_status_df] DEFAULT 'use',
    CONSTRAINT [TicketStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[TicketStatus] ADD CONSTRAINT [TicketStatus_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
