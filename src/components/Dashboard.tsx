import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography,
  AppBar,
  Toolbar,
  Tooltip,
  Avatar,
  Paper,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Folder as FolderIcon,
  Menu as MenuIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usePasswords } from '../context/PasswordContext';
import { useNavigate } from 'react-router-dom';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  description?: string;
}


const Dashboard: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  const { logout, user } = useAuth();
  const { passwords, addPassword, updatePassword, deletePassword } = usePasswords();
  const navigate = useNavigate();

  const filteredPasswords = passwords.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPassword = () => {
    if (newTitle && newUsername && newPassword) {
      addPassword({
        title: newTitle,
        username: newUsername,
        password: newPassword,
        description: newDescription,
      });
      handleAddDialogClose();
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleDeletePassword = (id: string) => {
    deletePassword(id);
    setDeleteConfirmId(null);
  };

  const handleEditClick = (password: PasswordEntry) => {
    setEditingPassword(password);
  };

  const handleEditClose = () => {
    setEditingPassword(null);
  };

  const handleEditSave = () => {
    if (editingPassword) {
      updatePassword(editingPassword.id, editingPassword);
      setEditingPassword(null);
    }
  };

  const handleAddDialogClose = () => {
    setIsAddDialogOpen(false);
    setNewTitle('');
    setNewUsername('');
    setNewPassword('');
    setNewDescription('');
  };

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate('/');
  };

  const handleLogoutCancel = () => {
    setIsLogoutDialogOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a1929' }}>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 80 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2, display: { xs: 'block', sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <SecurityIcon sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Password Manager
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Paper
              sx={{
                p: '2px 4px',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                width: 300,
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 3,
              }}
            >
              <InputAdornment position="start" sx={{ pl: 1 }}>
                <SearchIcon sx={{ color: 'white' }} />
              </InputAdornment>
              <TextField
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  style: { color: 'white' }
                }}
              />
            </Paper>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 3,
              py: 1,
              px: 2,
            }}>
              <Avatar sx={{
                bgcolor: '#1565c0',
                color: '#fff',
                fontSize: '1rem',
              }}>
                {user?.username[0].toUpperCase()}
              </Avatar>
              <Typography sx={{ 
                ml: 1,
                color: '#fff',
                display: { xs: 'none', sm: 'block' }
              }}>
                {user?.username}
              </Typography>
              <Tooltip title="Settings">
                <IconButton
                  onClick={() => navigate('/settings')}
                  sx={{ 
                    color: '#fff',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton
                  onClick={handleLogoutClick}
                  sx={{ 
                    color: '#fff',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '80px',
          background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 3, flex: 1 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Card
              elevation={8}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Typography variant="h5" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    color: '#fff',
                    fontWeight: 'bold',
                  }}>
                    <FolderIcon sx={{ color: '#2196f3', fontSize: 32 }} />
                    Stored Passwords
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsAddDialogOpen(true)}
                    sx={{
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      color: '#fff', // <--- Text color added here
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 5px 8px 2px rgba(33, 203, 243, .4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Add Password
                  </Button>
                </Box>

                <List>
                  {filteredPasswords.map((entry) => (
                    <ListItem
                      key={entry.id}
                      sx={{
                        mb: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                          transform: 'translateX(8px)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 'medium',
                            color: '#fff',
                          }}>
                            {entry.title}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              Username: {entry.username}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              Password: {showPassword[entry.id] ? entry.password : '••••••••'}
                            </Typography>
                            {entry.description && (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  mt: 1,
                                  fontStyle: 'italic'
                                }}
                              >
                                Note: {entry.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title={showPassword[entry.id] ? "Hide Password" : "Show Password"}>
                          <IconButton
                            edge="end"
                            onClick={() => setShowPassword((prev) => ({
                              ...prev,
                              [entry.id]: !prev[entry.id],
                            }))}
                            sx={{ 
                              mr: 1,
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
                            }}
                          >
                            {showPassword[entry.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            edge="end"
                            onClick={() => handleEditClick(entry)}
                            sx={{ 
                              mr: 1,
                              color: '#2196f3',
                              '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteConfirm(entry.id)}
                            sx={{ 
                              color: '#f44336',
                              '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      <Dialog 
        open={isAddDialogOpen} 
        onClose={handleAddDialogClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: '400px',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Add New Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              autoFocus
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Description (Optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleAddDialogClose}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddPassword}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Are you sure you want to delete this password? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => deleteConfirmId && handleDeletePassword(deleteConfirmId)}
            variant="contained"
            color="error"
            sx={{ color: '#fff' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editingPassword !== null}
        onClose={handleEditClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: '400px',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Edit Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={editingPassword?.title || ''}
              onChange={(e) => setEditingPassword(prev => prev ? {...prev, title: e.target.value} : null)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Username"
              value={editingPassword?.username || ''}
              onChange={(e) => setEditingPassword(prev => prev ? {...prev, username: e.target.value} : null)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Password"
              value={editingPassword?.password || ''}
              onChange={(e) => setEditingPassword(prev => prev ? {...prev, password: e.target.value} : null)}
              type="password"
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
            <TextField
              label="Description"
              value={editingPassword?.description || ''}
              onChange={(e) => setEditingPassword(prev => prev ? {...prev, description: e.target.value} : null)}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleEditClose}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isLogoutDialogOpen}
        onClose={handleLogoutCancel}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Confirm Logout</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Are you sure you want to logout? You will need to sign in again to access your passwords.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleLogoutCancel}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            color="error"
            sx={{ color: '#fff' }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      <Typography
        variant="body2"
        sx={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        © 2025 Ben Eytan. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Dashboard; 