import { http, HttpResponse } from 'msw'

const API_BASE = import.meta.env.VITE_REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'

export const handlers = [
  // System Overview API
  http.get(`${API_BASE}/system/overview`, () => {
    return HttpResponse.json({
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
      }
    })
  }),

  // Files API
  http.get(`${API_BASE}/files`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const per_page = parseInt(url.searchParams.get('per_page') || '20')

    const mockFiles = Array.from({ length: per_page }, (_, i) => ({
      id: page * per_page + i + 1,
      filename: `test_file_${page * per_page + i + 1}.txt`,
      extension: 'txt',
      path: '/test/path',
      full_path: `/test/path/test_file_${page * per_page + i + 1}.txt`,
      extracted_data: {
        name: `Test File ${page * per_page + i + 1}`,
        category: 'document',
        date_created: '2025-08-14'
      },
      pattern_id: (i % 3) + 1,
      created_at: '2025-08-14T10:00:00Z',
      updated_at: '2025-08-14T10:00:00Z'
    }))

    return HttpResponse.json(mockFiles, {
      headers: {
        'Content-Range': `files ${(page - 1) * per_page}-${page * per_page - 1}/1250`
      }
    })
  }),

  http.get(`${API_BASE}/files/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id),
      filename: `test_file_${params.id}.txt`,
      extension: 'txt',
      path: '/test/path',
      full_path: `/test/path/test_file_${params.id}.txt`,
      extracted_data: {
        name: `Test File ${params.id}`,
        category: 'document',
        date_created: '2025-08-14'
      },
      pattern_id: 1,
      created_at: '2025-08-14T10:00:00Z',
      updated_at: '2025-08-14T10:00:00Z'
    })
  }),

  http.post(`${API_BASE}/files/index`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      job_id: 'job-12345',
      status: 'started',
      directory_path: body.directory_path,
      message: 'File indexing job started successfully'
    })
  }),

  // Patterns API
  http.get(`${API_BASE}/patterns`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Document Pattern',
        regex_pattern: '([a-zA-Z]+)_([0-9]{4})_([a-zA-Z]+)\\.(txt|pdf)',
        field_mapping: {
          type: '$1:s$',
          year: '$2:d$',
          category: '$3:s$',
          extension: '$4:s$'
        },
        priority: 10,
        is_active: true,
        created_at: '2025-08-14T09:00:00Z'
      },
      {
        id: 2,
        name: 'Image Pattern',
        regex_pattern: 'IMG_([0-9]{8})_([0-9]{6})\\.(jpg|png|gif)',
        field_mapping: {
          date: '$1:date$',
          time: '$2:time$',
          format: '$3:s$'
        },
        priority: 8,
        is_active: true,
        created_at: '2025-08-14T09:00:00Z'
      }
    ])
  }),

  http.post(`${API_BASE}/patterns`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 99,
      ...body,
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.put(`${API_BASE}/patterns/:id`, async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: parseInt(params.id),
      ...body,
      updated_at: new Date().toISOString()
    })
  }),

  http.delete(`${API_BASE}/patterns/:id`, ({ params }) => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/patterns/test`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      pattern_name: body.pattern_name || 'Test Pattern',
      total_files_tested: 5,
      successful_matches: 3,
      match_rate_percent: 60,
      performance_metrics: {
        total_test_time_ms: 45.2,
        average_file_time_ms: 9.04,
        files_per_second: 110.6
      },
      security_validation: {
        passed: true,
        risk_score: 0.2,
        complexity_score: 0.3
      },
      results: {
        1: {
          success: true,
          filename: 'test_file_1.txt',
          extracted_data: { name: 'Test File 1', category: 'document' },
          extraction_score: 2,
          matched: true,
          processing_time_ms: 8.5
        },
        2: {
          success: true,
          filename: 'test_file_2.txt',
          extracted_data: null,
          extraction_score: 0,
          matched: false,
          processing_time_ms: 7.2
        }
      }
    })
  }),

  // Jobs API
  http.get(`${API_BASE}/jobs`, () => {
    return HttpResponse.json([
      {
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
        completed_at: '2025-08-14T10:05:00Z'
      },
      {
        id: 'job-67890',
        job_type: 'pattern_extraction',
        status: 'in_progress',
        stage: 'processing',
        progress_data: {
          total_count: 50,
          processed_count: 25,
          successful: 20,
          failed: 5
        },
        created_at: '2025-08-14T10:30:00Z'
      }
    ])
  }),

  http.get(`${API_BASE}/jobs/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
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
      result_data: {
        summary: {
          total_processed: 100,
          successful: 95,
          failed: 5,
          success_rate: 95,
          average_processing_time_ms: 12.5
        }
      },
      created_at: '2025-08-14T10:00:00Z',
      completed_at: '2025-08-14T10:05:00Z'
    })
  }),

  // Error responses for testing
  http.get(`${API_BASE}/error/500`, () => {
    return new HttpResponse('Internal Server Error', { status: 500 })
  }),

  http.get(`${API_BASE}/error/404`, () => {
    return HttpResponse.json({
      detail: 'Resource not found'
    }, { status: 404 })
  }),

  // Catch-all handler for unmatched requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`)
    return new HttpResponse(null, { status: 404 })
  })
]