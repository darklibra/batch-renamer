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
    indexFiles: (directoryPath, scanConfig = {}) => {
        // Prepare the request body with scan configuration
        const requestBody = {
            directory_path: directoryPath,
            file_extensions: scanConfig.file_extensions || null,
            max_file_size_mb: scanConfig.max_file_size_mb || 100,
            max_files: scanConfig.max_files || 10000,
            recursion_depth: scanConfig.recursion_depth || 5
        };

        return fetch(`${apiUrl}/files/index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
    getJobProgress: (jobId) => {
        return fetch(`${apiUrl}/files/index/${jobId}/progress`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get job progress');
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
    
    // ========================================
    // METADATA EXTRACTION API FUNCTIONS
    // ========================================
    
    // Extract metadata from a single file using patterns
    extractFileMetadata: (fileId, options = {}) => {
        const { forceReapply = false, patternIds = null } = options;
        const queryParams = new URLSearchParams();
        if (forceReapply) queryParams.append('force_reapply', 'true');
        
        const url = patternIds 
            ? `${apiUrl}/files/${fileId}/extract-metadata?${queryParams.toString()}`
            : `${apiUrl}/files/${fileId}/extract-metadata?${queryParams.toString()}`;
            
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: patternIds ? JSON.stringify({ pattern_ids: patternIds }) : null
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'An error occurred during metadata extraction.');
                });
            }
            return response.json();
        });
    },
    
    // Get extracted metadata for a file
    getFileExtractedData: (fileId, includeHistory = false) => {
        const queryParams = new URLSearchParams();
        if (includeHistory) queryParams.append('include_history', 'true');
        
        return fetch(`${apiUrl}/files/${fileId}/extracted-data?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get extracted data.');
                });
            }
            return response.json();
        });
    },
    
    // Start batch metadata extraction for multiple files
    batchExtractMetadata: (fileIds, options = {}) => {
        const { forceReapply = false, patternIds = null } = options;
        const queryParams = new URLSearchParams();
        if (forceReapply) queryParams.append('force_reapply', 'true');
        if (patternIds) {
            patternIds.forEach(id => queryParams.append('pattern_ids', id.toString()));
        }
        
        return fetch(`${apiUrl}/files/batch-extract-metadata?${queryParams.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fileIds)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to start batch metadata extraction.');
                });
            }
            return response.json();
        });
    },
    
    // Get extraction job status and progress
    getExtractionJobStatus: (jobId) => {
        return fetch(`${apiUrl}/jobs/${jobId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get job status.');
                });
            }
            return response.json();
        });
    },

    // Smart File Management API functions
    
    // Validate filename template
    // Pattern Security Validation
    validatePatternSecurity: (patternData) => {
        return fetch(`${apiUrl}/patterns/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: patternData.name,
                regex_pattern: patternData.regex_pattern,
                field_mapping: patternData.field_mapping,
                priority: patternData.priority || 1,
                test_filenames: patternData.test_filenames || []
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Pattern validation failed');
                });
            }
            return response.json();
        });
    },

    validateFilenameTemplate: (template, sampleFileId = null, patternId = null) => {
        const params = new URLSearchParams({ template });
        if (sampleFileId) {
            params.append('sample_file_id', sampleFileId);
        }
        if (patternId) {
            params.append('pattern_id', patternId);
        }
        
        return fetch(`${apiUrl}/files/validate-template?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Template validation failed.');
                });
            }
            return response.json();
        });
    },

    // Preview filename template
    previewFilenameTemplate: (fileIds, template, patternId = null) => {
        const requestBody = {
            file_ids: fileIds,
            filename_template: template
        };
        
        if (patternId !== null) {
            requestBody.pattern_id = patternId;
        }
        
        return fetch(`${apiUrl}/files/preview-rename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Preview generation failed.');
                });
            }
            return response.json();
        });
    },

    // Get available patterns for file
    getAvailablePatternsForFile: (fileId) => {
        return fetch(`${apiUrl}/files/patterns-for-file/${fileId}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get patterns for file.');
                });
            }
            return response.json();
        });
    },

    // Apply pattern to files
    applyPatternToFiles: (fileIds, patternId) => {
        return fetch(`${apiUrl}/files/apply-pattern`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_ids: fileIds,
                pattern_id: patternId
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to apply pattern.');
                });
            }
            return response.json();
        });
    },

    // Start smart copy operation
    startSmartCopy: (operationData) => {
        const params = new URLSearchParams({
            target_directory: operationData.target_directory,
            filename_template: operationData.filename_template,
            conflict_resolution: operationData.conflict_resolution || 'skip',
            create_backup: operationData.create_backup || false
        });

        // Add pattern_id if provided
        if (operationData.pattern_id) {
            params.append('pattern_id', operationData.pattern_id);
        }

        // Add file_ids as multiple query parameters
        operationData.file_ids.forEach(id => {
            params.append('file_ids', id);
        });

        return fetch(`${apiUrl}/files/smart-copy?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Smart copy failed.');
                });
            }
            return response.json();
        });
    },

    // Start smart move operation
    startSmartMove: (operationData) => {
        const params = new URLSearchParams({
            target_directory: operationData.target_directory,
            filename_template: operationData.filename_template,
            conflict_resolution: operationData.conflict_resolution || 'skip',
            create_backup: operationData.create_backup || false
        });

        // Add pattern_id if provided
        if (operationData.pattern_id) {
            params.append('pattern_id', operationData.pattern_id);
        }

        // Add file_ids as multiple query parameters
        operationData.file_ids.forEach(id => {
            params.append('file_ids', id);
        });

        return fetch(`${apiUrl}/files/smart-move?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Smart move failed.');
                });
            }
            return response.json();
        });
    },

    // Get smart operation status
    getSmartOperationStatus: (jobId) => {
        return fetch(`${apiUrl}/files/smart-operations/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get operation status.');
                    });
                }
                return response.json();
            });
    },

    // Cancel smart operation
    cancelSmartOperation: (jobId) => {
        return fetch(`${apiUrl}/files/smart-operations/${jobId}/cancel`, {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to cancel operation.');
                });
            }
            return response.json();
        });
    },

    // Get smart operation history
    getSmartOperationHistory: (limit = 10) => {
        const params = new URLSearchParams({ limit });
        
        return fetch(`${apiUrl}/files/smart-operations?${params}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.detail || 'Failed to get operation history.');
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

    // Job Management with intelligent job type detection
    getJobStatus: (jobId) => {
        // Optimized job lookup - try indexing jobs first as they are more common
        return fetch(`${apiUrl}/files/index/${jobId}/progress`)
            .then(response => {
                if (response.ok) {
                    return response.json().then(data => ({
                        ...data,
                        job_type: data.job_type || 'indexing_directory_scan' // Ensure job_type is set
                    }));
                }
                // If not found in indexing jobs, try pattern jobs
                return fetch(`${apiUrl}/patterns/jobs/${jobId}`)
                    .then(patternResponse => {
                        if (!patternResponse.ok) {
                            throw new Error('Job not found in either system');
                        }
                        return patternResponse.json().then(data => ({
                            ...data,
                            job_type: data.job_type || 'pattern_extraction' // Ensure job_type is set
                        }));
                    });
            })
            .catch(error => {
                // Only throw error if both endpoints fail
                throw new Error('Job not found');
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

        // Respect API limits: patterns max per_page=100, indexing max limit=50
        const maxPatternJobs = Math.min(per_page, 100);
        const maxIndexingJobs = Math.min(per_page, 50);
        
        // Fetch both pattern extraction jobs and file indexing jobs
        const patternJobsPromise = fetch(`${apiUrl}/patterns/jobs/?page=${page}&per_page=${maxPatternJobs}${status ? `&status=${status}` : ''}${job_type ? `&job_type=${job_type}` : ''}`)
            .then(response => {
                if (!response.ok) {
                    return { jobs: [], total: 0, pagination: { total: 0 } };
                }
                return response.json();
            })
            .catch(() => ({ jobs: [], total: 0, pagination: { total: 0 } }));

        const indexingJobsPromise = fetch(`${apiUrl}/files/index/jobs?limit=${maxIndexingJobs}`)
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

    // ===========================================
    // PATTERN ANALYSIS API METHODS FOR AUTO FILE SELECTION
    // ===========================================

    // Analyze pattern effectiveness for auto file selection
    analyzePatternEffectiveness: (patternId, options = {}) => {
        const requestBody = {
            file_filters: options.filters || {},
            limit: options.limit || 100,
            quality_threshold: options.threshold || 70,
            exclude_previously_selected: options.excludePrevious !== undefined ? options.excludePrevious : true,
            force_include_all: options.forceIncludeAll || false
        };
        
        return fetch(`${apiUrl}/patterns/${patternId}/analyze-files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Pattern analysis failed');
                });
            }
            return response.json();
        });
    },

    // Get optimal files for a pattern (quick version)
    getOptimalFilesForPattern: (patternId, count = 20) => {
        return fetch(`${apiUrl}/patterns/${patternId}/optimal-files?count=${count}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get optimal files');
                });
            }
            return response.json();
        });
    },

    // Auto-select files based on pattern analysis
    autoSelectFilesForPattern: async (patternId, options = {}) => {
        try {
            const analysisResult = await customDataProvider.analyzePatternEffectiveness(
                patternId, 
                {
                    threshold: options.qualityThreshold || 70,
                    limit: options.limit || 100,
                    filters: options.filters || {},
                    excludePrevious: options.excludePrevious !== undefined ? options.excludePrevious : true,
                    forceIncludeAll: options.forceIncludeAll || false
                }
            );
            
            // Filter and select optimal files
            const qualityThreshold = options.qualityThreshold || 70;
            const maxFiles = options.maxFiles || analysisResult.recommendations.optimal_file_count;
            
            const selectedFiles = analysisResult.ranked_files
                .filter(file => file.extraction_score >= qualityThreshold)
                .slice(0, maxFiles)
                .map(file => ({
                    id: file.file_id,
                    filename: file.filename,
                    extraction_score: file.extraction_score,
                    extracted_fields: file.extracted_fields,
                    confidence: file.confidence,
                    potential_data: file.potential_data
                }));
                
            return {
                selected_files: selectedFiles,
                analysis: analysisResult,
                selection_criteria: {
                    quality_threshold: qualityThreshold,
                    max_files: maxFiles,
                    total_analyzed: analysisResult.analyzed_files
                }
            };
            
        } catch (error) {
            throw new Error(`Auto file selection failed: ${error.message}`);
        }
    },

    // ===========================================
    // SELECTION HISTORY MANAGEMENT API METHODS
    // ===========================================

    // Record files that were auto-selected for a pattern
    recordPatternSelection: (patternId, fileIds, selectionContext = {}) => {
        const requestBody = {
            file_ids: fileIds,
            selection_context: selectionContext
        };
        
        return fetch(`${apiUrl}/patterns/${patternId}/record-selection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to record selection');
                });
            }
            return response.json();
        });
    },

    // Reset selection history for a specific pattern
    resetPatternSelections: (patternId) => {
        return fetch(`${apiUrl}/patterns/${patternId}/reset-selections`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to reset pattern selections');
                });
            }
            return response.json();
        });
    },

    // Reset all selection history for all patterns
    resetAllSelections: () => {
        return fetch(`${apiUrl}/patterns/reset-all-selections`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to reset all selections');
                });
            }
            return response.json();
        });
    },

    // Get selection history for a pattern
    getPatternSelectionHistory: (patternId) => {
        return fetch(`${apiUrl}/patterns/${patternId}/selection-history`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.detail || 'Failed to get selection history');
                });
            }
            return response.json();
        });
    }
};

export default customDataProvider;