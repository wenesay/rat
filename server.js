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
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

// Validate required environment variables
if (!SESSION_SECRET) {
  console.error('❌ SESSION_SECRET environment variable is required for security');
  console.error('Please set: export SESSION_SECRET="your-secure-random-string"');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Security middleware - applied first
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);

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
app.use(
  session({
    name: 'rat_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
    rolling: true, // Reset expiration on activity
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
let db;
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure database directory exists (skip for :memory:)
    if (DATABASE_PATH !== ':memory:') {
      const dbDir = path.dirname(DATABASE_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
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
        db.run(
          `
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
        `,
          (err) => {
            if (err) {
              console.error('❌ Error creating users table:', err.message);
              reject(err);
              return;
            }
          }
        );

        // Projects table
        db.run(
          `
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK(length(name) >= 1 AND length(name) <= 100),
            description TEXT CHECK(length(description) <= 500),
            owner_id INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            api_key TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `,
          (err) => {
            if (err) {
              console.error('❌ Error creating projects table:', err.message);
              reject(err);
              return;
            }
            // Migration: add api_key for existing DBs
            db.run('ALTER TABLE projects ADD COLUMN api_key TEXT UNIQUE', () => {});
          }
        );

        // Project shares table
        db.run(
          `
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
        `,
          (err) => {
            if (err) {
              console.error('❌ Error creating project_shares table:', err.message);
              reject(err);
              return;
            }
          }
        );

        // Analytics data table - privacy-focused
        db.run(
          `
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
        `,
          (err) => {
            if (err) {
              console.error('❌ Error creating analytics table:', err.message);
              reject(err);
              return;
            }

            // Create indexes for performance
            db.run(
              'CREATE INDEX IF NOT EXISTS idx_analytics_project_timestamp ON analytics(project_id, timestamp)'
            );
            db.run('CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics(session_id)');

            // Test seed: create user and project for /track tests
            if (NODE_ENV === 'test') {
              bcrypt.hash('Test1234!', 10, (hashErr, hash) => {
                if (hashErr) return resolve();
                db.run(
                  "INSERT OR IGNORE INTO users (id, username, password_hash, role, is_active) VALUES (1, 'testadmin', ?, 'admin', 1)",
                  [hash],
                  () => {
                    db.run(
                      "INSERT OR IGNORE INTO projects (id, name, owner_id, is_active, api_key) VALUES (1, 'Test Project', 1, 1, 'test-api-key-12345')",
                      () => {
                        console.log('✅ Database schema initialized (test mode)');
                        resolve();
                      }
                    );
                  }
                );
              });
            } else {
              console.log('✅ Database schema initialized');
              resolve();
            }
          }
        );
      });
    });
  });
}

// Input validation and sanitization functions
function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>"'&]/g, '');
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

function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
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
      message: 'Authentication required',
    });
  }
  next();
}

