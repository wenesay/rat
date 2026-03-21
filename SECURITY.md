# Security Policy

## Supported Versions

We take security seriously. This section outlines our security policy and how to report security vulnerabilities.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in RAT, please help us by reporting it responsibly.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by creating a [private security advisory on GitHub](https://github.com/wenesay/rat/security/advisories).

### What to Include

When reporting a security vulnerability, please include:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Any suggested fixes or mitigations
- Your contact information for follow-up

### Our Commitment

- We will acknowledge receipt of your report within 48 hours
- We will provide a more detailed response within 7 days indicating our next steps
- We will keep you informed about our progress throughout the process
- We will credit you (if desired) once the vulnerability is fixed

## Security Best Practices

When deploying RAT, please follow these security best practices:

### Environment Variables
- Change the default `SESSION_SECRET` to a strong, random value
- Use HTTPS in production
- Set secure session cookies

### User Management
- Change the default admin password immediately
- Use strong passwords for all accounts
- Regularly review and revoke unnecessary user access

### Network Security
- Run RAT behind a reverse proxy (nginx, Apache, etc.)
- Configure proper CORS settings for your domain
- Use firewalls to restrict access to the server

### Data Protection
- Regularly backup your SQLite database
- Monitor for unusual activity in analytics data
- Keep dependencies updated

## Known Security Considerations

- RAT stores analytics data in plain text (by design for transparency)
- Session data is stored server-side
- Passwords are hashed with bcrypt
- No personal user data is collected by the analytics script

## Contact

For security-related questions or concerns, please open an issue on [GitHub](https://github.com/wenesay/rat/issues).