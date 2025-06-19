import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, GlobalStyles } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PasswordProvider } from './context/PasswordContext';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // If authenticated, render children
  return isAuthenticated ? <>{children}</> : null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PasswordProvider>
          <CssBaseline />
          <GlobalStyles 
            styles={{
              'html, body': {
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                backgroundColor: '#0a1929',
              },
              '#root': {
                width: '100%',
                height: '100vh',
                overflow: 'auto',
              }
            }}
          />
          <Box sx={{ 
            width: '100%', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
            overflow: 'auto'
          }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Box>
      </PasswordProvider>
    </AuthProvider>
  );
};

export default App; 