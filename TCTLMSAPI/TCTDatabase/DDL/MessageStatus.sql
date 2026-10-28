 CREATE TABLE MessageStatus
(
    Id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_MessageStatus PRIMARY KEY
        DEFAULT NEWID(),

    MessageId UNIQUEIDENTIFIER NOT NULL,

    UserId UNIQUEIDENTIFIER NOT NULL,

    IsDelivered BIT NOT NULL
        CONSTRAINT DF_MessageStatus_IsDelivered DEFAULT (0),

    IsRead BIT NOT NULL
        CONSTRAINT DF_MessageStatus_IsRead DEFAULT (0),

    DeliveredAt DATETIME NULL,

    ReadAt DATETIME NULL,

    CreatedAt DATETIME NOT NULL
        CONSTRAINT DF_MessageStatus_CreatedAt DEFAULT (GETDATE())
);

ALTER TABLE MessageStatus
ADD CONSTRAINT UQ_MessageStatus_Message_User
UNIQUE (MessageId, UserId);

CREATE INDEX IX_MessageStatus_MessageId
ON MessageStatus(MessageId);

CREATE INDEX IX_MessageStatus_UserId
ON MessageStatus(UserId);

CREATE INDEX IX_MessageStatus_Message_User
ON MessageStatus(MessageId, UserId);