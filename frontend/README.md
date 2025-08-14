# Clear File Frontend

React-based frontend application for the Clear File management system, built with react-admin and Material-UI.

## Features

### 🔍 File Scanning System
- **Directory Browser**: Interactive directory selection for file scanning
- **Scan Configuration**: Customizable file type filters, size limits, and recursion depth
- **Real-time Progress**: Live progress updates during scanning operations
- **Scan Results**: Comprehensive scan results with file type summaries and error details

### 📊 Pattern Management System
- **Pattern Creation**: Visual pattern creation with regex validation and field mapping
- **Pattern Testing**: Test patterns against selected files with detailed results
- **Pattern Performance**: View pattern statistics and performance metrics
- **Pattern Validation**: Client-side validation for regex syntax and field mapping

### 📁 File Management
- **File List**: Comprehensive file listing with metadata display
- **Metadata Extraction**: View extracted metadata from applied patterns
- **Advanced Search**: Search files by content, metadata, and extraction status
- **Batch Operations**: Bulk metadata extraction and file operations

### 📈 Dashboard & Analytics
- **System Overview**: Real-time statistics on files, patterns, and metadata
- **Quick Actions**: One-click access to common operations
- **Performance Metrics**: Pattern effectiveness and system health monitoring

## Technology Stack

- **React 19** - Modern React with latest features
- **react-admin 5.10** - Admin interface framework
- **Material-UI 5** - Material Design components
- **Vite 7** - Fast build tool and dev server
- **React Router 6** - Client-side routing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Clear File backend running on port 8000

### Installation

Navigate to the `frontend` directory and install the dependencies:

```bash
cd frontend
npm install
```

### Environment Variables

Configure environment variables in `.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
VITE_REACT_APP_API_BASE_URL=http://127.0.0.1:8000
```

### Running the Development Server

To start the development server, run:

```bash
npm run dev
```

This will start the application at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

Build artifacts will be generated in the `dist/` directory.

## Usage Guide

### File Scanning Process

1. **Navigate to File Scanner** (`/scanner`)
2. **Select Directory**: Use the directory browser to choose scan location
3. **Configure Scan**: Set file types, size limits, and recursion depth
4. **Start Scan**: Monitor progress in real-time
5. **View Results**: Review scan statistics and navigate to file list

### Pattern Management

1. **Navigate to Pattern Manager** (`/pattern-manager`)
2. **Create Pattern**: 
   - Enter pattern name and description
   - Write regex pattern for filename matching
   - Define field mapping in JSON format
   - Set priority and activation status
3. **Test Pattern**: Select test files and validate pattern effectiveness
4. **Monitor Performance**: View pattern statistics and success rates

### Testing

Currently, there are no specific frontend tests configured. For future testing, you might consider:

- **Unit Tests**: Using testing libraries like `Vitest` or `Jest` for individual components and hooks.
- **End-to-End Tests**: Using tools like `Playwright` or `Cypress` for testing user flows.