using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>
/// Read-only SQL for the Accounts Reports module. Every view and summary is built on the shared CTEs below, so
/// report totals and detail rows always use the same filters and rules.
///
/// Data rules (from the existing schema and code; nothing here writes data):
///  - Invoiced revenue  = StudentInvoice.TotalInvoiceAmount (IsActive). Invoice lists/KPIs are dated by the invoice's
///    CreatedDate; revenue reports by its billing month (Year/Month) — the same split the Accounts dashboard uses.
///  - Collected         = StudentPayment.Amount (IsActive), dated by PaidDate. Payments can only be recorded against a
///    prepaid StudentPaymentPlan, so only plan invoices (plan UpfrontInvoiceNumber / BalanceInvoiceNumber) have a
///    payment status. Plan payments are applied to the upfront invoice first, then the balance invoice.
///    All other invoices show "Not tracked" (the system has no way to record their payment).
///  - Status: Paid (paid ≥ amount), Partially paid (0 < paid < amount), Overdue (unpaid, due date passed), Pending.
///  - Critical / Non-critical: unpaid past due; Critical when the due date is more than 3 months ago.
///  - Tutor payouts     = TutorInvoice.TutorTotalPayment by its pay month (Month/Year); no paid flag exists.
///  - Dropped           = SalesDetails status Dropped / Tutor Changed Dropped / DC Dropped / DP Dropped, reason from
///    the latest dropout-reason note on the enrollment.
///  - Tutor ids are matched as Tutor.Id or the tutor's User.Id (both forms are stored).
/// </summary>
public sealed class AccountsReportsRepository : IAccountsReportsRepository
{
    private const string Ctes = @"
WITH Inv0 AS (
 SELECT i.Id InvoiceId,i.InvoiceNumber,ISNULL(NULLIF(i.InvoiceType,N''),N'Regular') InvoiceType,i.StudentId,st.Code StudentCode,
  COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  CAST(ISNULL(i.TotalInvoiceAmount,0) AS decimal(18,2)) InvoiceAmount,
  CASE WHEN i.[Year] BETWEEN 2000 AND 2100 AND i.[Month] BETWEEN 1 AND 12 THEN DATEFROMPARTS(i.[Year],i.[Month],1) END BillingMonth,
  i.CreatedDate InvoiceDate,i.DueDate,i.EmailSentDate,
  sd.SubjectId,sub.TypeCodeName SubjectName,st.BoardId,board.TypeCodeName BoardName,st.GradeId,grade.TypeCodeName GradeName,
  sa.TCTBankId BankId,bank.BankName,NULLIF(sa.ClientCountryCode,N'') Country,
  t.Id TutorId,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
  pl.PlanId,pl.TotalFee,pl.IsUpfront,upf.UpfrontAmount,pay.PlanPaid,pay.LastPaidDate
 FROM dbo.StudentInvoice i
 LEFT JOIN dbo.Student st ON st.Id=i.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.Schedule s ON s.ScheduleId=i.ScheduleId
 LEFT JOIN dbo.SalesDetails sd ON sd.Id=s.SalesDetailsId LEFT JOIN dbo.Sales sa ON sa.Id=sd.SalesId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
 LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId LEFT JOIN dbo.TCTBankDetails bank ON bank.Id=sa.TCTBankId
 OUTER APPLY (SELECT TOP 1 tx.Id,tx.UserId FROM dbo.Tutor tx WHERE tx.Id=s.TutorId OR tx.UserId=s.TutorId
  ORDER BY CASE WHEN tx.Id=s.TutorId THEN 0 ELSE 1 END) t
 LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
 OUTER APPLY (SELECT TOP 1 p.Id PlanId,p.TotalFee,CASE WHEN p.UpfrontInvoiceNumber=i.InvoiceNumber THEN 1 ELSE 0 END IsUpfront,p.UpfrontInvoiceNumber
  FROM dbo.StudentPaymentPlan p WHERE p.IsActive=1 AND (p.UpfrontInvoiceNumber=i.InvoiceNumber OR p.BalanceInvoiceNumber=i.InvoiceNumber)
  ORDER BY p.CreatedDate DESC) pl
 OUTER APPLY (SELECT SUM(x.TotalInvoiceAmount) UpfrontAmount FROM dbo.StudentInvoice x
  WHERE pl.IsUpfront=0 AND x.IsActive=1 AND x.InvoiceNumber=pl.UpfrontInvoiceNumber) upf
 OUTER APPLY (SELECT SUM(pp.Amount) PlanPaid,MAX(pp.PaidDate) LastPaidDate FROM dbo.StudentPayment pp
  WHERE pp.StudentPaymentPlanId=pl.PlanId AND pp.IsActive=1) pay
 WHERE i.IsActive=1
  AND (@StudentId IS NULL OR i.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@BankId IS NULL OR sa.TCTBankId=@BankId) AND (@BoardId IS NULL OR st.BoardId=@BoardId) AND (@GradeId IS NULL OR st.GradeId=@GradeId)
  AND (@Country IS NULL OR sa.ClientCountryCode=@Country)
  AND (@TutorId IS NULL OR t.Id=@TutorId OR EXISTS (SELECT 1 FROM dbo.StudentInvoiceDetails dd JOIN dbo.Tutor tx ON tx.Id=@TutorId
   AND (tx.Id=dd.TutorId OR tx.UserId=dd.TutorId) WHERE dd.StudentInvoiceId=i.Id AND dd.IsActive=1))
  AND (@Search IS NULL OR i.InvoiceNumber LIKE @SearchLike OR su.FullName LIKE @SearchLike OR CONCAT(su.FirstName,N' ',su.LastName) LIKE @SearchLike
   OR st.Code LIKE @SearchLike OR sub.TypeCodeName LIKE @SearchLike)
),
Inv AS (
 SELECT Inv0.*,
  CAST(CASE WHEN PlanId IS NULL THEN NULL
   WHEN IsUpfront=1 THEN CASE WHEN ISNULL(PlanPaid,0)>=InvoiceAmount THEN InvoiceAmount ELSE ISNULL(PlanPaid,0) END
   ELSE CASE WHEN ISNULL(PlanPaid,0)-ISNULL(UpfrontAmount,0)<=0 THEN 0
    WHEN ISNULL(PlanPaid,0)-ISNULL(UpfrontAmount,0)>=InvoiceAmount THEN InvoiceAmount
    ELSE ISNULL(PlanPaid,0)-ISNULL(UpfrontAmount,0) END END AS decimal(18,2)) PaidAmount
 FROM Inv0
),
InvS AS (
 SELECT Inv.*,CAST(CASE WHEN PaidAmount IS NULL THEN NULL ELSE InvoiceAmount-PaidAmount END AS decimal(18,2)) BalanceAmount,
  CASE WHEN PaidAmount IS NULL THEN N'Not tracked' WHEN PaidAmount>=InvoiceAmount THEN N'Paid' WHEN PaidAmount>0 THEN N'Partially paid'
   WHEN DueDate<CAST(GETDATE() AS date) THEN N'Overdue' ELSE N'Pending' END PaymentStatus,
  CASE WHEN DueDate IS NOT NULL AND DueDate<CAST(GETDATE() AS date) THEN DATEDIFF(day,DueDate,GETDATE()) ELSE 0 END DaysPastDue
 FROM Inv
),
InvF AS (
 SELECT InvS.*,
  CASE WHEN PaymentStatus IN (N'Overdue',N'Partially paid') AND DaysPastDue>0
   THEN CASE WHEN DueDate<DATEADD(month,-3,CAST(GETDATE() AS date)) THEN N'Critical' ELSE N'Non-critical' END END Criticality,
  CASE WHEN PaymentStatus=N'Paid' AND LastPaidDate IS NOT NULL AND DueDate IS NOT NULL
   THEN CASE WHEN CAST(LastPaidDate AS date)<=CAST(DueDate AS date) THEN 1 ELSE 0 END END PaidOnTime
 FROM InvS
),
InvD AS (SELECT * FROM InvF WHERE InvoiceDate>=@FromDate AND InvoiceDate<DATEADD(day,1,@ToDate)),
InvB AS (SELECT * FROM InvF WHERE BillingMonth>=DATEFROMPARTS(YEAR(@FromDate),MONTH(@FromDate),1) AND BillingMonth<=@ToDate),
Ln AS (
 SELECT d.Id LineId,f.InvoiceId,f.InvoiceNumber,f.BillingMonth,f.InvoiceDate,f.StudentId,f.StudentCode,f.StudentName,
  COALESCE(NULLIF(d.Subject,''),f.SubjectName,N'Not set') SubjectName,COALESCE(NULLIF(d.Grade,''),f.GradeName,N'Not set') GradeName,
  COALESCE(NULLIF(d.Board,''),f.BoardName,N'Not set') BoardName,lt.Id LineTutorId,
  COALESCE(NULLIF(d.TutorName,''),COALESCE(ltu.FullName,CONCAT(ltu.FirstName,N' ',ltu.LastName)),N'Not set') TutorName,
  CAST(ISNULL(d.SubjectAmount,0) AS decimal(18,2)) LineAmount,d.NumberOfClasses
 FROM dbo.StudentInvoiceDetails d JOIN InvF f ON f.InvoiceId=d.StudentInvoiceId
 OUTER APPLY (SELECT TOP 1 tx.Id,tx.UserId FROM dbo.Tutor tx WHERE tx.Id=d.TutorId OR tx.UserId=d.TutorId
  ORDER BY CASE WHEN tx.Id=d.TutorId THEN 0 ELSE 1 END) lt
 LEFT JOIN dbo.[User] ltu ON ltu.Id=lt.UserId
 WHERE d.IsActive=1 AND (@TutorId IS NULL OR lt.Id=@TutorId)
),
Pay AS (
 SELECT p.Id PaymentId,p.PaidDate,CAST(p.PaidDate AS date) PaidDay,CAST(ISNULL(p.Amount,0) AS decimal(18,2)) Amount,
  ISNULL(NULLIF(LTRIM(RTRIM(p.PaymentMode)),N''),N'Unspecified') PaymentMode,p.ReferenceNo,p.InstallmentNo,p.Notes,
  pl.Id PlanId,pl.StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  pl.TotalFee,pl.UpfrontInvoiceNumber,ui.DueDate UpfrontDueDate,sd.SubjectId,sub.TypeCodeName SubjectName,
  sa.TCTBankId BankId,bank.BankName,NULLIF(sa.ClientCountryCode,N'') Country,st.BoardId,st.GradeId,
  CASE WHEN ui.DueDate IS NOT NULL AND CAST(p.PaidDate AS date)>=CAST(ui.DueDate AS date) THEN 1 ELSE 0 END OnOrAfterDue,
  CASE WHEN ui.DueDate IS NOT NULL THEN DATEDIFF(day,ui.DueDate,p.PaidDate) END DaysAfterDue
 FROM dbo.StudentPayment p JOIN dbo.StudentPaymentPlan pl ON pl.Id=p.StudentPaymentPlanId
 LEFT JOIN dbo.Student st ON st.Id=pl.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.SalesDetails sd ON sd.Id=pl.SalesDetailsId LEFT JOIN dbo.Sales sa ON sa.Id=sd.SalesId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.TCTBankDetails bank ON bank.Id=sa.TCTBankId
 OUTER APPLY (SELECT TOP 1 x.DueDate FROM dbo.StudentInvoice x WHERE x.IsActive=1 AND x.InvoiceNumber=pl.UpfrontInvoiceNumber) ui
 WHERE p.IsActive=1
  AND (@StudentId IS NULL OR pl.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@BankId IS NULL OR sa.TCTBankId=@BankId) AND (@BoardId IS NULL OR st.BoardId=@BoardId) AND (@GradeId IS NULL OR st.GradeId=@GradeId)
  AND (@Country IS NULL OR sa.ClientCountryCode=@Country) AND (@PaymentMode IS NULL OR p.PaymentMode=@PaymentMode)
  AND (@TutorId IS NULL OR EXISTS (SELECT 1 FROM dbo.Tutor tx WHERE tx.Id=@TutorId AND (tx.Id=sd.TutorId OR tx.UserId=sd.TutorId)))
  AND (@Search IS NULL OR su.FullName LIKE @SearchLike OR CONCAT(su.FirstName,N' ',su.LastName) LIKE @SearchLike OR st.Code LIKE @SearchLike
   OR p.ReferenceNo LIKE @SearchLike OR pl.UpfrontInvoiceNumber LIKE @SearchLike)
),
PayD AS (SELECT * FROM Pay WHERE PaidDate>=@FromDate AND PaidDate<DATEADD(day,1,@ToDate)),
TP AS (
 SELECT ti.Id TutorInvoiceId,ti.InvoiceNumber,t.Id TutorId,tu.UserCode TutorCode,COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,
  CASE WHEN TRY_CONVERT(int,ti.[Month]) BETWEEN 1 AND 12 AND ti.[Year] BETWEEN 2000 AND 2100 THEN DATEFROMPARTS(ti.[Year],TRY_CONVERT(int,ti.[Month]),1) END PayMonth,
  CAST(ISNULL(ti.TutorTotalPayment,0) AS decimal(18,2)) Amount,ti.CreatedDate,ti.EmailSentDate,
  CASE WHEN ti.EmailSentDate IS NULL THEN N'Generated' ELSE N'Sent to tutor' END InvoiceStatus,
  det.Students,det.ClassesScheduled,det.ClassesCompleted,det.ClassesCancelled
 FROM dbo.TutorInvoice ti
 OUTER APPLY (SELECT TOP 1 tx.Id,tx.UserId FROM dbo.Tutor tx WHERE tx.Id=ti.TutorId OR tx.UserId=ti.TutorId
  ORDER BY CASE WHEN tx.Id=ti.TutorId THEN 0 ELSE 1 END) t
 LEFT JOIN dbo.[User] tu ON tu.Id=t.UserId
 OUTER APPLY (SELECT COUNT(DISTINCT x.StudentId) Students,SUM(ISNULL(x.NoOfScheduledClasses,0)) ClassesScheduled,
  SUM(ISNULL(x.NoOfClassesCompleted,0)) ClassesCompleted,SUM(ISNULL(x.NoOfClassesCancelled,0)) ClassesCancelled
  FROM dbo.TutorInvoiceDetails x WHERE x.TutorInvoiceId=ti.Id AND x.IsActive=1) det
 WHERE ti.IsActive=1 AND (@TutorId IS NULL OR t.Id=@TutorId)
  AND (@Search IS NULL OR tu.FullName LIKE @SearchLike OR tu.UserCode LIKE @SearchLike OR ti.InvoiceNumber LIKE @SearchLike)
),
TPD AS (SELECT * FROM TP WHERE PayMonth>=DATEFROMPARTS(YEAR(@FromDate),MONTH(@FromDate),1) AND PayMonth<=@ToDate),
Drp AS (
 SELECT sd.Id SalesDetailsId,s.StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  sd.SubjectId,sub.TypeCodeName SubjectName,board.TypeCodeName BoardName,grade.TypeCodeName GradeName,
  COALESCE(tu.FullName,CONCAT(tu.FirstName,N' ',tu.LastName)) TutorName,tc.TypeCodeName StatusName,
  COALESCE(sd.ModifiedDate,sd.CreatedDate) DroppedOn,rs.ReasonName,rs.NoteText ReasonNote,
  CAST(ISNULL(inv.InvoicedToDate,0) AS decimal(18,2)) InvoicedToDate
 FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1 JOIN dbo.Type_Code tc ON tc.Id=sd.Status
 LEFT JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
 LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
 OUTER APPLY (SELECT TOP 1 tx.UserId FROM dbo.Tutor tx WHERE tx.Id=sd.TutorId OR tx.UserId=sd.TutorId
  ORDER BY CASE WHEN tx.Id=sd.TutorId THEN 0 ELSE 1 END) dt
 LEFT JOIN dbo.[User] tu ON tu.Id=dt.UserId
 OUTER APPLY (SELECT TOP 1 rt.TypeCodeName ReasonName,n.NoteText FROM dbo.TCTNotes n JOIN dbo.Type_Code rt ON rt.Id=n.ReferenceTypeId
  JOIN dbo.TypeGroup g ON g.Id=rt.TypeGroupId WHERE n.ReferenceId=sd.Id AND ISNULL(n.IsActive,1)=1
  AND g.TypeGroupName IN (N'DropoutRatioReasons',N'DropoutReason') ORDER BY n.CreatedDate DESC) rs
 OUTER APPLY (SELECT SUM(ISNULL(d.SubjectAmount,0)) InvoicedToDate FROM dbo.StudentInvoiceDetails d
  JOIN dbo.StudentInvoice i ON i.Id=d.StudentInvoiceId AND i.IsActive=1
  WHERE d.IsActive=1 AND d.StudentId=s.StudentId AND d.Subject=sub.TypeCodeName) inv
 WHERE sd.IsActive=1 AND tc.TypeCodeValue IN (20005,20026,20031,20032)
  AND (@StudentId IS NULL OR s.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@BoardId IS NULL OR st.BoardId=@BoardId) AND (@GradeId IS NULL OR st.GradeId=@GradeId)
  AND (@BankId IS NULL OR s.TCTBankId=@BankId) AND (@Country IS NULL OR s.ClientCountryCode=@Country)
  AND (@TutorId IS NULL OR EXISTS (SELECT 1 FROM dbo.Tutor tx WHERE tx.Id=@TutorId AND (tx.Id=sd.TutorId OR tx.UserId=sd.TutorId)))
  AND (@Search IS NULL OR su.FullName LIKE @SearchLike OR st.Code LIKE @SearchLike OR sub.TypeCodeName LIKE @SearchLike)
),
Enr AS (
 SELECT sd.Id SalesDetailsId,s.StudentId,st.Code StudentCode,COALESCE(su.FullName,CONCAT(su.FirstName,N' ',su.LastName)) StudentName,
  sd.CreatedDate EnrolledOn,sd.SubjectId,sub.TypeCodeName SubjectName,board.TypeCodeName BoardName,grade.TypeCodeName GradeName,
  MIN(sd.CreatedDate) OVER (PARTITION BY s.StudentId) FirstEnrolledOn
 FROM dbo.SalesDetails sd JOIN dbo.Sales s ON s.Id=sd.SalesId AND s.IsActive=1
 JOIN dbo.Student st ON st.Id=s.StudentId LEFT JOIN dbo.[User] su ON su.Id=st.UserId
 LEFT JOIN dbo.Type_Code sub ON sub.Id=sd.SubjectId LEFT JOIN dbo.Type_Code board ON board.Id=st.BoardId
 LEFT JOIN dbo.Type_Code grade ON grade.Id=st.GradeId
 WHERE sd.IsActive=1
  AND (@StudentId IS NULL OR s.StudentId=@StudentId) AND (@SubjectId IS NULL OR sd.SubjectId=@SubjectId)
  AND (@BoardId IS NULL OR st.BoardId=@BoardId) AND (@GradeId IS NULL OR st.GradeId=@GradeId)
  AND (@BankId IS NULL OR s.TCTBankId=@BankId) AND (@Country IS NULL OR s.ClientCountryCode=@Country)
  AND (@TutorId IS NULL OR EXISTS (SELECT 1 FROM dbo.Tutor tx WHERE tx.Id=@TutorId AND (tx.Id=sd.TutorId OR tx.UserId=sd.TutorId)))
  AND (@Search IS NULL OR su.FullName LIKE @SearchLike OR st.Code LIKE @SearchLike OR sub.TypeCodeName LIKE @SearchLike)
)";

