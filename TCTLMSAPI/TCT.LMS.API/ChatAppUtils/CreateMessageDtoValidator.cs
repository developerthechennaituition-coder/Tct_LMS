using FluentValidation;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.API.ChatAppUtils
{
    public class CreateMessageDtoValidator : AbstractValidator<CreateMessageDto>
    {
        public CreateMessageDtoValidator()
        {
            RuleFor(x => x.ConversationId).NotEmpty()
                .WithMessage("ConversationId is required");
            RuleFor(x => x.Chat[0]).NotEmpty()
                .WithMessage("Message text cannot be empty")
                .MaximumLength(1000)
                .WithMessage("Message cannot exceed 1000 characters");
        }
    }
}
