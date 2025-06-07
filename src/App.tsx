import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, GlobalStyles, CircularProgress } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TemplateProvider } from './context/TemplateContext';
import { PasswordProvider } from './context/PasswordContext';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
        }}
      >
        <CircularProgress sx={{ color: '#2196f3' }} />
      </Box>
    );
  }

  return user ? <>{children}</> : null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PasswordProvider>
        <TemplateProvider>
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
        </TemplateProvider>
      </PasswordProvider>
    </AuthProvider>
  );
};

export default App; 