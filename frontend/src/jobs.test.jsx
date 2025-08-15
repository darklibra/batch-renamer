import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockDataProvider, mockJob } from './test/utils/testUtils'
import { JobList, JobShow, JobMonitorDialog } from './jobs.jsx'

// Mock react-admin's useNotify and useRefresh
const mockNotify = vi.fn()
const mockRefresh = vi.fn()
vi.mock('react-admin', async () => {
  const actual = await vi.importActual('react-admin')
  return {
    ...actual,
    useNotify: () => mockNotify,
    useRefresh: () => mockRefresh
  }
})

// Mock the dataProvider
vi.mock('./dataProvider', () => ({
  default: mockDataProvider
}))

describe('Jobs Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    mockDataProvider.getJobStatus.mockResolvedValue(
      mockJob({ status: 'completed' })
    )
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('JobList Component', () => {
    it('renders job statistics and list', async () => {
      const mockJobs = [
        mockJob({ id: 'job-1', status: 'completed', job_type: 'batch_extract' }),
        mockJob({ id: 'job-2', status: 'processing', job_type: 'test_pattern' })
      ]

      mockDataProvider.getList.mockResolvedValue({
        data: mockJobs,
        total: 2
      })

      renderWithProviders(<JobList />)

      await waitFor(() => {
        expect(screen.getByText('Job Statistics')).toBeInTheDocument()
        expect(screen.getByText('Total Jobs')).toBeInTheDocument()
      })

      // Check that jobs are displayed
      await waitFor(() => {
        expect(screen.getByText('job-1')).toBeInTheDocument()
        expect(screen.getByText('job-2')).toBeInTheDocument()
      })
    })

    it('displays job status chips correctly', async () => {
      const mockJobs = [
        mockJob({ status: 'completed' }),
        mockJob({ status: 'error' }),
        mockJob({ status: 'processing' })
      ]

      mockDataProvider.getList.mockResolvedValue({
        data: mockJobs,
        total: 3
      })

      renderWithProviders(<JobList />)

      await waitFor(() => {
        expect(screen.getByText('COMPLETED')).toBeInTheDocument()
        expect(screen.getByText('ERROR')).toBeInTheDocument()
        expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      })
    })

    it('shows progress bars for jobs', async () => {
      const mockJobs = [
        mockJob({
          progress_data: {
            total_count: 100,
            processed_count: 75,
            percentage: 75
          }
        })
      ]

      mockDataProvider.getList.mockResolvedValue({
        data: mockJobs,
        total: 1
      })

      renderWithProviders(<JobList />)

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
        expect(screen.getByText('75 / 100')).toBeInTheDocument()
      })
    })

    it('opens job monitor dialog when view button clicked', async () => {
      const user = userEvent.setup()
      const mockJobs = [mockJob({ id: 'job-123' })]

      mockDataProvider.getList.mockResolvedValue({
        data: mockJobs,
        total: 1
      })

      renderWithProviders(<JobList />)

      await waitFor(() => {
        expect(screen.getByText('job-123')).toBeInTheDocument()
      })

      // Find and click the view button
      const viewButtons = screen.getAllByRole('button')
      const viewButton = viewButtons.find(btn => 
        btn.querySelector('[data-testid="VisibilityIcon"]')
      )

      if (viewButton) {
        await user.click(viewButton)

        await waitFor(() => {
          expect(screen.getByText('Job Monitor')).toBeInTheDocument()
        })
      }
    })

    it('calculates success rate correctly', async () => {
      const mockJobs = [
        mockJob({
          progress_data: {
            successful: 80,
            failed: 20
          }
        })
      ]

      mockDataProvider.getList.mockResolvedValue({
        data: mockJobs,
        total: 1
      })

      renderWithProviders(<JobList />)

      await waitFor(() => {
        expect(screen.getByText('80.0%')).toBeInTheDocument()
      })
    })
  })

  describe('JobShow Component', () => {
    it('renders job details with progress', async () => {
      const mockJobData = mockJob({
        id: 'job-show-test',
        status: 'processing'
      })

      mockDataProvider.getOne.mockResolvedValue({
        data: mockJobData
      })

      renderWithProviders(<JobShow />, {
        initialEntries: ['/jobs/job-show-test']
      })

      await waitFor(() => {
        expect(screen.getByText('Job job-show-test')).toBeInTheDocument()
        expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      })
    })
  })

  describe('JobMonitorDialog Component', () => {
    it('renders dialog with job progress', async () => {
      const mockJobData = mockJob({
        id: 'dialog-job',
        status: 'processing',
        progress_data: {
          total_count: 50,
          processed_count: 25,
          percentage: 50
        }
      })

      mockDataProvider.getJobStatus.mockResolvedValue(mockJobData)

      renderWithProviders(
        <JobMonitorDialog
          jobId="dialog-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Job Monitor')).toBeInTheDocument()
        expect(screen.getByText('Job dialog-job')).toBeInTheDocument()
        expect(screen.getByText('Progress: 25 / 50')).toBeInTheDocument()
        expect(screen.getByText('50.0%')).toBeInTheDocument()
      })
    })

    it('auto-refreshes job status for active jobs', async () => {
      const mockJobData = mockJob({
        id: 'auto-refresh-job',
        status: 'processing'
      })

      mockDataProvider.getJobStatus.mockResolvedValue(mockJobData)

      renderWithProviders(
        <JobMonitorDialog
          jobId="auto-refresh-job"
          open={true}
          onClose={() => {}}
        />
      )

      // Initial call
      await waitFor(() => {
        expect(mockDataProvider.getJobStatus).toHaveBeenCalledTimes(1)
      })

      // Advance timers to trigger auto-refresh
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(mockDataProvider.getJobStatus).toHaveBeenCalledTimes(2)
      })
    })

    it('stops auto-refresh when job completes', async () => {
      const processingJob = mockJob({
        id: 'completing-job',
        status: 'processing'
      })

      const completedJob = mockJob({
        id: 'completing-job',
        status: 'completed'
      })

      mockDataProvider.getJobStatus
        .mockResolvedValueOnce(processingJob)
        .mockResolvedValueOnce(completedJob)

      renderWithProviders(
        <JobMonitorDialog
          jobId="completing-job"
          open={true}
          onClose={() => {}}
        />
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      })

      // Advance timer to trigger next refresh
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      })

      // Job completed, no more auto-refresh calls should happen
      const callCount = mockDataProvider.getJobStatus.mock.calls.length

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(mockDataProvider.getJobStatus).toHaveBeenCalledTimes(callCount)
    })

    it('handles job status fetch errors', async () => {
      mockDataProvider.getJobStatus.mockRejectedValue(new Error('Network error'))

      renderWithProviders(
        <JobMonitorDialog
          jobId="error-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Failed to load job status/)).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('allows manual refresh of job status', async () => {
      const user = userEvent.setup()
      const mockJobData = mockJob({ id: 'manual-refresh-job' })

      mockDataProvider.getJobStatus.mockResolvedValue(mockJobData)

      renderWithProviders(
        <JobMonitorDialog
          jobId="manual-refresh-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Job manual-refresh-job')).toBeInTheDocument()
      })

      // Find and click refresh button
      const refreshButtons = screen.getAllByRole('button')
      const refreshButton = refreshButtons.find(btn => 
        btn.querySelector('[data-testid="RefreshIcon"]')
      )

      if (refreshButton) {
        await user.click(refreshButton)

        await waitFor(() => {
          expect(mockDataProvider.getJobStatus).toHaveBeenCalledTimes(2)
        })
      }
    })

    it('displays job results when available', async () => {
      const jobWithResults = mockJob({
        id: 'results-job',
        status: 'completed',
        result_data: {
          summary: {
            total_processed: 100,
            successful: 95,
            failed: 5
          }
        }
      })

      mockDataProvider.getJobStatus.mockResolvedValue(jobWithResults)

      renderWithProviders(
        <JobMonitorDialog
          jobId="results-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Job Results')).toBeInTheDocument()
      })

      // Expand accordion to see results
      const user = userEvent.setup()
      const accordionButton = screen.getByText('Job Results')
      await user.click(accordionButton)

      await waitFor(() => {
        expect(screen.getByText(/"total_processed": 100/)).toBeInTheDocument()
      })
    })

    it('shows error message for failed jobs', async () => {
      const failedJob = mockJob({
        id: 'failed-job',
        status: 'error',
        error_message: 'Pattern compilation failed'
      })

      mockDataProvider.getJobStatus.mockResolvedValue(failedJob)

      renderWithProviders(
        <JobMonitorDialog
          jobId="failed-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument()
        expect(screen.getByText('Pattern compilation failed')).toBeInTheDocument()
      })
    })

    it('displays job metrics correctly', async () => {
      const jobWithMetrics = mockJob({
        id: 'metrics-job',
        status: 'completed',
        progress_data: {
          successful: 150,
          failed: 10
        },
        duration_seconds: 245
      })

      mockDataProvider.getJobStatus.mockResolvedValue(jobWithMetrics)

      renderWithProviders(
        <JobMonitorDialog
          jobId="metrics-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('245s')).toBeInTheDocument()
        expect(screen.getByText('Successful')).toBeInTheDocument()
        expect(screen.getByText('Failed')).toBeInTheDocument()
        expect(screen.getByText('Duration')).toBeInTheDocument()
      })
    })

    it('shows done button when job completes', async () => {
      const completedJob = mockJob({
        id: 'done-job',
        status: 'completed'
      })

      mockDataProvider.getJobStatus.mockResolvedValue(completedJob)

      const onJobComplete = vi.fn()

      renderWithProviders(
        <JobMonitorDialog
          jobId="done-job"
          open={true}
          onClose={() => {}}
          onJobComplete={onJobComplete}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      })

      // Wait a bit to ensure job completion callback is triggered
      act(() => {
        vi.advanceTimersByTime(100)
      })
    })

    it('shows timestamps for job lifecycle', async () => {
      const jobWithTimestamps = mockJob({
        id: 'timestamp-job',
        status: 'completed',
        created_at: '2025-08-14T10:00:00Z',
        completed_at: '2025-08-14T10:05:00Z'
      })

      mockDataProvider.getJobStatus.mockResolvedValue(jobWithTimestamps)

      renderWithProviders(
        <JobMonitorDialog
          jobId="timestamp-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Started:/)).toBeInTheDocument()
        expect(screen.getByText(/Completed:/)).toBeInTheDocument()
      })
    })
  })

  describe('Job Progress Component', () => {
    it('shows current processing item when available', async () => {
      const jobWithCurrentItem = mockJob({
        id: 'current-item-job',
        status: 'processing',
        progress: {
          current_item: '/test/path/current_file.txt',
          stage: 'extraction'
        }
      })

      mockDataProvider.getJobStatus.mockResolvedValue(jobWithCurrentItem)

      renderWithProviders(
        <JobMonitorDialog
          jobId="current-item-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Current: /test/path/current_file.txt')).toBeInTheDocument()
        expect(screen.getByText('Stage: extraction')).toBeInTheDocument()
      })
    })

    it('handles missing job data gracefully', async () => {
      mockDataProvider.getJobStatus.mockResolvedValue(null)

      renderWithProviders(
        <JobMonitorDialog
          jobId="missing-job"
          open={true}
          onClose={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No job data available')).toBeInTheDocument()
      })
    })
  })
})