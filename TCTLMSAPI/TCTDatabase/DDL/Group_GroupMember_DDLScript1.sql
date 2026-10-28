alter table Groups add StudentId uniqueidentifier null  
alter table Groups add TutorId uniqueidentifier null
alter table Groups add SubjectId uniqueidentifier null
alter table Groups add GradeId uniqueidentifier null
alter table Groups add BoardId uniqueidentifier null



alter table GroupMembers add Role VARCHAR(50) 
alter table GroupMembers add JoinedDate DATETIME NULL
alter table GroupMembers add LeftDate DATETIME NULL