    // Period start for @GroupBy (day / month / quarter / year) from a date expression.
    private static string Period(string dateExpr) => $@"CASE @GroupBy
   WHEN N'day' THEN CAST({dateExpr} AS date)
   WHEN N'quarter' THEN DATEFROMPARTS(YEAR({dateExpr}),((MONTH({dateExpr})-1)/3)*3+1,1)
   WHEN N'year' THEN DATEFROMPARTS(YEAR({dateExpr}),1,1)
   ELSE DATEFROMPARTS(YEAR({dateExpr}),MONTH({dateExpr}),1) END";

    private sealed record ViewDef(string Body, string DefaultSort, bool DefaultDesc, string TieBreak, string[] SortColumns);

    private static readonly Dictionary<string, ViewDef> Views = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Accounts overview (dashboard KPIs, page 14–15) ─────────────────────────
        ["overview/new-students"] = new(@"
SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,MAX(BoardName) BoardName,MAX(GradeName) GradeName,
 MIN(FirstEnrolledOn) FirstEnrolledOn,COUNT_BIG(*) Subjects,STRING_AGG(ISNULL(SubjectName,N'Not set'),N', ') SubjectNames
FROM Enr WHERE FirstEnrolledOn>=@FromDate AND FirstEnrolledOn<DATEADD(day,1,@ToDate)
 AND EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate)
GROUP BY StudentId",
            "FirstEnrolledOn", true, "StudentId", new[] { "StudentName", "FirstEnrolledOn", "Subjects", "GradeName" }),

        ["overview/new-subjects"] = new(@"
SELECT SalesDetailsId,StudentId,StudentCode,StudentName,SubjectName,BoardName,GradeName,EnrolledOn,FirstEnrolledOn
FROM Enr WHERE EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate) AND FirstEnrolledOn<@FromDate",
            "EnrolledOn", true, "SalesDetailsId", new[] { "EnrolledOn", "StudentName", "SubjectName", "FirstEnrolledOn" }),

        ["overview/invoiced-students"] = new(@"
SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,COUNT_BIG(*) Invoices,SUM(InvoiceAmount) InvoicedAmount,
 SUM(PaidAmount) PaidAmount,SUM(BalanceAmount) BalanceAmount,
 SUM(CASE WHEN PaymentStatus=N'Not tracked' THEN 1 ELSE 0 END) NotTracked
FROM InvD GROUP BY StudentId",
            "InvoicedAmount", true, "StudentId", new[] { "StudentName", "Invoices", "InvoicedAmount", "PaidAmount", "BalanceAmount" }),

        // ── A. Invoice reports ───────────────────────────────────────────────────
        ["invoices/list"] = new(@"
SELECT InvoiceId,InvoiceNumber,InvoiceType,InvoiceDate,BillingMonth,DueDate,StudentId,StudentCode,StudentName,SubjectName,BoardName,GradeName,
 BankName,Country,InvoiceAmount,PaidAmount,BalanceAmount,PaymentStatus,Criticality,DaysPastDue
FROM InvD WHERE @Status IS NULL OR PaymentStatus=@Status OR Criticality=@Status",
            "InvoiceDate", true, "InvoiceId", new[] { "InvoiceNumber", "InvoiceDate", "DueDate", "StudentName", "SubjectName", "InvoiceAmount", "PaidAmount", "BalanceAmount", "PaymentStatus" }),

        ["invoices/reconciliation"] = new(@"
SELECT InvoiceId,InvoiceNumber,InvoiceDate,StudentId,StudentCode,StudentName,InvoiceAmount,PaidAmount,
 CAST(InvoiceAmount-ISNULL(PaidAmount,0) AS decimal(18,2)) Difference,LastPaidDate,PaymentStatus
FROM InvD WHERE PaymentStatus<>N'Not tracked' AND (@Status IS NULL OR PaymentStatus=@Status)",
            "InvoiceDate", true, "InvoiceId", new[] { "InvoiceNumber", "InvoiceDate", "StudentName", "InvoiceAmount", "PaidAmount", "Difference", "PaymentStatus" }),

        ["invoices/by-date"] = new(@"
SELECT PaidDay,COUNT_BIG(*) Payments,COUNT(DISTINCT StudentId) Students,SUM(Amount) CollectedAmount
FROM PayD GROUP BY PaidDay",
            "PaidDay", true, "PaidDay", new[] { "PaidDay", "Payments", "Students", "CollectedAmount" }),

        ["invoices/by-course"] = new(@"
SELECT COALESCE(a.SubjectName,b.SubjectName) CourseName,ISNULL(a.Invoices,0) Invoices,ISNULL(a.Students,0) Students,
 ISNULL(a.InvoicedAmount,0) InvoicedAmount,ISNULL(b.Payments,0) Payments,ISNULL(b.CollectedAmount,0) CollectedAmount
FROM (SELECT l.SubjectName,COUNT(DISTINCT l.InvoiceId) Invoices,COUNT(DISTINCT l.StudentId) Students,SUM(l.LineAmount) InvoicedAmount
  FROM Ln l WHERE l.InvoiceDate>=@FromDate AND l.InvoiceDate<DATEADD(day,1,@ToDate) GROUP BY l.SubjectName) a
FULL JOIN (SELECT ISNULL(p.SubjectName,N'Not set') SubjectName,COUNT_BIG(*) Payments,SUM(p.Amount) CollectedAmount FROM PayD p
  GROUP BY ISNULL(p.SubjectName,N'Not set')) b ON b.SubjectName=a.SubjectName",
            "InvoicedAmount", true, "CourseName", new[] { "CourseName", "Invoices", "Students", "InvoicedAmount", "CollectedAmount" }),

        ["invoices/by-student"] = new(@"
SELECT COALESCE(a.StudentId,b.StudentId) StudentId,COALESCE(a.StudentCode,b.StudentCode) StudentCode,COALESCE(a.StudentName,b.StudentName) StudentName,
 ISNULL(a.Invoices,0) Invoices,ISNULL(a.InvoicedAmount,0) InvoicedAmount,ISNULL(b.CollectedAmount,0) CollectedAmount,a.BalanceAmount
FROM (SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,COUNT_BIG(*) Invoices,SUM(InvoiceAmount) InvoicedAmount,
  SUM(BalanceAmount) BalanceAmount FROM InvD GROUP BY StudentId) a
FULL JOIN (SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,SUM(Amount) CollectedAmount FROM PayD GROUP BY StudentId) b
 ON b.StudentId=a.StudentId",
            "InvoicedAmount", true, "StudentId", new[] { "StudentName", "Invoices", "InvoicedAmount", "CollectedAmount", "BalanceAmount" }),

        ["invoices/pending"] = new(@"
SELECT InvoiceId,InvoiceNumber,InvoiceDate,DueDate,StudentId,StudentCode,StudentName,SubjectName,InvoiceAmount,PaidAmount,BalanceAmount,
 PaymentStatus,DaysPastDue,Criticality
FROM InvD WHERE PaymentStatus IN (N'Pending',N'Overdue',N'Partially paid')
 AND (@Status IS NULL OR PaymentStatus=@Status OR Criticality=@Status)",
            "DaysPastDue", true, "InvoiceId", new[] { "InvoiceNumber", "DueDate", "StudentName", "BalanceAmount", "PaymentStatus", "DaysPastDue", "Criticality" }),

        // ── B. Revenue reports (billing month) ──────────────────────────────────
        ["revenue/period"] = new($@"
SELECT COALESCE(a.Period,b.Period) Period,ISNULL(a.Invoices,0) Invoices,ISNULL(a.Students,0) Students,ISNULL(a.InvoicedRevenue,0) InvoicedRevenue,
 ISNULL(b.Collected,0) Collected,
 CAST(100.0*ISNULL(b.Collected,0)/NULLIF(a.InvoicedRevenue,0) AS decimal(7,2)) CollectionPct
FROM (SELECT {Period("BillingMonth")} Period,COUNT_BIG(*) Invoices,COUNT(DISTINCT StudentId) Students,SUM(InvoiceAmount) InvoicedRevenue
  FROM InvB GROUP BY {Period("BillingMonth")}) a
FULL JOIN (SELECT {Period("PaidDate")} Period,SUM(Amount) Collected FROM PayD GROUP BY {Period("PaidDate")}) b ON b.Period=a.Period",
            "Period", true, "Period", new[] { "Period", "Invoices", "Students", "InvoicedRevenue", "Collected", "CollectionPct" }),

        ["revenue/by-course"] = new(@"
SELECT SubjectName CourseName,COUNT(DISTINCT InvoiceId) Invoices,COUNT(DISTINCT StudentId) Students,SUM(LineAmount) Revenue,
 CAST(100.0*SUM(LineAmount)/NULLIF(SUM(SUM(LineAmount)) OVER (),0) AS decimal(7,2)) SharePct
FROM Ln WHERE BillingMonth>=DATEFROMPARTS(YEAR(@FromDate),MONTH(@FromDate),1) AND BillingMonth<=@ToDate GROUP BY SubjectName",
            "Revenue", true, "CourseName", new[] { "CourseName", "Invoices", "Students", "Revenue", "SharePct" }),

        ["revenue/by-tutor"] = new(@"
SELECT TutorName,MAX(CONVERT(varchar(36),LineTutorId)) TutorId,COUNT(DISTINCT StudentId) Students,COUNT(DISTINCT SubjectName) Subjects,
 COUNT(DISTINCT InvoiceId) Invoices,SUM(LineAmount) Revenue,
 CAST(100.0*SUM(LineAmount)/NULLIF(SUM(SUM(LineAmount)) OVER (),0) AS decimal(7,2)) SharePct
FROM Ln WHERE BillingMonth>=DATEFROMPARTS(YEAR(@FromDate),MONTH(@FromDate),1) AND BillingMonth<=@ToDate GROUP BY TutorName",
            "Revenue", true, "TutorName", new[] { "TutorName", "Students", "Subjects", "Invoices", "Revenue", "SharePct" }),

        ["revenue/by-student"] = new(@"
SELECT COALESCE(a.StudentId,b.StudentId) StudentId,COALESCE(a.StudentCode,b.StudentCode) StudentCode,COALESCE(a.StudentName,b.StudentName) StudentName,
 ISNULL(a.InvoicedRevenue,0) InvoicedRevenue,ISNULL(b.Collected,0) Collected,
 CAST(100.0*ISNULL(a.InvoicedRevenue,0)/NULLIF(SUM(ISNULL(a.InvoicedRevenue,0)) OVER (),0) AS decimal(7,2)) InvoicedSharePct,
 CAST(100.0*ISNULL(b.Collected,0)/NULLIF(SUM(ISNULL(b.Collected,0)) OVER (),0) AS decimal(7,2)) CollectedSharePct
FROM (SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,SUM(InvoiceAmount) InvoicedRevenue FROM InvB GROUP BY StudentId) a
FULL JOIN (SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,SUM(Amount) Collected FROM PayD GROUP BY StudentId) b
 ON b.StudentId=a.StudentId",
            "InvoicedRevenue", true, "StudentId", new[] { "StudentName", "InvoicedRevenue", "Collected", "InvoicedSharePct", "CollectedSharePct" }),

        ["revenue/monthly-invoices"] = new(@"
SELECT InvoiceId,InvoiceNumber,BillingMonth,InvoiceDate,StudentId,StudentCode,StudentName,SubjectName,InvoiceAmount,PaidAmount,PaymentStatus
FROM InvB WHERE @Status IS NULL OR PaymentStatus=@Status",
            "BillingMonth", true, "InvoiceId", new[] { "BillingMonth", "InvoiceNumber", "StudentName", "InvoiceAmount", "PaymentStatus" }),

        // Current period vs the previous period of the same length.
        ["revenue/comparison"] = new(@"
SELECT Metric,SortOrder,CurrentValue,PreviousValue,CAST(CurrentValue-PreviousValue AS decimal(18,2)) Change,
 CAST(100.0*(CurrentValue-PreviousValue)/NULLIF(PreviousValue,0) AS decimal(9,2)) ChangePct,IsAmount
FROM (
 SELECT N'Invoiced revenue' Metric,1 SortOrder,
  CAST((SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvF WHERE InvoiceDate>=@FromDate AND InvoiceDate<DATEADD(day,1,@ToDate)) AS decimal(18,2)) CurrentValue,
  CAST((SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvF WHERE InvoiceDate>=@PrevFrom AND InvoiceDate<DATEADD(day,1,@PrevTo)) AS decimal(18,2)) PreviousValue,1 IsAmount
 UNION ALL SELECT N'Invoices',2,(SELECT COUNT_BIG(*) FROM InvF WHERE InvoiceDate>=@FromDate AND InvoiceDate<DATEADD(day,1,@ToDate)),
  (SELECT COUNT_BIG(*) FROM InvF WHERE InvoiceDate>=@PrevFrom AND InvoiceDate<DATEADD(day,1,@PrevTo)),0
 UNION ALL SELECT N'Students invoiced',3,(SELECT COUNT(DISTINCT StudentId) FROM InvF WHERE InvoiceDate>=@FromDate AND InvoiceDate<DATEADD(day,1,@ToDate)),
  (SELECT COUNT(DISTINCT StudentId) FROM InvF WHERE InvoiceDate>=@PrevFrom AND InvoiceDate<DATEADD(day,1,@PrevTo)),0
 UNION ALL SELECT N'Collected',4,(SELECT ISNULL(SUM(Amount),0) FROM Pay WHERE PaidDate>=@FromDate AND PaidDate<DATEADD(day,1,@ToDate)),
  (SELECT ISNULL(SUM(Amount),0) FROM Pay WHERE PaidDate>=@PrevFrom AND PaidDate<DATEADD(day,1,@PrevTo)),1
 UNION ALL SELECT N'New students',5,(SELECT COUNT(DISTINCT StudentId) FROM Enr WHERE FirstEnrolledOn>=@FromDate AND FirstEnrolledOn<DATEADD(day,1,@ToDate)),
  (SELECT COUNT(DISTINCT StudentId) FROM Enr WHERE FirstEnrolledOn>=@PrevFrom AND FirstEnrolledOn<DATEADD(day,1,@PrevTo)),0
 UNION ALL SELECT N'Dropped enrollments',6,(SELECT COUNT_BIG(*) FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)),
  (SELECT COUNT_BIG(*) FROM Drp WHERE DroppedOn>=@PrevFrom AND DroppedOn<DATEADD(day,1,@PrevTo)),0
 UNION ALL SELECT N'Revenue of dropped enrollments',7,(SELECT ISNULL(SUM(InvoicedToDate),0) FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)),
  (SELECT ISNULL(SUM(InvoicedToDate),0) FROM Drp WHERE DroppedOn>=@PrevFrom AND DroppedOn<DATEADD(day,1,@PrevTo)),1
) m",
            "SortOrder", false, "SortOrder", new[] { "SortOrder" }),

        // Last six months ending with the To date's month (independent of From date).
        ["revenue/trend"] = new(@"
SELECT m.MonthStart,
 (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvF WHERE BillingMonth=m.MonthStart) InvoicedRevenue,
 (SELECT COUNT(DISTINCT StudentId) FROM InvF WHERE BillingMonth=m.MonthStart) StudentsInvoiced,
 (SELECT ISNULL(SUM(Amount),0) FROM Pay WHERE PaidDate>=m.MonthStart AND PaidDate<DATEADD(month,1,m.MonthStart)) Collected,
 (SELECT COUNT(DISTINCT StudentId) FROM Enr WHERE FirstEnrolledOn>=m.MonthStart AND FirstEnrolledOn<DATEADD(month,1,m.MonthStart)) NewStudents,
 (SELECT COUNT_BIG(*) FROM Drp WHERE DroppedOn>=m.MonthStart AND DroppedOn<DATEADD(month,1,m.MonthStart)) DroppedEnrollments
FROM (SELECT DATEADD(month,-n,DATEFROMPARTS(YEAR(@ToDate),MONTH(@ToDate),1)) MonthStart FROM (VALUES (0),(1),(2),(3),(4),(5)) v(n)) m",
            "MonthStart", false, "MonthStart", new[] { "MonthStart", "InvoicedRevenue", "StudentsInvoiced", "Collected", "NewStudents" }),

        // ── C. Payment reports ───────────────────────────────────────────────────
        ["payments/received"] = new(@"
SELECT PaymentId,PaidDate,StudentId,StudentCode,StudentName,SubjectName,Amount,PaymentMode,ReferenceNo,InstallmentNo,BankName,
 UpfrontInvoiceNumber,CASE WHEN OnOrAfterDue=1 THEN N'On/after due date' WHEN UpfrontDueDate IS NULL THEN N'No due date' ELSE N'Before due date' END Timing
FROM PayD",
            "PaidDate", true, "PaymentId", new[] { "PaidDate", "StudentName", "Amount", "PaymentMode", "BankName" }),

        ["payments/modes"] = new(@"
SELECT PaymentMode,COUNT_BIG(*) Payments,COUNT(DISTINCT StudentId) Students,SUM(Amount) Amount,
 CAST(100.0*SUM(Amount)/NULLIF(SUM(SUM(Amount)) OVER (),0) AS decimal(7,2)) SharePct
FROM PayD GROUP BY PaymentMode",
            "Amount", true, "PaymentMode", new[] { "PaymentMode", "Payments", "Students", "Amount", "SharePct" }),

        ["payments/partial"] = new(@"
SELECT InvoiceId,InvoiceNumber,InvoiceDate,DueDate,StudentId,StudentCode,StudentName,InvoiceAmount,PaidAmount,BalanceAmount,DaysPastDue,Criticality
FROM InvD WHERE PaymentStatus=N'Partially paid'",
            "BalanceAmount", true, "InvoiceId", new[] { "InvoiceNumber", "DueDate", "StudentName", "InvoiceAmount", "PaidAmount", "BalanceAmount" }),

        ["payments/history"] = new(@"
SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,COUNT_BIG(*) Payments,SUM(Amount) TotalPaid,
 MIN(PaidDate) FirstPaid,MAX(PaidDate) LastPaid,STRING_AGG(PaymentMode,N', ') WITHIN GROUP (ORDER BY PaidDate) Modes
FROM PayD GROUP BY StudentId",
            "LastPaid", true, "StudentId", new[] { "StudentName", "Payments", "TotalPaid", "FirstPaid", "LastPaid" }),

        // Balances on payment-tracked invoices issued up to the To date.
        ["payments/outstanding"] = new(@"
SELECT StudentId,MAX(StudentCode) StudentCode,MAX(StudentName) StudentName,COUNT_BIG(*) Invoices,SUM(InvoiceAmount) InvoicedAmount,
 SUM(PaidAmount) PaidAmount,SUM(BalanceAmount) BalanceAmount,MIN(DueDate) OldestDueDate,MAX(DaysPastDue) MaxDaysPastDue,
 CASE WHEN MAX(CASE WHEN Criticality=N'Critical' THEN 1 ELSE 0 END)=1 THEN N'Critical'
  WHEN MAX(CASE WHEN Criticality=N'Non-critical' THEN 1 ELSE 0 END)=1 THEN N'Non-critical' END Criticality
FROM InvF WHERE BalanceAmount>0 AND InvoiceDate<DATEADD(day,1,@ToDate)
GROUP BY StudentId
HAVING @Status IS NULL OR @Status=CASE WHEN MAX(CASE WHEN Criticality=N'Critical' THEN 1 ELSE 0 END)=1 THEN N'Critical'
  WHEN MAX(CASE WHEN Criticality=N'Non-critical' THEN 1 ELSE 0 END)=1 THEN N'Non-critical' END",
            "BalanceAmount", true, "StudentId", new[] { "StudentName", "Invoices", "BalanceAmount", "OldestDueDate", "MaxDaysPastDue", "Criticality" }),

        ["payments/late"] = new(@"
SELECT PaymentId,PaidDate,UpfrontDueDate DueDate,DaysAfterDue,StudentId,StudentCode,StudentName,Amount,PaymentMode,UpfrontInvoiceNumber,
 CASE WHEN DaysAfterDue>90 THEN N'Critical' ELSE N'Non-critical' END Criticality
FROM PayD WHERE OnOrAfterDue=1 AND (@Status IS NULL OR @Status=CASE WHEN DaysAfterDue>90 THEN N'Critical' ELSE N'Non-critical' END)",
            "PaidDate", true, "PaymentId", new[] { "PaidDate", "DueDate", "DaysAfterDue", "StudentName", "Amount" }),

        ["payments/tutor"] = new(@"
SELECT TutorInvoiceId,PayMonth,InvoiceNumber,TutorId,TutorCode,TutorName,Amount,Students,ClassesScheduled,ClassesCompleted,ClassesCancelled,
 CreatedDate,EmailSentDate,InvoiceStatus
FROM TPD WHERE @Status IS NULL OR InvoiceStatus=@Status",
            "PayMonth", true, "TutorInvoiceId", new[] { "PayMonth", "TutorName", "Amount", "ClassesCompleted", "InvoiceStatus" }),

        ["payments/banks"] = new(@"
SELECT COALESCE(a.BankName,b.BankName) BankName,ISNULL(a.Invoices,0) Invoices,ISNULL(a.InvoicedAmount,0) InvoicedAmount,
 ISNULL(b.Payments,0) Payments,ISNULL(b.CollectedAmount,0) CollectedAmount
FROM (SELECT ISNULL(BankName,N'Not set') BankName,COUNT_BIG(*) Invoices,SUM(InvoiceAmount) InvoicedAmount FROM InvD GROUP BY ISNULL(BankName,N'Not set')) a
FULL JOIN (SELECT ISNULL(BankName,N'Not set') BankName,COUNT_BIG(*) Payments,SUM(Amount) CollectedAmount FROM PayD GROUP BY ISNULL(BankName,N'Not set')) b
 ON b.BankName=a.BankName",
            "CollectedAmount", true, "BankName", new[] { "BankName", "Invoices", "InvoicedAmount", "Payments", "CollectedAmount" }),

        // ── D. Financial reports (income side only — no expense data exists) ─────
        ["financial/margin"] = new($@"
SELECT COALESCE(a.Period,b.Period) Period,ISNULL(a.InvoicedRevenue,0) InvoicedRevenue,ISNULL(b.TutorCost,0) TutorCost,
 CAST(ISNULL(a.InvoicedRevenue,0)-ISNULL(b.TutorCost,0) AS decimal(18,2)) GrossMargin,
 CAST(100.0*(ISNULL(a.InvoicedRevenue,0)-ISNULL(b.TutorCost,0))/NULLIF(a.InvoicedRevenue,0) AS decimal(9,2)) MarginPct
FROM (SELECT {Period("BillingMonth")} Period,SUM(InvoiceAmount) InvoicedRevenue FROM InvB GROUP BY {Period("BillingMonth")}) a
FULL JOIN (SELECT {Period("PayMonth")} Period,SUM(Amount) TutorCost FROM TPD GROUP BY {Period("PayMonth")}) b ON b.Period=a.Period",
            "Period", true, "Period", new[] { "Period", "InvoicedRevenue", "TutorCost", "GrossMargin", "MarginPct" }),

        ["financial/areas"] = new(@"
SELECT l.GradeName,l.BoardName,l.SubjectName,COUNT(DISTINCT l.StudentId) Students,SUM(l.LineAmount) InvoicedRevenue,
 CAST(ISNULL(SUM(CASE WHEN f.BalanceAmount>0 AND f.DaysPastDue>0 THEN l.LineAmount*f.BalanceAmount/NULLIF(f.InvoiceAmount,0) END),0) AS decimal(18,2)) UnrecoveredAmount,
 (SELECT COUNT_BIG(*) FROM Drp d WHERE d.SubjectName=l.SubjectName AND ISNULL(d.GradeName,N'Not set')=l.GradeName
   AND ISNULL(d.BoardName,N'Not set')=l.BoardName AND d.DroppedOn>=@FromDate AND d.DroppedOn<DATEADD(day,1,@ToDate)) DroppedEnrollments
FROM Ln l JOIN InvF f ON f.InvoiceId=l.InvoiceId
WHERE l.BillingMonth>=DATEFROMPARTS(YEAR(@FromDate),MONTH(@FromDate),1) AND l.BillingMonth<=@ToDate
GROUP BY l.GradeName,l.BoardName,l.SubjectName",
            "InvoicedRevenue", true, "SubjectName", new[] { "GradeName", "BoardName", "SubjectName", "Students", "InvoicedRevenue", "UnrecoveredAmount", "DroppedEnrollments" }),

        // Loss statement: un-recovered revenue (tracked invoices with a balance past the due date).
        ["financial/unrecovered"] = new(@"
SELECT InvoiceId,InvoiceNumber,InvoiceDate,DueDate,StudentId,StudentCode,StudentName,SubjectName,InvoiceAmount,PaidAmount,BalanceAmount,DaysPastDue,Criticality
FROM InvF WHERE BalanceAmount>0 AND DaysPastDue>0 AND InvoiceDate<DATEADD(day,1,@ToDate)
 AND (@Status IS NULL OR Criticality=@Status)",
            "BalanceAmount", true, "InvoiceId", new[] { "InvoiceNumber", "DueDate", "StudentName", "BalanceAmount", "DaysPastDue", "Criticality" }),

        // ── E. Refund & dropout reports (no refund data exists) ──────────────────
        ["refunds/dropouts"] = new(@"
SELECT SalesDetailsId,DroppedOn,StudentId,StudentCode,StudentName,SubjectName,BoardName,GradeName,TutorName,StatusName,
 ISNULL(ReasonName,N'Not recorded') ReasonName,ReasonNote,InvoicedToDate
FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)
 AND (@Status IS NULL OR ISNULL(ReasonName,N'Not recorded')=@Status)",
            "DroppedOn", true, "SalesDetailsId", new[] { "DroppedOn", "StudentName", "SubjectName", "StatusName", "ReasonName", "InvoicedToDate" }),

        ["refunds/reasons"] = new(@"
SELECT ISNULL(ReasonName,N'Not recorded') ReasonName,COUNT_BIG(*) Dropouts,SUM(InvoicedToDate) InvoicedToDate,
 CAST(100.0*COUNT_BIG(*)/NULLIF(SUM(COUNT_BIG(*)) OVER (),0) AS decimal(7,2)) SharePct
FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate) GROUP BY ISNULL(ReasonName,N'Not recorded')",
            "Dropouts", true, "ReasonName", new[] { "ReasonName", "Dropouts", "InvoicedToDate", "SharePct" }),

        ["refunds/trend"] = new($@"
SELECT p.Period,
 (SELECT COUNT_BIG(*) FROM Drp WHERE {Period("DroppedOn")}=p.Period AND DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)) Dropouts,
 (SELECT COUNT_BIG(*) FROM Enr WHERE {Period("EnrolledOn")}=p.Period AND EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate)) NewEnrollments
