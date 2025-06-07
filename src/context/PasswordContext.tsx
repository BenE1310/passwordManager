import React, { createContext, useContext, useState, useEffect } from 'react';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  description?: string;
}

interface PasswordContextType {
  passwords: PasswordEntry[];
  addPassword: (password: Omit<PasswordEntry, 'id'>) => void;
  updatePassword: (id: string, password: PasswordEntry) => void;
  deletePassword: (id: string) => void;
  getPassword: (id: string) => PasswordEntry | undefined;
  isLoading: boolean;
  error: string | null;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load passwords from JSON file on initial mount
  useEffect(() => {
    const loadPasswords = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/data/stored_passwords.json');
        if (!response.ok) {
          throw new Error('Failed to load passwords');
        }
        const data = await response.json();
        console.log('Loaded passwords:', data);
        setPasswords(data.passwords);
      } catch (error) {
        console.error('Error loading passwords:', error);
        setError('Failed to load passwords');
        setPasswords([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPasswords();
  }, []);

  // Save passwords to the server
  const savePasswordsToServer = async (updatedPasswords: PasswordEntry[]) => {
    try {
      setError(null);
      const response = await fetch('/api/save-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passwords: updatedPasswords }),
      });

      if (!response.ok) {
        throw new Error('Failed to save passwords');
      }

      const result = await response.json();
      console.log('Save result:', result);
    } catch (error) {
      console.error('Error saving passwords:', error);
      setError('Failed to save passwords');
      // Reload the passwords to ensure UI is in sync with server
      const response = await fetch('/data/stored_passwords.json');
      if (response.ok) {
        const data = await response.json();
        setPasswords(data.passwords);
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

  return (
    <PasswordContext.Provider 
      value={{ 
        passwords, 
        addPassword, 
        updatePassword, 
        deletePassword, 
        getPassword,
        isLoading,
        error
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