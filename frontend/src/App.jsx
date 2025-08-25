import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Layout and Router Components
import Layout from './components/Layout.jsx';
import AppRouter from './routes/AppRouter.jsx';

// Enhanced Theme System
import { ClearFileThemeProvider } from './themes/index.js';

const App = () => {
  return (
    <ClearFileThemeProvider
      options={{
        enableAutoTheme: true,
        enableSystemTheme: true,
        enableCssBaseline: true,
        enableTokenInjection: true
      }}
      onThemeChange={(themeMode, resolvedMode) => {
        // Theme changed: { themeMode, resolvedMode }
      }}
    >
      <Router>
        <Layout>
          <AppRouter />
        </Layout>
      </Router>
    </ClearFileThemeProvider>
  );
};

export default App;