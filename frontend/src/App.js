import React from 'react';
import { Admin, Resource, Layout } from 'react-admin';
import dataProvider from './dataProvider';
import { FileList } from './files';
import { FileChangePatternList, FileChangePatternEdit, FileChangePatternCreate } from './fileChangePatterns';
import { ExclusionPatternList, ExclusionPatternEdit, ExclusionPatternCreate } from './exclusionPatterns';
import FileIndexer from './FileIndexer';

const MyLayout = (props) => <Layout {...props} appBar={() => null} />;

const App = () => (
  <Admin dataProvider={dataProvider} layout={MyLayout} dashboard={FileIndexer}>
    <Resource name="files" list={FileList} />
    <Resource 
      name="file-change-patterns" 
      list={FileChangePatternList} 
      edit={FileChangePatternEdit} 
      create={FileChangePatternCreate} 
    />
    <Resource 
      name="exclusion-patterns" 
      list={ExclusionPatternList} 
      edit={ExclusionPatternEdit} 
      create={ExclusionPatternCreate} 
    />
  </Admin>
);

export default App;