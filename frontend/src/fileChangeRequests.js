
import React, { useState, useEffect } from 'react';
import { List, Datagrid, TextField, DateField, NumberField, ReferenceField, Show, SimpleShowLayout, FunctionField, Create, SimpleForm, TextInput, ReferenceInput, SelectInput, useNotify } from 'react-admin';
import dataProvider from './dataProvider';

export const FileChangeRequestList = () => (
    <List>
        <Datagrid rowClick="show">
            <TextField source="id" />
            <ReferenceField source="file_change_pattern_id" reference="file-change-patterns">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="rename_pattern_string" label="Rename Pattern" />
            <TextField source="destination_path" />
            <TextField source="status" />
            <NumberField source="success_count" />
            <NumberField source="failed_count" />
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);

export const FileChangeRequestShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <ReferenceField source="file_change_pattern_id" reference="file-change-patterns">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="rename_pattern_string" label="Rename Pattern" />
            <TextField source="destination_path" />
            <TextField source="status" />
            <NumberField source="success_count" />
            <NumberField source="failed_count" />
            <FunctionField label="Details" render={record => (
                <pre>{record.details}</pre>
            )} />
            <DateField source="created_at" showTime />
            <DateField source="updated_at" showTime />

            <h3>Affected Files</h3>
            <Datagrid data={record => record.targets} is  empty={record => !record.targets || record.targets.length === 0}>
                <TextField source="id" />
                <TextField source="original_file_id" label="Original File ID" />
                <TextField source="new_filename" />
                <TextField source="status" />
                <TextField source="message" />
            </Datagrid>
        </SimpleShowLayout>
    </Show>
);

export const FileChangeRequestCreate = (props) => {
    const notify = useNotify();
    const [selectedPatternId, setSelectedPatternId] = useState(null);
    const [availableRegexVariables, setAvailableRegexVariables] = useState([]);
    const [availableReplacementKeys, setAvailableReplacementKeys] = useState([]);

    useEffect(() => {
        if (selectedPatternId) {
            dataProvider.getRegexVariables(selectedPatternId)
                .then(variables => {
                    setAvailableRegexVariables(variables);
                })
                .catch(error => {
                    notify(`정규식 변수 로드 오류: ${error.message}`, { type: 'warning' });
                    setAvailableRegexVariables([]);
                });
            
            dataProvider.getReplacementFormatKeys(selectedPatternId)
                .then(keys => {
                    setAvailableReplacementKeys(keys);
                })
                .catch(error => {
                    notify(`교체 형식 키 로드 오류: ${error.message}`, { type: 'warning' });
                    setAvailableReplacementKeys([]);
                });
        } else {
            setAvailableRegexVariables([]);
            setAvailableReplacementKeys([]);
        }
    }, [selectedPatternId, notify]);

    return (
        <Create {...props}>
            <SimpleForm>
                <ReferenceInput 
                    source="file_change_pattern_id" 
                    reference="file-change-patterns" 
                    onChange={(e) => setSelectedPatternId(e.target.value)}
                >
                    <SelectInput optionText="name" />
                </ReferenceInput>
                <TextInput 
                    source="rename_pattern_string" 
                    label="Rename Pattern" 
                    fullWidth 
                    helperText={selectedPatternId 
                        ? `정규식 변수: {${availableRegexVariables.join('}, {')}} | 교체 형식 키: {${availableReplacementKeys.join('}, {')}}` 
                        : '패턴을 선택하면 사용 가능한 변수가 표시됩니다.'
                    }
                />
                <TextInput source="destination_path" label="Destination Path" fullWidth />
            </SimpleForm>
        </Create>
    );
};
