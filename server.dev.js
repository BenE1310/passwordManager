const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAuthDb, getPasswordsDb } = require('./mongo');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 chars
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function safeEncrypt(text) {
  if (typeof text !== 'string' || text.includes(':')) {
    return text; // Already encrypted
  }
  return encrypt(text);
}

function safeDecrypt(text) {
  if (typeof text !== 'string' || !text.includes(':')) {
    return text; // Not encrypted
  }
  return decrypt(text);
}

// Enable CORS for Vite
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

(async () => {
  const db = await getAuthDb();
  const existing = await db.collection('users').findOne({ username: 'admin' });

  if (!existing) {
    await db.collection('users').insertOne({
      username: 'admin',
      password: 'admin', // Default password
      role: 'administrator',
      createdAt: new Date()
    });
    console.log('✅ Default admin user created: admin / admin');
  } else {
    console.log('ℹ️ Admin user already exists');
  }
})();

// === Get all users (admin only) ===
app.get('/api/users', async (req, res) => {
  try {
    const db = await getAuthDb();
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Failed to load users:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

// === Create new user (admin only) ===
app.post('/api/users', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getAuthDb();

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Create new user (encrypt password unless admin)
    const isAdmin = username === 'admin';
    const result = await db.collection('users').insertOne({
      username,
      password: isAdmin ? password : encrypt(password),
      role: isAdmin ? 'administrator' : 'user',
      createdAt: new Date()
    });

    // Create user's password collection
    const passwordsDb = await getPasswordsDb();
    await passwordsDb.createCollection(`passwords_${username}`);

    res.json({ 
      success: true, 
      user: {
        username,
        role: isAdmin ? 'administrator' : 'user',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Failed to create user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// === Delete user (admin only) ===
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const db = await getAuthDb();

    // Don't allow deleting the admin user
    if (username === 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete admin user' 
      });
    }

    // Delete user
    const result = await db.collection('users').deleteOne({ username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete user's collections
    const passwordsDb = await getPasswordsDb();
    await passwordsDb.collection(`passwords_${username}`).drop();

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to delete user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// === Update user password (admin only) ===
app.put('/api/users/:username/password', async (req, res) => {
  try {
    const { username } = req.params;
    const { password } = req.body;
    const db = await getAuthDb();

    // Always encrypt new password (including admin)
    const result = await db.collection('users').updateOne(
      { username },
      { $set: { password: encrypt(password) } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to update user password:', error);
    res.status(500).json({ success: false, message: 'Failed to update user password' });
  }
});

// === Authenticate user ===
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getAuthDb();

    const user = await db.collection('users').findOne({ username });
    if (user) {
      const storedPassword = user.password;
      let isValid = false;
      if (username === 'admin') {
        // Allow both plain and encrypted admin password
        isValid = (storedPassword === password) || (safeDecrypt(storedPassword) === password);
      } else {
        isValid = safeDecrypt(storedPassword) === password;
      }
      if (isValid) {
        res.json({
          success: true,
          user: {
            username: user.username,
            role: user.role
          }
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('🔴 Login error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// === Update user credentials ===
app.post('/api/auth/update-credentials', async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;
    const db = await getAuthDb();

    // First verify the current credentials
    const user = await db.collection('users').findOne({ username: currentUsername });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    let isValid = false;
    if (currentUsername === 'admin') {
      isValid = (user.password === currentPassword) || (safeDecrypt(user.password) === currentPassword);
    } else {
      isValid = safeDecrypt(user.password) === currentPassword;
    }
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Check if new username is already taken
    if (newUsername !== currentUsername) {
      const existingUser = await db.collection('users').findOne({ username: newUsername });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already exists' 
        });
      }
    }

    // Update the credentials (always encrypt new password)
    const result = await db.collection('users').updateOne(
      { username: currentUsername },
      { 
        $set: { 
          username: newUsername,
          password: encrypt(newPassword) 
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to update credentials' 
      });
    }

    // If username changed, rename the collections
    if (newUsername !== currentUsername) {
      const passwordsDb = await getPasswordsDb();
      await passwordsDb.collection(`passwords_${currentUsername}`).rename(`passwords_${newUsername}`);
    }

    // Return the updated user data
    res.json({ 
      success: true, 
      user: {
        username: newUsername,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Failed to update credentials:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// === Get all passwords for a user ===
app.get('/api/passwords', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const passwords = await db.collection(`passwords_${username}`).find().toArray();

    // Decrypt passwords
    const decryptedPasswords = passwords.map(pw => ({
      ...pw,
      password: safeDecrypt(pw.password)
    }));

    res.json(decryptedPasswords);
  } catch (error) {
    console.error('❌ Failed to load passwords:', error);
    res.status(500).json({ success: false, message: 'Failed to load passwords' });
  }
});

// === Save all passwords for a user ===
app.post('/api/save-passwords', async (req, res) => {
  try {
    const { username, passwords } = req.body;
    if (!username || !Array.isArray(passwords)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    // Encrypt passwords
    const encryptedPasswords = passwords.map(pw => ({
      ...pw,
      password: encrypt(pw.password)
    }));

    const db = await getPasswordsDb();
    await db.collection(`passwords_${username}`).deleteMany({});
    await db.collection(`passwords_${username}`).insertMany(encryptedPasswords);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to save passwords:', error);
    res.status(500).json({ success: false, message: 'Failed to save passwords' });
  }
});


// === Folder Management ===
// Get all folders for a user
app.get('/api/folders', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const folders = await db.collection(`folders_${username}`).find().toArray();
    
    // Convert ObjectId to string for the frontend
    const formattedFolders = folders.map(folder => ({
      ...folder,
      id: folder._id.toString(),
      _id: undefined
    }));
    
    res.json({ success: true, folders: formattedFolders });
  } catch (error) {
    console.error('❌ Failed to load folders:', error);
    res.status(500).json({ success: false, message: 'Failed to load folders' });
  }
});

// Create new folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name, parentId, username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const newFolder = {
      name,
      parentId: parentId ? new ObjectId(parentId) : null,
      userId: username,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(`folders_${username}`).insertOne(newFolder);
    const createdFolder = {
      ...newFolder,
      id: result.insertedId.toString(),
      _id: undefined
    };

    res.json({ success: true, folder: createdFolder });
  } catch (error) {
    console.error('❌ Failed to create folder:', error);
    res.status(500).json({ success: false, message: 'Failed to create folder' });
  }
});

// Update folder
app.put('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const result = await db.collection(`folders_${username}`).updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          name,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const updatedFolder = await db.collection(`folders_${username}`).findOne({ _id: new ObjectId(id) });
    const formattedFolder = {
      ...updatedFolder,
      id: updatedFolder._id.toString(),
      _id: undefined
    };
    
    res.json({ success: true, folder: formattedFolder });
  } catch (error) {
    console.error('❌ Failed to update folder:', error);
    res.status(500).json({ success: false, message: 'Failed to update folder' });
  }
});

// Delete folder
app.delete('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    
    // First, get the folder to find its parent
    const folder = await db.collection(`folders_${username}`).findOne({ _id: new ObjectId(id) });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Recursively delete all subfolders and their contents
    const deleteFolderAndContents = async (folderId) => {
      // Get all subfolders
      const subfolders = await db.collection(`folders_${username}`).find({ 
        parentId: new ObjectId(folderId) 
      }).toArray();
      
      // Recursively delete each subfolder
      for (const subfolder of subfolders) {
        await deleteFolderAndContents(subfolder._id);
      }

      // Delete all passwords in this folder
      await db.collection(`passwords_${username}`).deleteMany({ 
        folderId: folderId.toString() 
      });
      
      // Delete the folder itself
      await db.collection(`folders_${username}`).deleteOne({ 
        _id: new ObjectId(folderId) 
      });
    };

    // Start the recursive deletion
    await deleteFolderAndContents(id);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to delete folder:', error);
    res.status(500).json({ success: false, message: 'Failed to delete folder' });
  }
});

// Move password to folder
app.put('/api/passwords/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { folderId, username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const result = await db.collection(`passwords_${username}`).updateOne(
      { id },
      { $set: { folderId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to move password:', error);
    res.status(500).json({ success: false, message: 'Failed to move password' });
  }
});

// Move folder to another folder
app.put('/api/folders/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { parentId, username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const db = await getPasswordsDb();
    const update = {
      parentId: parentId ? new ObjectId(parentId) : null,
      updatedAt: new Date()
    };
    const result = await db.collection(`folders_${username}`).updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    const updatedFolder = await db.collection(`folders_${username}`).findOne({ _id: new ObjectId(id) });
    const formattedFolder = {
      ...updatedFolder,
      id: updatedFolder._id.toString(),
      _id: undefined
    };
    res.json({ success: true, folder: formattedFolder });
  } catch (error) {
    console.error('❌ Failed to move folder:', error);
    res.status(500).json({ success: false, message: 'Failed to move folder' });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Dev server running at http://localhost:${PORT}`);
});
