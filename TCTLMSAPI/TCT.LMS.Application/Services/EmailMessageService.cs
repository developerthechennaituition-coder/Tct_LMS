using Microsoft.Extensions.Configuration;
using TCT.LMS.Domain.Enums;

namespace TCT.LMS.Application.Services;

public static class EmailMessageService
{
    public static string GetMessageContent(MailMessage message)
    {
        return message.MessageType switch
        {
            MessageType.Registration => GetRegistrationMessage(message),
            MessageType.Forgotpassword => GetForgotpasswordMessage(message),
            MessageType.StudentRegistrationForm => GetStudentRegistrationFormMessage(message),
            MessageType.SalesCreated => GetSalesCreatedMessage(message),
            MessageType.TutorAssigned => GetTutorAssignedMessage(message),
            MessageType.ScheduleDemo => GetScheduleDemoMessage(message),
            MessageType.EmployeeAssigned => GetEmployeeAssignedMessage(message),
            _ => throw new ArgumentException("Invalid communication type")
        };
    }
    private static string GetRegistrationMessage(MailMessage message)
    {
        var activateButtonHtml = !string.IsNullOrEmpty(message.Link)
            ? $@"<div style='text-align:center;margin:28px 0;'>
                   <a href='{message.Link}'
                      style='display:inline-block;background:#7CB342;color:#fff;
                             padding:14px 40px;border-radius:6px;text-decoration:none;
                             font-size:16px;font-weight:600;'>
                     Activate My Account
                   </a>
                 </div>"
            : string.Empty;

        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>

    <!-- Body -->
    <div style='padding:28px 32px;'>

      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        Congratulations! Your account on <strong>The Chennai Tuition Learning Management System</strong>
        has been successfully created. We're excited to have you on board.
      </p>

      {activateButtonHtml}

      <!-- Credentials card -->
      <div style='background:#f9f9f9;border:1px solid #eee;
                  border-radius:8px;padding:18px;margin-bottom:20px;'>
        <div style='font-weight:700;color:#333;margin-bottom:12px;font-size:14px;'>
          Your Login Credentials
        </div>
        <table style='width:100%;border-collapse:collapse;font-size:13px;'>
          <tr>
            <td style='padding:7px 0;color:#777;width:40%;'>Login Email</td>
            <td style='padding:7px 0;font-weight:600;color:#222;'>{message.ToEmail}</td>
          </tr>
          <tr style='border-top:1px solid #eee;'>
            <td style='padding:7px 0;color:#777;'>Temporary Password</td>
            <td style='padding:7px 0;font-weight:700;font-size:15px;color:#7CB342;letter-spacing:1px;font-family:monospace;'>{message.Password}</td>
          </tr>
        </table>
      </div>

      <!-- Security notice -->
      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          <strong>&#128274; Security reminder:</strong> Please change your password immediately
          after your first login. Do not share your credentials with anyone.
        </p>
      </div>

      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        If you have any questions or need assistance, feel free to reach out to our support team.
        Thank you for joining us!
      </p>
    </div>

    <!-- Footer -->
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>

  </div>
</body>
</html>";
    }
    private static string GetStudentRegistrationFormMessage(MailMessage message)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>

    <!-- Body -->
    <div style='padding:28px 32px;'>

      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        Welcome to <strong>The Chennai Tuition</strong>! We're delighted to have you as part of our learning community.
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        To help us serve you better and complete your enrolment, we kindly request you to fill in your
        <strong>Student Registration Form</strong>. This takes only a few minutes and ensures we have
        all the information needed to provide you with the best learning experience.
      </p>

      <!-- CTA Button -->
      <div style='text-align:center;margin:28px 0;'>
        <a href='{message.Link}'
           style='display:inline-block;background:#7CB342;color:#fff;
                  padding:14px 40px;border-radius:6px;text-decoration:none;
                  font-size:16px;font-weight:600;'>
          Fill Registration Form
        </a>
      </div>

      <!-- Info box -->
      <div style='background:#f9f9f9;border:1px solid #eee;
                  border-radius:8px;padding:18px;margin-bottom:20px;'>
        <div style='font-weight:700;color:#333;margin-bottom:10px;font-size:14px;'>
          What you'll need to fill in:
        </div>
        <ul style='font-size:13px;color:#555;line-height:2;margin:0;padding-left:20px;'>
          <li>Student &amp; parent details</li>
          <li>School name and location</li>
          <li>Subject / Standard preferences</li>
          <li>Curriculum / Board</li>
          <li>Address and ID proof</li>
        </ul>
      </div>

      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          <strong>&#128276; Please note:</strong> Completing this form is required to finalise
          your registration. If you have any trouble accessing the form, please reply to this
          email or contact our support team.
        </p>
      </div>

      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        Thank you for choosing The Chennai Tuition. We look forward to supporting your academic journey!
      </p>
    </div>

