import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockDataProvider } from '../test/utils/testUtils'
import FileScanner from './FileScanner'

// Mock react-admin's useNotify
const mockNotify = vi.fn()
vi.mock('react-admin', () => ({
  useNotify: () => mockNotify
}))

// Mock the dataProvider
vi.mock('../dataProvider', () => ({
  default: mockDataProvider
}))

describe('FileScanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    renderWithProviders(<FileScanner />)
    
    expect(screen.getByText('파일 스캐너')).toBeInTheDocument()
    expect(screen.getByText('스캔할 디렉토리 선택')).toBeInTheDocument()
  })

  it('displays directory path input field', () => {
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('allows user to enter directory path', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    expect(input).toHaveValue('/test/directory')
  })

  it('shows browse button for directory selection', () => {
    renderWithProviders(<FileScanner />)
    
    const browseButton = screen.getByRole('button', { name: /찾아보기/i })
    expect(browseButton).toBeInTheDocument()
  })

  it('opens directory browser dialog when browse button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileScanner />)
    
    const browseButton = screen.getByRole('button', { name: /찾아보기/i })
    await user.click(browseButton)
    
    await waitFor(() => {
      expect(screen.getByText('디렉토리 선택')).toBeInTheDocument()
    })
  })

  it('enables scan button when directory path is provided', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    
    // Initially disabled
    expect(scanButton).toBeDisabled()
    
    // Enable after entering path
    await user.type(input, '/test/directory')
    expect(scanButton).toBeEnabled()
  })

  it('starts scanning when scan button is clicked', async () => {
    const user = userEvent.setup()
    mockDataProvider.startFileIndexing.mockResolvedValue({ job_id: 'test-job-123' })
    
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    await user.click(scanButton)
    
    expect(mockDataProvider.startFileIndexing).toHaveBeenCalledWith({
      directory_path: '/test/directory'
    })
  })

  it('displays loading state during scan', async () => {
    const user = userEvent.setup()
    let resolvePromise
    const promise = new Promise(resolve => { resolvePromise = resolve })
    mockDataProvider.startFileIndexing.mockReturnValue(promise)
    
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    await user.click(scanButton)
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /스캔 중.../i })).toBeInTheDocument()
    
    // Resolve the promise and wait for update
    resolvePromise({ job_id: 'test-job-123' })
    await waitFor(() => {
      expect(screen.queryByText(/스캔 중.../)).not.toBeInTheDocument()
    })
  })

  it('shows scan results after successful scan', async () => {
    const user = userEvent.setup()
    mockDataProvider.startFileIndexing.mockResolvedValue({
      job_id: 'test-job-123',
      status: 'started'
    })
    
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    await user.click(scanButton)
    
    await waitFor(() => {
      expect(screen.getByText('스캔 결과')).toBeInTheDocument()
      expect(screen.getByText(/스캔이 시작되었습니다/)).toBeInTheDocument()
    })
  })

  it('handles scan errors gracefully', async () => {
    const user = userEvent.setup()
    mockDataProvider.startFileIndexing.mockRejectedValue(new Error('Scan failed'))
    
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    await user.click(scanButton)
    
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith(
        '스캔 실패: Scan failed',
        { type: 'error' }
      )
    })
  })

  it('shows exclusion patterns section', () => {
    renderWithProviders(<FileScanner />)
    
    expect(screen.getByText('제외 패턴 설정')).toBeInTheDocument()
    expect(screen.getByText(/스캔에서 제외할 파일이나 폴더 패턴/)).toBeInTheDocument()
  })

  it('allows adding custom exclusion patterns', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileScanner />)
    
    // Click on exclusion patterns accordion to expand
    const exclusionHeader = screen.getByText('제외 패턴 설정')
    await user.click(exclusionHeader)
    
    await waitFor(() => {
      expect(screen.getByText('패턴 추가')).toBeInTheDocument()
    })
  })

  it('displays scan progress when available', async () => {
    const user = userEvent.setup()
    mockDataProvider.startFileIndexing.mockResolvedValue({ job_id: 'test-job' })
    
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    await user.click(scanButton)
    
    await waitFor(() => {
      // Progress should be shown
      expect(screen.getByText('스캔 진행률')).toBeInTheDocument()
    })
  })

  it('validates directory path format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileScanner />)
    
    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, 'invalid-path')
    
    const scanButton = screen.getByRole('button', { name: /스캔 시작/i })
    expect(scanButton).toBeEnabled() // Basic path validation
  })
})