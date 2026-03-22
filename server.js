#!/usr/bin/env node

/**
 * RAT Analytics - Privacy-First Analytics Platform
 *
 * A lightweight, self-hosted analytics solution that prioritizes user privacy
 * while providing valuable insights for website owners.
 *
 * Features:
 * - No cookies or personal identifiers
 * - Minimal data collection (URL, referrer, user agent)
 * - Project-based organization
 * - User authentication and authorization
 * - RESTful API
 * - Docker-ready deployment
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Security and utility middleware
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'analytics.db');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// Validate required environment variables
if (!SESSION_SECRET) {
  console.error('❌ SESSION_SECRET environment variable is required for security');
  console.error('Please set: export SESSION_SECRET="your-secure-random-string"');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Security middleware - applied first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit analytics endpoint to 10 requests per minute per IP
  message: 'Analytics rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/track', analyticsLimiter);
app.use('/api/', limiter);

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session configuration
app.use(session({
  name: 'rat_session',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  rolling: true // Reset expiration on activity
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
let db;
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure database directory exists
    const dbDir = path.dirname(DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Connected to SQLite database');

      // Create tables
      db.serialize(() => {
        // Users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL CHECK(length(username) >= 3 AND length(username) <= 50),
            email TEXT UNIQUE CHECK(length(email) <= 255),
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating users table:', err.message);
            reject(err);
            return;
          }
        });

        // Projects table
        db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK(length(name) >= 1 AND length(name) <= 100),
            description TEXT CHECK(length(description) <= 500),
            owner_id INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating projects table:', err.message);
            reject(err);
            return;
          }
        });

        // Project shares table
        db.run(`
          CREATE TABLE IF NOT EXISTS project_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            permission TEXT NOT NULL DEFAULT 'view' CHECK(permission IN ('view', 'admin')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating project_shares table:', err.message);
            reject(err);
            return;
          }
        });

        // Analytics data table - privacy-focused
        db.run(`
          CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            url TEXT NOT NULL CHECK(length(url) <= 2000),
            referrer TEXT CHECK(length(referrer) <= 2000),
            user_agent TEXT CHECK(length(user_agent) <= 500),
            ip_hash TEXT, -- Hashed IP for geography (optional)
            session_id TEXT, -- Anonymous session identifier
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating analytics table:', err.message);
            reject(err);
            return;
          }

          // Create indexes for performance
          db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_project_timestamp ON analytics(project_id, timestamp)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics(session_id)`);

          console.log('✅ Database schema initialized');
          resolve();
        });
      });
    });
  });
}

// Input validation and sanitization functions
function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[<>\"'&]/g, '');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function hashIP(ip) {
  // Optional: Hash IP for anonymous geography insights
  if (!ip || ip === '::1' || ip === '127.0.0.1') return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Middleware: Require authentication
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
}

// Middleware: Require admin role
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

// Middleware: Check project access
function requireProjectAccess(req, res, next) {
  const projectId = parseInt(req.params.projectId);
  const userId = req.session.userId;

  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project ID'
    });
  }

  // Check if user owns the project or has access
  db.get(`
    SELECT p.id FROM projects p
    LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.user_id = ?
    WHERE p.id = ? AND p.is_active = 1 AND (p.owner_id = ? OR ps.permission IS NOT NULL)
  `, [userId, projectId, userId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    if (!row) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }

    req.projectId = projectId;
    next();
  });
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Analytics tracking endpoint (public)
app.post('/track', (req, res) => {
  const { projectId, url, referrer, userAgent } = req.body;

  // Validate required fields
  if (!projectId || !url) {
    return res.status(400).json({
      success: false,
      message: 'projectId and url are required'
    });
  }

  const projectIdNum = parseInt(projectId);
  if (isNaN(projectIdNum) || projectIdNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid projectId'
    });
  }

  // Sanitize inputs
  const cleanUrl = sanitizeString(url, 2000);
  const cleanReferrer = referrer ? sanitizeString(referrer, 2000) : null;
  const cleanUserAgent = userAgent ? sanitizeString(userAgent, 500) : null;

  // Verify project exists and is active
  db.get('SELECT id FROM projects WHERE id = ? AND is_active = 1', [projectIdNum], (err, project) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Generate anonymous session ID if not provided
    const sessionId = req.body.sessionId || generateSessionId();
    const ipHash = hashIP(req.ip);

    // Insert analytics data
    db.run(`
      INSERT INTO analytics (project_id, url, referrer, user_agent, ip_hash, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectIdNum, cleanUrl, cleanReferrer, cleanUserAgent, ipHash, sessionId], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to record analytics data'
        });
      }

      res.json({
        success: true,
        message: 'Analytics data recorded',
        id: this.lastID
      });
    });
  });
});

// Get analytics script (industry-standard: DNT, no cookies/localStorage, sendBeacon)
app.get('/snippet/analytics.js', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const trackEndpoint = `${baseUrl}/track`;

  const script = `(function() {
  'use strict';
  // RAT Analytics - Privacy-First, Open-Source
  // No cookies, no localStorage, no persistent identifiers. Respects DNT.

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  var projectId = window.ratAnalyticsProjectId;
  if (!projectId) {
    var meta = document.querySelector('meta[name="rat-analytics-project"]');
    if (meta) projectId = meta.getAttribute('content');
  }
  if (!projectId) {
    var m = document.querySelector('meta[name="rat-project-id"]');
    if (m) projectId = m.getAttribute('content');
  }
  if (!projectId) {
    console.warn('RAT: Set window.ratAnalyticsProjectId or <meta name="rat-analytics-project" content="YOUR_PROJECT_ID">');
    return;
  }

  var endpoint = '${trackEndpoint}';
  var data = {
    projectId: projectId,
    url: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent
  };
  var payload = JSON.stringify(data);

  function send() {
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))) return;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {});
  }

  send();

  if (typeof window.history !== 'undefined' && typeof window.history.pushState === 'function') {
    var orig = history.pushState;
    history.pushState = function() { orig.apply(this, arguments); setTimeout(send, 0); };
    window.addEventListener('popstate', function() { setTimeout(send, 0); });
  }
})();
`;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(script);
});

// Authentication routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  const cleanUsername = sanitizeString(username, 50);

  db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [cleanUsername], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    bcrypt.compare(password, user.password_hash, (err, isValid) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({
          success: false,
          message: 'Authentication error'
        });
      }

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  });
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout error'
      });
    }

    res.clearCookie('rat_session');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    }
  });
});

// User management (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  db.all(`
    SELECT id, username, email, role, is_active, created_at, last_login
    FROM users
    ORDER BY created_at DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    res.json({
      success: true,
      users: rows
    });
  });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  const cleanUsername = sanitizeString(username, 50);
  const cleanEmail = email ? sanitizeString(email, 255) : null;

  if (cleanUsername !== username || cleanUsername.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username must be 3-50 characters and contain only valid characters'
    });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
    });
  }

  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role'
    });
  }

  // Hash password
  bcrypt.hash(password, 12, (err, hash) => {
    if (err) {
      console.error('Password hashing error:', err);
      return res.status(500).json({
        success: false,
        message: 'Password processing error'
      });
    }

    // Insert user
    db.run(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [cleanUsername, cleanEmail, hash, role], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({
            success: false,
            message: 'Username or email already exists'
          });
        }
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId: this.lastID
      });
    });
  });
});

// Project management
app.get('/api/projects', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(`
    SELECT
      p.id, p.name, p.description, p.created_at, p.updated_at,
      u.username as owner_username,
      CASE WHEN p.owner_id = ? THEN 'owner' ELSE ps.permission END as access_level
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.user_id = ?
    WHERE p.is_active = 1 AND (p.owner_id = ? OR ps.permission IS NOT NULL)
    ORDER BY p.created_at DESC
  `, [userId, userId, userId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    res.json({
      success: true,
      projects: rows
    });
  });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, description } = req.body;
  const userId = req.session.userId;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required'
    });
  }

  const cleanName = sanitizeString(name, 100);
  const cleanDescription = description ? sanitizeString(description, 500) : null;

  if (cleanName !== name || cleanName.length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project name'
    });
  }

  db.run(`
    INSERT INTO projects (name, description, owner_id)
    VALUES (?, ?, ?)
  `, [cleanName, cleanDescription, userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        id: this.lastID,
        name: cleanName,
        description: cleanDescription,
        owner_id: userId
      }
    });
  });
});

// Analytics data retrieval
app.get('/api/stats/:projectId', requireAuth, requireProjectAccess, (req, res) => {
  const projectId = req.projectId;
  const { period = '30' } = req.query; // days

  const days = parseInt(period);
  if (isNaN(days) || days < 1 || days > 365) {
    return res.status(400).json({
      success: false,
      message: 'Invalid period (1-365 days)'
    });
  }

  // Get summary statistics
  db.get(`
    SELECT
      COUNT(*) as total_views,
      COUNT(DISTINCT url) as unique_pages,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(DISTINCT ip_hash) as unique_visitors
    FROM analytics
    WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days')
  `, [projectId], (err, summary) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    // Get top pages
    db.all(`
      SELECT
        url,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics
      WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days')
      GROUP BY url
      ORDER BY views DESC
      LIMIT 20
    `, [projectId], (err, topPages) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      // Get referrer data
      db.all(`
        SELECT
          referrer,
          COUNT(*) as count
        FROM analytics
        WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days') AND referrer IS NOT NULL
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 10
      `, [projectId], (err, referrers) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          period: `${days} days`,
          summary,
          topPages,
          referrers
        });
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const message = NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    success: false,
    message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down RAT Analytics...');

  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 RAT Analytics server running on port ${PORT}`);
      console.log(`📊 Privacy-first analytics platform`);
      console.log(`🔒 Security: ${NODE_ENV === 'production' ? 'Production mode' : 'Development mode'}`);
      console.log(`📁 Database: ${DATABASE_PATH}`);
      console.log(`🌐 Access dashboard at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Updated page_views table
  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Shares table for sharing projects
  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      permissions TEXT DEFAULT 'view' CHECK (permissions IN ('view', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )
  `);

  // Create default admin user only if no users exist and SETUP_ADMIN is true
  if (process.env.SETUP_ADMIN === 'true') {
    db.get('SELECT COUNT(*) as count FROM users', [], (err, result) => {
      if (!err && result.count === 0) {
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;

        if (defaultPassword) {
          const saltRounds = 10;
          bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
            if (err) {
              console.error('Error hashing default admin password:', err);
            } else {
              db.run(`
                INSERT INTO users (username, password_hash, role)
                VALUES (?, ?, 'admin')
              `, [defaultUsername, hash], (err) => {
                if (err) {
                  console.error('Error creating default admin user:', err);
                } else {
                  console.log('Default admin user created. Please change the password after first login.');
                }
              });
            }
          });
        }
      }
    });
  }
});

// Input validation and sanitization
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[<>'"&]/g, '');
}

function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Login routes
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = sanitizeString(username, 50);
  if (cleanUsername !== username) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  db.get('SELECT id, username, password_hash, role FROM users WHERE username = ?', [cleanUsername], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Authentication service temporarily unavailable' });
    }

    if (!user) {
      // Don't reveal if username exists or not for security
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Authentication service temporarily unavailable' });
      }

      if (result) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        res.json({ success: true, user: { username: user.username, role: user.role } });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Protected routes
app.post('/track', (req, res) => {
  const { projectId, url, referrer, userAgent } = req.body;

  // Comprehensive validation
  if (!projectId || !url) {
    return res.status(400).json({ error: 'Project ID and URL are required' });
  }

  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum) || projectIdNum <= 0) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (!validateUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const cleanUrl = sanitizeString(url, 2000);
  const cleanReferrer = referrer ? sanitizeString(referrer, 2000) : '';
  const cleanUserAgent = userAgent ? sanitizeString(userAgent, 500) : '';

  // Get client IP (handle proxy headers)
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   'unknown';

  // Check if project exists
  db.get('SELECT id FROM projects WHERE id = ?', [projectIdNum], (err, project) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Tracking service temporarily unavailable' });
    }

    if (!project) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Insert data with prepared statement
    const stmt = db.prepare(`
      INSERT INTO page_views (project_id, url, referrer, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(projectIdNum, cleanUrl, cleanReferrer, cleanUserAgent, clientIP, (err) => {
      stmt.finalize();
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to record analytics data' });
      }
      res.status(200).json({ success: true });
    });
  });
});

app.get('/api/projects', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const role = req.session.role;

  let query;
  let params;

  if (role === 'admin') {
    query = 'SELECT * FROM projects ORDER BY created_at DESC';
    params = [];
  } else {
    query = `
      SELECT p.* FROM projects p
      LEFT JOIN shares s ON p.id = s.project_id AND s.user_id = ?
      WHERE p.owner_id = ? OR s.user_id IS NOT NULL
      ORDER BY p.created_at DESC
    `;
    params = [userId, userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
    res.json(rows);
  });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name } = req.body;
  const ownerId = req.session.userId;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const stmt = db.prepare('INSERT INTO projects (name, owner_id) VALUES (?, ?)');
  stmt.run(name, ownerId, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to create project' });
    }
    res.json({ id: this.lastID, name, owner_id: ownerId });
  });
  stmt.finalize();
});

app.get('/api/stats/:projectId', requireAuth, (req, res) => {
  const projectId = req.params.projectId;
  const userId = req.session.userId;
  const role = req.session.role;

  // Check access
  if (role !== 'admin') {
    db.get(`
      SELECT 1 FROM projects p
      LEFT JOIN shares s ON p.id = s.project_id AND s.user_id = ?
      WHERE p.id = ? AND (p.owner_id = ? OR s.user_id IS NOT NULL)
    `, [userId, projectId, userId], (err, result) => {
      if (err || !result) {
        return res.status(403).json({ error: 'Access denied' });
      }
      getStats();
    });
  } else {
    getStats();
  }

  function getStats() {
    const query = `
      SELECT
        COUNT(*) as total_views,
        COUNT(DISTINCT url) as unique_pages,
        url,
        COUNT(url) as views_per_page
      FROM page_views
      WHERE project_id = ?
      GROUP BY url
      ORDER BY views_per_page DESC
      LIMIT 10
    `;

    db.all(query, [projectId], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      res.json(rows);
    });
  }
});

// User management (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = sanitizeString(username, 50);
  if (cleanUsername !== username || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be 3-50 characters and contain only valid characters' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
    });
  }

  if (role && !['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin or viewer' });
  }

  const userRole = role || 'viewer';

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Password hashing error:', err);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    stmt.run(cleanUsername, hash, userRole, function(err) {
      stmt.finalize();
      if (err) {
        console.error('Database error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user account' });
      }
      res.status(201).json({
        id: this.lastID,
        username: cleanUsername,
        role: userRole
      });
    });
  });
});

app.put('/api/users/:id/password', requireAuth, (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  // Users can only change their own password, or admins can change any
  if (req.session.userId != userId && req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters with uppercase, lowercase, and number'
    });
  }

  // Verify current password
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Password change service temporarily unavailable' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    bcrypt.compare(currentPassword, user.password_hash, (err, result) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Password change service temporarily unavailable' });
      }

      if (!result) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      const saltRounds = 10;
      bcrypt.hash(newPassword, saltRounds, (err, hash) => {
        if (err) {
          console.error('Password hashing error:', err);
          return res.status(500).json({ error: 'Failed to update password' });
        }

        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update password' });
          }
          res.json({ success: true, message: 'Password updated successfully' });
        });
      });
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  db.get('SELECT 1', [], (err) => {
    if (err) {
      return res.status(503).json({ status: 'error', database: 'unhealthy' });
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.1.1'
    });
  });
});

// Sharing
app.post('/api/projects/:projectId/share', requireAuth, (req, res) => {
  const projectId = req.params.projectId;
  const { userId, permissions } = req.body;
  const ownerId = req.session.userId;

  // Check if user owns the project or is admin
  db.get('SELECT owner_id FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!project || (project.owner_id != ownerId && req.session.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO shares (project_id, user_id, permissions) VALUES (?, ?, ?)');
    stmt.run(projectId, userId, permissions || 'view', (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to share project' });
      }
      res.json({ success: true });
    });
    stmt.finalize();
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role
  });
});

// SEO routes
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

});

// SEO routes
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.listen(PORT, () => {
  console.log(`Analytics server running on port ${PORT}`);
  console.log('🐀 RAT Analytics - Open-source edition');
  console.log('📊 Privacy-first analytics platform');
});

module.exports = app;