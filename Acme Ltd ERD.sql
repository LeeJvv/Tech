CREATE TABLE [Category] (
  [CategoryID] integer PRIMARY KEY,
  [Name] nvarchar(255) NOT NULL
)
GO

CREATE TABLE [Item] (
  [ItemID] integer PRIMARY KEY,
  [Name] nvarchar(255) NOT NULL,
  [Description] nvarchar(255),
  [CategoryID] INT
)
GO

CREATE TABLE [Customer] (
  [CustomerID] int PRIMARY KEY,
  [Name] nvarchar(255) NOT NULL,
  [Email] nvarchar(255),
  [Password] nvarchar(255)
)
GO

CREATE TABLE [Visibility] (
  [CategoryID] int,
  [CustomerID] int,
  [visible] boolean
)
GO

CREATE TABLE [CategoryItemRelation] (
  [RelationID] INT PRIMARY KEY,
  [CategoryID] INT,
  [ItemID] INT
)
GO

ALTER TABLE [Item] ADD FOREIGN KEY ([CategoryID]) REFERENCES [Category] ([CategoryID])
GO

ALTER TABLE [Visibility] ADD FOREIGN KEY ([CategoryID]) REFERENCES [Category] ([CategoryID])
GO

ALTER TABLE [Visibility] ADD FOREIGN KEY ([CustomerID]) REFERENCES [Customer] ([CustomerID])
GO

ALTER TABLE [CategoryItemRelation] ADD FOREIGN KEY ([CategoryID]) REFERENCES [Category] ([CategoryID])
GO

ALTER TABLE [CategoryItemRelation] ADD FOREIGN KEY ([ItemID]) REFERENCES [Item] ([ItemID])
GO
