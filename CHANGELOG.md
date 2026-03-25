## [Unreleased]

### Added

- **Analytics snippet (CloudRAT-compatible)**: Optional first-party `sessionId` in `localStorage` (key `rat_vid_` + sanitized project id), opt-out via `window.ratAnalyticsDisableStorage`, `window.ratTrack()` for custom events, delegated `data-rat-track` clicks, `window.ratDebug`, guarded SPA hooks (`pushState` / `replaceState` / `popstate` with delayed re-patch), and `fetch` with `keepalive: true` plus `X-API-Key` (no API key in JSON body from the snippet).
- **`POST /track`**: Accepts `sessionId` (32 hex), `event` (defaults to `pageview`), `eventTarget`, `eventData`; persists `event`, `event_target`, `event_data` on `analytics` rows. Invalid `sessionId` values are ignored.
- **Dashboard stats**: Page views, top pages, and referrers count only `pageview` rows (`event` null or `pageview`) so clicks/custom events do not inflate headline metrics.

### Changed

- **`GET /snippet/analytics.js`**: Served from `snippet/analytics.js` on disk with the default track URL replaced for the current host (single source of truth).
- **Session storage**: Server no longer invents a per-request `session_id` when the client omits a valid id (allows null for storage-opt-out visitors).

## [1.1.1] - 2024-03-17

### Added

- **SEO Optimization**: Added meta tags, Open Graph, Twitter Cards, and structured data
- **Sitemap & Robots.txt**: Auto-generated sitemap.xml and robots.txt for search engines
- **GitHub Actions CI/CD**: Automated testing and Docker builds
- **Professional Documentation**: Enhanced README with badges, comprehensive guides, and API docs
- **Issue Templates**: Bug report and feature request templates
- **Code of Conduct**: Community guidelines and standards
- **Security Policy**: Vulnerability reporting and security best practices
- **ESLint Configuration**: Code linting and style consistency
- **Enhanced .gitignore**: Comprehensive ignore patterns for professional development
- **Funding Support**: GitHub Sponsors integration

### Changed

- **Package.json**: Professional metadata, funding, and enhanced scripts
- **Branding**: Updated from "Rat Analytics" to "Real Analytics Tracker (RAT)"
- **Documentation**: Complete rewrite with SEO-friendly content and better structure

### Security

- Added security policy and vulnerability reporting process
- Enhanced .gitignore to prevent accidental secret commits

## [1.1.0] - 2024-03-17

### Added

- **Project-based analytics**: Analytics are now organized by projects
- **User authentication**: Login/logout system with session management
- **User management**: Admin users can create and manage other users
- **Project sharing**: Share projects with other users (view/admin permissions)
- **Role-based access control**: Admin and viewer roles with different permissions
- **Enhanced dashboard**: Tabbed interface for analytics, projects, and user management
- **Password management**: Users can change their passwords
- **Database migrations**: Automatic database schema updates
- **Security improvements**: Bcrypt password hashing, session-based auth

### Changed

- **Database schema**: Added users, projects, and shares tables
- **Analytics tracking**: Now requires project ID for data collection
- **Dashboard UI**: Complete redesign with authentication and project management
- **API endpoints**: Updated to support projects and authentication

### Security

- Added user authentication and authorization
- Password hashing with bcrypt
- Session-based security
- Role-based access control

### Features

- Lightweight JavaScript snippet (non-blocking)
- RESTful API for data collection
- Simple web dashboard
- CORS enabled for cross-origin requests
- Basic data validation