// Middleware: Require admin role
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
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
      message: 'Invalid project ID',
    });
  }

  // Check if user owns the project or has access
  db.get(
    `
    SELECT p.id FROM projects p
    LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.user_id = ?
    WHERE p.id = ? AND p.is_active = 1 AND (p.owner_id = ? OR ps.permission IS NOT NULL)
  `,
    [userId, projectId, userId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      if (!row) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project',
        });
      }

      req.projectId = projectId;
      next();
    }
  );
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Analytics tracking endpoint (public)
app.post('/track', (req, res) => {
  const { projectId, url, referrer, userAgent, apiKey: bodyApiKey } = req.body;
  const apiKey = req.headers['x-api-key'] || bodyApiKey;

  // Resolve project: X-API-Key header takes precedence over projectId in body
  const resolveProject = (callback) => {
    if (apiKey) {
      db.get(
        'SELECT id FROM projects WHERE api_key = ? AND is_active = 1',
        [apiKey],
        (err, project) => {
          if (err) return callback(err, null);
          callback(null, project ? project.id : null);
        }
      );
    } else if (projectId) {
      const projectIdNum = parseInt(projectId);
      if (isNaN(projectIdNum) || projectIdNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid projectId',
        });
      }
      db.get(
        'SELECT id FROM projects WHERE id = ? AND is_active = 1',
        [projectIdNum],
        (err, project) => {
          if (err) return callback(err, null);
          callback(null, project ? project.id : null);
        }
      );
    } else {
      callback(null, null);
    }
  };

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'url is required',
    });
  }

  if (!validateUrl(url)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid url format',
    });
  }

  if (!apiKey && !projectId) {
    return res.status(400).json({
      success: false,
      message: 'projectId or X-API-Key header is required',
    });
  }

  // Sanitize inputs
  const cleanUrl = sanitizeString(url, 2000);
  const cleanReferrer = referrer ? sanitizeString(referrer, 2000) : null;
  const cleanUserAgent = userAgent ? sanitizeString(userAgent, 500) : null;

  resolveProject((err, projectIdNum) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
      });
    }

    if (!projectIdNum) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Generate anonymous session ID if not provided
    const sessionId = req.body.sessionId || generateSessionId();
    const ipHash = hashIP(req.ip);

    // Insert analytics data
    db.run(
      `
      INSERT INTO analytics (project_id, url, referrer, user_agent, ip_hash, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [projectIdNum, cleanUrl, cleanReferrer, cleanUserAgent, ipHash, sessionId],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to record analytics data',
          });
        }

        res.json({
          success: true,
          message: 'Analytics data recorded',
          id: this.lastID,
        });
      }
    );
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

  var endpoint = window.ratAnalyticsEndpoint || '${trackEndpoint}';
  var apiKey = window.ratAnalyticsApiKey;
  var data = {
    projectId: projectId,
    url: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent
  };
  if (apiKey) data.apiKey = apiKey;
  var payload = JSON.stringify(data);

  function send() {
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (navigator.sendBeacon && !apiKey) {
      if (navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))) return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: headers,
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
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required',
    });
  }

  const cleanUsername = sanitizeString(username, 50);

  db.get(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [cleanUsername],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      bcrypt.compare(password, user.password_hash, (err, isValid) => {
        if (err) {
          console.error('Password comparison error:', err);
          return res.status(500).json({
            success: false,
            message: 'Authentication error',
          });
        }

        if (!isValid) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
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
            role: user.role,
          },
        });
      });
    }
  );
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout error',
      });
    }

    res.clearCookie('rat_session');
    res.json({
      success: true,
      message: 'Logout successful',
    });
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
    },
  });
});

// User management (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  db.all(
    `
    SELECT id, username, email, role, is_active, created_at, last_login
    FROM users
    ORDER BY created_at DESC
  `,
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      res.json({
        success: true,
        users: rows,
      });
    }
  );
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required',
    });
  }

  const cleanUsername = sanitizeString(username, 50);
  const cleanEmail = email ? sanitizeString(email, 255) : null;

  if (cleanUsername !== username || cleanUsername.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username must be 3-50 characters and contain only valid characters',
    });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
    });
  }

  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role',
    });
  }

  // Hash password
  bcrypt.hash(password, 12, (err, hash) => {
    if (err) {
      console.error('Password hashing error:', err);
      return res.status(500).json({
        success: false,
        message: 'Password processing error',
      });
    }

    // Insert user
    db.run(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `,
      [cleanUsername, cleanEmail, hash, role],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
              success: false,
              message: 'Username or email already exists',
            });
          }
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error',
          });
        }

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          userId: this.lastID,
        });
      }
    );
  });
});

// Project management
app.get('/api/projects', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    `
    SELECT
      p.id, p.name, p.description, p.api_key, p.created_at, p.updated_at,
      u.username as owner_username,
      CASE WHEN p.owner_id = ? THEN 'owner' ELSE ps.permission END as access_level
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_shares ps ON p.id = ps.project_id AND ps.user_id = ?
    WHERE p.is_active = 1 AND (p.owner_id = ? OR ps.permission IS NOT NULL)
    ORDER BY p.created_at DESC
  `,
    [userId, userId, userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      res.json({
        success: true,
        projects: rows,
      });
    }
  );
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, description } = req.body;
  const userId = req.session.userId;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required',
    });
  }

  const cleanName = sanitizeString(name, 100);
  const cleanDescription = description ? sanitizeString(description, 500) : null;

  if (cleanName !== name || cleanName.length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project name',
    });
  }

  const apiKey = crypto.randomBytes(32).toString('hex');
  db.run(
    `
    INSERT INTO projects (name, description, owner_id, api_key)
    VALUES (?, ?, ?, ?)
  `,
    [cleanName, cleanDescription, userId, apiKey],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project: {
          id: this.lastID,
          name: cleanName,
          description: cleanDescription,
          owner_id: userId,
          api_key: apiKey,
        },
      });
    }
  );
});