    <!-- Footer -->
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>

  </div>
</body>
</html>";
    }
    private static string GetSalesCreatedMessage(MailMessage message)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>

    <!-- Body -->
    <div style='padding:28px 32px;'>

      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        {message.Body}
      </p>

      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          Please login to the LMS portal to review the details and take necessary action.
        </p>
      </div>

      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        If you have any questions, please reach out to the team.
      </p>
    </div>

    <!-- Footer -->
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>

  </div>
</body>
</html>";
    }
    private static string GetTutorAssignedMessage(MailMessage message)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>
    <div style='padding:28px 32px;'>
      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        {message.Body}
      </p>
      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          Please login to the LMS portal to view the details. You will be notified once the coordinator admin approves this assignment.
        </p>
      </div>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        If you have any questions, please reach out to your coordinator.
      </p>
    </div>
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>";
    }
    private static string GetEmployeeAssignedMessage(MailMessage message)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>
    <div style='padding:28px 32px;'>
      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        {message.Body}
      </p>
      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          Please login to the LMS portal to view their profile.
        </p>
      </div>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        If you have any questions, please reach out to HR.
      </p>
    </div>
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>";
    }
    private static string GetForgotpasswordMessage(MailMessage message)
    {
        var resetButtonHtml = !string.IsNullOrEmpty(message.Link)
            ? $@"<div style='text-align:center;margin:28px 0;'>
                   <a href='{message.Link}'
                      style='display:inline-block;background:#7CB342;color:#fff;
                             padding:14px 40px;border-radius:6px;text-decoration:none;
                             font-size:16px;font-weight:600;'>
                     Reset My Password
                   </a>
                 </div>"
            : string.Empty;

        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>

    <div style='padding:28px 32px;'>
      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        We received a request to reset the password for your The Chennai Tuition LMS account.
        Use the button below to choose a new password.
      </p>

      {resetButtonHtml}

      <div style='background:#fff8e6;border-left:4px solid #f0ad4e;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#75520b;margin:0;line-height:1.7;'>
          <strong>&#128274; Security notice:</strong> If you did not request this reset,
          you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        For your security, do not forward this email or share the reset link with anyone.
      </p>
    </div>

    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>";
    }

    private static string GetScheduleDemoMessage(MailMessage message)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset='utf-8'/></head>
<body style='margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Arial,sans-serif;'>
  <div style='max-width:600px;margin:30px auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.08);'>
    <div style='background:#1a1a2e;padding:24px 32px;'>
      <h1 style='color:#7CB342;font-size:22px;font-weight:300;margin:0;letter-spacing:1px;'>
        THE CHENNAI TUITION
      </h1>
      <p style='color:rgba(255,255,255,0.45);font-size:11px;margin:4px 0 0;'>
        Learning Management System
      </p>
    </div>
    <div style='padding:28px 32px;'>
      <p style='font-size:15px;color:#333;margin:0 0 6px;'>
        Dear <strong>{message.Name}</strong>,
      </p>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0 0 20px;'>
        {message.Body}
      </p>
      <div style='background:#f0fdf4;border-left:4px solid #7CB342;
                  border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:20px;'>
        <p style='font-size:13px;color:#2d6a2d;margin:0;line-height:1.7;'>
          Please login to the LMS portal to view the full schedule details and be ready for the session.
        </p>
      </div>
      <p style='font-size:13px;color:#555;line-height:1.7;margin:0;'>
        If you have any questions, please reach out to your coordinator.
      </p>
    </div>
    <div style='background:#f9f9f9;border-top:1px solid #eee;
                padding:14px 32px;text-align:center;'>
      <p style='font-size:11px;color:#aaa;margin:0;'>
        The Chennai Tuition &nbsp;·&nbsp;
        accounts@thechennaituition.com &nbsp;·&nbsp;
        +91 90421 71782
      </p>
      <p style='font-size:10px;color:#ccc;margin:5px 0 0;font-style:italic;'>
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>";
    }
}
