const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
require('dotenv').config({ path: '.env.local' });
const JWT_SECRET = process.env.JWT_SECRET;

const SALT_ROUNDS = 12;

// Database connection
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
  credentials: true,               // Allow cookies to be sent
}));



// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});


// Authentication middleware with single session enforcement
function authenticateToken(req, res, next) {
  const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }

    // Check if session exists in database (single session enforcement)
    db.get(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime("now")',
      [token],
      (err, session) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!session) {
          return res.status(401).json({ error: 'Session expired or invalid.' });
        }

        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
      }
    );
  });
}
  

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Find user
  db.get(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // SINGLE SESSION ENFORCEMENT: Delete existing sessions, then create new session
      db.serialize(() => {
        db.run('DELETE FROM user_sessions WHERE user_id = ?', [user.id], (err) => {
          if (err) {
            console.error('Error deleting existing sessions:', err);
            return res.status(500).json({ error: 'Failed to clear previous sessions.' });
          }

          // Create new session token
          const sessionToken = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' } // Session expires in 24 hours
          );

          // Calculate expiry time (24 hours from now)
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          // Store session in database
          db.run(
            'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
            [user.id, sessionToken, expiresAt.toISOString()],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create session.' });
              }

              // Set HTTP-only cookie
              res.cookie('session_token', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',  // true on HTTPS production, false locally
                maxAge: 24 * 60 * 60 * 1000, 
                sameSite: 'lax',  // change from 'strict' to 'lax' for cross-origin localhost dev
              });
              

              res.json({
                message: 'Login successful',
                user: {
                  id: user.id,
                  username: user.username,
                  email: user.email
                }
              });
            }
          );
        });
      });
    }
  );
});

// Logout endpoint
app.post('/logout', authenticateToken, (req, res) => {
  const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
  
  // Delete session from database
  db.run('DELETE FROM user_sessions WHERE session_token = ?', [token], (err) => {
    if (err) {
      console.error('Error deleting session:', err);
    }
    
    // Clear cookie
    res.clearCookie('session_token');
    res.json({ message: 'Logged out successfully' });
  });
});

// Protected route example
app.get('/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Access granted to protected resource',
    user: {
      id: req.userId,
      username: req.username
    }
  });
});

// Check authentication status
app.get('/auth/status', authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.userId,
      username: req.username
    }
  });
});

app.get('/get', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }
      res.json(rows);
    });
  });
  

// Clean up expired sessions (run periodically)
setInterval(() => {
  db.run('DELETE FROM user_sessions WHERE expires_at < datetime("now")', (err) => {
    if (err) {
      console.error('Error cleaning expired sessions:', err);
    }
  });
}, 60 * 60 * 1000); // Run every hour

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
