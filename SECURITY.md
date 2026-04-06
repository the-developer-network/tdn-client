# Security Policy

## Supported Versions

Only the latest production deployment of TDN is actively maintained and receives security fixes.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue, report it privately:

1. **Email:** send details to the project maintainer (see profile contact).
2. **Include in your report:**
    - A clear description of the vulnerability
    - Steps to reproduce
    - Potential impact
    - Any suggested mitigation (optional)

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days** for critical issues.

## Scope

The following are in scope:

- Authentication and session management flaws
- Cross-site scripting (XSS)
- SQL / NoSQL injection
- Insecure direct object references (IDOR)
- Sensitive data exposure

The following are **out of scope**:

- Volumetric denial-of-service attacks
- Social engineering
- Issues in third-party dependencies that have no published CVE

## Disclosure Policy

Once a fix is deployed we will publish a brief summary in the GitHub Security Advisories tab. We follow a **coordinated disclosure** model — please allow us to patch before publishing details publicly.
