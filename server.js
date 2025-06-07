const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for the Vite development server
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Serve static files from the data directory
app.use('/data', express.static(path.join(__dirname, 'data')));

// Initialize the files if they don't exist
async function initializeFiles() {
  const passwordsPath = path.join(__dirname, 'data', 'stored_passwords.json');
  const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');

  try {
    // Check and initialize passwords file
    try {
      await fs.access(passwordsPath);
      console.log('Password file exists at:', passwordsPath);
    } catch {
      await fs.writeFile(passwordsPath, JSON.stringify({ passwords: [] }, null, 2), 'utf8');
      console.log('Created new password file at:', passwordsPath);
    }

    // Check and initialize admin credentials file
    try {
      await fs.access(adminsPath);
      console.log('Admin credentials file exists at:', adminsPath);
    } catch {
      const defaultAdmins = {
        admins: [{
          username: 'admin',
          password: 'admin',
          role: 'administrator'
        }]
      };
      await fs.writeFile(adminsPath, JSON.stringify(defaultAdmins, null, 2), 'utf8');
      console.log('Created new admin credentials file at:', adminsPath);
    }
  } catch (error) {
    console.error('Error initializing files:', error);
  }
}

// Initialize files when the server starts
initializeFiles();

// Authenticate admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');
    const adminData = await fs.readFile(adminsPath, 'utf8');
    const { admins } = JSON.parse(adminData);

    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
      res.json({ 
        success: true, 
        user: { 
          username: admin.username,
          role: admin.role
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
});

// Update admin credentials
app.post('/api/auth/update-credentials', async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;
    const adminsPath = path.join(__dirname, 'data', 'admin_credentials.json');
    const adminData = await fs.readFile(adminsPath, 'utf8');
    const data = JSON.parse(adminData);

    // Verify current credentials
    const admin = data.admins.find(a => 
      a.username === currentUsername && a.password === currentPassword
    );

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Current credentials are invalid' });
    }

    // Update the credentials
    admin.username = newUsername;
    admin.password = newPassword;

    // Save the updated credentials
    await fs.writeFile(adminsPath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ 
      success: true, 
      message: 'Credentials updated successfully',
      user: {
        username: newUsername,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ success: false, message: 'Server error while updating credentials' });
  }
});

// Get all passwords
app.get('/data/stored_passwords.json', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'stored_passwords.json');
    console.log('Reading passwords from:', filePath);
    const data = await fs.readFile(filePath, 'utf8');
    const parsedData = JSON.parse(data);
    console.log('Successfully read', parsedData.passwords.length, 'passwords');
    res.json(parsedData);
  } catch (error) {
    console.error('Error reading passwords:', error);
    res.status(500).json({ error: 'Failed to read passwords' });
  }
});

// Save passwords
app.post('/api/save-passwords', async (req, res) => {
  try {
    console.log('Received save request with body:', JSON.stringify(req.body, null, 2));
    const { passwords } = req.body;
    if (!Array.isArray(passwords)) {
      console.error('Invalid passwords data received:', passwords);
      return res.status(400).json({ error: 'Invalid passwords data' });
    }

    const filePath = path.join(__dirname, 'data', 'stored_passwords.json');
    console.log('Saving passwords to:', filePath);
    await fs.writeFile(
      filePath,
      JSON.stringify({ passwords }, null, 2),
      'utf8'
    );
    
    console.log(`Successfully saved ${passwords.length} passwords to file`);
    res.json({ success: true, message: `Saved ${passwords.length} passwords` });
  } catch (error) {
    console.error('Error saving passwords:', error);
    res.status(500).json({ error: 'Failed to save passwords' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Data directory:', path.join(__dirname, 'data'));
}); 