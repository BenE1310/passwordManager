import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface User {
  username: string;
  role: string;
  createdAt: string;
}

const SettingsPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [isEditingUser, setIsEditingUser] = useState<User | null>(null);

  const navigate = useNavigate();
  const { updateCredentials, user } = useAuth();

  const isAdmin = user?.role === 'administrator';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUpdating(true);

    if (!user) {
      setError('User not authenticated');
      setIsUpdating(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsUpdating(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsUpdating(false);
      return;
    }

    try {
      const success = await updateCredentials(
        user.username,
        oldPassword,
        user.username,
        newPassword
      );

      if (success) {
        setSuccess(true);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError('Current password is incorrect');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) throw new Error('Failed to create user');
      
      setSuccess(true);
      setNewUser({ username: '', password: '' });
      setIsUserDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Failed to create user');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;

    try {
      const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');
      
      setSuccess(true);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  const handleUpdateUserPassword = async (username: string, newPassword: string) => {
    try {
      const response = await fetch(`/api/users/${username}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) throw new Error('Failed to update user password');
      
      setSuccess(true);
      setIsEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user password:', error);
      setError('Failed to update user password');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      pt: '80px',
      background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{ p: 3, flex: 1 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate('/dashboard')}
              sx={{ 
                color: '#fff',
                mr: 2,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ 
              color: '#fff',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Settings
            </Typography>
          </Box>

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
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  mb: 4,
                  '& .MuiTab-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': {
                      color: '#fff',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#2196f3',
                  },
                }}
              >
                <Tab icon={<LockIcon />} label="Change Password" />
                {isAdmin && <Tab icon={<PersonIcon />} label="Manage Users" />}
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    mb: 4,
                  }}>
                    <LockIcon sx={{ color: '#2196f3', fontSize: 32 }} />
                    <Typography variant="h5" sx={{ 
                      color: '#fff',
                      fontWeight: 'bold',
                    }}>
                      Change Password
                    </Typography>
                  </Box>

                  <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Current Password"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        fullWidth
                        variant="outlined"
                        disabled={isUpdating}
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
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        fullWidth
                        variant="outlined"
                        disabled={isUpdating}
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
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        fullWidth
                        variant="outlined"
                        disabled={isUpdating}
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
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isUpdating}
                        sx={{
                          mt: 2,
                          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                          boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                          borderRadius: 3,
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: 500,
                          textTransform: 'none',
                          color: '#fff',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 5px 8px 2px rgba(33, 203, 243, .4)',
                          },
                          transition: 'all 0.3s ease',
                          '&.Mui-disabled': {
                            background: 'rgba(255, 255, 255, 0.12)',
                            color: 'rgba(255, 255, 255, 0.3)',
                          },
                        }}
                      >
                        {isUpdating ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </Box>
                  </form>
                </Box>
              )}

              {activeTab === 1 && isAdmin && (
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    mb: 4,
                  }}>
                    <PersonIcon sx={{ color: '#2196f3', fontSize: 32 }} />
                    <Typography variant="h5" sx={{ 
                      color: '#fff',
                      fontWeight: 'bold',
                    }}>
                      Manage Users
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => setIsUserDialogOpen(true)}
                    sx={{
                      mb: 3,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      borderRadius: 3,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      color: '#fff',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 5px 8px 2px rgba(33, 203, 243, .4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Add New User
                  </Button>

                  <List sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    {users.map((user) => (
                      <ListItem
                        key={user.username}
                        sx={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <ListItemText
                          primary={user.username}
                          secondary={`Role: ${user.role} | Created: ${new Date(user.createdAt).toLocaleDateString()}`}
                          sx={{
                            '& .MuiListItemText-primary': {
                              color: '#fff',
                              fontWeight: 500,
                            },
                            '& .MuiListItemText-secondary': {
                              color: 'rgba(255, 255, 255, 0.7)',
                            },
                          }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => setIsEditingUser(user)}
                            sx={{ color: '#2196f3', mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteUser(user.username)}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* New User Dialog */}
      <Dialog
        open={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 35, 126, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            sx={{
              mt: 2,
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
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            sx={{
              mt: 2,
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsUserDialogOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!isEditingUser}
        onClose={() => setIsEditingUser(null)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 35, 126, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Change User Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            onChange={(e) => handleUpdateUserPassword(isEditingUser!.username, e.target.value)}
            sx={{
              mt: 2,
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsEditingUser(null)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setIsEditingUser(null)}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
            }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={error !== ''} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled">{error}</Alert>
      </Snackbar>

      <Snackbar 
        open={success} 
        autoHideDuration={2000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">Operation completed successfully!</Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage; 