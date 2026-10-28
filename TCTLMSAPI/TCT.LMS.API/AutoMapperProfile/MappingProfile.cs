using AutoMapper;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.ChatApp;

namespace TCT.LMS.API.AutoMapperProfile
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<ChatUser, ChatUserDto>();
            CreateMap<ChatUserDto, ChatUser>();
            CreateMap<Conversation, ConversationDto>();
            CreateMap<Message, MessageDto>();
        }
    }
}