FROM (SELECT DISTINCT {Period("DroppedOn")} Period FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)
  UNION SELECT DISTINCT {Period("EnrolledOn")} FROM Enr WHERE EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate)) p",
            "Period", true, "Period", new[] { "Period", "Dropouts", "NewEnrollments" }),
    };

    // One row of headline numbers per report, from the same CTEs as its views.
    private static readonly Dictionary<string, string> Summaries = new(StringComparer.OrdinalIgnoreCase)
    {
        ["overview"] = @"
SELECT
 (SELECT COUNT_BIG(*) FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1) ActiveStudents,
 (SELECT COUNT(DISTINCT StudentId) FROM InvD) InvoicedStudents,
 (SELECT COUNT_BIG(*) FROM InvD) Invoices,(SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvD) InvoicedAmount,
 (SELECT COUNT_BIG(*) FROM InvD WHERE PaymentStatus=N'Paid') PaidInvoices,
 (SELECT COUNT_BIG(*) FROM InvD WHERE PaymentStatus IN (N'Pending',N'Overdue',N'Partially paid')) PendingInvoices,
 (SELECT COUNT_BIG(*) FROM InvD WHERE PaymentStatus=N'Partially paid') PartialInvoices,
 (SELECT COUNT_BIG(*) FROM InvD WHERE PaymentStatus=N'Not tracked') NotTrackedInvoices,
 (SELECT CAST(100.0*SUM(CASE WHEN PaymentStatus=N'Partially paid' THEN 1 ELSE 0 END)/NULLIF(SUM(CASE WHEN PaymentStatus<>N'Not tracked' THEN 1 ELSE 0 END),0) AS decimal(7,2)) FROM InvD) PartialPaymentRatePct,
 (SELECT ISNULL(SUM(BalanceAmount),0) FROM InvF WHERE BalanceAmount>0 AND DaysPastDue>0 AND InvoiceDate<DATEADD(day,1,@ToDate)) OverdueAmount,
 (SELECT COUNT_BIG(*) FROM InvF WHERE BalanceAmount>0 AND DaysPastDue>0 AND InvoiceDate<DATEADD(day,1,@ToDate)) OverdueInvoices,
 (SELECT ISNULL(SUM(Amount),0) FROM PayD) Collected,
 (SELECT ISNULL(SUM(Amount),0) FROM Pay WHERE PaidDate>=@PrevFrom AND PaidDate<DATEADD(day,1,@PrevTo)) CollectedPrevious,
 (SELECT ISNULL(SUM(Amount),0) FROM TP WHERE PayMonth=DATEADD(month,-1,DATEFROMPARTS(YEAR(@ToDate),MONTH(@ToDate),1))) TutorPaymentsPreviousMonth,
 (SELECT COUNT(DISTINCT StudentId) FROM Enr WHERE FirstEnrolledOn>=@FromDate AND FirstEnrolledOn<DATEADD(day,1,@ToDate)) NewStudents,
 (SELECT COUNT(DISTINCT StudentId) FROM Enr WHERE EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate) AND FirstEnrolledOn<@FromDate) ExistingStudentsNewSubjects,
 (SELECT CAST(100.0*SUM(PaidAmount)/NULLIF(SUM(CASE WHEN PaidAmount IS NOT NULL THEN InvoiceAmount END),0) AS decimal(7,2)) FROM InvD) FeeCollectionEfficiencyPct,
 (SELECT CAST(100.0*SUM(CASE WHEN PaidOnTime=1 THEN 1 ELSE 0 END)/NULLIF(SUM(CASE WHEN PaymentStatus<>N'Not tracked' THEN 1 ELSE 0 END),0) AS decimal(7,2)) FROM InvD) PaymentCompliancePct",

        ["invoices"] = @"
