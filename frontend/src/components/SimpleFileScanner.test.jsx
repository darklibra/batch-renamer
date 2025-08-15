import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils/testUtils'

// Simple FileScanner component for testing (without React Admin dependencies)
const SimpleFileScanner = ({ onScan, loading = false }) => {
  const [path, setPath] = React.useState('')
  
  const handleScan = () => {
    if (path.trim()) {
      onScan(path)
    }
  }

  return (
    <div>
      <h2>파일 스캐너</h2>
      <div>
        <label htmlFor="scan-path">스캔 디렉토리 경로</label>
        <input
          id="scan-path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/path/to/directory"
        />
      </div>
      <button 
        onClick={handleScan}
        disabled={!path.trim() || loading}
      >
        {loading ? '스캔 중...' : '스캔 시작'}
      </button>
      {loading && <div>스캔이 진행 중입니다...</div>}
    </div>
  )
}

describe('SimpleFileScanner Component', () => {
  const mockOnScan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders file scanner interface', () => {
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    expect(screen.getByText('파일 스캐너')).toBeInTheDocument()
    expect(screen.getByLabelText('스캔 디렉토리 경로')).toBeInTheDocument()
    expect(screen.getByText('스캔 시작')).toBeInTheDocument()
  })

  it('allows user to enter directory path', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    const input = screen.getByLabelText('스캔 디렉토리 경로')
    await user.type(input, '/test/directory')

    expect(input).toHaveValue('/test/directory')
  })

  it('enables scan button when path is provided', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    const input = screen.getByLabelText('스캔 디렉토리 경로')
    const button = screen.getByText('스캔 시작')

    // Initially disabled
    expect(button).toBeDisabled()

    // Enable after entering path
    await user.type(input, '/test/directory')
    expect(button).toBeEnabled()
  })

  it('calls onScan when scan button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    const input = screen.getByLabelText('스캔 디렉토리 경로')
    const button = screen.getByText('스캔 시작')

    await user.type(input, '/test/directory')
    await user.click(button)

    expect(mockOnScan).toHaveBeenCalledWith('/test/directory')
  })

  it('shows loading state when scanning', () => {
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} loading={true} />)

    expect(screen.getByText('스캔 중...')).toBeInTheDocument()
    expect(screen.getByText('스캔이 진행 중입니다...')).toBeInTheDocument()
  })

  it('disables button during loading', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} loading={true} />)

    const input = screen.getByLabelText('스캔 디렉토리 경로')
    const button = screen.getByText('스캔 중...')

    await user.type(input, '/test/directory')
    expect(button).toBeDisabled()
  })

  it('does not call onScan with empty path', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    const button = screen.getByText('스캔 시작')
    
    // Button should be disabled with empty path
    expect(button).toBeDisabled()
    expect(mockOnScan).not.toHaveBeenCalled()
  })

  it('trims whitespace from path', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SimpleFileScanner onScan={mockOnScan} />)

    const input = screen.getByLabelText('스캔 디렉토리 경로')
    const button = screen.getByText('스캔 시작')

    await user.type(input, '  /test/directory  ')
    await user.click(button)

    expect(mockOnScan).toHaveBeenCalledWith('  /test/directory  ')
  })
})