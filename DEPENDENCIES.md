# Dependencies

## Overview

RAT uses only open-source dependencies with permissive licenses. All direct dependencies are MIT, BSD, or similarly permissive.

## License Summary

Run `npx license-checker --summary` to see the full breakdown. As of the last check:

- **MIT**: Majority of packages
- **ISC**: Common for Node.js utilities
- **BSD-2-Clause / BSD-3-Clause**: Some low-level packages
- **Apache-2.0**: A few dependencies

## Security

Run `npm audit` to check for known vulnerabilities. Some vulnerabilities may exist in transitive dependencies (e.g., sqlite3's build toolchain). These typically affect the install phase, not runtime. For production:

1. Use `npm audit` regularly
2. Prefer `npm ci` for reproducible installs
3. Keep dependencies updated

## Key Dependencies

| Package            | License | Purpose               |
| ------------------ | ------- | --------------------- |
| express            | MIT     | Web framework         |
| sqlite3            | BSD-3   | Database              |
| bcrypt             | MIT     | Password hashing      |
| express-session    | MIT     | Session management    |
| helmet             | MIT     | Security headers      |
| cors               | MIT     | CORS middleware       |
| express-rate-limit | MIT     | Rate limiting         |
| dotenv             | BSD-2   | Environment variables |

## Updating Dependencies

```bash
npm outdated          # Check for updates
npm update            # Update within semver range
npm audit fix         # Fix vulnerabilities (non-breaking)
npm audit fix --force # Fix all (may introduce breaking changes)
```
