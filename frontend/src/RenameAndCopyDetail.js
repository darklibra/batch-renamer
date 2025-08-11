import React, { useState, useEffect } from 'react';
import { 
    useShowController, 
    useRecordContext, 
    Title, 
    Loading, 
    ListBase,
    Datagrid,
    TextField,
    SimpleForm,
    TextInput,
    Button,
    useNotify,
    Pagination
} from 'react-admin';
import dataProvider from './dataProvider';

const AssociatedFilesList = ({ patternId }) => {
    return (
        <ListBase
            resource="files"
            filter={{ pattern_id: patternId }}
            sort={{ field: 'id', order: 'ASC' }}
            perPage={1000}
        >
            <AssociatedFilesGrid />
        </ListBase>
    );
};

const AssociatedFilesGrid = () => (
    <>
        <Datagrid bulkActionButtons={false}>
            <TextField source="id" />
            <TextField source="filename" />
            <TextField source="full_path" />
        </Datagrid>
        <Pagination />
    </>
);

const RenameAndCopyDetail = () => {
    const { record, isLoading, error } = useShowController();
    const [destinationPath, setDestinationPath] = useState('');
    const [renamePattern, setRenamePattern] = useState('');
    const notify = useNotify();

    useEffect(() => {
        if (record) {
            setRenamePattern(record.replacement_format || '');
        }
    }, [record]);

    const handleCopy = () => {
        if (!record) return;
        dataProvider.create('file-change-requests', {
            data: {
                file_change_pattern_id: record.id,
                rename_pattern_string: renamePattern,
                destination_path: destinationPath
            }
        }).then((res) => {
            const { success_count, failed_count, details } = res.data;
            notify(`${success_count} files copied, ${failed_count} failed. Details: ${details}`, { 
                type: 'info', 
                multiLine: true,
                autoHideDuration: 10000
            });
        }).catch(error => {
            notify(`Error: ${error.message}`, { type: 'warning', multiLine: true });
        });
    };

    if (isLoading) return <Loading />;
    if (error || !record) return <div>Pattern not found</div>;

    return (
        <div>
            <Title title={`Rename and Copy for Pattern: ${record.name}`} />
            <h2>Pattern: {record.name}</h2>
            <p>Regex: {record.regex_pattern}</p>
            
            <SimpleForm toolbar={false}>
                <TextInput source="renamePattern" label="Rename Pattern" fullWidth value={renamePattern} onChange={(e) => setRenamePattern(e.target.value)} />
                <TextInput source="destinationPath" label="Destination Path" fullWidth value={destinationPath} onChange={(e) => setDestinationPath(e.target.value)} />
                <Button label="Run Copy" onClick={handleCopy} variant="contained" color="primary" />
            </SimpleForm>

            <h3>Associated Files</h3>
            <AssociatedFilesList patternId={record.id} />
        </div>
    );
};

export default RenameAndCopyDetail;