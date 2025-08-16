import { lazy } from 'react';
import {
  Dashboard as DashboardIcon,
  FilePresent,
  Pattern,
  FolderOpen,
  Work,
  Settings,
  DriveFileMoveOutlined
} from '@mui/icons-material';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const FileListPage = lazy(() => import('../pages/FileListPage.jsx'));
const FileDetailsPage = lazy(() => import('../pages/FileDetailsPage.jsx'));
const PatternListPage = lazy(() => import('../pages/PatternListPage.jsx'));
const PatternDetailsPage = lazy(() => import('../pages/PatternDetailsPage.jsx'));
const FileScannerPage = lazy(() => import('../pages/FileScannerPage.jsx'));
const PatternManagerPage = lazy(() => import('../pages/PatternManagerPage.jsx'));
const SmartFileManagerPage = lazy(() => import('../pages/SmartFileManagerPage.jsx'));
const JobListPage = lazy(() => import('../pages/JobListPage.jsx'));

// Route configuration with metadata
export const routeConfig = [
  {
    path: '/',
    element: Dashboard,
    title: 'Dashboard',
    icon: DashboardIcon,
    showInNav: true,
    exact: true
  },
  {
    path: '/files',
    element: FileListPage,
    title: 'Files',
    icon: FilePresent,
    showInNav: true,
    exact: true
  },
  {
    path: '/files/:id',
    element: FileDetailsPage,
    title: 'File Details',
    showInNav: false,
    exact: false
  },
  {
    path: '/patterns',
    element: PatternListPage,
    title: 'Patterns',
    icon: Pattern,
    showInNav: true,
    exact: true
  },
  {
    path: '/patterns/:id',
    element: PatternDetailsPage,
    title: 'Pattern Details',
    showInNav: false,
    exact: false
  },
  {
    path: '/scanner',
    element: FileScannerPage,
    title: 'File Scanner',
    icon: FolderOpen,
    showInNav: true,
    exact: true
  },
  {
    path: '/pattern-manager',
    element: PatternManagerPage,
    title: 'Pattern Manager',
    icon: Settings,
    showInNav: true,
    exact: true
  },
  {
    path: '/smart-file-manager',
    element: SmartFileManagerPage,
    title: 'Smart File Manager',
    icon: DriveFileMoveOutlined,
    showInNav: true,
    exact: true
  },
  {
    path: '/jobs',
    element: JobListPage,
    title: 'Jobs',
    icon: Work,
    showInNav: true,
    exact: true
  }
];

// Navigation items (filtered from routes)
export const navigationItems = routeConfig.filter(route => route.showInNav);

// Route groups for organization
export const routeGroups = {
  main: ['/', '/files', '/patterns'],
  operations: ['/scanner', '/smart-file-manager'],
  management: ['/pattern-manager'],
  system: ['/jobs']
};