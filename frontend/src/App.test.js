import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithAdmin, mockSystemStats } from './test/utils/testUtils'
import App from './App'

// Mock the data provider
const mockDataProvider = {
  getList: vi.fn(),
  getOne: vi.fn(),
  getMany: vi.fn(),
  getManyReference: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  getSystemOverview: vi.fn()
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDataProvider.getSystemOverview.mockResolvedValue(mockSystemStats())
  })

  it('renders without crashing', async () => {
    renderWithAdmin(<App />, {
      dataProvider: mockDataProvider,
      initialEntries: ['/']
    })

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByText('Clear File Dashboard')).toBeInTheDocument()
    })
  })

  it('displays system statistics on dashboard', async () => {
    const mockStats = mockSystemStats({
      total_files: 500,
      total_patterns: 8,
      files_with_metadata: 350,
      active_patterns: 6
    })
    
    mockDataProvider.getSystemOverview.mockResolvedValue(mockStats)

    renderWithAdmin(<App />, {
      dataProvider: mockDataProvider,
      initialEntries: ['/']
    })

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('350')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  it('handles data provider errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDataProvider.getSystemOverview.mockRejectedValue(new Error('API Error'))

    renderWithAdmin(<App />, {
      dataProvider: mockDataProvider,
      initialEntries: ['/']
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch dashboard stats:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('displays default values when stats are empty', async () => {
    mockDataProvider.getSystemOverview.mockResolvedValue({
      total_files: 0,
      total_patterns: 0,
      files_with_metadata: 0,
      active_patterns: 0
    })

    renderWithAdmin(<App />, {
      dataProvider: mockDataProvider,
      initialEntries: ['/']
    })

    await waitFor(() => {
      // Check that zeros are displayed correctly
      const zeroElements = screen.getAllByText('0')
      expect(zeroElements.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('renders all main navigation elements', async () => {
    renderWithAdmin(<App />, {
      dataProvider: mockDataProvider,
      initialEntries: ['/']
    })

    await waitFor(() => {
      // Check for key UI elements that should be present
      expect(screen.getByText('Total Files')).toBeInTheDocument()
      expect(screen.getByText('Total Patterns')).toBeInTheDocument()
      expect(screen.getByText('Files with Metadata')).toBeInTheDocument()
      expect(screen.getByText('Active Patterns')).toBeInTheDocument()
    })
  })
})
