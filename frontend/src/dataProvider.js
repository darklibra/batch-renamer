import simpleRestProvider from 'ra-data-simple-rest';

const apiUrl = process.env.REACT_APP_BACKEND_URL + '/api/v1';
const dataProvider = simpleRestProvider(apiUrl);

const customDataProvider = {
    ...dataProvider,
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
};

export default customDataProvider;
