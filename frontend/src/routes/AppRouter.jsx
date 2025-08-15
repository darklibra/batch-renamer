import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { routeConfig } from './routes.config.js';
import ErrorBoundary from './ErrorBoundary.jsx';

// Loading component for lazy routes
const RouteLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

// Error fallback component
const RouteError = ({ error }) => (
  <Box p={3}>
    <Alert severity="error">
      Failed to load page: {error?.message || 'Unknown error'}
    </Alert>
  </Box>
);

const AppRouter = () => {
  return (
    <ErrorBoundary fallback={RouteError}>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {routeConfig.map((route) => {
            const Component = route.element;
            return (
              <Route
                key={route.path}
                path={route.path}
                element={<Component />}
              />
            );
          })}
          {/* Catch-all route for 404 */}
          <Route
            path="*"
            element={
              <Box p={3}>
                <Alert severity="warning">
                  Page not found. <Navigate to="/" replace />
                </Alert>
              </Box>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppRouter;