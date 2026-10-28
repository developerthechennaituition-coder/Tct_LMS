using FluentValidation;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Validator;

public class SalesValidator : AbstractValidator<Sales>
{
    public SalesValidator()
    {
        //RuleFor(sales => sales.StudentName)
        //    .NotEmpty().WithMessage("Student name is required.")
        //    .Length(2, 50).WithMessage("Student name must be between 2 and 50 characters.");

    }
}
