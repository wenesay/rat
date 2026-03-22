const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'analytics.db');
const db = new sqlite3.Database(dbPath);

async function initDemoData() {
  console.log('Initializing demo database...');

  // Create tables
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id)
    )`);

    // Project shares table
    db.run(`CREATE TABLE IF NOT EXISTS project_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      permission TEXT NOT NULL DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(project_id, user_id)
    )`);

    // Analytics table
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id)
    )`);

    // Insert demo users
    const demoUsers = [
      { username: 'admin', password: 'demo123', role: 'admin' },
      { username: 'analyst', password: 'demo123', role: 'viewer' },
    ];

    demoUsers.forEach(async (user) => {
      const hash = await bcrypt.hash(user.password, 10);
      db.run('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
        user.username,
        hash,
        user.role,
      ]);
    });

    // Insert demo projects
    setTimeout(() => {
      db.run('INSERT OR IGNORE INTO projects (name, description, owner_id) VALUES (?, ?, ?)', [
        'Demo Website',
        'Sample analytics project',
        1,
      ]);

      // Insert sample analytics data
      setTimeout(() => {
        const sampleData = [
          {
            project_id: 1,
            url: 'https://demo-site.com/',
            referrer: 'https://google.com',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          {
            project_id: 1,
            url: 'https://demo-site.com/about',
            referrer: 'https://demo-site.com/',
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          {
            project_id: 1,
            url: 'https://demo-site.com/contact',
            referrer: 'https://demo-site.com/about',
            user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          },
          {
            project_id: 1,
            url: 'https://demo-site.com/blog',
            referrer: 'https://reddit.com/r/analytics',
            user_agent:
              'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          },
        ];

        sampleData.forEach((data) => {
          db.run(
            'INSERT OR IGNORE INTO analytics (project_id, url, referrer, user_agent, created_at) VALUES (?, ?, ?, ?, datetime("now", "-" || (RANDOM() % 30) || " days"))',
            [data.project_id, data.url, data.referrer, data.user_agent]
          );
        });
      }, 100);
    }, 100);

    console.log('Demo database initialized successfully!');
    console.log('Demo credentials:');
    console.log('Admin: admin / demo123');
    console.log('Viewer: analyst / demo123');
  });
}

initDemoData().catch(console.error);