SELECT COUNT_BIG(*) Invoices,ISNULL(SUM(InvoiceAmount),0) InvoicedAmount,
 SUM(CASE WHEN PaymentStatus=N'Paid' THEN 1 ELSE 0 END) PaidInvoices,SUM(CASE WHEN PaymentStatus=N'Partially paid' THEN 1 ELSE 0 END) PartialInvoices,
 SUM(CASE WHEN PaymentStatus=N'Pending' THEN 1 ELSE 0 END) PendingInvoices,SUM(CASE WHEN PaymentStatus=N'Overdue' THEN 1 ELSE 0 END) OverdueInvoices,
 SUM(CASE WHEN PaymentStatus=N'Not tracked' THEN 1 ELSE 0 END) NotTrackedInvoices,
 ISNULL(SUM(CASE WHEN BalanceAmount>0 THEN BalanceAmount END),0) OutstandingAmount,
 SUM(CASE WHEN Criticality=N'Critical' THEN 1 ELSE 0 END) CriticalInvoices,
 (SELECT ISNULL(SUM(Amount),0) FROM PayD) Collected
FROM InvD",

        ["revenue"] = @"
SELECT (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvB) InvoicedRevenue,(SELECT COUNT_BIG(*) FROM InvB) Invoices,
 (SELECT COUNT(DISTINCT StudentId) FROM InvB) StudentsInvoiced,(SELECT ISNULL(SUM(Amount),0) FROM PayD) Collected,
 (SELECT CAST(SUM(InvoiceAmount)/NULLIF(COUNT(DISTINCT StudentId),0) AS decimal(18,2)) FROM InvB) RevenuePerStudent,
 (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvF WHERE InvoiceDate>=@PrevFrom AND InvoiceDate<DATEADD(day,1,@PrevTo)) PreviousInvoiced,
 (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvF WHERE InvoiceDate>=@FromDate AND InvoiceDate<DATEADD(day,1,@ToDate)) CurrentInvoiced",

        ["payments"] = @"
