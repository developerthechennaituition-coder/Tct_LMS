select * from Documents order by CreatedDate desc
select * from [Messages] where Id='DC6A225C-CBEC-466B-A915-A9070530BF9A'

select * from MessageStatus

select ta.SalesDetailsId,ta.StatusCode,tc.TypeCodeName,ta.IsActive   from TutorStudentAllocations as ta
inner join Type_Code  as tc on ta.StatusCode = tc.TypeCodeValue