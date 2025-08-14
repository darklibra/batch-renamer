import React from 'react'
import { render } from '@testing-library/react'
import { Admin, Resource, testDataProvider } from 'react-admin'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, createTheme } from '@mui/material/styles'

// Create a default theme for testing
const theme = createTheme()

// Create a custom render function that includes all necessary providers
export function renderWithProviders(
  ui,
  {
    initialEntries = ['/'],
    dataProvider = testDataProvider(),
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Render component within React Admin context
export function renderWithAdmin(
  ui,
  {
    dataProvider = testDataProvider(),
    initialEntries = ['/'],
    resources = [],
    ...renderOptions
  } = {}
) {
  function AdminWrapper({ children }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider theme={theme}>
          <Admin dataProvider={dataProvider} disableTelemetry>
            {resources.map((resource, index) => (
              <Resource key={index} {...resource} />
            ))}
            {children}
          </Admin>
        </ThemeProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: AdminWrapper, ...renderOptions })
}

// Mock data generators
export const mockFile = (overrides = {}) => ({
  id: 1,
  filename: 'test_file.txt',
  extension: 'txt',
  path: '/test/path',
  full_path: '/test/path/test_file.txt',
  extracted_data: {
    name: 'Test File',
    category: 'document'
  },
  pattern_id: 1,
  created_at: '2025-08-14T10:00:00Z',
  updated_at: '2025-08-14T10:00:00Z',
  ...overrides
})

export const mockPattern = (overrides = {}) => ({
  id: 1,
  name: 'Test Pattern',
  regex_pattern: '([a-zA-Z]+)_([0-9]+)\\.(txt|pdf)',
  field_mapping: {
    type: '$1:s$',
    number: '$2:d$',
    extension: '$3:s$'
  },
  priority: 10,
  is_active: true,
  created_at: '2025-08-14T09:00:00Z',
  ...overrides
})

export const mockJob = (overrides = {}) => ({
  id: 'job-12345',
  job_type: 'file_indexing',
  directory_path: '/test/path',
  status: 'completed',
  stage: 'complete',
  progress_data: {
    total_count: 100,
    processed_count: 100,
    successful: 95,
    failed: 5
  },
  created_at: '2025-08-14T10:00:00Z',
  completed_at: '2025-08-14T10:05:00Z',
  ...overrides
})

export const mockSystemStats = (overrides = {}) => ({
  total_files: 1250,
  total_patterns: 15,
  files_with_metadata: 987,
  active_patterns: 12,
  recent_activities: [
    { type: 'file_scan', count: 145, timestamp: '2025-08-14T10:30:00Z' },
    { type: 'pattern_match', count: 89, timestamp: '2025-08-14T09:45:00Z' }
  ],
  performance_metrics: {
    average_scan_time: 2.3,
    cache_hit_rate: 89.5,
    success_rate: 95.2
  },
  ...overrides
})

// Custom matchers helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

// Mock implementations
export const mockDataProvider = {
  getList: vi.fn(() => Promise.resolve({ data: [], total: 0 })),
  getOne: vi.fn(() => Promise.resolve({ data: {} })),
  create: vi.fn(() => Promise.resolve({ data: {} })),
  update: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
  getMany: vi.fn(() => Promise.resolve({ data: [] })),
  getManyReference: vi.fn(() => Promise.resolve({ data: [], total: 0 })),
  updateMany: vi.fn(() => Promise.resolve({ data: [] })),
  deleteMany: vi.fn(() => Promise.resolve({ data: [] })),
  getSystemOverview: vi.fn(() => Promise.resolve(mockSystemStats())),
  getPatterns: vi.fn(() => Promise.resolve([mockPattern()])),
  testPattern: vi.fn(() => Promise.resolve({
    success: true,
    results: { 1: { matched: true, extracted_data: { name: 'Test' } } }
  })),
  startFileIndexing: vi.fn(() => Promise.resolve({ job_id: 'job-12345' })),
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'