// Analytics data retrieval
app.get('/api/stats/:projectId', requireAuth, requireProjectAccess, (req, res) => {
  const projectId = req.projectId;
  const { period = '30' } = req.query; // days

  const days = parseInt(period);
  if (isNaN(days) || days < 1 || days > 365) {
    return res.status(400).json({
      success: false,
      message: 'Invalid period (1-365 days)',
    });
  }

  // Get summary statistics
  db.get(
    `
    SELECT
      COUNT(*) as total_views,
      COUNT(DISTINCT url) as unique_pages,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(DISTINCT ip_hash) as unique_visitors
    FROM analytics
    WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days')
  `,
    [projectId],
    (err, summary) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
        });
      }

      // Get top pages
      db.all(
        `
      SELECT
        url,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics
      WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days')
      GROUP BY url
      ORDER BY views DESC
      LIMIT 20
    `,
        [projectId],
        (err, topPages) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Database error',
            });
          }

          // Get referrer data
          db.all(
            `
        SELECT
          referrer,
          COUNT(*) as count
        FROM analytics
        WHERE project_id = ? AND timestamp >= datetime('now', '-${days} days') AND referrer IS NOT NULL
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 10
      `,
            [projectId],
            (err, referrers) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Database error',
                });
              }

              res.json({
                success: true,
                period: `${days} days`,
                summary,
                topPages,
                referrers,
              });
            }
          );
        }
      );
    }
  );
});

// Change password
app.put('/api/users/:id/password', requireAuth, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const userId = req.session.userId;
  const { currentPassword, newPassword } = req.body;

  if (req.session.role !== 'admin' && targetUserId !== userId) {
    return res.status(403).json({ error: 'Cannot change another user password' });
  }
  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }
  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters with uppercase, lowercase, and number',
    });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [targetUserId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isAdminChangingOther = req.session.role === 'admin' && targetUserId !== userId;
    if (isAdminChangingOther) {
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetUserId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to update password' });
          res.json({ success: true });
        });
      });
      return;
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    bcrypt.compare(currentPassword, user.password_hash, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetUserId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to update password' });
          res.json({ success: true });
        });
      });
    });
  });
});

// Share project
app.post('/api/projects/:projectId/share', requireAuth, (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { userId: targetUserId, permission } = req.body;
  const ownerId = req.session.userId;

  if (!projectId || !targetUserId) {
    return res.status(400).json({
      success: false,
      message: 'projectId and userId are required',
    });
  }

  db.get(
    'SELECT owner_id FROM projects WHERE id = ? AND is_active = 1',
    [projectId],
    (err, project) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!project || (project.owner_id !== ownerId && req.session.role !== 'admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const perm = permission === 'admin' ? 'admin' : 'view';
      db.run(
        'INSERT OR REPLACE INTO project_shares (project_id, user_id, permission) VALUES (?, ?, ?)',
        [projectId, targetUserId, perm],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to share project' });
          }
          res.json({ success: true });
        }
      );
    }
  );
});

// SEO
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

// Error handling middleware (next required by Express signature)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const message = NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(500).json({
    success: false,
    message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
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

// Start server (skip listen in test mode for supertest)
async function startServer() {
  try {
    await initializeDatabase();
    if (NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`🚀 RAT Analytics server running on port ${PORT}`);
        console.log('📊 Privacy-first analytics platform');
        console.log(
          `🔒 Security: ${NODE_ENV === 'production' ? 'Production mode' : 'Development mode'}`
        );
        console.log(`📁 Database: ${DATABASE_PATH}`);
        console.log(`🌐 Access dashboard at: http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

const serverReady = startServer();

module.exports = app;
module.exports.ready = serverReady;
