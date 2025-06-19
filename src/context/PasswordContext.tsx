import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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

interface PasswordContextType {
  passwords: PasswordEntry[];
  addPassword: (password: Omit<PasswordEntry, 'id'>) => void;
  updatePassword: (id: string, password: PasswordEntry) => void;
  deletePassword: (id: string) => void;
  getPassword: (id: string) => PasswordEntry | undefined;
  isLoading: boolean;
  error: string | null;
  folders: Folder[];
  loadFolders: () => void;
  loadPasswords: () => Promise<void>;
  addFolder: (folder: Omit<Folder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFolder: (id: string, folder: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  movePassword: (passwordId: string, folderId: string | null) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();


  // AES-256-GCM
  // // Load passwords from server on initial mount and when user changes
  useEffect(() => {
    const loadPasswords = async () => {
      if (!user?.username) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/passwords?username=${user.username}`);
        if (!response.ok) {
          throw new Error('Failed to load passwords');
        }
        const data = await response.json();
        setPasswords(data);
      } catch (error) {
        console.error('Error loading passwords:', error);
        setError('Failed to load passwords');
        setPasswords([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPasswords();
  }, [user?.username]);

  // Load folders from the server
  const loadFolders = async () => {
    if (!user?.username) return;

    try {
      const response = await fetch(`/api/folders?username=${user.username}`);
      if (!response.ok) {
        throw new Error('Failed to load folders');
      }
      const data = await response.json();
      setFolders(data.folders);
    } catch (error) {
      console.error('Error loading folders:', error);
      setError('Failed to load folders');
    }
  };

  // Add a new folder
  const addFolder = async (folder: Omit<Folder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.username) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...folder,
          username: user.username
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add folder');
      }

      const data = await response.json();
      setFolders(prev => [...prev, data.folder]);
    } catch (error) {
      console.error('Error adding folder:', error);
      throw error;
    }
  };

  // Update a folder
  const updateFolder = async (id: string, folder: Partial<Folder>) => {
    if (!user?.username) return;

    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...folder,
          username: user.username
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update folder');
      }

      const data = await response.json();
      setFolders(prev => prev.map(f => f.id === id ? data.folder : f));
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  // Delete a folder
  const deleteFolder = async (id: string) => {
    if (!user?.username) return;

    try {
      const response = await fetch(`/api/folders/${id}?username=${user.username}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      setFolders(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  // Move a password to a different folder
  const movePassword = async (passwordId: string, folderId: string | null) => {
    if (!user?.username) return;

    try {
      const response = await fetch(`/api/passwords/${passwordId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          folderId,
          username: user.username 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move password');
      }

      setPasswords(prev => prev.map(password => 
        password.id === passwordId ? { ...password, folderId } : password
      ));
    } catch (error) {
      console.error('Error moving password:', error);
      throw error;
    }
  };

  // Move a folder to a different parent folder
  const moveFolder = async (folderId: string, parentId: string | null) => {
    if (!user?.username) return;
    try {
      const response = await fetch(`/api/folders/${folderId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId,
          username: user.username
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to move folder');
      }
      // Reload folders to update UI
      await loadFolders();
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  };

  // Save passwords to the server
  const savePasswordsToServer = async (updatedPasswords: PasswordEntry[]) => {
    if (!user?.username) return;

    try {
      setError(null);
      const response = await fetch('/api/save-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: user.username,
          passwords: updatedPasswords 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save passwords');
      }
    } catch (error) {
      console.error('Error saving passwords:', error);
      setError('Failed to save passwords');
      // Reload passwords from server to ensure UI is in sync
      const response = await fetch(`/api/passwords?username=${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setPasswords(data);
      }
    }
  };

  const addPassword = async (passwordData: Omit<PasswordEntry, 'id'>) => {
    const newPassword: PasswordEntry = {
      ...passwordData,
      id: Date.now().toString(),
    };
    const updatedPasswords = [...passwords, newPassword];
    setPasswords(updatedPasswords);
    await savePasswordsToServer(updatedPasswords);
  };

  const updatePassword = async (id: string, updatedPassword: PasswordEntry) => {
    const updatedPasswords = passwords.map(password => 
      password.id === id ? updatedPassword : password
    );
    setPasswords(updatedPasswords);
    await savePasswordsToServer(updatedPasswords);
  };

  const deletePassword = async (id: string) => {
    const updatedPasswords = passwords.filter(password => password.id !== id);
    setPasswords(updatedPasswords);
    await savePasswordsToServer(updatedPasswords);
  };

  const getPassword = (id: string) => {
    return passwords.find(password => password.id === id);
  };

  const loadPasswords = async () => {
    if (!user?.username) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/passwords?username=${user.username}`);
      if (!response.ok) {
        throw new Error('Failed to load passwords');
      }
      const data = await response.json();
      setPasswords(data);
    } catch (error) {
      console.error('Error loading passwords:', error);
      setError('Failed to load passwords');
      setPasswords([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PasswordContext.Provider 
      value={{ 
        passwords, 
        addPassword, 
        updatePassword, 
        deletePassword, 
        getPassword,
        isLoading,
        error,
        folders,
        loadFolders,
        loadPasswords,
        addFolder,
        updateFolder,
        deleteFolder,
        movePassword,
        moveFolder
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
};

export const usePasswords = () => {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('usePasswords must be used within a PasswordProvider');
  }
  return context;
}; 