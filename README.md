# Real Analytics Tracker (RAT) 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com/)

> **Real Analytics Tracker (RAT)** — Open-source, privacy-focused, self-hosted web analytics. No cookies, no invasive tracking. GDPR/CCPA friendly.

**RAT** is public, open-source software. Clone, fork, and contribute via pull requests. It is maintained by an individual developer and improved by the community. You self-host RAT on your own infrastructure and retain full control of your data.

## ✨ Features

- 🔒 **Privacy-First**: No cookies, no personal identifiers, no cross-site tracking
- 📊 **Project-Based Analytics**: Organize your analytics by projects with granular access control
- 👥 **Multi-User Support**: Admin and viewer roles with secure authentication
- 🔗 **Project Sharing**: Share analytics access with team members or clients
- ⚡ **Lightweight**: Industry-standard snippet (respects DNT, uses sendBeacon, no cookies/localStorage)
- 🐳 **Easy Deployment**: Docker-ready with SQLite database (no external dependencies)
- 📱 **Responsive Dashboard**: Clean, modern interface for viewing analytics
- 🔐 **Secure**: Password hashing, session management, and role-based access control

## 📜 Legal & Compliance

RAT Analytics is committed to transparency and legal compliance:

- **MIT License**: Open-source software license
- **[Terms and Conditions](TERMS_AND_CONDITIONS.md)**: Service usage terms
- **[Privacy Policy](PRIVACY_POLICY.md)**: Data collection and privacy practices
- **GDPR Compliant**: Designed to comply with EU data protection regulations
- **CCPA Compliant**: California Consumer Privacy Act compliance
- **Self-Hosted**: You control your data and compliance requirements

## 🚀 Getting Started

### Option 1: Self-Hosted (Full Control)

Deploy RAT on your own infrastructure with complete control:

#### Using Docker (Recommended)

```bash
git clone https://github.com/wenesay/rat.git
cd rat
docker-compose up -d
```

#### Manual Installation

```bash
git clone https://github.com/wenesay/rat.git
cd rat
npm install
npm start
```

Access your dashboard at `http://localhost:3000`

**Default credentials:** `admin` / `admin` (change immediately!)

### Option 2: Managed Hosting (Optional)

Prefer zero setup? A managed hosting option may be available separately (e.g., cloudrat.io). This repository contains only the self-hosted open-source software. For managed hosting, refer to that provider's terms and documentation.

## 📋 Table of Contents