SELECT (SELECT COUNT_BIG(*) FROM PayD) Payments,(SELECT ISNULL(SUM(Amount),0) FROM PayD) Collected,
 (SELECT COUNT(DISTINCT StudentId) FROM PayD) StudentsPaying,(SELECT COUNT_BIG(*) FROM PayD WHERE OnOrAfterDue=1) LatePayments,
 (SELECT COUNT_BIG(*) FROM InvD WHERE PaymentStatus=N'Partially paid') PartialInvoices,
 (SELECT ISNULL(SUM(BalanceAmount),0) FROM InvF WHERE BalanceAmount>0 AND InvoiceDate<DATEADD(day,1,@ToDate)) OutstandingAmount,
 (SELECT COUNT_BIG(*) FROM TPD) TutorInvoices,(SELECT ISNULL(SUM(Amount),0) FROM TPD) TutorPayable",

        ["financial"] = @"
SELECT (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvB) InvoicedRevenue,(SELECT ISNULL(SUM(Amount),0) FROM TPD) TutorCost,
 (SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvB)-(SELECT ISNULL(SUM(Amount),0) FROM TPD) GrossMargin,
 (SELECT CAST(100.0*((SELECT ISNULL(SUM(InvoiceAmount),0) FROM InvB)-(SELECT ISNULL(SUM(Amount),0) FROM TPD))/NULLIF((SELECT SUM(InvoiceAmount) FROM InvB),0) AS decimal(9,2))) MarginPct,
 (SELECT ISNULL(SUM(BalanceAmount),0) FROM InvF WHERE BalanceAmount>0 AND DaysPastDue>0 AND InvoiceDate<DATEADD(day,1,@ToDate)) UnrecoveredAmount,
 (SELECT ISNULL(SUM(Amount),0) FROM PayD) Collected",

        ["refunds"] = @"
