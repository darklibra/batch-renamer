import * as React from "react";
import { Admin, Resource, CustomRoutes, Layout, Menu } from "react-admin";
import { Route } from "react-router-dom";
import {
    Dashboard, FilePresent, Pattern, Settings, Analytics,
    FolderOpen, BugReport, Security
} from '@mui/icons-material';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';

// Data Provider
import dataProvider from './dataProvider';

// Import existing components  
import { FileList, FileShow } from './files';
import { PatternList, PatternShow, PatternCreate, PatternEdit } from './patterns';
import { JobList, JobShow } from './jobs';

// Import new components
import FileScanner from './components/FileScanner';
import PatternManager from './components/PatternManager';

// ===========================================
// DASHBOARD COMPONENT
// ===========================================
const DashboardComponent = () => {
    const [stats, setStats] = React.useState({
        total_files: 0,
        total_patterns: 0,
        files_with_metadata: 0,
        active_patterns: 0
    });

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const result = await dataProvider.getSystemOverview();
                setStats(result);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            }
        };
        fetchStats();
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Clear File Dashboard
            </Typography>
            
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FilePresent color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats.total_files || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Files
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Pattern color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats.total_patterns || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Patterns
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Analytics color="info" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats.files_with_metadata || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Files with Metadata
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Security color="warning" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats.active_patterns || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Active Patterns
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Quick Actions
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    File Management
                                </Typography>
                                <Typography variant="body2" color="textSecondary" paragraph>
                                    Scan new directories, manage existing files, and view extracted metadata.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <button 
                                        onClick={() => window.location.href = '#/scanner'} 
                                        style={{ 
                                            padding: '8px 16px', 
                                            backgroundColor: '#1976d2', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Scan Files
                                    </button>
                                    <button 
                                        onClick={() => window.location.href = '#/files'} 
                                        style={{ 
                                            padding: '8px 16px', 
                                            backgroundColor: '#4caf50', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View Files
                                    </button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Pattern Management
                                </Typography>
                                <Typography variant="body2" color="textSecondary" paragraph>
                                    Create and manage regex patterns for extracting structured data from filenames.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <button 
                                        onClick={() => window.location.href = '#/pattern-manager'} 
                                        style={{ 
                                            padding: '8px 16px', 
                                            backgroundColor: '#ff9800', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Manage Patterns
                                    </button>
                                    <button 
                                        onClick={() => window.location.href = '#/patterns'} 
                                        style={{ 
                                            padding: '8px 16px', 
                                            backgroundColor: '#9c27b0', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View All Patterns
                                    </button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

// ===========================================
// CUSTOM MENU COMPONENT
// ===========================================
const CustomMenu = () => (
    <Menu>
        <Menu.DashboardItem />
        <Menu.Item to="/scanner" primaryText="File Scanner" leftIcon={<FolderOpen />} />
        <Menu.Item to="/pattern-manager" primaryText="Pattern Manager" leftIcon={<Pattern />} />
        <Menu.ResourceItem name="files" />
        <Menu.ResourceItem name="patterns" />
        <Menu.ResourceItem name="jobs" />
    </Menu>
);

// ===========================================
// CUSTOM LAYOUT WITH MENU
// ===========================================
const CustomLayout = (props) => <Layout {...props} menu={CustomMenu} />;

// ===========================================
// MAIN APP COMPONENT
// ===========================================
const App = () => (
    <Admin 
        dataProvider={dataProvider}
        layout={CustomLayout}
        dashboard={DashboardComponent}
        title="Clear File Management System"
    >
        {/* File Management Resources */}
        <Resource 
            name="files" 
            list={FileList}
            show={FileShow}
            options={{ label: 'Files' }}
        />
        
        {/* Pattern Management Resources */}
        <Resource 
            name="patterns"
            list={PatternList}
            show={PatternShow}
            create={PatternCreate}
            edit={PatternEdit}
            options={{ label: 'Patterns' }}
        />
        
        {/* Job Management Resources */}
        <Resource 
            name="jobs"
            list={JobList}
            show={JobShow}
            options={{ label: 'Jobs' }}
        />

        {/* Custom Routes for New Components */}
        <CustomRoutes>
            <Route path="/scanner" element={<FileScanner />} />
            <Route path="/pattern-manager" element={<PatternManager />} />
        </CustomRoutes>
    </Admin>
);

export default App;