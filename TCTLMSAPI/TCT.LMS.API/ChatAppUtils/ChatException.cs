namespace TCT.LMS.API.ChatAppUtils
{
    public class ChatException : Exception
    {
        public ChatException(string message) : base(message) { }
    }

    public class ResourceNotFoundException : ChatException
    {
        public ResourceNotFoundException(string resource, string id)
            : base($"{resource} with id {id} not found.") { }
    }
}
