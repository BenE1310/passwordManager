import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateCredentials: (currentUsername: string, currentPassword: string, newUsername: string, newPassword: string) => Promise<boolean>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        setError(data.message || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect to authentication server');
      return false;
    }
  };

  const updateCredentials = async (
    currentUsername: string,
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUsername,
          currentPassword,
          newUsername,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        setError(data.message || 'Failed to update credentials');
        return false;
      }
    } catch (error) {
      console.error('Update credentials error:', error);
      setError('Failed to connect to authentication server');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateCredentials,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 