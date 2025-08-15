import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import customDataProvider from './dataProvider'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock API base URL for testing
const API_BASE = 'http://127.0.0.1:8000/api/v1'

// MSW server setup for API mocking
const server = setupServer(
  http.get(`${API_BASE}/files`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const per_page = parseInt(url.searchParams.get('per_page') || '20')

    const mockFiles = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      filename: `test_file_${i + 1}.txt`,
      extension: 'txt',
      path: '/test/path',
      full_path: `/test/path/test_file_${i + 1}.txt`,
      extracted_data: { name: `Test File ${i + 1}` },
      pattern_id: 1
    }))

    return HttpResponse.json(mockFiles, {
      headers: { 'Content-Range': `files 0-4/25` }
    })
  }),

  http.get(`${API_BASE}/files/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id),
      filename: `test_file_${params.id}.txt`,
      extension: 'txt',
      path: '/test/path',
      full_path: `/test/path/test_file_${params.id}.txt`,
      extracted_data: { name: `Test File ${params.id}` },
      pattern_id: 1
    })
  }),

  http.post(`${API_BASE}/patterns`, ({ request }) => {
    return HttpResponse.json({
      id: 99,
      name: 'New Pattern',
      regex_pattern: '([a-z]+)_([0-9]+)',
      field_mapping: { type: '$1:s$', number: '$2:d$' },
      priority: 10,
      is_active: true
    }, { status: 201 })
  }),

  http.post(`${API_BASE}/files/index`, ({ request }) => {
    return HttpResponse.json({
      job_id: 'job-12345',
      status: 'started',
      message: 'File indexing started'
    })
  }),

  http.post(`${API_BASE}/patterns/test`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      total_files_tested: 5,
      successful_matches: 3,
      match_rate_percent: 60,
      results: {
        1: { matched: true, extracted_data: { name: 'Test' } },
        2: { matched: false, extracted_data: null }
      }
    })
  }),

  http.get(`${API_BASE}/patterns/stats/overview`, () => {
    return HttpResponse.json({
      total_files: 1250,
      total_patterns: 15,
      files_with_metadata: 987,
      active_patterns: 12
    })
  }),

  http.get(`${API_BASE}/patterns`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Pattern 1',
        regex_pattern: '([a-z]+)_([0-9]+)',
        field_mapping: { type: '$1:s$', number: '$2:d$' },
        priority: 10,
        is_active: true
      }
    ])
  }),

  http.post(`${API_BASE}/test-pattern`, () => {
    return HttpResponse.json({
      success: true,
      total_files_tested: 5,
      successful_matches: 3,
      match_rate_percent: 60,
      results: {
        1: { matched: true, extracted_data: { name: 'Test' } },
        2: { matched: false, extracted_data: null }
      }
    })
  })
)

describe('DataProvider API Integration Tests', () => {
  beforeEach(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())

  describe('getList method', () => {
    it('fetches files list with pagination', async () => {
      const result = await customDataProvider.getList('files', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'created_at', order: 'desc' },
        filter: {}
      })

      expect(result.data).toHaveLength(5)
      expect(result.total).toBe(25)
      expect(result.data[0]).toHaveProperty('id')
      expect(result.data[0]).toHaveProperty('filename')
    })

    it('handles pagination parameters correctly', async () => {
      const result = await customDataProvider.getList('files', {
        pagination: { page: 2, perPage: 10 },
        sort: { field: 'filename', order: 'asc' },
        filter: { extension: 'txt' }
      })

      expect(result).toBeDefined()
      expect(result.data).toBeInstanceOf(Array)
    })

    it('handles API errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/files`, () => {
          return HttpResponse.json(
            { detail: 'Database connection error' },
            { status: 500 }
          )
        })
      )

      await expect(customDataProvider.getList('files', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'created_at', order: 'desc' },
        filter: {}
      })).rejects.toThrow('Database connection error')
    })
  })

  describe('getOne method', () => {
    it('fetches single file by id', async () => {
      const result = await customDataProvider.getOne('files', { id: 1 })

      expect(result.data).toHaveProperty('id', 1)
      expect(result.data).toHaveProperty('filename', 'test_file_1.txt')
      expect(result.data).toHaveProperty('extracted_data')
    })
  })

  describe('create method', () => {
    it('creates new pattern successfully', async () => {
      const patternData = {
        name: 'New Pattern',
        regex_pattern: '([a-z]+)_([0-9]+)',
        field_mapping: { type: '$1:s$', number: '$2:d$' },
        priority: 10,
        is_active: true
      }

      const result = await customDataProvider.create('patterns', { data: patternData })

      expect(result.data).toHaveProperty('id', 99)
      expect(result.data).toHaveProperty('name', 'New Pattern')
      expect(result.data).toHaveProperty('regex_pattern', '([a-z]+)_([0-9]+)')
    })
  })

  describe('Custom API methods', () => {
    it('indexes files successfully', async () => {
      const result = await customDataProvider.indexFiles('/test/directory')

      expect(result).toHaveProperty('job_id', 'job-12345')
      expect(result).toHaveProperty('status', 'started')
      expect(result).toHaveProperty('message')
    })

    it('tests pattern successfully', async () => {
      const result = await customDataProvider.testPattern([1, 2, 3], '([a-z]+)_([0-9]+)')

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('total_files_tested', 5)
      expect(result).toHaveProperty('successful_matches', 3)
      expect(result).toHaveProperty('results')
      expect(result.results[1]).toHaveProperty('matched', true)
    })

    it('gets system overview statistics', async () => {
      const result = await customDataProvider.getSystemOverview()

      expect(result).toHaveProperty('total_files', 1250)
      expect(result).toHaveProperty('total_patterns', 15)
      expect(result).toHaveProperty('files_with_metadata', 987)
      expect(result).toHaveProperty('active_patterns', 12)
    })

    it('gets patterns with default parameters', async () => {
      server.use(
        http.get(`${API_BASE}/patterns`, () => {
          return HttpResponse.json([
            {
              id: 1,
              name: 'Test Pattern 1',
              regex_pattern: '([a-z]+)_([0-9]+)',
              field_mapping: { type: '$1:s$', number: '$2:d$' },
              priority: 10,
              is_active: true
            }
          ])
        })
      )

      const result = await customDataProvider.getPatterns()

      expect(result).toBeInstanceOf(Array)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
    })

    it('handles pattern testing errors', async () => {
      server.use(
        http.post(`${API_BASE}/patterns/test`, () => {
          return HttpResponse.json(
            { detail: 'Invalid regex pattern' },
            { status: 400 }
          )
        })
      )

      await expect(
        customDataProvider.testPatternAdvanced({
          name: 'Invalid Pattern',
          regex_pattern: '[invalid',
          field_mapping: {}
        }, [1, 2])
      ).rejects.toThrow('Invalid regex pattern')
    })
  })

  describe('Pattern management API', () => {
    it('creates pattern with proper data structure', async () => {
      const patternData = {
        name: 'Image Pattern',
        regex_pattern: 'IMG_([0-9]{8})_([0-9]{6})\\.(jpg|png)',
        field_mapping: {
          date: '$1:date$',
          time: '$2:time$',
          format: '$3:s$'
        },
        priority: 5
      }

      server.use(
        http.post(`${API_BASE}/patterns`, () => {
          return HttpResponse.json({
            id: 100,
            ...patternData,
            is_active: true,
            created_at: new Date().toISOString()
          }, { status: 201 })
        })
      )

      const result = await customDataProvider.createPattern(patternData)

      expect(result.id).toBe(100)
      expect(result.name).toBe('Image Pattern')
      expect(result.field_mapping).toEqual(patternData.field_mapping)
    })

    it('updates pattern successfully', async () => {
      server.use(
        http.put(`${API_BASE}/patterns/1`, () => {
          return HttpResponse.json({
            id: 1,
            name: 'Updated Pattern',
            regex_pattern: '([a-z]+)_([0-9]+)',
            field_mapping: { type: '$1:s$', number: '$2:d$' },
            priority: 15,
            is_active: false,
            updated_at: new Date().toISOString()
          })
        })
      )

      const result = await customDataProvider.updatePattern(1, {
        name: 'Updated Pattern',
        priority: 15,
        is_active: false
      })

      expect(result.id).toBe(1)
      expect(result.name).toBe('Updated Pattern')
      expect(result.priority).toBe(15)
      expect(result.is_active).toBe(false)
    })

    it('deletes pattern successfully', async () => {
      server.use(
        http.delete(`${API_BASE}/patterns/1`, () => {
          return HttpResponse.json({ success: true })
        })
      )

      const result = await customDataProvider.deletePattern(1)

      expect(result).toHaveProperty('success', true)
    })

    it('gets pattern statistics', async () => {
      server.use(
        http.get(`${API_BASE}/patterns/stats/pattern/1`, () => {
          return HttpResponse.json({
            pattern_id: 1,
            usage_count: 45,
            success_rate: 89.5,
            average_processing_time: 15.2,
            total_files_matched: 40,
            last_used: '2025-08-14T10:30:00Z'
          })
        })
      )

      const result = await customDataProvider.getPatternStats(1)

      expect(result.pattern_id).toBe(1)
      expect(result.usage_count).toBe(45)
      expect(result.success_rate).toBe(89.5)
    })
  })

  describe('File operations API', () => {
    it('extracts file metadata successfully', async () => {
      server.use(
        http.post(`${API_BASE}/files/1/extract-metadata`, () => {
          return HttpResponse.json({
            file_id: 1,
            extracted_data: {
              name: 'Extracted Test File',
              category: 'document',
              date: '2025-08-14'
            },
            pattern_id: 1,
            processing_time_ms: 12.5,
            success: true
          })
        })
      )

      const result = await customDataProvider.extractFileMetadata(1, true)

      expect(result.file_id).toBe(1)
      expect(result.success).toBe(true)
      expect(result.extracted_data).toHaveProperty('name', 'Extracted Test File')
    })

    it('starts batch extraction job', async () => {
      server.use(
        http.post(`${API_BASE}/files/batch-extract-metadata`, () => {
          return HttpResponse.json({
            job_id: 'batch-job-789',
            status: 'started',
            file_count: 25,
            estimated_completion_time: '2025-08-14T11:00:00Z'
          })
        })
      )

      const result = await customDataProvider.startBatchExtraction(
        [1, 2, 3, 4, 5],
        [1, 2],
        false
      )

      expect(result.job_id).toBe('batch-job-789')
      expect(result.status).toBe('started')
      expect(result.file_count).toBe(25)
    })

    it('searches files with advanced parameters', async () => {
      server.use(
        http.get(`${API_BASE}/files/search`, ({ request }) => {
          const url = new URL(request.url)
          const query = url.searchParams.get('query')
          
          return HttpResponse.json({
            files: [
              {
                id: 1,
                filename: 'search_result.txt',
                path: '/test/path',
                extracted_data: { name: 'Search Result' },
                relevance_score: 0.95
              }
            ],
            total: 1,
            query_time_ms: 15.3,
            search_terms: query?.split(' ') || []
          })
        })
      )

      const result = await customDataProvider.searchFiles({
        query: 'test document',
        search_in: 'filename',
        has_extracted_data: true,
        page: 1,
        per_page: 20
      })

      expect(result.files).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.files[0]).toHaveProperty('relevance_score')
    })
  })

  describe('Error handling', () => {
    it('handles network errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/files`, () => {
          return HttpResponse.error()
        })
      )

      await expect(customDataProvider.getList('files', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'created_at', order: 'desc' },
        filter: {}
      })).rejects.toThrow()
    })

    it('handles invalid JSON responses', async () => {
      server.use(
        http.get(`${API_BASE}/patterns/stats/overview`, () => {
          return new HttpResponse('Invalid JSON', {
            headers: { 'Content-Type': 'application/json' }
          })
        })
      )

      await expect(customDataProvider.getSystemOverview()).rejects.toThrow()
    })

    it('handles missing Content-Range header', async () => {
      server.use(
        http.get(`${API_BASE}/files`, () => {
          return HttpResponse.json([
            { id: 1, filename: 'test.txt' }
          ])
        })
      )

      const result = await customDataProvider.getList('files', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'created_at', order: 'desc' },
        filter: {}
      })

      expect(result.total).toBe(0) // Should default to 0 when no Content-Range
    })
  })

  describe('Special create operations', () => {
    it('handles file-change-patterns/test resource', async () => {
      server.use(
        http.post(`${API_BASE}/file-change-patterns/test`, () => {
          return HttpResponse.json({
            success: true,
            results: {
              1: { matched: true, data: { type: 'document' } }
            }
          })
        })
      )

      const result = await customDataProvider.create('file-change-patterns/test', {
        data: {
          pattern: '([a-z]+)_([0-9]+)',
          file_ids: [1, 2, 3]
        }
      })

      expect(result.data.success).toBe(true)
      expect(result.data.results[1].matched).toBe(true)
    })

    it('handles file-change-patterns/confirm resource', async () => {
      server.use(
        http.post(`${API_BASE}/file-change-patterns/confirm`, () => {
          return HttpResponse.json({
            confirmed: true,
            job_id: 'confirm-job-456',
            affected_files: 15
          })
        })
      )

      const result = await customDataProvider.create('file-change-patterns/confirm', {
        data: {
          pattern_id: 1,
          file_ids: [1, 2, 3, 4, 5]
        }
      })

      expect(result.data.confirmed).toBe(true)
      expect(result.data.job_id).toBe('confirm-job-456')
      expect(result.data.affected_files).toBe(15)
    })
  })
})