- [Features](#-features)
- [Legal & Compliance](#-legal--compliance)
- [Quick Start](#-quick-start)
- [Hosting Options](#-hosting-options)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Deployment Guide](DEPLOYMENT.md)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🛠 Installation

### Prerequisites

- Node.js 14+ and npm
- Docker and Docker Compose (optional, for containerized deployment)

### Step-by-Step Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/wenesay/rat.git
   cd rat
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment** (optional)

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server**

   ```bash
   npm start
   ```

5. **Access the dashboard**
   - Open `http://localhost:3000` in your browser
   - Register a new account or login with existing credentials

### Docker Installation (Recommended)

```bash
git clone https://github.com/wenesay/rat.git
cd rat
docker-compose up -d
```

Access at `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security (Required)
SESSION_SECRET=your-super-secure-random-session-secret-here

# Database
DATABASE_PATH=./analytics.db

# CORS (optional)
ALLOWED_ORIGINS=https://yourdomain.com

# Admin Setup (only for initial setup)
SETUP_ADMIN=true
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=SecurePassword123!
```

**Security Note**: Generate a secure session secret with: `openssl rand -base64 32`

### Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **Rate Limiting**: Prevents abuse of endpoints
- **Input Validation**: Sanitizes all user inputs
- **CORS Protection**: Configurable origin restrictions
- **Helmet Security Headers**: XSS and clickjacking protection

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
git clone https://github.com/wenesay/rat.git
cd rat
docker-compose up -d
```

### Manual Deployment

```bash
# Install dependencies
npm install

# Start production server
npm start
```

### Cloud Deployment Options

RAT can be deployed to any platform supporting Node.js:

- **Railway**: Connect GitHub repo, automatic deployments
- **Render**: Deploy from GitHub with persistent disks
- **Fly.io**: Use included Dockerfile and fly.toml
- **Vercel**: Serverless deployment (requires modifications)
- **Heroku**: Traditional deployment with buildpacks

### Environment Setup

For production deployment, ensure these environment variables are set:

```bash
NODE_ENV=production
SESSION_SECRET=your-secure-secret-here
PORT=3000
```

### Security for Production

- Use HTTPS (required for secure cookies)
- Set strong `SESSION_SECRET`
- Configure `ALLOWED_ORIGINS` for CORS
- Use environment variables, never commit secrets
- Regularly update dependencies
- Monitor logs and set up alerts
- **DigitalOcean App Platform**: Docker-based deployment
- **Heroku**: Traditional PaaS (consider migration)

#### 3. **Cloud Platforms** - Enterprise grade

- **AWS**: EC2 + RDS, Lightsail for simple setups
- **Google Cloud**: App Engine, Cloud Run
- **Azure**: App Service, Container Instances

### Self-Hosting with External Database

#### Supported Databases

- **SQLite**: Default, file-based (perfect for single instances)
- **PostgreSQL**: Production recommended
- **MySQL**: Enterprise environments

#### Configuration

```bash
# Use external PostgreSQL
export DATABASE_URL=postgresql://user:pass@host:5432/rat_db
npm start
```

### Demo Environment

Try before you deploy:

```bash
cd demo
docker-compose -f docker-compose.demo.yml up -d
```

Access at `http://localhost:3000` with pre-populated demo data.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Required
SESSION_SECRET=your-super-secure-random-session-secret-here

# Optional
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_PATH=./analytics.db

# Admin Setup (only for initial setup)
SETUP_ADMIN=true
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=SecurePassword123!
```

**Security Note**: Never commit your `.env` file to version control. Use the provided `.env.example` as a template.

### First-Time Setup

1. Copy `.env.example` to `.env`
2. Generate a secure session secret: `openssl rand -base64 32`
3. Set a strong admin password
4. Run the application

The admin user will be created automatically on first run if `SETUP_ADMIN=true`.

### Security Best Practices

- Use HTTPS in production
- Change default admin credentials immediately
- Use strong, unique passwords
- Regularly update dependencies
- Monitor logs for suspicious activity

## 📖 Usage

### For Website Owners

#### 1. Deploy Your RAT Instance

First, deploy RAT on your own server (see [Quick Start](#-quick-start) above).

#### 2. Register/Login

- Access your RAT dashboard at `http://your-server.com`
- Register a new account or login with existing credentials
- **Default credentials**: `admin` / `admin` (change immediately!)

#### 3. Create a Project

- Navigate to the Projects section in your dashboard
- Click "Create New Project"
- Give your project a name (e.g., "My Website Analytics")

#### 4. Get Your Tracking Code

- In your project dashboard, click "Get Code" or "Tracking Code"
- Copy the provided HTML snippet

#### 5. Add Tracking to Your Website

Include the tracking code in the `<head>` section of your website:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
    <!-- RAT Analytics Tracking Code -->
    <script>
      window.ratAnalyticsProjectId = 'your-project-id-here';
    </script>
    <script src="https://your-rat-server.com/snippet/analytics.js"></script>
  </head>
  <body>
    <!-- Your website content -->
  </body>
</html>
```

**Replace:**

- `your-project-id-here` with your actual project ID
- `https://your-rat-server.com` with your self-hosted RAT server URL

The snippet auto-detects its endpoint from the script URL, respects Do Not Track (DNT), and uses `sendBeacon` for reliable delivery.

**Optional configuration** (set before loading the script):

- **window.ratAnalyticsEndpoint** – Custom track URL. Use when serving the script from a CDN or static host where the endpoint cannot be inferred (e.g. `https://your-rat-server.com/track`).
- **window.ratAnalyticsApiKey** – Project API key. When set, sent with `/track` requests for API-key auth (e.g. for SaaS or proxy setups).

**Integration method:** RAT uses the snippet only. No npm package or SDK is provided. See [API.md](API.md) for the REST API.

### Advanced Usage

#### Custom Event Tracking

Track custom events beyond automatic page views:

```javascript
// Track custom events (if implemented)
if (window.ratAnalytics) {
  window.ratAnalytics.track('button_click', {
    button_id: 'cta_main',
    page: window.location.pathname,
  });
}
```

#### User Identification (Privacy-Compliant)

Identify users without collecting personal data:

```javascript
// Set anonymous user identifier (if implemented)
if (window.ratAnalytics) {
  window.ratAnalytics.identify('anonymous_user_123');
}
```

### Dashboard Features

#### Analytics Overview

- **Real-time Metrics**: Total views, unique visitors, sessions
- **Top Pages**: Most visited pages on your site
- **Traffic Sources**: Referrer analysis
- **Device & Browser Stats**: Technical breakdown

#### Project Management

- **Multiple Projects**: Track different websites or sections
- **Access Control**: Share projects with team members
- **API Keys**: Generate project-specific tracking keys

#### User Management

- **Role-Based Access**: Admin and viewer roles
- **Team Collaboration**: Invite users to projects
- **Secure Authentication**: Password-protected access

### Data Collection Policy

RAT is designed with privacy as the foundation:

#### ✅ What We Collect (Minimal & Anonymous)

- **Page URL**: Current page path (anonymized)
- **Referrer**: Source website (if available)
- **Timestamp**: When the visit occurred
- **Technical Data**: Browser type, screen size, device type
- **Session Data**: Temporary session identifier (not stored long-term)

#### ❌ What We DON'T Collect

- **Personal Information**: No names, emails, or identifiers
- **Cookies**: No tracking cookies or local storage
- **IP Addresses**: Not stored (privacy protection)
- **User Behavior**: No mouse tracking or heatmaps
- **Third-Party Data**: No integration with other tracking services

#### 🔒 Privacy Compliance

- **GDPR Compliant**: Minimal data collection, no personal data
- **CCPA Compliant**: No sale of personal information
- **Self-Hosted**: You control all your data
- **Data Retention**: Configurable retention policies

## 🔌 API Documentation

### Authentication Endpoints

- `POST /login` - User authentication
- `POST /logout` - User logout
- `GET /api/user` - Get current user info
- `POST /register` - User registration

### Analytics Endpoints

- `POST /track` - Record page view (public, requires projectId)
- `GET /api/stats/:projectId` - Get project analytics

### Management Endpoints

- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)

### Public Endpoints

- `GET /snippet/analytics.js` - Analytics tracking script
- `GET /` - Dashboard (requires authentication)
- `GET /login.html` - Login page
- `GET /register.html` - Registration page

## 🔍 SEO & Discoverability

RAT includes built-in SEO optimizations:

- **Meta Tags**: Proper Open Graph and Twitter Card support
- **Sitemap**: Auto-generated sitemap.xml for search engines
- **Robots.txt**: Search engine crawling instructions
- **Structured Data**: JSON-LD for better search understanding

## 🚀 Future Development

### Planned Features

- [ ] Advanced analytics visualizations
- [ ] Custom dashboard themes
- [ ] API rate limiting improvements
- [ ] Enhanced security features
- [ ] Plugin system for custom analytics
- [ ] Export functionality improvements

### Development Setup

```bash
git clone https://github.com/wenesay/rat.git
cd rat
npm install
npm run dev
```

### Testing

```bash
npm test
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/wenesay/rat/wiki)
- 🐛 [Bug Reports](https://github.com/wenesay/rat/issues)
- 💬 [Discussions](https://github.com/wenesay/rat/discussions)

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database powered by [SQLite](https://sqlite.org/)
- Authentication via [express-session](https://github.com/expressjs/session)

---

## 🚀 Ready to Get Started?

```bash
git clone https://github.com/wenesay/rat.git
cd rat
npm install && npm start
```

**[Self-Hosting Guide](DEPLOYMENT.md)**

---

**Open-source • Community contributions welcome** — [Fork and contribute](CONTRIBUTING.md) | [Report issues](https://github.com/wenesay/rat/issues)

⭐ Star this repo if you find it useful!

## Features

- **Privacy-First**: Only collects essential data (URL, referrer, user agent) without cookies or personal identifiers
- **Project-Based**: Organize analytics by projects with granular access control
- **User Management**: Admin users can create accounts and manage permissions
- **Sharing**: Share projects with other users as viewers or admins
- **Lightweight**: Minimal JavaScript snippet that doesn't block page loading
- **Easy Hosting**: Simple Node.js application with SQLite database
- **Minimal Dashboard**: Clean, tabbed interface for viewing analytics and managing projects/users

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:

   ```bash
   git clone https://github.com/wenesay/rat.git
   cd rat
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

The server will run on `http://localhost:3000`.

### Manual Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/wenesay/rat.git
   cd rat
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3000`.

### Integration

1. **Create a Project**: Log into your dashboard and create a new project to get a Project ID.

2. **Add the Snippet**: Include the analytics script on your website with your project ID:

   **Option 1: Global Variable**

   ```html
   <script>
     window.ratAnalyticsProjectId = 'YOUR_PROJECT_ID';
   </script>
   <script src="https://your-domain.com/snippet/analytics.js"></script>
   ```

   **Option 2: Meta Tag**

   ```html
   <meta name="rat-analytics-project" content="YOUR_PROJECT_ID" />
   <script src="https://your-domain.com/snippet/analytics.js"></script>
   ```

**Important**: Before deploying, edit `snippet/analytics.js` and replace `your-analytics-server.com` with your actual domain.

## Data Collected

- **URL**: The current page URL
- **Referrer**: The referring page (if available)
- **User Agent**: Browser information (for technical analysis)
- **Timestamp**: When the page view occurred

No personal data, cookies, or tracking identifiers are collected.

## API Endpoints

### Public Endpoints

- `GET /snippet/analytics.js` - Serves the analytics snippet
- `POST /track` - Receives analytics data (requires projectId)

### Authentication Endpoints

- `GET /login` - Login page
- `POST /login` - Authenticate user
- `POST /logout` - Logout user

### Protected Endpoints (require authentication)

- `GET /api/user` - Get current user info
- `GET /api/projects` - List user's accessible projects
- `POST /api/projects` - Create new project
- `POST /api/projects/:id/share` - Share project with user
- `GET /api/stats/:projectId` - Get analytics for specific project
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id/password` - Change user password

## Dashboard

Visit `http://your-domain.com` to view your analytics dashboard, which shows:

- Total page views
- Number of unique pages
- Top viewed pages

## Deployment

### Docker Deployment

Build and run the Docker container:

```bash
docker build -t rat-analytics .
docker run -p 3000:3000 -v $(pwd)/analytics.db:/app/analytics.db rat-analytics
```

### Cloud Deployment

This application can be deployed to any platform that supports Node.js:

- **Heroku**: Push to Heroku with `git push heroku main`
- **Vercel**: Use Vercel's Node.js runtime
- **Railway**: Connect your GitHub repo
- **Render**: Deploy from GitHub
- **Fly.io**: Use the Dockerfile

### Environment Variables

- `PORT`: Server port (default: 3000)

## 👥 User Management

### User Roles

- **Admin**: Full access to create projects, manage users, view all analytics
- **Viewer**: Can view analytics for assigned projects only

### Registration & Authentication

- **Self-Registration**: Users can register accounts through `/register.html`
- **Secure Login**: Session-based authentication with secure cookies
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Automatic logout on inactivity

### Admin Features

Admin users can:

- Create and manage user accounts
- View all projects and analytics
- Access user management dashboard
- Change their own password and profile

### Default Setup

On first run, if `SETUP_ADMIN=true` in environment:

- Creates default admin user
- Allows initial configuration
- Should be disabled after setup

**Important**: Change default credentials immediately!

### Database

By default, uses SQLite (`analytics.db`). To use a different database:

1. Modify `server.js` to connect to your preferred database
2. Update the schema creation and queries accordingly

### Server Configuration

Set the `PORT` environment variable to change the default port (3000).

## Development

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## 🔒 Security Considerations

### Built-in Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Security**: HTTP-only, secure cookies with configurable settings
- **Rate Limiting**: Prevents brute force and abuse
- **Input Validation**: Comprehensive validation and sanitization
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js provides XSS and clickjacking protection
- **CSRF Protection**: Token-based CSRF prevention
- **SQL Injection Prevention**: Parameterized queries

### Production Security Checklist

- ✅ Use HTTPS in production
- ✅ Set strong, unique `SESSION_SECRET`
- ✅ Configure `ALLOWED_ORIGINS` appropriately
- ✅ Use environment variables for all secrets
- ✅ Regularly update dependencies
- ✅ Monitor logs for suspicious activity
- ✅ Enable rate limiting
- ✅ Use strong passwords
- ✅ Keep backups of the database

### Privacy Compliance

RAT is designed to be privacy-compliant:

- **GDPR/CCPA Ready**: Minimal data collection, no personal identifiers
- **No Cookies**: No tracking cookies or local storage
- **Data Control**: Self-hosted means you control all data
- **Transparency**: Open source code for audit
- **User Consent**: Respects Do Not Track headers

## Privacy & Ethics

This analytics tool is designed with privacy in mind:

- No cookies or local storage
- No cross-site tracking
- Data is stored locally on your server
- Only aggregate statistics are displayed
- Easy to audit and self-host

## License

MIT License - see LICENSE file for details.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## Support

For questions or issues, please open an issue on GitHub.
