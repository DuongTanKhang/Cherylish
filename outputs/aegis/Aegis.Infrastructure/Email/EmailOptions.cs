namespace Aegis.Infrastructure.Email;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string Host { get; init; } = "mailpit";
    public int Port { get; init; } = 1025;
    public bool EnableSsl { get; init; }
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string FromName { get; init; } = "Cherylish";
    public string PublicBaseUrl { get; init; } = "http://localhost:5130";
    public string SupportEmail { get; init; } = "support@localhost";
}
