using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;
using TCTModel.Student;

namespace TCT.LMS.Infrastructure.Repositories;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    private readonly ApplicationDbContext _dbContext;
    public StudentRepository(ApplicationDbContext dbContext) : base(dbContext)
    {
        _dbContext = dbContext;
    }

    public List<StudentInfo> GetCoordinatorAllStudent(Guid coordinatorId)
    {
        if (coordinatorId == Guid.Empty)
        {
            var result = GetAllStudents();
            return result;
        }
        List<StudentInfo> studentInfos = new List<StudentInfo>();
        var query = from s in _dbContext.Student
                    join u in _dbContext.User on s.UserId equals u.Id
                    join sale in _dbContext.Sales on s.Id equals sale.StudentId
                    join detail in _dbContext.SalesDetails on sale.Id equals detail.SalesId
                    //join grade in _dbContext.Type_Code on s.GradeId equals grade.Id
                    //join board in _dbContext.Type_Code on s.BoardId equals board.Id
                    where detail.Coordinator == coordinatorId && u.IsActive == true
                    select new StudentInfo()
                    {
                        Id = s.Id,
                        SalesId = sale.Id,
                        DetailsId = detail.Id,
                        SubjectId = detail.SubjectId,
                        UserId = u.Id,
                        StudentName = $"{u.FirstName} {u.LastName}",
                        BoardId = s.BoardId,
                        GradeId = s.GradeId,
                        FullName = $"{u.FirstName} {u.LastName}",
                        ParentName = s.ParentName,
                        Code = s.Code,
                        DOB = u.DOB,
                        //Grade = grade.TypeCodeName,
                        //Board = board.TypeCodeName,
                        CreatedDate = u.CreatedDate,
                        MobileNumber = u.Phone,
                        EmailAddress = u.Email,
                        EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                        EnrolledCourse = _dbContext.Type_Code.Where(tc => tc.Id == detail.SubjectId).FirstOrDefault().TypeCodeName,
                        Status = u.IsActive == true ? "Active" : "Inactive",
                    };
        var results = query.OrderByDescending(s => s.CreatedDate).ToList();
        results = results.DistinctBy(s => s.Id).ToList();
        return results;
    }

    public async Task<PagedResponse<StudentInfo>> GetStudentsByTutorId(Guid tutorId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber)
    {
        // Empty IDs from the UI mean "no filter" (same handling as GetStudentsByCoordinatorOrOps).
        boardId = boardId == Guid.Empty ? null : boardId;
        gradeId = gradeId == Guid.Empty ? null : gradeId;
        subjectId = subjectId == Guid.Empty ? null : subjectId;
        var search = filterText?.Trim();

        var tutor = await _dbContext.Tutor.Where(s => s.UserId == tutorId).FirstOrDefaultAsync();
        var query = (from s in _dbContext.Student
                     join u in _dbContext.User on s.UserId equals u.Id
                     join sa in _dbContext.Sales on s.Id equals sa.StudentId
                     join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                     join tsaItem in _dbContext.TutorStudentAllocations
                         on sd.Id equals tsaItem.SalesDetailsId into allocationGroup
                     from tsa in allocationGroup
                         .Where(item => item.IsActive
                             && (item.TutorId == tutor.Id || item.TutorId == tutor.UserId))
                         .DefaultIfEmpty()
                     join subject in _dbContext.Type_Code on sd.SubjectId equals subject.Id
                     join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                     from address in addressGroup.DefaultIfEmpty()

                     where s.IsActive
                           && u.IsActive
                           && sa.IsActive
                           && sd.IsActive
                           && (tsa != null || sd.TutorId == tutor.Id || sd.TutorId == tutor.UserId)
                           && (!boardId.HasValue || s.BoardId == boardId)
                           && (!gradeId.HasValue || s.GradeId == gradeId)
                           && (!subjectId.HasValue || sd.SubjectId == subjectId)
                           // Search by name, code or parent name only; contact details are not searchable for tutors.
                           && (string.IsNullOrEmpty(search) ||
                               (u.FirstName + " " + u.LastName).Contains(search) ||
                               s.Code.Contains(search) ||
                               s.ParentName.Contains(search))

                     select new StudentInfo
                     {
                         Id = s.Id,
                         UserId = u.Id,
                         StudentName = $"{u.FirstName} {u.LastName}",
                         FullName = u.FirstName + " " + u.LastName,
                         ParentName = s.ParentName,
                         // Contact details are intentionally excluded from tutor-facing responses.
                         EmailAddress = null,
                         MobileNumber = null,
                         Country = address.Country,
                         Code = s.Code,
                         SubjectId = sd.SubjectId,
                         EnrolledCourse = subject.TypeCodeName,
                         DOB = u.DOB,
                         SalesId = sa.Id,
                         DetailsId = sd.Id
                     }).Distinct();

        // Stable order so pages do not overlap between requests; total is counted before paging.
        var allData = (await query.ToListAsync())
            .OrderBy(x => x.StudentName)
            .ThenBy(x => x.Code)
            .ToList();
        var totalRows = allData.Count;
        if (pageNumber < 1) pageNumber = 1;
        var pagedData = pageSize > 0
            ? allData.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList()
            : allData;
        PagedResponse<StudentInfo> pagedResponse = new PagedResponse<StudentInfo>(pagedData, pageNumber, pageSize, totalRows);

        return pagedResponse;
    }

    public async Task<PagedResponse<StudentInfo>> GetStudentsByCoordinatorOrOps(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber)
    {
        gradeId = gradeId == Guid.Empty ? null : gradeId;
        subjectId = subjectId == Guid.Empty ? null : subjectId;
        boardId = boardId == Guid.Empty ? null : boardId;

        // roleId 6 = Coordinator (filter by SalesDetails.Coordinator)
        // roleId 4 = Operations  (filter by Sales.Ownership)
        var studentQuery = (from s in _dbContext.Student
                       join u in _dbContext.User on s.UserId equals u.Id
                       join sa in _dbContext.Sales on s.Id equals sa.StudentId
                       join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                       join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                       from address in addressGroup.DefaultIfEmpty()
                       where s.IsActive == true
                             && u.IsActive == true
                             && (roleId == 6 ? sd.Coordinator == userId : sa.Ownership == userId)
                             && (!boardId.HasValue || s.BoardId == boardId)
                             && (!gradeId.HasValue || s.GradeId == gradeId)
                             && (!subjectId.HasValue || sd.SubjectId == subjectId)
                             && (string.IsNullOrEmpty(filterText) ||
                                 u.Email.Contains(filterText) ||
                                 u.FullName.Contains(filterText) ||
                                 u.Phone.Contains(filterText))
                       select new StudentInfo
                       {
                           Id = s.Id,
                           UserId = u.Id,
                           StudentName = $"{u.FirstName} {u.LastName}",
                           FullName = $"{u.FirstName} {u.LastName}",
                           ParentName = s.ParentName,
                           DOB = u.DOB,
                           Code = s.Code,
                           MobileNumber = u.Phone,
                           EmailAddress = u.Email,
                           Country = address.Country,
                           SalesId = sa.Id,
                           SubjectId = sd.SubjectId,
                           DetailsId = sd.Id,
                           CreatedDate = u.CreatedDate,
                       });

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var distinctStudents = studentQuery.Select(item => new { item.Id, item.CreatedDate }).Distinct();
        var totalRows = await distinctStudents.CountAsync();
        var pageIds = await distinctStudents
            .OrderByDescending(item => item.CreatedDate)
            .ThenBy(item => item.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(item => item.Id)
            .ToListAsync();
        var pageRows = await studentQuery.Where(item => pageIds.Contains(item.Id)).ToListAsync();
        var pageOrder = pageIds.Select((id, index) => new { id, index })
            .ToDictionary(item => item.id, item => item.index);
        var pagedData = pageRows.DistinctBy(item => item.Id)
            .OrderBy(item => pageOrder[item.Id]).ToList();

        var subjectIds = pagedData.Where(item => item.SubjectId.HasValue)
            .Select(item => item.SubjectId!.Value).Distinct().ToList();
        var subjectNames = await _dbContext.Type_Code
            .Where(code => subjectIds.Contains(code.Id))
            .ToDictionaryAsync(code => code.Id, code => code.TypeCodeName);
        foreach (var item in pagedData)
            item.EnrolledCourse = item.SubjectId.HasValue
                ? subjectNames.GetValueOrDefault(item.SubjectId.Value)
                : null;

        return new PagedResponse<StudentInfo>(pagedData, pageNumber, pageSize, totalRows);
    }

    public async Task<PagedResponse<StudentInfo>> GetStudentListWithPaginations(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText, int pageSize, int pageNumber)
    {
        gradeId = gradeId == Guid.Empty ? null : gradeId;
        subjectId = subjectId == Guid.Empty ? null : subjectId;
        boardId = boardId == Guid.Empty ? null : boardId;

        var studentQuery = (from s in _dbContext.Student
                       join u in _dbContext.User on s.UserId equals u.Id
                            join saItem in _dbContext.Sales
         on s.Id equals saItem.StudentId into salesGroup
                            from sa in salesGroup.DefaultIfEmpty()

                            join sdItem in _dbContext.SalesDetails
                                on sa.Id equals sdItem.SalesId into detailsGroup
                            from sd in detailsGroup.DefaultIfEmpty()
                            join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                       from address in addressGroup.DefaultIfEmpty()
                       join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
                       from _grade in gradeGroup.DefaultIfEmpty()
                       join board in _dbContext.Type_Code on s.BoardId equals board.Id into boardGroup
                       from _board in boardGroup.DefaultIfEmpty()
                            where s.IsActive == true
         && u.IsActive == true
         && (!boardId.HasValue || s.BoardId == boardId.Value)
         && (!gradeId.HasValue || s.GradeId == gradeId.Value)
         && (!subjectId.HasValue ||
             (sd != null && sd.SubjectId == subjectId.Value))
         && (string.IsNullOrWhiteSpace(filterText) ||
             (u.Email != null && u.Email.Contains(filterText)) ||
             (u.FullName != null && u.FullName.Contains(filterText)) ||
             (u.Phone != null && u.Phone.Contains(filterText)))
                            select new StudentInfo()
                       {
                           Id = s.Id,
                           UserId = u.Id,
                           StudentName = $"{u.FirstName} {u.LastName}",
                           FullName = $"{u.FirstName} {u.LastName}",
                           ParentName = s.ParentName,
                           DOB = u.DOB,
                           Code = s.Code,
                           BoardId = _board != null ? _board.Id : Guid.Empty,
                           Board = _board != null ? _board.TypeCodeName : "",
                           Grade = _grade != null ? _grade.TypeCodeName : "",
                           CreatedDate = u.CreatedDate,
                           MobileNumber = u.Phone,
                           EmailAddress = u.Email,
                                /* Country = address.Country,
                                 SalesId = sa.Id,
                                 SubjectId = sd.SubjectId,
                                 DetailsId = sd.Id,*/
                                Country = address != null ? address.Country : null,
                                SalesId = sa != null ? sa.Id : Guid.Empty,
                                SubjectId = sd != null ? sd.SubjectId : null,
                                DetailsId = sd != null ? sd.Id : Guid.Empty,
                                EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                           Status = u.IsActive ? "Active" : "Inactive",
                                //TctBankID = sa.TCTBankId,
                                TctBankID = sa != null ? sa.TCTBankId : null,
                            });

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var distinctStudents = studentQuery
            .Select(item => new { item.Id, item.CreatedDate })
            .Distinct();
        var totalRows = await distinctStudents.CountAsync();
        var pageIds = await distinctStudents
            .OrderByDescending(item => item.CreatedDate)
            .ThenBy(item => item.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(item => item.Id)
            .ToListAsync();

        var pageRows = await studentQuery
            .Where(item => pageIds.Contains(item.Id))
            .ToListAsync();
        var pageOrder = pageIds.Select((id, index) => new { id, index })
            .ToDictionary(item => item.id, item => item.index);
        var pagedData = pageRows
            .DistinctBy(item => item.Id)
            .OrderBy(item => pageOrder[item.Id])
            .ToList();

        var subjectIds = pagedData.Where(item => item.SubjectId.HasValue)
            .Select(item => item.SubjectId!.Value).Distinct().ToList();
        var subjectNames = await _dbContext.Type_Code
            .Where(code => subjectIds.Contains(code.Id))
            .ToDictionaryAsync(code => code.Id, code => code.TypeCodeName);
        foreach (var item in pagedData)
            item.EnrolledCourse = item.SubjectId.HasValue
                ? subjectNames.GetValueOrDefault(item.SubjectId.Value)
                : null;

        return new PagedResponse<StudentInfo>(pagedData, pageNumber, pageSize, totalRows);
    }

    public async Task<List<StudentInfo>> GetBoardViseStudentListByUser(Guid userId, int roleId, Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText)
    {
        gradeId = gradeId == Guid.Empty ? null : gradeId;
        subjectId = subjectId == Guid.Empty ? null : subjectId;
        boardId = boardId == Guid.Empty ? null : boardId;

        List<StudentInfo> results;

        if (roleId == 13) // Tutor
        {
            var tutor = await _dbContext.Tutor.Where(s => s.UserId == userId).FirstOrDefaultAsync();
            if (tutor == null) return new List<StudentInfo>();

            results = (from s in _dbContext.Student
                       join u in _dbContext.User on s.UserId equals u.Id
                       join sa in _dbContext.Sales on s.Id equals sa.StudentId
                       join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                       join tsa in _dbContext.TutorStudentAllocations on sd.Id equals tsa.SalesDetailsId
                       join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                       from address in addressGroup.DefaultIfEmpty()
                       join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
                       from _grade in gradeGroup.DefaultIfEmpty()
                       join board in _dbContext.Type_Code on s.BoardId equals board.Id into boardGroup
                       from _board in boardGroup.DefaultIfEmpty()
                       where s.IsActive == true
                             && u.IsActive == true
                             && tsa.TutorId == tutor.Id
                             && (!boardId.HasValue || s.BoardId == boardId)
                             && (!gradeId.HasValue || s.GradeId == gradeId)
                             && (!subjectId.HasValue || sd.SubjectId == subjectId)
                             && (string.IsNullOrEmpty(filterText) ||
                                 u.Email.Contains(filterText) ||
                                 u.FullName.Contains(filterText) ||
                                 u.Phone.Contains(filterText))
                       select new StudentInfo
                       {
                           Id = s.Id,
                           UserId = u.Id,
                           StudentName = $"{u.FirstName} {u.LastName}",
                           FullName = $"{u.FirstName} {u.LastName}",
                           ParentName = s.ParentName,
                           DOB = u.DOB,
                           Code = s.Code,
                           Board = _board != null ? _board.TypeCodeName : "",
                           Grade = _grade != null ? _grade.TypeCodeName : "",
                           CreatedDate = u.CreatedDate,
                           MobileNumber = u.Phone,
                           EmailAddress = u.Email,
                           Country = address.Country,
                           SalesId = sa.Id,
                           SubjectId = sd.SubjectId,
                           DetailsId = sd.Id,
                           EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                           Status = u.IsActive == true ? "Active" : "Inactive",
                           TctBankID = sa.TCTBankId,
                       })
                       .ToList()
                       .DistinctBy(x => x.Id)
                       .OrderByDescending(x => x.CreatedDate)
                       .ToList();
        }
        else
        {
            // roleId 6 = Coordinator: filter by SalesDetails.Coordinator
            // roleId 4 = Operations:  filter by Sales.Ownership
            results = (from s in _dbContext.Student
                       join u in _dbContext.User on s.UserId equals u.Id
                       join sa in _dbContext.Sales on s.Id equals sa.StudentId
                       join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                       join co in _dbContext.User on sd.Coordinator equals co.Id
                       join op in _dbContext.User on sa.Ownership equals op.Id
                       join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                       from address in addressGroup.DefaultIfEmpty()
                       join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
                       from _grade in gradeGroup.DefaultIfEmpty()
                       join board in _dbContext.Type_Code on s.BoardId equals board.Id into boardGroup
                       from _board in boardGroup.DefaultIfEmpty()
                       where s.IsActive == true
                             && u.IsActive == true
                             && (roleId == 6 ? sd.Coordinator == userId : sa.Ownership == userId)
                             && (!boardId.HasValue || s.BoardId == boardId)
                             && (!gradeId.HasValue || s.GradeId == gradeId)
                             && (!subjectId.HasValue || sd.SubjectId == subjectId)
                             && (string.IsNullOrEmpty(filterText) ||
                                 u.Email.Contains(filterText) ||
                                 u.FullName.Contains(filterText) ||
                                 u.Phone.Contains(filterText))
                       select new StudentInfo
                       {
                           Id = s.Id,
                           UserId = u.Id,
                           StudentName = $"{u.FirstName} {u.LastName}",
                           FullName = $"{u.FirstName} {u.LastName}",
                           ParentName = s.ParentName,
                           CoordinatorId = co.Id,
                           CoordinatorName = co.FirstName,
                           OperationId = op.Id,
                           OperationName = op.FirstName,
                           DOB = u.DOB,
                           Code = s.Code,
                           Board = _board != null ? _board.TypeCodeName : "",
                           Grade = _grade != null ? _grade.TypeCodeName : "",
                           CreatedDate = u.CreatedDate,
                           MobileNumber = u.Phone,
                           EmailAddress = u.Email,
                           Country = address.Country,
                           SalesId = sa.Id,
                           SubjectId = sd.SubjectId,
                           DetailsId = sd.Id,
                           EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                           Status = u.IsActive == true ? "Active" : "Inactive",
                           TctBankID = sa.TCTBankId,
                           GSTPercentage = sa.GSTPercentage,
                           VATPercentage = sa.VATPercentage,
                           Currency = sa.Currency,
                           ClientGST = sa.ClientGST,
                           ClientPAN = sa.ClientPAN,
                           ClientGSTStateCode = sa.ClientGSTStateCode,
                           ClientCountryCode = sa.ClientCountryCode,
                       })
                       .ToList()
                       .DistinctBy(x => x.Id)
                       .OrderByDescending(x => x.CreatedDate)
                       .ToList();
        }

        var studentIds = results.Select(s => s.Id).ToList();
        var scheduledStudentIds = _dbContext.Schedule
            .Where(s => studentIds.Contains(s.StudentId))
            .Select(s => s.StudentId)
            .Distinct()
            .ToHashSet();
        foreach (var item in results)
        {
            item.EnrolledCourse = _dbContext.Type_Code.Where(s => s.Id == item.SubjectId).FirstOrDefault()?.TypeCodeName;
            item.HasSchedule = scheduledStudentIds.Contains(item.Id);
        }

        return results;
    }

    public List<StudentInfo> GetBoardViseStudentList(Guid? boardId, Guid? gradeId, Guid? subjectId, string filterText)
    {
        try
        {
            var output = new List<StudentInfo>();
            gradeId = gradeId == Guid.Empty ? null : gradeId;
            subjectId = subjectId == Guid.Empty ? null : subjectId;
            boardId = boardId == Guid.Empty ? null : boardId;

            var query = (from s in _dbContext.Student
                         join u in _dbContext.User on s.UserId equals u.Id
                         join sa in _dbContext.Sales on s.Id equals sa.StudentId
                         join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                         join co in _dbContext.User on sd.Coordinator equals co.Id
                         join op in _dbContext.User on sa.Ownership equals op.Id
                         join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                         from address in addressGroup.DefaultIfEmpty()
                         join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
                         from _grade in gradeGroup.DefaultIfEmpty()
                         join board in _dbContext.Type_Code on s.BoardId equals board.Id
                         where s.IsActive == true && u.IsActive == true
                        && (!boardId.HasValue || s.BoardId == boardId)
                        && (!gradeId.HasValue || s.GradeId == gradeId)
                        && (!subjectId.HasValue || sd.SubjectId == subjectId)
                        && (string.IsNullOrEmpty(filterText) ||
                                   u.Email.Contains(filterText) ||
                                   u.FullName.Contains(filterText) ||
                                   u.Phone.Contains(filterText))
                         select new StudentInfo()
                         {
                             Id = s.Id,
                             UserId = u.Id,
                             StudentName = $"{u.FirstName} {u.LastName}",
                             FullName = $"{u.FirstName} {u.LastName}",
                             ParentName = s.ParentName,
                             CoordinatorId = co.Id,
                             CoordinatorName = co.FirstName,
                             OperationId = op.Id,
                             OperationName = op.FirstName,
                             DOB = u.DOB,
                             Code = s.Code,
                             BoardId = board.Id,
                             Board = board.TypeCodeName,
                             Grade = _grade.TypeCodeName,
                             CreatedDate = u.CreatedDate,
                             MobileNumber = u.Phone,
                             EmailAddress = u.Email,
                             Country = address.Country,
                             SalesId = sa.Id,
                             SubjectId = sd.SubjectId,
                             DetailsId = sd.Id,
                             EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                             Status = u.IsActive == true ? "Active" : "Inactive",
                             TctBankID = sa.TCTBankId,
                             GSTPercentage = sa.GSTPercentage,
                             VATPercentage = sa.VATPercentage,
                             Currency = sa.Currency,
                             ClientGST = sa.ClientGST,
                             ClientPAN = sa.ClientPAN,
                             ClientGSTStateCode = sa.ClientGSTStateCode,
                             ClientCountryCode = sa.ClientCountryCode,
                         }).ToList().DistinctBy(d => d.Id);

            var results = query.OrderByDescending(s => s.CreatedDate).ToList();
            var studentIds = results.Select(s => s.Id).ToList();
            var scheduledStudentIds = _dbContext.Schedule
                .Where(s => studentIds.Contains(s.StudentId))
                .Select(s => s.StudentId)
                .Distinct()
                .ToHashSet();
            foreach (var item in results)
            {
                item.EnrolledCourse = _dbContext.Type_Code.Where(s => s.Id == item.SubjectId).FirstOrDefault()?.TypeCodeName;
                item.HasSchedule = scheduledStudentIds.Contains(item.Id);
            }

            return results;
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }

    public List<StudentInfo> GetBoardViseStudentListForReport(Guid? boardId, Guid? gradeId, Guid? subjectId)
    {
        try
        {
            var output = new List<StudentInfo>();
            gradeId = gradeId == Guid.Empty ? null : gradeId;
            boardId = boardId == Guid.Empty ? null : boardId;
            subjectId = subjectId == Guid.Empty ? null : subjectId;
            var query = (from s in _dbContext.Student
                         join u in _dbContext.User on s.UserId equals u.Id
                         join sa in _dbContext.Sales on s.Id equals sa.StudentId
                         join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                         join addr in _dbContext.Address on s.UserId equals addr.UserId into addressGroup
                         from address in addressGroup.DefaultIfEmpty()
                         join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
                         from _grade in gradeGroup.DefaultIfEmpty()
                         join board in _dbContext.Type_Code on s.BoardId equals board.Id
                         where s.IsActive == true && u.IsActive == true
                        && (!boardId.HasValue || s.BoardId == boardId)
                        && (!gradeId.HasValue || s.GradeId == gradeId)
                        && (!subjectId.HasValue || sd.SubjectId == subjectId)

                         select new StudentInfo()
                         {
                             Id = s.Id,
                             UserId = u.Id,
                             StudentName = $"{u.FirstName} {u.LastName}",
                             FullName = $"{u.FirstName} {u.LastName}",
                             ParentName = s.ParentName,
                             DOB = u.DOB,
                             Code = s.Code,
                             BoardId = board.Id,
                             Board = board.TypeCodeName,
                             Grade = _grade.TypeCodeName,
                             CreatedDate = u.CreatedDate,
                             MobileNumber = u.Phone,
                             EmailAddress = u.Email,
                             Country = address.Country,
                             SalesId = sa.Id,
                             SubjectId = sd.SubjectId,
                             DetailsId = sd.Id,
                             EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                             Status = u.IsActive == true ? "Active" : "Inactive",
                         }).ToList();

            var results = query.OrderByDescending(s => s.CreatedDate).ToList();
            foreach (var item in results)
            {
                item.EnrolledCourse = _dbContext.Type_Code.Where(s => s.Id == item.SubjectId).FirstOrDefault()?.TypeCodeName;
                //var _sale = _dbContext.Sales.Where(s => s.StudentId == item.Id).FirstOrDefault();
                //if (_sale != null)
                //{
                //    var salesDetails = _dbContext.SalesDetails.Where(s => s.SalesId == _sale.Id).FirstOrDefault();

                //    if (salesDetails != null)
                //    {
                //    }
                //}
            }
            results = query.OrderByDescending(s => s.CreatedDate).ThenByDescending(p => p.FullName).ThenByDescending(p => p.EnrolledCourse).ToList();
            return results;
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }

    public List<StudentInfo> GetAllStudents()
    {
        var output = new List<StudentInfo>();

        var query = from s in _dbContext.Student
                    join u in _dbContext.User on s.UserId equals u.Id
                    join addr in _dbContext.Address on s.UserId equals addr.UserId
                    join grade in _dbContext.Type_Code on s.GradeId equals grade.Id
                    join board in _dbContext.Type_Code on s.BoardId equals board.Id
                    where addr.IsPrimary == true && s.IsActive == true && u.IsActive == true

                    select new StudentInfo()
                    {
                        Id = s.Id,
                        UserId = u.Id,
                        StudentName = $"{u.FirstName} {u.LastName}",
                        BoardId = board.Id,
                        FullName = $"{u.FirstName} {u.LastName}",
                        ParentName = s.ParentName,
                        Code = s.Code,
                        DOB = u.DOB,
                        Grade = grade.TypeCodeName,
                        Board = board.TypeCodeName,
                        CreatedDate = u.CreatedDate,
                        MobileNumber = u.Phone,
                        EmailAddress = u.Email,
                        Country = addr.Country,
                        EnrollmentDate = u.CreatedDate.ToString("dd/MM/yyyy"),
                        Status = u.IsActive == true ? "Active" : "Inactive",
                    };

        var results = query.OrderByDescending(s => s.CreatedDate).ToList();
        foreach (var item in results)
        {
            var _sale = _dbContext.Sales.Where(s => s.StudentId == item.Id).FirstOrDefault();
            if (_sale != null)
            {
                var salesDetails = _dbContext.SalesDetails.Where(s => s.SalesId == _sale.Id).FirstOrDefault();

                if (salesDetails != null)
                {
                    item.EnrolledCourse = _dbContext.Type_Code.Where(s => s.Id == salesDetails.SubjectId).FirstOrDefault()?.TypeCodeName;
                }
            }
        }
        return results;
    }

    public async Task<Response<StudentRequestDto>> GetStudent(Guid studentId)
    {
        Response<StudentRequestDto> response = new Response<StudentRequestDto>();
        var query = from s in _dbContext.Student
                    join sa in _dbContext.Sales on s.Id equals sa.StudentId
                    join user in _dbContext.User on s.UserId equals user.Id
                    join addr in _dbContext.Address.Where(a => a.IsPrimary.Value)
                        on s.UserId equals addr.UserId into addrGroup
                    from addr in addrGroup.DefaultIfEmpty() // Left join
                    join grade in _dbContext.Type_Code on s.GradeId equals grade.Id
                    join board in _dbContext.Type_Code on s.BoardId equals board.Id
                    where s.Id == studentId
                    select new StudentRequestDto()
                    {
                        UserId = s.UserId,
                        Id = s.Id,
                        LastName = user.LastName,
                        FirstName = user.FirstName,
                        Gender = user.Gender,
                        GenderId = _dbContext.Type_Code
                                        .Where(c => c.TypeCodeName == user.Gender)
                                        .Select(t => t.Id).FirstOrDefault(),
                        EmailAddress = user.Email,
                        DOB = user.DOB,
                        ParentName = s.ParentName,
                        Code = s.Code,
                        GradeId = s.GradeId,
                        BoardId = s.BoardId,
                        GradeName = grade.TypeCodeName,
                        BoardName = board.TypeCodeName,
                        MobileNumber = user.Phone,
                        AlternatePhone = user.AlternatePhone,
                        Ownership = sa.Ownership,

                        PreviousBoardId = sa.PreviousBoardId,
                        CustomerConnectedDate = sa.CustomerConnectedDate,
                        PreviousMarks = sa.PreviousMarks,
                        ExamSeries = sa.ExamSeries,
                        LevelOfDemonstration = sa.LevelOfDemonstration,
                        TutorPreference = sa.TutorPreference,
                        GenderPreference = sa.GenderPreference,
                        ParentsInterestedLevel = sa.ParentsInterestedLevel,
                        StudentCurrentLocationAndSchool = sa.StudentCurrentLocationAndSchool
                    };


        var results = query.FirstOrDefault();
        response.Data = query.FirstOrDefault();
        if (results != null)
        {
            var address = await _dbContext.Address.Where(s => s.UserId == results.UserId).FirstOrDefaultAsync();
            if (address == null)
            {
                response.Data.StudentAddress = new DTOs.Address.StudentAddressRequestDto()
                {
                    Id = Guid.Empty,
                };
            }
            else
            {
                response.Data.StudentAddress = new DTOs.Address.StudentAddressRequestDto()
                {
                    Id = address.Id,
                    State = address.State,
                    AddressLine1 = address.AddressLine1,
                    AddressLine2 = address.AddressLine2,
                    AddressLine3 = address.AddressLine3,
                    City = address.City,
                    Country = address.Country,
                    ZipCode = address.ZipCode
                };
            }

            response.Succeeded = true;
        }
        return response;
    }

    public async Task<Response<bool>> UpdateStudent(StudentRequestDto input)
    {
        var student = await _dbContext.FindAsync<Student>(input.Id);
        if (student == null)
        {
            throw new Exception("Student not found");
        }

        student.ParentName = input.ParentName;
        //student.StudentName = input.StudentName;
        student.BoardId = input.BoardId.Value;
        student.GradeId = input.GradeId.Value;
        student.ModifiedBy = Guid.Empty;
        student.ModifiedDate = DateTime.UtcNow;
        _dbContext.Update(student);

        var user = await _dbContext.FindAsync<User>(student.UserId);
        if (user != null)
        {
            user.FirstName = input.FirstName;
            user.LastName = input.LastName;
            user.DOB = input.DOB;
            user.Gender = input.Gender;
            user.Phone = input.MobileNumber;
            user.AlternatePhone = input.AlternatePhone;
            user.ModifiedBy = input.ModifiedBy;
            user.ModifiedDate = DateTime.UtcNow;
            _dbContext.Update(user);
        }
        await _dbContext.SaveChangesAsync();
        return new Response<bool>();
    }

    public async Task<List<ContactResponseDto>> GetContactsByUserId(Guid userId, string role)
    {
        //var query = from sl in _dbContext.Sales
        //            join sd in _dbContext.SalesDetails on sl.Id equals sd.SalesId
        //            join ur in _dbContext.User on
        //                (role == "Student" ? sd.TutorId : sl.StudentId) equals ur.Id
        //            where sl.IsActive && sd.IsActive && sd.TutorId != null
        //                && ur.Id == userId
        //var query = from sl in _dbContext.Sales
        //             join sd in _dbContext.SalesDetails on sl.Id equals sd.SalesId
        //             join st in _dbContext.Student on sl.StudentId equals st.Id
        //             join ut in _dbContext.User on sd.TutorId equals ut.Id
        //             where sl.IsActive && sd.IsActive && st.IsActive
        //                   && sd.TutorId != null
        //                   && st.UserId == userId
        //             select new ContactResponseDto
        //            {
        //                AdminUserId = sd.Coordinator,
        //                FirstName = ut.FirstName,
        //                LastName = ut.LastName,
        //                FullName = ut.FullName,
        //                StudentId = role == "Tutor" ? sl.StudentId : null,
        //                TutorId = role == "Student" ? sd.TutorId : null
        //            };
        var result = (
    // First part of UNION - Tutors
    (from sl in _dbContext.Sales
     join sd in _dbContext.SalesDetails on sl.Id equals sd.SalesId
     join st in _dbContext.Student on sl.StudentId equals st.Id
     join ut in _dbContext.User on sd.TutorId equals ut.Id
     join ur in _dbContext.UserRole on ut.Id equals ur.UserId
     join rl in _dbContext.Roles on ur.RoleId equals rl.Id
     where sl.IsActive == true
         && sd.IsActive == true
         && sd.TutorId != null
         && st.IsActive == true
         && ur.IsActive == true
         && rl.IsActive == true
         && st.UserId == userId
     select new ContactResponseDto
     {
         AdminUserId = sd.Coordinator,
         FirstName = ut.FirstName,
         LastName = ut.LastName,
         FullName = ut.FullName,
         StudentId = role == "Tutor" ? sl.StudentId : null,
         TutorId = role == "Student" ? sd.TutorId : null,
         Role = rl.RoleName,
     }).Distinct()
)
.Union(
    // Second part of UNION - Coordinators
    (from sl in _dbContext.Sales
     join sd in _dbContext.SalesDetails on sl.Id equals sd.SalesId
     join st in _dbContext.Student on sl.StudentId equals st.Id
     join uc in _dbContext.User on sd.Coordinator equals uc.Id
     join ur in _dbContext.UserRole on uc.Id equals ur.UserId
     join rl in _dbContext.Roles on ur.RoleId equals rl.Id
     where sl.IsActive == true
         && sd.IsActive == true
         && sd.TutorId != null
         && st.IsActive == true
         && ur.IsActive == true
         && rl.IsActive == true
         && rl.Id == 4
         && st.UserId == userId
     select new ContactResponseDto
     {
         AdminUserId = sd.Coordinator,
         FirstName = uc.FirstName,
         LastName = uc.LastName,
         FullName = uc.FullName,
         StudentId = role == "Tutor" ? sl.StudentId : null,
         TutorId = role == "Student" ? sd.TutorId : null,
         Role = rl.RoleName,
     }).Distinct()
);

        return await result.Distinct().ToListAsync();
    }

    public async Task<Response<bool>> BankDetailsForPaymentForStudent(BankDetailsUpdateRequest request)
    {
        var sales = _dbContext.Sales.Where(s => s.StudentId == request.StudentId).FirstOrDefault();
        if (sales == null)
        {
            throw new Exception("Student not found");
        }
        sales.TCTBankId = request.BankDetailId;
        sales.GSTPercentage = request.GSTPercentage;
        sales.VATPercentage = request.VATPercentage;
        sales.Currency = request.Currency;
        sales.ClientGST = request.ClientGST;
        sales.ClientPAN = request.ClientPAN;
        sales.ClientGSTStateCode = request.ClientGSTStateCode;
        sales.ClientCountryCode = request.ClientCountryCode;
        sales.ModifiedBy = request.UserId;
        sales.ModifiedDate = DateTime.UtcNow;
        _dbContext.Update(sales);

        await _dbContext.SaveChangesAsync();
        return new Response<bool>
        {
            Succeeded = true,
            Data = true,
            Message = "Bank details updated successfully"
        };
    }

    public async Task<Response<Guid>> Register(StudentRegistrationDto request)
    {
        string cleanMobile = request.ParentMobile?.ToString().Replace(" ", "") ?? "";

        var userTypeId = await _dbContext.Type_Code
            .Where(c => c.TypeCodeValue == 10001)
            .Select(c => c.Id)
            .FirstOrDefaultAsync();

        if (userTypeId == Guid.Empty)
        {
            return new Response<Guid>
            {
                Succeeded = false,
                Message = "System error: Required User Type (10001) not found in database."
            };
        }

        bool alreadyRegistered = await _dbContext.StudentRegistration.AnyAsync(s =>
            s.ParentMobile.Replace(" ", "") == cleanMobile &&
            s.ParentName == request.ParentName &&
            s.StudentName == request.StudentName &&
            s.Subject == request.Subject);

        if (alreadyRegistered)
        {
            return new Response<Guid>
            {
                Succeeded = false,
                Data = Guid.Empty,
                Message = $"Student with phone number {request.ParentMobile} is already registered.",
            };
        }

        string cleanEmail = request.ParentEmail?.Trim().ToLower() ?? "";

        var userData = await _dbContext.User
            .Where(u => u.FirstName == request.StudentName &&
                        u.Phone.Replace(" ", "") == cleanMobile &&
                        u.Email != null && u.Email.ToLower() == cleanEmail &&
                        u.UserType == userTypeId)
            .Select(u => new
            {
                u.Id,
                u.CreatedBy,
                StudentId = _dbContext.Student
                                .Where(st => st.UserId == u.Id)
                                .Select(st => st.Id)
                                .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        if (userData == null)
        {
            return new Response<Guid>
            {
                Succeeded = false,
                Data = Guid.Empty,
                Message = $"Student record not found for the given name, email and phone number. Please check that the email ({request.ParentEmail}) and phone number ({request.ParentMobile}) match what is on file.",
            };
        }

        var studentRegistration = new StudentRegistration()
        {
            StudentId = userData.StudentId,
            StudentName = request.StudentName,
            SchoolName = request.SchoolName,
            Address = request.Address,
            Curriculum = request.Curriculum,
            DemoFeedback = request.DemoFeedback,
            FeesPerHour = request.FeesPerHour,
            AnnualExamMonth = request.AnnualExamMonth,
            Location = request.Location,
            ParentEmail = request.ParentEmail,
            ParentMobile = cleanMobile,
            ParentName = request.ParentName,
            Subject = request.Subject,
            TermsAccepted = request.TermsAccepted,
            CreatedBy = userData.CreatedBy,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };

        _dbContext.StudentRegistration.Add(studentRegistration);

        var matchingSalesDetails = await (
            from sales in _dbContext.Sales
            join details in _dbContext.SalesDetails on sales.Id equals details.SalesId
            where sales.StudentId == userData.StudentId &&
                  details.SubjectId == request.Subject &&
                  sales.IsActive && details.IsActive
            select details).ToListAsync();

        foreach (var salesDetails in matchingSalesDetails)
        {
            salesDetails.ParentPayment = request.FeesPerHour;
            salesDetails.ModifiedDate = DateTime.UtcNow;
            salesDetails.ModifiedBy = userData.Id;
        }

        await _dbContext.SaveChangesAsync();

        return new Response<Guid>
        {
            Succeeded = true,
            Data = userData.Id,
            Message = "Registration completed successfully"
        };
    }
}
