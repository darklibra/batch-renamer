import simpleRestProvider from 'ra-data-simple-rest';

const apiUrl = process.env.REACT_APP_BACKEND_URL + '/api/v1';

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
                const contentRange = response.headers.get('Content-Range');
                const total = contentRange ? parseInt(contentRange.split('/').pop(), 10) : 0;
                return response.json().then(data => ({
                    data: data,
                    total: total,
                }));
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
                return response.json().then(data => ({
                    data: data,
                    total: total,
                }));
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
};

export default customDataProvider;