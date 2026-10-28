$ErrorActionPreference = 'Stop'
# Isolated schema smoke test only. Never accepts an existing LMS connection string.
$testServer = '(localdb)\TCT_Codex_Bugfix_20261014'
$testDatabase = 'TCT_Package_Test_' + [Guid]::NewGuid().ToString('N')
$master = New-Object System.Data.SqlClient.SqlConnection("Server=$testServer;Database=master;Integrated Security=True;TrustServerCertificate=True")
$testConnection = $null
$created = $false
function Execute-Sql($connection, [string]$sql) {
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.CommandTimeout = 60
    try { $command.ExecuteNonQuery() | Out-Null } finally { $command.Dispose() }
}
function Expect-Rejected([string]$sql, [int[]]$numbers) {
    try { Execute-Sql $testConnection $sql }
    catch [System.Data.SqlClient.SqlException] {
        if ($numbers -contains $_.Exception.Number) { return }
        throw
    }
    throw 'Expected invalid ledger insert to be rejected.'
}
try {
    $master.Open()
    Execute-Sql $master "CREATE DATABASE [$testDatabase]"
    $created = $true
    $testConnection = New-Object System.Data.SqlClient.SqlConnection("Server=$testServer;Database=$testDatabase;Integrated Security=True;TrustServerCertificate=True")
    $testConnection.Open()
    # Minimal parent schema: migration syntax/integrity, not full repository integration.
    Execute-Sql $testConnection @'
CREATE TABLE dbo.StudentPaymentPlan (Id uniqueidentifier PRIMARY KEY, SalesDetailsId uniqueidentifier,
 StudentId uniqueidentifier, UpfrontInvoiceNumber nvarchar(50), TotalClasses int, IsActive bit);
CREATE TABLE dbo.ScheduleDetails (ScheduleDetailsId uniqueidentifier PRIMARY KEY);
CREATE TABLE dbo.StudentInvoice (Id bigint PRIMARY KEY);
'@
    $release = Get-Content (Join-Path $PSScriptRoot 'Server_Package_Reconciliation_Release.sql') -Raw
    Expect-Rejected $release @(51000)
    $release = $release.Replace("N'CHANGE_ME';", "N'$testDatabase';")
    Execute-Sql $testConnection $release
    Execute-Sql $testConnection $release
    Execute-Sql $testConnection @'
INSERT dbo.StudentPaymentPlan VALUES ('00000000-0000-0000-0000-000000000001',NEWID(),NEWID(),'TEST',24,1);
INSERT dbo.ScheduleDetails VALUES ('00000000-0000-0000-0000-000000000002');
INSERT dbo.ScheduleDetails VALUES ('00000000-0000-0000-0000-000000000003');
INSERT dbo.StudentInvoice VALUES (1);
INSERT dbo.PrepaidClassCharge VALUES (NEWID(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',1,100,SYSUTCDATETIME());
'@
    Expect-Rejected "INSERT dbo.PrepaidClassCharge VALUES (NEWID(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',1,100,SYSUTCDATETIME());" @(2601,2627)
    Expect-Rejected "INSERT dbo.PrepaidClassCharge VALUES (NEWID(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',1,-1,SYSUTCDATETIME());" @(547)
    Expect-Rejected "INSERT dbo.PrepaidClassCharge VALUES (NEWID(),NEWID(),'00000000-0000-0000-0000-000000000003',1,100,SYSUTCDATETIME());" @(547)
    Expect-Rejected "INSERT dbo.PrepaidClassCharge VALUES (NEWID(),'00000000-0000-0000-0000-000000000001',NEWID(),1,100,SYSUTCDATETIME());" @(547)
    Expect-Rejected "INSERT dbo.PrepaidClassCharge VALUES (NEWID(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',999,100,SYSUTCDATETIME());" @(547)
    Execute-Sql $testConnection "IF (SELECT COUNT(*) FROM dbo.PrepaidClassCharge) <> 1 THROW 51001, 'Unexpected ledger rows.', 1;"
    Write-Output 'PASS: database guard, deployment, rerun, valid insert, duplicate rejection, nonnegative amount, three foreign keys, final row count.'
}
finally {
    if ($testConnection) { $testConnection.Dispose() }
    [System.Data.SqlClient.SqlConnection]::ClearAllPools()
    if ($created -and $testDatabase -match '^TCT_Package_Test_[0-9a-f]{32}$' -and $master.DataSource -eq $testServer) {
        Execute-Sql $master "DROP DATABASE [$testDatabase]"
        Write-Output "Removed isolated test database $testDatabase. No LMS database was touched."
    }
    $master.Dispose()
}
