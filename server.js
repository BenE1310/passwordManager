const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS (open for now, secure it in production)
app.use(cors());
app.use(express.json());

// Serve static files from the Vite-built frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Serve static data folder (JSON files)
app.use('/data', express.static(path.join(__dirname, 'data')));

// Initialize the files if they don't exist
async function initializeFiles() {
  const passwordsPath = path.join(__dirname, 'data', 'stored_passwords.json');
  const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');

  try {
    await fs.access(passwordsPath).catch(async () => {
      await fs.writeFile(passwordsPath, JSON.stringify({ passwords: [] }, null, 2), 'utf8');
      console.log('🟢 Created stored_passwords.json');
    });

    await fs.access(adminsPath).catch(async () => {
      const defaultAdmins = {
        admins: [
          {
            username: 'admin',
            password: 'admin',
            role: 'administrator'
          }
        ]
      };
      await fs.writeFile(adminsPath, JSON.stringify(defaultAdmins, null, 2), 'utf8');
      console.log('🟢 Created admin_credentials.json');
    });
  } catch (error) {
    console.error('🔴 File initialization error:', error);
  }
}
initializeFiles();

// === Auth login ===
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');
    const { admins } = JSON.parse(await fs.readFile(adminsPath, 'utf8'));

    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
      res.json({
        success: true,
        user: { username: admin.username, role: admin.role }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('🔴 Login error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// === Update admin credentials ===
app.post('/api/auth/update-credentials', async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;
    const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');
    const data = JSON.parse(await fs.readFile(adminsPath, 'utf8'));

    const admin = data.admins.find(
      a => a.username === currentUsername && a.password === currentPassword
    );
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid current credentials' });
    }

    admin.username = newUsername;
    admin.password = newPassword;

    await fs.writeFile(adminsPath, JSON.stringify(data, null, 2), 'utf8');
    res.json({
      success: true,
      message: 'Credentials updated',
      user: { username: newUsername, role: admin.role }
    });
  } catch (error) {
    console.error('🔴 Update error:', error);
    res.status(500).json({ success: false, message: 'Credential update error' });
  }
});

// === Get stored passwords ===
app.get('/data/stored_passwords.json', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'stored_passwords.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('🔴 Read passwords error:', error);
    res.status(500).json({ error: 'Failed to read passwords' });
  }
});

// === Save updated passwords ===
app.post('/api/save-passwords', async (req, res) => {
  try {
    const { passwords } = req.body;
    if (!Array.isArray(passwords)) {
      return res.status(400).json({ error: 'Invalid passwords array' });
    }

    const filePath = path.join(__dirname, 'data', 'stored_passwords.json');
    await fs.writeFile(filePath, JSON.stringify({ passwords }, null, 2), 'utf8');
    res.json({ success: true, message: `Saved ${passwords.length} passwords` });
  } catch (error) {
    console.error('🔴 Save passwords error:', error);
    res.status(500).json({ error: 'Failed to save passwords' });
  }
});

// === React fallback for React Router ===
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// === Start the server ===
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
