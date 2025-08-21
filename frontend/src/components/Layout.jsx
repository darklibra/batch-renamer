import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  ListSubheader
} from '@mui/material';
import {
  Menu as MenuIcon
} from '@mui/icons-material';
import { navigationItems, routeGroups } from '../routes/routes.config.js';
import { ThemeSwitcher } from '../themes/index.js';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const renderNavigationGroup = (groupName, paths) => {
    const groupItems = navigationItems.filter(item => paths.includes(item.path));
    if (groupItems.length === 0) return null;

    const groupLabels = {
      main: 'Core Features',
      operations: 'File Operations', 
      management: 'Management',
      system: 'System'
    };

    return (
      <React.Fragment key={groupName}>
        <ListSubheader component="div" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
          {groupLabels[groupName] || groupName}
        </ListSubheader>
        {groupItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <ListItem key={item.title} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{ pl: 2 }}
              >
                <ListItemIcon>
                  <IconComponent />
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          );
        })}
        <Divider sx={{ my: 1 }} />
      </React.Fragment>
    );
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Clear File
        </Typography>
      </Toolbar>
      <List sx={{ pt: 1 }}>
        {Object.entries(routeGroups).map(([groupName, paths]) => 
          renderNavigationGroup(groupName, paths)
        )}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Clear File Management System
          </Typography>
          
          {/* Theme Switcher in AppBar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeSwitcher variant="selector" color="inherit" />
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;