SELECT (SELECT COUNT_BIG(*) FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)) Dropouts,
 (SELECT COUNT_BIG(*) FROM Drp WHERE DroppedOn>=@PrevFrom AND DroppedOn<DATEADD(day,1,@PrevTo)) DropoutsPrevious,
 (SELECT ISNULL(SUM(InvoicedToDate),0) FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)) DroppedRevenue,
 (SELECT COUNT_BIG(*) FROM Enr WHERE EnrolledOn>=@FromDate AND EnrolledOn<DATEADD(day,1,@ToDate)) NewEnrollments,
 (SELECT TOP 1 ISNULL(ReasonName,N'Not recorded') FROM Drp WHERE DroppedOn>=@FromDate AND DroppedOn<DATEADD(day,1,@ToDate)
   GROUP BY ISNULL(ReasonName,N'Not recorded') ORDER BY COUNT_BIG(*) DESC) TopReason,
 CAST(NULL AS decimal(18,2)) RefundedAmount",
    };

    private const string ReportMenuLinkPrefix = "/lms/accounts/reports/";
    private readonly ApplicationDbContext _dbContext;

    public AccountsReportsRepository(ApplicationDbContext dbContext) => _dbContext = dbContext;

    public bool IsKnownView(string report, string view) => Views.ContainsKey($"{report}/{view}");

    public bool IsKnownReport(string report) => Summaries.ContainsKey(report);

    public async Task<AccountsReportPage> GetPageAsync(AccountsReportRequest request, CancellationToken token)
    {
        var def = Views[$"{request.Report}/{request.View}"];
        var sort = request.SortBy != null ? Array.Find(def.SortColumns, c => c.Equals(request.SortBy, StringComparison.OrdinalIgnoreCase)) : null;
        var descending = sort != null ? request.SortDescending : def.DefaultDesc;
        sort ??= def.DefaultSort;

        // Sort column comes from the view's allow-list above, never from raw input.
        var tie = sort.Equals(def.TieBreak, StringComparison.OrdinalIgnoreCase) ? "" : $",[{def.TieBreak}]";
        var sql = $@"{Ctes},
Q AS ({def.Body})
SELECT Q.*,COUNT_BIG(*) OVER () TotalRows FROM Q
ORDER BY [{sort}] {(descending ? "DESC" : "ASC")}{tie}
OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        var rows = await ExecuteAsync(sql, request, token);
        long total = 0;
        foreach (var row in rows)
        {
            if (row is Dictionary<string, object?> editable && editable.Remove("TotalRows", out var value) && value != null)
                total = Convert.ToInt64(value);
        }
        if (rows.Count == 0 && request.Page > 1)
        {
            var count = await ExecuteAsync($"{Ctes},\nQ AS ({def.Body})\nSELECT COUNT_BIG(*) TotalRows FROM Q;", request with { Page = 1 }, token);
            total = count.Count > 0 && count[0]["TotalRows"] != null ? Convert.ToInt64(count[0]["TotalRows"]) : 0;
        }
        return new AccountsReportPage(rows, total, request.Page, request.PageSize);
    }

    public async Task<IReadOnlyDictionary<string, object?>?> GetSummaryAsync(AccountsReportRequest request, CancellationToken token)
        => (await ExecuteAsync($"{Ctes}\n{Summaries[request.Report]};", request, token)).FirstOrDefault();

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>> GetFilterOptionsAsync(
        CancellationToken token)
    {
        var none = new AccountsReportRequest("", "", DateTime.Today, DateTime.Today, null, null, null, null, null, null, null, null, null, null, "month", null, false, 1, 1);
        async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> Lookup(int groupCode) => await ExecuteAsync(@"
SELECT tc.Id Value,tc.TypeCodeName Label FROM dbo.Type_Code tc JOIN dbo.TypeGroup g ON g.Id=tc.TypeGroupId
WHERE g.TypeGroupCode=" + groupCode + " AND tc.IsActive=1 ORDER BY Label;", none, token);
        return new Dictionary<string, IReadOnlyList<IReadOnlyDictionary<string, object?>>>
        {
            ["students"] = await ExecuteAsync(@"
SELECT st.Id Value,CONCAT(COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)),CASE WHEN st.Code IS NOT NULL THEN CONCAT(N' (',st.Code,N')') END) Label
FROM dbo.Student st JOIN dbo.[User] u ON u.Id=st.UserId WHERE st.IsActive=1 AND ISNULL(u.IsActive,0)=1 ORDER BY Label;", none, token),
            ["tutors"] = await ExecuteAsync(@"
SELECT t.Id Value,COALESCE(u.FullName,CONCAT(u.FirstName,N' ',u.LastName)) Label FROM dbo.Tutor t JOIN dbo.[User] u ON u.Id=t.UserId
WHERE t.IsActive=1 AND ISNULL(u.IsActive,0)=1 ORDER BY Label;", none, token),
            ["subjects"] = await Lookup(500),
            ["boards"] = await Lookup(400),
            ["grades"] = await Lookup(300),
            ["banks"] = await ExecuteAsync(@"
SELECT b.Id Value,CONCAT(b.BankName,CASE WHEN b.AccountName IS NOT NULL THEN CONCAT(N' — ',b.AccountName) END,CASE WHEN b.IsActive=0 THEN N' (inactive)' END) Label
FROM dbo.TCTBankDetails b ORDER BY b.IsActive DESC,Label;", none, token),
            ["countries"] = await ExecuteAsync(@"
SELECT DISTINCT ClientCountryCode Value,ClientCountryCode Label FROM dbo.Sales WHERE IsActive=1 AND NULLIF(ClientCountryCode,N'') IS NOT NULL ORDER BY Label;", none, token),
            ["paymentModes"] = await ExecuteAsync(@"
SELECT DISTINCT PaymentMode Value,PaymentMode Label FROM dbo.StudentPayment WHERE IsActive=1 AND NULLIF(PaymentMode,N'') IS NOT NULL ORDER BY Label;", none, token),
        };
    }

    // Same visibility rule as the sidebar menu (MenuService): any of View/Add/Edit/Delete on an active menu row.
    public async Task<bool> HasReportPermissionAsync(string roleName, string? report, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(roleName)) return false;
        if (report != null && !Summaries.ContainsKey(report)) return false;

        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = @"
SELECT CASE WHEN EXISTS (
 SELECT 1 FROM dbo.RoleMenuPermission p JOIN dbo.Roles r ON r.Id=p.RoleId JOIN dbo.Menu m ON m.Id=p.MenuId
 WHERE r.RoleName=@RoleName AND m.IsActive=1 AND (p.[View]=1 OR p.[Add]=1 OR p.[Edit]=1 OR p.[Delete]=1)
  AND ((@Link IS NULL AND LEFT(m.Link,LEN(@Prefix))=@Prefix) OR m.Link=@Link)
) THEN 1 ELSE 0 END;";
            command.CommandTimeout = 30;
            Add(command, "@RoleName", DbType.String, roleName);
            Add(command, "@Link", DbType.String, report == null ? null : ReportMenuLinkPrefix + report);
            Add(command, "@Prefix", DbType.String, ReportMenuLinkPrefix);
            return Convert.ToInt32(await command.ExecuteScalarAsync(token)) == 1;
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }
    }

    private async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> ExecuteAsync(
        string sql, AccountsReportRequest request, CancellationToken token)
    {
        DbConnection connection = _dbContext.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(token);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 60;

            // Previous period: the same number of days immediately before the selected range.
            var days = (request.ToDate.Date - request.FromDate.Date).Days;
            var prevTo = request.FromDate.Date.AddDays(-1);
            var like = request.Search == null ? null : $"%{EscapeLike(request.Search)}%";
            Add(command, "@FromDate", DbType.Date, request.FromDate.Date);
            Add(command, "@ToDate", DbType.Date, request.ToDate.Date);
            Add(command, "@PrevFrom", DbType.Date, prevTo.AddDays(-days));
            Add(command, "@PrevTo", DbType.Date, prevTo);
            Add(command, "@Search", DbType.String, request.Search);
            Add(command, "@SearchLike", DbType.String, like);
            Add(command, "@StudentId", DbType.Guid, request.StudentId);
            Add(command, "@TutorId", DbType.Guid, request.TutorId);
            Add(command, "@SubjectId", DbType.Guid, request.SubjectId);
            Add(command, "@BankId", DbType.Guid, request.BankId);
            Add(command, "@BoardId", DbType.Guid, request.BoardId);
            Add(command, "@GradeId", DbType.Guid, request.GradeId);
            Add(command, "@Country", DbType.String, request.Country);
            Add(command, "@PaymentMode", DbType.String, request.PaymentMode);
            Add(command, "@Status", DbType.String, request.Status);
            Add(command, "@GroupBy", DbType.String, request.GroupBy);
            Add(command, "@Offset", DbType.Int32, (request.Page - 1) * request.PageSize);
            Add(command, "@PageSize", DbType.Int32, request.PageSize);

            var rows = new List<IReadOnlyDictionary<string, object?>>();
            await using var reader = await command.ExecuteReaderAsync(token);
            while (await reader.ReadAsync(token))
            {
                var row = new Dictionary<string, object?>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = await reader.IsDBNullAsync(i, token) ? null : reader.GetValue(i);
                rows.Add(row);
            }
            return rows;
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }
    }

    // Search text is matched literally: LIKE wildcards typed by the user are escaped.
    private static string EscapeLike(string value) => value.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    private static void Add(DbCommand command, string name, DbType type, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value ?? DBNull.Value;
        if (type == DbType.String) parameter.Size = 4000;
        command.Parameters.Add(parameter);
    }
}
