IF OBJECT_ID(N'[dbo].[RefreshToken]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RefreshToken]
    (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RefreshToken] PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Token] NVARCHAR(256) NOT NULL,
        [Expires] DATETIME2 NOT NULL,
        [Created] DATETIME2 NOT NULL,
        [CreatedByIp] NVARCHAR(64) NULL,
        [Revoked] DATETIME2 NULL,
        [RevokedByIp] NVARCHAR(64) NULL,
        CONSTRAINT [FK_RefreshToken_User_UserId]
            FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id])
    );

    CREATE UNIQUE INDEX [IX_RefreshToken_Token] ON [dbo].[RefreshToken]([Token]);
    CREATE INDEX [IX_RefreshToken_UserId] ON [dbo].[RefreshToken]([UserId]);
END;
