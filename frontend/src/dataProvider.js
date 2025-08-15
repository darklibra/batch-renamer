import simpleRestProvider from 'ra-data-simple-rest';

const apiUrl = (import.meta.env.VITE_REACT_APP_API_BASE_URL || 'http://localhost:8000') + '/api/v1';

const customDataProvider = {
    getList: (resource, params) => {
        const { pagination, sort, filter } = params;
        const { page, perPage } = pagination;
        const { field, order } = sort;

        const query = {
            page: page,
            per_page: perPage,
            _sort: field,
            _order: order,
            ...filter,
        };

        const queryString = Object.keys(query)
            .map(key => `${key}=${query[key]}`)
            .join('&');

        return fetch(`${apiUrl}/${resource}?${queryString}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'An error occurred.');
                    });
                }
                return response.json().then(responseData => {
                    // Handle different API response structures
                    let data, total;
                    
                    if (resource === 'files') {
                        // Files API returns: {files: [], total: 0, page: 1, per_page: 10, total_pages: 0}
                        data = responseData.files || [];
                        total = responseData.total || 0;
                    } else if (resource === 'patterns') {
                        // Patterns API might return different structure
                        if (responseData.patterns) {
                            data = responseData.patterns || [];
                            total = responseData.pagination?.total || responseData.total || 0;
                        } else {
                            // Fallback for standard array response
                            data = Array.isArray(responseData) ? responseData : [];
                            total = data.length;
                        }
                    } else if (resource === 'jobs') {
                        // Jobs API returns: {jobs: [], total: 0, page: 1, per_page: 20}
                        data = responseData.jobs || [];
                        total = responseData.total || 0;
                    } else {
                        // Default handling for other resources
                        if (Array.isArray(responseData)) {
                            data = responseData;
                            total = responseData.length;
                        } else {
                            data = responseData.data || responseData.items || [];
                            total = responseData.total || data.length;
                        }
                    }
                    
                    // Ensure data is always an array
                    if (!Array.isArray(data)) {
                        console.warn(`Expected array for ${resource} but got:`, typeof data, data);
                        data = [];
                    }
                    
                    // Validate that items have IDs
                    if (data.length > 0 && data[0].id === undefined) {
                        console.error(`Received data items do not have an 'id' key for ${resource}:`, data);
                    }
                    
                    return {
                        data: data,
                        total: total,
                    };
                });
            });
    },
    getOne: (resource, params) => {
        return fetch(`${apiUrl}/${resource}/${params.id}`)
            .then(response => response.json())
            .then(data => ({
                data: data,
            }));
    },
    getMany: (resource, params) => {
        const query = params.ids.map(id => `ids=${id}`).join('&');
        return fetch(`${apiUrl}/${resource}?${query}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'An error occurred.');
                    });
                }
                return response.json().then(data => ({
                    data: data,
                }));
            });
    },
    getManyReference: (resource, params) => {
        const { pagination, sort, filter, target, id } = params;
        const { page, perPage } = pagination;
        const { field, order } = sort;

        const query = {
            page: page,
            per_page: perPage,
            _sort: field,
            _order: order,
            [target]: id,
            ...filter,
        };

        const queryString = Object.keys(query)
            .map(key => `${key}=${query[key]}`)
            .join('&');

        return fetch(`${apiUrl}/${resource}?${queryString}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'An error occurred.');
                    });
                }
                const contentRange = response.headers.get('Content-Range');
                const total = contentRange ? parseInt(contentRange.split('/').pop(), 10) : 0;
                return response.json().then(data => {
                    // 각 아이템에 id가 있는지 확인 (디버깅용)
                    if (data.length > 0 && data[0].id === undefined) {
                        console.error("Received data items do not have an 'id' key:", data);
                        // 여기서 오류를 throw하거나, id를 강제로 추가하는 로직을 넣을 수 있습니다.
                        // 예를 들어, data.map(item => ({ ...item, id: item.some_other_unique_field }))
                    }
                    return {
                        data: data,
                        total: total,
                    };
                });
            });
    },
    update: (resource, params) => {
        return fetch(`${apiUrl}/${resource}/${params.id}`,
            {
                method: 'PUT',
                body: JSON.stringify(params.data),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => ({
                data: data,
            }));
    },
    updateMany: (resource, params) => {
        const query = params.ids.map(id => `ids=${id}`).join('&');
        return fetch(`${apiUrl}/${resource}?${query}`,
            {
                method: 'PUT',
                body: JSON.stringify(params.data),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => ({
                data: data,
            }));
    },
    create: (resource, params) => {
        if (resource === 'file-change-patterns/test') {
            return fetch(`${apiUrl}/${resource}`,
                {
                    method: 'POST',
                    body: JSON.stringify(params.data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(error => {
                            throw new Error(error.detail || 'An error occurred during pattern test.');
                        });
                    }
                    return response.json().then(data => ({
                        data: data, // data.results will be accessed in fileChangePatterns.js
                    }));
                });
        } else if (resource === 'file-change-patterns/confirm') {
            return fetch(`${apiUrl}/${resource}`,
                {
                    method: 'POST',
                    body: JSON.stringify(params.data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(error => {
                            throw new Error(error.detail || 'An error occurred during pattern confirmation.');
                        });
                    }
                    return response.json().then(data => ({
                        data: data,
                    }));
                });
        } else {
            return fetch(`${apiUrl}/${resource}`,
                {
                    method: 'POST',
                    body: JSON.stringify(params.data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => response.json())
                .then(data => ({
                    data: data,
                }));
        }
    },
    delete: (resource, params) => {
        return fetch(`${apiUrl}/${resource}/${params.id}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => ({
                data: data,
            }));
    },
    deleteMany: (resource, params) => {
        const query = params.ids.map(id => `ids=${id}`).join('&');
        return fetch(`${apiUrl}/${resource}?${query}`,
            {
                method: 'DELETE',
                body: JSON.stringify(params.data),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => ({
                data: data,
            }));
    },
    indexFiles: (directoryPath) => {
        return fetch(`${apiUrl}/files/index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ directory_path: directoryPath }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred during indexing.');
                });
            }
            return response.json();
        });
    },
    testPattern: (fileIds, patternString) => {
        return fetch(`${apiUrl}/test-pattern`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_ids: fileIds, pattern_string: patternString }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred during pattern testing.');
                });
            }
            return response.json();
        });
    },
    applyRenameAndCopy: (params) => {
        return fetch(`${apiUrl}/files/apply-rename-and-copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred during rename and copy.');
                });
            }
            return response.json();
        });
    },
    renameAndCopyByPattern: (params) => {
        return fetch(`${apiUrl}/files/rename-and-copy-by-pattern`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred during rename and copy by pattern.');
                });
            }
            return response.json();
        });
    },
    getRegexVariables: (regexPattern) => {
        return fetch(`${apiUrl}/file-change-patterns/regex-variables?regex_pattern=${encodeURIComponent(regexPattern)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred while fetching regex variables.');
                });
            }
            return response.json();
        });
    },
    getExtractedDataByPattern: (patternId) => {
        return fetch(`${apiUrl}/file-change-patterns/${patternId}/extracted-data`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred while fetching extracted data by pattern.');
                });
            }
            return response.json();
        });
    },
    getReplacementFormatKeys: (patternId) => {
        return fetch(`${apiUrl}/file-change-patterns/${patternId}/replacement-keys`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred while fetching replacement keys.');
                });
            }
            return response.json();
        });
    },

    // ===========================================
    // NEW PATTERN MANAGEMENT API METHODS
    // ===========================================

    // Pattern CRUD Operations
    getPatterns: (params = {}) => {
        const { page = 1, per_page = 20, is_active, sort_by = 'priority', sort_order = 'desc' } = params;
        const query = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
            sort_by,
            sort_order,
            ...(is_active !== undefined && { is_active: is_active.toString() })
        });
        
        return fetch(`${apiUrl}/patterns?${query}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to fetch patterns');
                    });
                }
                return response.json();
            });
    },

    createPattern: (patternData) => {
        return fetch(`${apiUrl}/patterns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patternData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to create pattern');
                });
            }
            return response.json();
        });
    },

    updatePattern: (patternId, patternData) => {
        return fetch(`${apiUrl}/patterns/${patternId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patternData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to update pattern');
                });
            }
            return response.json();
        });
    },

    deletePattern: (patternId, hardDelete = false) => {
        const query = hardDelete ? '?hard_delete=true' : '';
        return fetch(`${apiUrl}/patterns/${patternId}${query}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to delete pattern');
                });
            }
            return response.json();
        });
    },

    // Pattern Testing
    testPatternAdvanced: (patternData, fileIds) => {
        return fetch(`${apiUrl}/patterns/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: patternData.name,
                regex_pattern: patternData.regex_pattern,
                field_mapping: patternData.field_mapping,
                file_ids: fileIds
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Pattern test failed');
                });
            }
            return response.json();
        });
    },

    // Metadata Extraction
    extractFileMetadata: (fileId, forceReapply = false) => {
        const query = forceReapply ? '?force_reapply=true' : '';
        return fetch(`${apiUrl}/files/${fileId}/extract-metadata${query}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Metadata extraction failed');
                });
            }
            return response.json();
        });
    },

    startBatchExtraction: (fileIds, patternIds = null, forceReapply = false) => {
        return fetch(`${apiUrl}/files/batch-extract-metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_ids: fileIds,
                pattern_ids: patternIds,
                force_reapply: forceReapply
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to start batch extraction');
                });
            }
            return response.json();
        });
    },

    // Job Management
    getJobStatus: (jobId) => {
        // Try pattern jobs first, then indexing jobs with correct endpoints
        return fetch(`${apiUrl}/patterns/jobs/${jobId}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                // If not found in pattern jobs, try indexing jobs with correct endpoint
                return fetch(`${apiUrl}/files/index/${jobId}/progress`)
                    .then(indexingResponse => {
                        if (!indexingResponse.ok) {
                            throw new Error('Job not found');
                        }
                        return indexingResponse.json();
                    });
            })
            .catch(error => {
                throw new Error(error.message || 'Failed to get job status');
            });
    },

    getJobs: (params = {}) => {
        const { page = 1, per_page = 20, status, job_type } = params;
        const query = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
            ...(status && { status }),
            ...(job_type && { job_type })
        });

        // Fetch both pattern extraction jobs and file indexing jobs
        const patternJobsPromise = fetch(`${apiUrl}/patterns/jobs/?${query}`)
            .then(response => {
                if (!response.ok) {
                    return { jobs: [], total: 0 };
                }
                return response.json();
            })
            .catch(() => ({ jobs: [], total: 0 }));

        const indexingJobsPromise = fetch(`${apiUrl}/files/index/jobs?limit=${per_page}`)
            .then(response => {
                if (!response.ok) {
                    return [];
                }
                return response.json();
            })
            .catch(() => []);

        return Promise.all([patternJobsPromise, indexingJobsPromise])
            .then(([patternResult, indexingJobs]) => {
                // Combine both types of jobs
                const patternJobs = patternResult.jobs || [];
                const allJobs = [
                    ...patternJobs,
                    ...(Array.isArray(indexingJobs) ? indexingJobs : [])
                ];

                // Sort by created/started date, newest first
                allJobs.sort((a, b) => {
                    const dateA = new Date(a.started_at || a.created_at || 0);
                    const dateB = new Date(b.started_at || b.created_at || 0);
                    return dateB - dateA;
                });

                // Apply pagination to combined results
                const startIndex = (page - 1) * per_page;
                const endIndex = startIndex + per_page;
                const paginatedJobs = allJobs.slice(startIndex, endIndex);

                return {
                    jobs: paginatedJobs,
                    total: allJobs.length,
                    page,
                    per_page
                };
            });
    },

    // Failure Management
    getExtractionFailures: (params = {}) => {
        const { limit = 50, requires_user_input } = params;
        const query = new URLSearchParams({
            limit: limit.toString(),
            ...(requires_user_input !== undefined && { requires_user_input: requires_user_input.toString() })
        });

        return fetch(`${apiUrl}/files/extraction-failures?${query}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get extraction failures');
                    });
                }
                return response.json();
            });
    },

    resolveFailure: (failureId, patternId) => {
        return fetch(`${apiUrl}/patterns/failures/${failureId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern_id: patternId })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to resolve failure');
                });
            }
            return response.json();
        });
    },

    // Statistics and Analytics
    getExtractionStats: () => {
        return fetch(`${apiUrl}/files/extraction-stats`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get extraction stats');
                    });
                }
                return response.json();
            });
    },

    getPatternStats: (patternId) => {
        return fetch(`${apiUrl}/patterns/stats/pattern/${patternId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get pattern stats');
                    });
                }
                return response.json();
            });
    },

    getSystemOverview: () => {
        return fetch(`${apiUrl}/patterns/stats/overview`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get system overview');
                    });
                }
                return response.json();
            });
    },

    // Advanced Search
    searchFiles: (params = {}) => {
        const { query, search_in = 'all', pattern_id, has_extracted_data, page = 1, per_page = 20 } = params;
        const searchParams = new URLSearchParams({
            query: query || '',
            search_in,
            page: page.toString(),
            per_page: per_page.toString(),
            ...(pattern_id && { pattern_id: pattern_id.toString() }),
            ...(has_extracted_data !== undefined && { has_extracted_data: has_extracted_data.toString() })
        });

        return fetch(`${apiUrl}/files/search?${searchParams}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Search failed');
                    });
                }
                return response.json();
            });
    },
};

export default customDataProvider;