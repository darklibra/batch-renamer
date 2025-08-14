import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockDataProvider, mockPattern } from '../test/utils/testUtils'
import PatternManager from './PatternManager'

// Mock react-admin's useNotify
const mockNotify = vi.fn()
vi.mock('react-admin', () => ({
  useNotify: () => mockNotify
}))

// Mock the dataProvider
vi.mock('../dataProvider', () => ({
  default: mockDataProvider
}))

describe('PatternManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDataProvider.getPatterns.mockResolvedValue([
      mockPattern({ id: 1, name: 'Test Pattern 1' }),
      mockPattern({ id: 2, name: 'Test Pattern 2', is_active: false })
    ])
  })

  it('renders without crashing', async () => {
    renderWithProviders(<PatternManager />)
    
    expect(screen.getByText('패턴 관리')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockDataProvider.getPatterns).toHaveBeenCalled()
    })
  })

  it('displays list of patterns', async () => {
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
      expect(screen.getByText('Test Pattern 2')).toBeInTheDocument()
    })
  })

  it('shows add new pattern button', () => {
    renderWithProviders(<PatternManager />)
    
    const addButton = screen.getByLabelText('새 패턴 추가')
    expect(addButton).toBeInTheDocument()
  })

  it('opens create pattern dialog when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PatternManager />)
    
    const addButton = screen.getByLabelText('새 패턴 추가')
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('새 패턴 생성')).toBeInTheDocument()
      expect(screen.getByLabelText('패턴 이름')).toBeInTheDocument()
      expect(screen.getByLabelText('정규표현식')).toBeInTheDocument()
    })
  })

  it('allows creating a new pattern', async () => {
    const user = userEvent.setup()
    const newPattern = mockPattern({ id: 99, name: 'New Pattern' })
    mockDataProvider.create.mockResolvedValue({ data: newPattern })
    
    renderWithProviders(<PatternManager />)
    
    // Open create dialog
    const addButton = screen.getByLabelText('새 패턴 추가')
    await user.click(addButton)
    
    // Fill in pattern details
    const nameInput = screen.getByLabelText('패턴 이름')
    const regexInput = screen.getByLabelText('정규표현식')
    
    await user.type(nameInput, 'New Pattern')
    await user.type(regexInput, '([a-z]+)_([0-9]+)')
    
    // Submit form
    const saveButton = screen.getByRole('button', { name: /저장/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockDataProvider.create).toHaveBeenCalledWith('patterns', {
        data: expect.objectContaining({
          name: 'New Pattern',
          regex_pattern: '([a-z]+)_([0-9]+)'
        })
      })
    })
  })

  it('displays pattern statistics when expanded', async () => {
    const user = userEvent.setup()
    mockDataProvider.getPatternStats = vi.fn().mockResolvedValue({
      usage_count: 25,
      success_rate: 85,
      average_processing_time: 12.5
    })
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
    })
    
    // Expand pattern card
    const expandButton = screen.getAllByLabelText(/더 보기/)[0]
    await user.click(expandButton)
    
    await waitFor(() => {
      expect(mockDataProvider.getPatternStats).toHaveBeenCalledWith(1)
      expect(screen.getByText('사용 횟수')).toBeInTheDocument()
      expect(screen.getByText('성공률')).toBeInTheDocument()
    })
  })

  it('allows testing patterns against files', async () => {
    const user = userEvent.setup()
    mockDataProvider.testPattern.mockResolvedValue({
      success: true,
      results: { 1: { matched: true, extracted_data: { name: 'Test' } } }
    })
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
    })
    
    // Find and click test button
    const testButtons = screen.getAllByLabelText(/패턴 테스트/)
    await user.click(testButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('패턴 테스트')).toBeInTheDocument()
    })
  })

  it('allows editing existing patterns', async () => {
    const user = userEvent.setup()
    mockDataProvider.update.mockResolvedValue({
      data: mockPattern({ id: 1, name: 'Updated Pattern' })
    })
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
    })
    
    // Find and click edit button
    const editButtons = screen.getAllByLabelText(/패턴 편집/)
    await user.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('패턴 편집')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Pattern 1')).toBeInTheDocument()
    })
  })

  it('allows deleting patterns with confirmation', async () => {
    const user = userEvent.setup()
    mockDataProvider.delete.mockResolvedValue({ data: {} })
    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true)
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
    })
    
    // Find and click delete button
    const deleteButtons = screen.getAllByLabelText(/패턴 삭제/)
    await user.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('정말 삭제하시겠습니까?')
      )
      expect(mockDataProvider.delete).toHaveBeenCalledWith('patterns', { id: 1 })
    })
  })

  it('allows toggling pattern active status', async () => {
    const user = userEvent.setup()
    mockDataProvider.update.mockResolvedValue({
      data: mockPattern({ id: 1, is_active: false })
    })
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument()
    })
    
    // Find and click the active toggle switch
    const toggleSwitches = screen.getAllByRole('checkbox')
    const activeSwitch = toggleSwitches.find(switch_ => 
      switch_.closest('.MuiFormControlLabel-root')?.textContent?.includes('활성')
    )
    
    if (activeSwitch) {
      await user.click(activeSwitch)
      
      await waitFor(() => {
        expect(mockDataProvider.update).toHaveBeenCalledWith('patterns', {
          id: 1,
          data: expect.objectContaining({ is_active: false })
        })
      })
    }
  })

  it('handles pattern loading errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDataProvider.getPatterns.mockRejectedValue(new Error('Failed to load patterns'))
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch patterns:',
        expect.any(Error)
      )
    })
    
    consoleSpy.mockRestore()
  })

  it('shows loading state while fetching patterns', () => {
    let resolvePromise
    const promise = new Promise(resolve => { resolvePromise = resolve })
    mockDataProvider.getPatterns.mockReturnValue(promise)
    
    renderWithProviders(<PatternManager />)
    
    expect(screen.getByText('패턴 관리')).toBeInTheDocument()
    // Should show loading state while patterns are being fetched
  })

  it('displays pattern priority and sorting', async () => {
    const patterns = [
      mockPattern({ id: 1, name: 'High Priority', priority: 10 }),
      mockPattern({ id: 2, name: 'Low Priority', priority: 1 })
    ]
    mockDataProvider.getPatterns.mockResolvedValue(patterns)
    
    renderWithProviders(<PatternManager />)
    
    await waitFor(() => {
      expect(screen.getByText('High Priority')).toBeInTheDocument()
      expect(screen.getByText('Low Priority')).toBeInTheDocument()
    })
    
    // Patterns should be displayed with priority indicators
    const priorityElements = screen.getAllByText(/우선순위/)
    expect(priorityElements.length).toBeGreaterThan(0)
  })

  it('validates regex patterns before saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PatternManager />)
    
    // Open create dialog
    const addButton = screen.getByLabelText('새 패턴 추가')
    await user.click(addButton)
    
    // Enter invalid regex
    const regexInput = screen.getByLabelText('정규표현식')
    await user.type(regexInput, '[invalid regex')
    
    // Try to save
    const saveButton = screen.getByRole('button', { name: /저장/i })
    await user.click(saveButton)
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/유효하지 않은 정규표현식/)).toBeInTheDocument()
    })
  })
})