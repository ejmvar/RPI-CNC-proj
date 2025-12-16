# Security Policy

## Reporting a Vulnerability

**⚠️ Please do NOT report security vulnerabilities through public GitHub issues.**

We take security seriously. If you discover a security vulnerability in the CNC Simulator, please report it responsibly.

### How to Report

Send an email to: **security@your-domain.com** (replace with your actual security contact)

Include the following information:

1. **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
2. **Affected component** (frontend, backend, database, etc.)
3. **Steps to reproduce** the vulnerability
4. **Potential impact** of the vulnerability
5. **Suggested fix** (if you have one)
6. **Your contact information** for follow-up questions

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt of your report within **48 hours**
- **Initial assessment**: We'll provide an initial assessment within **5 business days**
- **Regular updates**: We'll keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within **30 days**
- **Disclosure**: We'll coordinate with you on public disclosure timing

### Responsible Disclosure

We kindly ask that you:

- ✅ Give us reasonable time to fix the issue before public disclosure
- ✅ Do not exploit the vulnerability beyond what's necessary to demonstrate it
- ✅ Do not access, modify, or delete data belonging to others
- ✅ Keep confidential any information about the vulnerability until we publish a fix

## Security Update Process

1. **Validation**: We validate and confirm the reported vulnerability
2. **Fix development**: We develop and test a fix in a private branch
3. **Security advisory**: We create a GitHub Security Advisory
4. **Patch release**: We release a patch version with the fix
5. **Public disclosure**: We publish the security advisory and CVE (if applicable)
6. **Credit**: We credit the reporter (unless they prefer to remain anonymous)

## Supported Versions

We provide security updates for the following versions:

| Version | Supported      |
| ------- | -------------- |
| 1.x.x   | ✅ Yes         |
| 0.x.x   | ⚠️ Best effort |
| < 0.9   | ❌ No          |

## Security Best Practices

### For Users

- ✅ Keep your installation up to date
- ✅ Use strong, unique passwords
- ✅ Enable two-factor authentication (when available)
- ✅ Review access permissions regularly
- ✅ Use HTTPS in production
- ✅ Keep your browser updated

### For Self-Hosters

- ✅ Use environment variables for secrets (never commit them)
- ✅ Enable PostgreSQL SSL connections
- ✅ Use a reverse proxy (Nginx, Caddy) with HTTPS
- ✅ Enable CORS only for trusted origins
- ✅ Set up rate limiting
- ✅ Use strong JWT secrets (min 32 characters)
- ✅ Enable database backups
- ✅ Monitor logs for suspicious activity
- ✅ Keep dependencies updated (`npm audit fix`)
- ✅ Use Docker security best practices (non-root user, read-only volumes)

### For Contributors

- ✅ Never commit secrets or credentials
- ✅ Sanitize user inputs (use parameterized queries)
- ✅ Validate and escape outputs (prevent XSS)
- ✅ Use security linters (ESLint security plugins)
- ✅ Run `npm audit` before submitting PRs
- ✅ Follow the principle of least privilege
- ✅ Write security tests for sensitive features
- ✅ Review dependencies before adding them

## Security Features

The CNC Simulator includes the following security features:

### Authentication & Authorization

- ✅ JWT-based authentication with httpOnly cookies
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Session management with automatic expiry
- ✅ Role-based access control (RBAC)
- ✅ Password strength requirements

### Input Validation

- ✅ Parameterized SQL queries (prevents SQL injection)
- ✅ Input sanitization (prevents XSS)
- ✅ File upload restrictions (type and size limits)
- ✅ G-Code validation (malformed command rejection)

### Network Security

- ✅ CORS configuration for API endpoints
- ✅ CSRF protection for state-changing operations
- ✅ Rate limiting on authentication endpoints
- ✅ Secure WebSocket connections (WSS in production)
- ✅ Content Security Policy (CSP) headers

### Data Protection

- ✅ HTTPS enforcement in production
- ✅ Encrypted database connections (SSL)
- ✅ Secure cookie flags (httpOnly, secure, sameSite)
- ✅ Automatic session cleanup

## Known Limitations

- ⚠️ Service Worker cache poisoning (mitigated by HTTPS requirement)
- ⚠️ Local storage can be accessed by any JS on the same origin
- ⚠️ G-Code file uploads not scanned for malware (implement on your server)
- ⚠️ WebSocket connections susceptible to DoS (use rate limiting)

## Security Tooling

We use the following tools to maintain security:

- **npm audit**: Vulnerability scanning for Node.js dependencies
- **Snyk**: Continuous security monitoring
- **ESLint**: Security-focused linting rules
- **OWASP ZAP**: Web application security testing (manual)
- **GitHub Dependabot**: Automated dependency updates
- **GitHub CodeQL**: Static code analysis

## Security Checklist for Production

Before deploying to production, ensure:

- [ ] All secrets are in environment variables (not in code)
- [ ] HTTPS is enabled and enforced
- [ ] Database uses SSL connections
- [ ] JWT_SECRET is strong (min 32 random characters)
- [ ] CORS is configured for specific origins (not `*`)
- [ ] Rate limiting is enabled
- [ ] Database backups are automated
- [ ] Logs are monitored for errors and suspicious activity
- [ ] Dependencies are up to date (`npm audit` shows 0 high/critical)
- [ ] CSP headers are configured
- [ ] Security headers are set (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Error messages don't leak sensitive information
- [ ] File upload size limits are enforced
- [ ] Session timeout is reasonable (e.g., 24 hours)

## Bug Bounty Program

**Status**: Not currently available

We appreciate security researchers and may establish a bug bounty program in the future. In the meantime, we're happy to provide acknowledgment in our security advisories.

## Contact

- **Security Email**: security@your-domain.com
- **General Contact**: info@your-domain.com
- **GitHub Security Advisories**: https://github.com/your-org/RPI-CNC-proj/security/advisories

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated**: December 2024  
**Version**: 1.0
