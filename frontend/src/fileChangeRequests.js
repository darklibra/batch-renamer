
import React from 'react';
import { List, Datagrid, TextField, DateField, NumberField, ReferenceField, Show, SimpleShowLayout, FunctionField, Create, SimpleForm, TextInput, ReferenceInput, SelectInput } from 'react-admin';

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

export const FileChangeRequestCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="file_change_pattern_id" reference="file-change-patterns">
                <SelectInput optionText="name" />
            </ReferenceInput>
            <TextInput source="rename_pattern_string" label="Rename Pattern" fullWidth />
            <TextInput source="destination_path" label="Destination Path" fullWidth />
        </SimpleForm>
    </Create>
);
