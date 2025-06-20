import React, { useState, useEffect, useCallback } from 'react';
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
  Breadcrumbs,
  Link,
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
  DriveFileMove as DriveFileMoveIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usePasswords } from '../context/PasswordContext';
import { useNavigate } from 'react-router-dom';
import { FaFolderPlus } from "react-icons/fa";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  description?: string;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const Dashboard: React.FC = () => {
  // --- State Variables ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false); // State for mobile drawer, if implemented

  // Folder Management States
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null for root
  const [currentFolderPath, setCurrentFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
  const [isAddFolderDialogOpen, setIsAddFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isEditFolderDialogOpen, setIsEditFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Password Action States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [isMovePasswordDialogOpen, setIsMovePasswordDialogOpen] = useState(false);
  const [passwordToMove, setPasswordToMove] = useState<PasswordEntry | null>(null);
  const [selectedMoveFolderId, setSelectedMoveFolderId] = useState<string | null>(null);

  // Logout State
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  // Move Folder States
  const [isMoveFolderDialogOpen, setIsMoveFolderDialogOpen] = useState(false);
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null);
  const [selectedMoveFolderIdForFolder, setSelectedMoveFolderIdForFolder] = useState<string | null>(null);
  
  // Mobile menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // --- Context Hooks ---
  const { logout, user } = useAuth();
  const { passwords, addPassword, updatePassword, deletePassword, folders, loadFolders, loadPasswords, addFolder, updateFolder, deleteFolder, movePassword, moveFolder } = usePasswords();
  const navigate = useNavigate();

  // --- Effects ---
  useEffect(() => {
    loadFolders();
    // The backend now creates a default Root folder, so no need to create it here
  }, [user, loadFolders]);

  // --- Helper Functions and Memoized Values ---
  const filteredPasswords = useCallback(() => {
    return passwords.filter(
      (entry) =>
        (entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
        entry.folderId === currentFolderId
    );
  }, [passwords, searchTerm, currentFolderId]);

  const getSubfolders = useCallback((parentId: string | null) => {
    return folders.filter(f => {
      if (parentId === null) {
        return f.parentId === null;
      }
      return f.parentId === parentId;
    });
  }, [folders]);

  const getAllFoldersForMove = useCallback(() => {
    const allFolders: { id: string | null; name: string; path: string }[] = [];
    const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
  
    // Always include root at the very beginning
    allFolders.push({ id: null, name: 'Root', path: 'Root' });
  
    // Helper to build the full path for a folder
    const buildPath = (folder: Folder): string => {
      let path = folder.name;
      let current = folder;
      while (current.parentId !== null) {
        const parent = sortedFolders.find(f => f.id === current.parentId);
        if (parent) {
          path = parent.name + ' / ' + path;
          current = parent;
        } else {
          break;
        }
      }
      return path;
    };

    // Add all other folders with their full paths
    sortedFolders.forEach(folder => {
      allFolders.push({ id: folder.id, name: folder.name, path: buildPath(folder) });
    });
  
    // Sort the folders (excluding Root) by their path for hierarchical display
    const rootFolder = allFolders.shift(); // Remove root temporarily
    allFolders.sort((a, b) => a.path.localeCompare(b.path));
    if (rootFolder) { // Add root back to the beginning
      allFolders.unshift(rootFolder);
    }
    
    return allFolders;
  }, [folders]);

  // Helper to get all descendants of a folder (for move validation)
  const getDescendantFolderIds = useCallback((folderId: string): string[] => {
    const descendants: string[] = [];
    const findDescendants = (id: string) => {
      folders.forEach(f => {
        if (f.parentId === id) {
          descendants.push(f.id);
          findDescendants(f.id);
        }
      });
    };
    findDescendants(folderId);
    return descendants;
  }, [folders]);

  // For move folder dialog: exclude self and descendants
  const getAllFoldersForMoveFolder = useCallback((movingFolder: Folder | null) => {
    if (!movingFolder) return [];
    const excludeIds = [movingFolder.id, ...getDescendantFolderIds(movingFolder.id)];
    const allFolders: { id: string | null; name: string; path: string }[] = [];
    const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
    allFolders.push({ id: null, name: 'Root', path: 'Root' });
    const buildPath = (folder: Folder): string => {
      let path = folder.name;
      let current = folder;
      while (current.parentId !== null) {
        const parent = sortedFolders.find(f => f.id === current.parentId);
        if (parent) {
          path = parent.name + ' / ' + path;
          current = parent;
        } else {
          break;
        }
      }
      return path;
    };
    sortedFolders.forEach(folder => {
      if (!excludeIds.includes(folder.id)) {
        allFolders.push({ id: folder.id, name: folder.name, path: buildPath(folder) });
      }
    });
    const rootFolder = allFolders.shift();
    allFolders.sort((a, b) => a.path.localeCompare(b.path));
    if (rootFolder) allFolders.unshift(rootFolder);
    return allFolders;
  }, [folders, getDescendantFolderIds]);

  // --- Handlers ---
  const handleAddPassword = useCallback(() => {
    if (newTitle && newUsername && newPassword) {
      addPassword({
        title: newTitle,
        username: newUsername,
        password: newPassword,
        description: newDescription,
        folderId: currentFolderId,
      });
      handleAddDialogClose();
    }
  }, [newTitle, newUsername, newPassword, newDescription, currentFolderId, addPassword]);

  const handleDeleteConfirm = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleDeletePassword = useCallback((id: string) => {
    deletePassword(id);
    setDeleteConfirmId(null);
  }, [deletePassword]);

  const handleEditClick = useCallback((password: PasswordEntry) => {
    setEditingPassword(password);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingPassword(null);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingPassword) {
      updatePassword(editingPassword.id, editingPassword);
      setEditingPassword(null);
    }
  }, [editingPassword, updatePassword]);

  const handleAddDialogClose = useCallback(() => {
    setIsAddDialogOpen(false);
    setNewTitle('');
    setNewUsername('');
    setNewPassword('');
    setNewDescription('');
  }, []);

  const handleLogoutClick = useCallback(() => {
    setIsLogoutDialogOpen(true);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate('/');
  }, [logout, navigate]);

  const handleLogoutCancel = useCallback(() => {
    setIsLogoutDialogOpen(false);
  }, []);

  const handleFolderClick = useCallback((folder: Folder | null) => {
    setCurrentFolderId(folder ? folder.id : null);
    if (folder) {
      const newPath = [...currentFolderPath];
      const existingIndex = newPath.findIndex(f => f.id === folder.id);
      if (existingIndex !== -1) {
        // If clicking on a folder that's already in the path, truncate to that point
        setCurrentFolderPath(newPath.slice(0, existingIndex + 1));
      } else {
        // Add the new folder to the path
        setCurrentFolderPath([...currentFolderPath, { id: folder.id, name: folder.name }]);
      }
    } else {
      // Navigating to root
      setCurrentFolderPath([{ id: null, name: 'Root' }]);
    }
  }, [currentFolderPath]);

  const handleBreadcrumbClick = useCallback((folderId: string | null) => {
    const index = currentFolderPath.findIndex(f => f.id === folderId);
    if (index !== -1) {
      setCurrentFolderId(folderId);
      setCurrentFolderPath(currentFolderPath.slice(0, index + 1));
    }
  }, [currentFolderPath]);

  const handleAddFolder = useCallback(async () => {
    if (newFolderName.trim() === '') return;
    try {
      await addFolder({
        name: newFolderName,
        parentId: currentFolderId,
      });
      setNewFolderName('');
      setIsAddFolderDialogOpen(false);
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  }, [newFolderName, currentFolderId, addFolder]);

  const handleEditFolder = useCallback((folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name); // Pre-fill with current name
    setIsEditFolderDialogOpen(true);
  }, []);

  const handleUpdateFolder = useCallback(async () => {
    if (editingFolder && newFolderName.trim() !== '') {
      try {
        await updateFolder(editingFolder.id, { name: newFolderName });
        setEditingFolder(null);
        setNewFolderName('');
        setIsEditFolderDialogOpen(false);
      } catch (error) {
        console.error('Error updating folder:', error);
        // Handle error display here if needed
      }
    }
  }, [editingFolder, newFolderName, updateFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? All passwords and subfolders will be permanently deleted.')) {
      try {
        await deleteFolder(folderId);
        // If the current folder was deleted, navigate to its parent or root
        if (currentFolderId === folderId) {
          const parentFolder = folders.find(f => f.id === (folders.find(fd => fd.id === folderId)?.parentId));
          handleFolderClick(parentFolder || null);
        }
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  }, [currentFolderId, folders, deleteFolder, handleFolderClick]);

  const handleMovePasswordClick = useCallback((password: PasswordEntry) => {
    setPasswordToMove(password);
    setSelectedMoveFolderId(password.folderId || null); // Pre-select current folder
    setIsMovePasswordDialogOpen(true);
  }, []);

  const handleMovePasswordSave = useCallback(async () => {
    if (passwordToMove && selectedMoveFolderId !== undefined) { // Check for undefined, allowing null for root
      try {
        await movePassword(passwordToMove.id, selectedMoveFolderId === 'root' ? null : selectedMoveFolderId);
        setPasswordToMove(null);
        setSelectedMoveFolderId(null);
        setIsMovePasswordDialogOpen(false);
      } catch (error) {
        console.error('Error moving password:', error);
        // Handle error display here if needed
      }
    }
  }, [passwordToMove, selectedMoveFolderId, movePassword]);

  const handleMoveFolderClick = useCallback((folder: Folder) => {
    setFolderToMove(folder);
    setSelectedMoveFolderIdForFolder(folder.parentId || null); // Pre-select current parent
    setIsMoveFolderDialogOpen(true);
  }, []);

  const handleMoveFolderSave = useCallback(async (): Promise<void> => {
    if (folderToMove && selectedMoveFolderIdForFolder !== undefined) {
      try {
        await moveFolder(folderToMove.id, selectedMoveFolderIdForFolder === 'root' ? null : selectedMoveFolderIdForFolder);
        await loadFolders();
        await loadPasswords();
        setFolderToMove(null);
        setSelectedMoveFolderIdForFolder(null);
        setIsMoveFolderDialogOpen(false);
      } catch (error) {
        console.error('Error moving folder:', error);
      }
    }
  }, [folderToMove, selectedMoveFolderIdForFolder, moveFolder, loadFolders, loadPasswords]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#0a1929' }}>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 80 }, px: { xs: 1, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ fontSize: { xs: 28, sm: 40 }, mr: 1 }} />
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              fontSize: { xs: '1.3rem', sm: '2rem' },
              background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1,
            }}>
              KeePass<br style={{ display: (window.innerWidth < 600) ? 'block' : 'none' }} /> Secure
            </Typography>
          </Box>
          {/* Right-side controls: show as menu on mobile */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 3 }}>
            <Paper
              sx={{
                p: '2px 4px',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                width: { xs: '100%', sm: 300 },
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
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
            <IconButton onClick={handleMenuClick} sx={{ color: '#fff' }}>
              <Avatar sx={{ bgcolor: '#1565c0', color: '#fff', fontSize: '1rem', width: 32, height: 32 }}>
                {user?.username[0].toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleMenuClose}
              PaperProps={{ sx: { bgcolor: '#1a237e', color: '#fff' } }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
                <SettingsIcon sx={{ mr: 1 }} /> Settings
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); handleLogoutClick(); }}>
                <LogoutIcon sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: '56px', sm: '80px' },
          background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: { xs: 1, sm: 3 }, flex: 1 }}>
          <Box sx={{ maxWidth: { xs: '100%', sm: 1200 }, mx: 'auto' }}>
            <Card
              elevation={8}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: { xs: 2, sm: 4 },
                border: '1px solid rgba(255, 255, 255, 0.12)',
                width: '100%',
                boxShadow: { xs: '0 2px 8px rgba(33,203,243,0.08)', sm: '0 3px 5px 2px rgba(33, 203, 243, .3)' },
              }}
            >
              <CardContent sx={{ p: { xs: 1, sm: 4 } }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 4, gap: { xs: 2, sm: 0 } }}>
                  <Typography variant="h5" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: { xs: '1.1rem', sm: '1.5rem' },
                  }}>
                    <FolderIcon sx={{ color: '#2196f3', fontSize: { xs: 24, sm: 32 } }} />
                    {currentFolderId === null ? 'Root' : currentFolderPath[currentFolderPath.length - 1]?.name || ''}
                  </Typography>
                  {/* Responsive Add Password button */}
                  <Box sx={{ width: { xs: '100%', sm: 'auto' }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mt: { xs: 1, sm: 0 } }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setIsAddDialogOpen(true)}
                      sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: { xs: '0 2px 8px rgba(33,203,243,0.18)', sm: '0 3px 5px 2px rgba(33, 203, 243, .3)' },
                        borderRadius: 3,
                        px: { xs: 0, sm: 4 },
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '1rem', sm: '1rem' },
                        fontWeight: 500,
                        textTransform: 'none',
                        color: '#fff',
                        width: { xs: '100%', sm: 'auto' },
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                          transform: { xs: 'none', sm: 'translateY(-2px)' },
                          boxShadow: { xs: '0 4px 12px rgba(33,203,243,0.22)', sm: '0 5px 8px 2px rgba(33, 203, 243, .4)' },
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Add Password
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<FaFolderPlus />}
                      onClick={() => setIsAddFolderDialogOpen(true)}
                      sx={{
                        background: 'linear-gradient(45deg, #FFC107 30%, #FFEB3B 90%)',
                        boxShadow: { xs: '0 2px 8px rgba(255,193,7,0.18)', sm: '0 3px 5px 2px rgba(255, 193, 7, .3)' },
                        borderRadius: 3,
                        px: { xs: 0, sm: 4 },
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '1rem', sm: '1rem' },
                        fontWeight: 500,
                        textTransform: 'none',
                        color: '#222',
                        width: { xs: '100%', sm: 'auto' },
                        '&:hover': {
                          background: 'linear-gradient(45deg, #FFA000 30%, #FFD700 90%)',
                          transform: { xs: 'none', sm: 'translateY(-2px)' },
                          boxShadow: { xs: '0 4px 12px rgba(255,193,7,0.22)', sm: '0 5px 8px 2px rgba(255, 193, 7, .4)' },
                        },
                        transition: 'all 0.3s ease',
                        mt: { xs: 1, sm: 0 },
                      }}
                    >
                      Add Folder
                    </Button>
                  </Box>
                </Box>

                {/* Breadcrumbs for navigation */}
                <Box sx={{ mb: 2 }}>
                  <Breadcrumbs
                    separator={<ArrowForwardIosIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                    aria-label="breadcrumb"
                  >
                    {currentFolderPath.map((folder, index) => (
                      <Link
                        key={folder.id || 'root'}
                        underline="hover"
                        color={index === currentFolderPath.length - 1 ? '#fff' : 'rgba(255, 255, 255, 0.7)'}
                        onClick={() => handleBreadcrumbClick(folder.id)}
                        sx={{ cursor: 'pointer', fontWeight: index === currentFolderPath.length - 1 ? 'bold' : 'normal' }}
                      >
                        {folder.name}
                      </Link>
                    ))}
                  </Breadcrumbs>
                </Box>

                {/* Folders List */}
                <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontSize: { xs: '1rem', sm: '1.2rem' } }}>Folders</Typography>
                  </Box>
                  <List sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    flexDirection: 'row',
                    gap: 2.5,
                    width: '100%',
                    justifyContent: { xs: 'center', sm: 'flex-start' },
                  }}>
                    {getSubfolders(currentFolderId).length > 0 ? (
                      getSubfolders(currentFolderId).map((folder, index) => (
                        <Box
                          key={folder.id}
                          sx={{
                            width: { xs: '100%', sm: 175 },
                            minWidth: { xs: '90vw', sm: 175 },
                            maxWidth: { xs: '100%', sm: 175 },
                            height: { xs: 90, sm: 150 },
                            position: 'relative',
                            cursor: 'pointer',
                            mb: { xs: 2, sm: 0 },
                            animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`,
                            '@keyframes slideInUp': {
                              '0%': {
                                opacity: 0,
                                transform: 'translateY(30px)',
                              },
                              '100%': {
                                opacity: 1,
                                transform: 'translateY(0)',
                              },
                            },
                            '&:hover': {
                              '& .folder-card': {
                                transform: 'translateY(-8px) scale(1.02)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(33, 150, 243, 0.2)',
                                borderColor: 'rgba(33, 150, 243, 0.4)',
                              },
                              '& .folder-icon': {
                                transform: 'scale(1.1) rotate(5deg)',
                                filter: 'drop-shadow(0 0 15px rgba(33, 150, 243, 0.6))',
                              },
                              '& .folder-name': {
                                color: '#2196f3',
                                transform: 'translateY(-2px)',
                              },
                              '& .folder-actions': {
                                opacity: 1,
                                transform: 'translateX(-50%) translateY(0) scale(1)',
                              },
                              '& .folder-glow': {
                                opacity: 1,
                              }
                            }
                          }}
                          onClick={() => handleFolderClick(folder)}
                        >
                          {/* Animated Glow Effect */}
                          <Box
                            className="folder-glow"
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '100%',
                              height: '100%',
                              background: 'radial-gradient(circle, rgba(33, 150, 243, 0.15) 0%, transparent 70%)',
                              opacity: 0,
                              transition: 'opacity 0.4s ease',
                              pointerEvents: 'none',
                              borderRadius: '12px',
                            }}
                          />
                          
                          {/* Main Folder Card */}
                          <Card
                            className="folder-card"
                            elevation={0}
                            sx={{
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(135deg, rgba(26, 32, 39, 0.9) 0%, rgba(10, 25, 41, 0.8) 100%)',
                              border: '2px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              backdropFilter: 'blur(10px)',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'linear-gradient(90deg, #2196f3, #21CBF3, #2196f3)',
                                borderRadius: '10px 10px 0 0',
                              }
                            }}
                          >
                            <CardContent
                              sx={{
                                textAlign: 'center',
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                py: 1.5,
                                position: 'relative',
                                zIndex: 2,
                              }}
                            >
                              <FolderIcon 
                                className="folder-icon"
                                sx={{ 
                                  fontSize: 42, 
                                  color: '#2196f3',
                                  mb: 1,
                                  filter: 'drop-shadow(0 2px 8px rgba(33, 150, 243, 0.3))',
                                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} 
                              /> 
                              <Typography 
                                className="folder-name"
                                variant="body2" 
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.9)', 
                                  fontWeight: 600,
                                  fontSize: '0.9rem',
                                  whiteSpace: 'nowrap', 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '90%',
                                  transition: 'all 0.3s ease',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                }}
                              >{folder.name}</Typography>
                            </CardContent>
                            
                            {/* Animated Action Buttons */}
                            <Box 
                              className="folder-actions"
                              sx={{ 
                                position: 'absolute', 
                                bottom: 8, 
                                left: '50%',
                                transform: 'translateX(-50%) translateY(10px) scale(0.8)',
                                display: 'flex', 
                                gap: 0.5,
                                opacity: 0,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 3,
                              }}
                            >
                              <Tooltip title="Edit Folder" arrow placement="top">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }}
                                  sx={{ 
                                    background: 'rgba(33, 150, 243, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(33, 150, 243, 0.3)',
                                    color: '#2196f3',
                                    width: 32,
                                    height: 32,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { 
                                      background: 'rgba(33, 150, 243, 0.3)',
                                      transform: 'scale(1.1)',
                                      boxShadow: '0 0 15px rgba(33, 150, 243, 0.4)',
                                    }
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Folder" arrow placement="top">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                  sx={{ 
                                    background: 'rgba(244, 67, 54, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(244, 67, 54, 0.3)',
                                    color: '#f44336',
                                    width: 32,
                                    height: 32,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { 
                                      background: 'rgba(244, 67, 54, 0.3)',
                                      transform: 'scale(1.1)',
                                      boxShadow: '0 0 15px rgba(244, 67, 54, 0.4)',
                                    }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Move Folder">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleMoveFolderClick(folder); }}
                                  sx={{ 
                                    background: 'rgba(255, 193, 7, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 193, 7, 0.3)',
                                    color: '#ffa000',
                                    width: 32,
                                    height: 32,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { 
                                      background: 'rgba(255, 193, 7, 0.3)',
                                      transform: 'scale(1.1)',
                                      boxShadow: '0 0 15px rgba(255, 193, 7, 0.4)',
                                    }
                                  }}
                                >
                                  <DriveFileMoveIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            
                            {/* Subtle Pattern Overlay */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: `
                                  linear-gradient(90deg, rgba(33, 150, 243, 0.03) 1px, transparent 1px),
                                  linear-gradient(rgba(33, 150, 243, 0.03) 1px, transparent 1px)
                                `,
                                backgroundSize: '20px 20px',
                                opacity: 0.5,
                                pointerEvents: 'none',
                              }}
                            />
                          </Card>
                        </Box>
                      ))
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          py: 4,
                          color: 'rgba(255, 255, 255, 0.5)',
                          animation: 'fadeIn 0.8s ease-out',
                          '@keyframes fadeIn': {
                            '0%': { opacity: 0, transform: 'translateY(20px)' },
                            '100%': { opacity: 1, transform: 'translateY(0)' },
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 60,
                            background: 'linear-gradient(135deg, rgba(26, 32, 39, 0.9) 0%, rgba(10, 25, 41, 0.8) 100%)',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            opacity: 0.4,
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <FolderIcon sx={{ fontSize: 24, color: '#2196f3' }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          No subfolders in this location.
                        </Typography>
                      </Box>
                    )}
                  </List>
                </Box>

                {/* Passwords List */}
                <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontSize: { xs: '1rem', sm: '1.2rem' } }}>Passwords</Typography>
                <List sx={{ width: '100%' }}>
                  {filteredPasswords().length > 0 ? (
                    filteredPasswords().map((entry) => (
                      <ListItem
                        key={entry.id}
                        sx={{
                          mb: 2,
                          bgcolor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          width: '100%',
                          px: { xs: 1, sm: 2 },
                          py: { xs: 1, sm: 2 },
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                            '& .MuiListItemText-primary': {
                              fontSize: { xs: '1.1rem', sm: '1.25rem' },
                              transition: 'font-size 0.3s ease',
                            },
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="h6" sx={{
                              fontSize: { xs: '1rem', sm: '1.1rem' },
                              fontWeight: 'medium',
                              color: '#fff',
                              wordBreak: 'break-word',
                              transition: 'font-size 0.3s ease',
                            }}>
                              {entry.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', wordBreak: 'break-all', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                                Username: {entry.username}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', wordBreak: 'break-all', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                                Password: {showPassword[entry.id] ? entry.password : '••••••••'}
                              </Typography>
                              {entry.description && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    mt: 1,
                                    fontStyle: 'italic',
                                    wordBreak: 'break-word',
                                    fontSize: { xs: '0.95rem', sm: '1rem' },
                                  }}
                                >
                                  Note: {entry.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={showPassword[entry.id] ? "Hide Password" : "Show Password"}>
                            <IconButton
                              edge="end"
                              onClick={() => setShowPassword((prev) => ({
                                ...prev,
                                [entry.id]: !prev[entry.id],
                              }))}
                              sx={{
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
                          <Tooltip title="Move to Folder">
                            <IconButton
                              edge="end"
                              onClick={() => handleMovePasswordClick(entry)}
                              sx={{
                                color: '#ffa000',
                                '&:hover': { bgcolor: 'rgba(255, 160, 0, 0.1)' },
                              }}
                            >
                              <DriveFileMoveIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>No passwords found in this location.</Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          width: '100%',
          backdropFilter: 'blur(8px)',
          background: 'rgba(10, 25, 41, 0.85)',
          borderTop: '1.5px solid rgba(33,150,243,0.12)',
          boxShadow: '0 -4px 24px 0 rgba(33,150,243,0.10)',
          py: 3,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#b3cfff',
            textAlign: 'center',
            fontWeight: 400,
            letterSpacing: 1,
            textShadow: '0 1px 8px #0a1929',
          }}
        >
          © 2025 Ben Eytan. All rights reserved.
        </Typography>
      </Box>

      {/* Add Password Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onClose={handleAddDialogClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: { xs: 'unset', sm: '400px' },
            width: { xs: '95vw', sm: 'auto' },
            maxWidth: { xs: '98vw', sm: '600px' },
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

      {/* Delete Confirmation Dialog */}
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

      {/* Edit Password Dialog */}
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

      {/* Folder Dialogs */}
      <Dialog
        open={isAddFolderDialogOpen}
        onClose={() => setIsAddFolderDialogOpen(false)}
        disableEscapeKeyDown
        onBackdropClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: '300px',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Add New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            fullWidth
            variant="outlined"
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
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setIsAddFolderDialogOpen(false)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >Cancel</Button>
          <Button
            onClick={handleAddFolder}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEditFolderDialogOpen}
        onClose={() => setIsEditFolderDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(26, 32, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: '300px',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Edit Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            fullWidth
            variant="outlined"
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
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setIsEditFolderDialogOpen(false)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >Cancel</Button>
          <Button
            onClick={handleUpdateFolder}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >Save</Button>
        </DialogActions>
      </Dialog>

      {/* Move Password Dialog */}
      <Dialog
        open={isMovePasswordDialogOpen}
        onClose={() => setIsMovePasswordDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff' }}>Move Password: {passwordToMove?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>Select destination folder:</Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {getAllFoldersForMove().map((folder) => (
                <ListItem
                  key={folder.id || 'root'}
                  button
                  selected={selectedMoveFolderId === folder.id}
                  onClick={() => setSelectedMoveFolderId(folder.id)}
                  sx={{
                    bgcolor: selectedMoveFolderId === folder.id ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography sx={{ color: '#fff' }}>
                        {folder.path}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setIsMovePasswordDialogOpen(false)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >Cancel</Button>
          <Button
            onClick={handleMovePasswordSave}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >Move</Button>
        </DialogActions>
      </Dialog>

      {/* Move Folder Dialog */}
      <Dialog
        open={isMoveFolderDialogOpen}
        onClose={() => setIsMoveFolderDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff' }}>Move Folder: {folderToMove?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>Select destination folder:</Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {getAllFoldersForMoveFolder(folderToMove).map((folder) => (
                <ListItem
                  key={folder.id || 'root'}
                  button
                  selected={selectedMoveFolderIdForFolder === folder.id}
                  onClick={() => setSelectedMoveFolderIdForFolder(folder.id)}
                  sx={{
                    bgcolor: selectedMoveFolderIdForFolder === folder.id ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography sx={{ color: '#fff' }}>
                        {folder.path}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setIsMoveFolderDialogOpen(false)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >Cancel</Button>
          <Button
            onClick={handleMoveFolderSave}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              },
              color: '#fff',
            }}
          >Move</Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
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
    </Box>
  );
};

export default Dashboard; 