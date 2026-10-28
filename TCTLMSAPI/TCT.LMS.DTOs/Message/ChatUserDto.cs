using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Message;

public class ChatUserDto
{
    public string Id { get; set; }
    public string Username { get; set; }
    public string UserType { get; set; }
    public bool IsOnline { get; set; }
}
