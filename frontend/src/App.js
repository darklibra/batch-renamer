import React from 'react';
import { Admin, Resource, Layout, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import dataProvider from './dataProvider';
import { FileList } from './files';
import { FileChangePatternList, FileChangePatternEdit, FileChangePatternCreate } from './fileChangePatterns';
import { ExclusionPatternList, ExclusionPatternEdit, ExclusionPatternCreate } from './exclusionPatterns';
import FileIndexer from './FileIndexer';
import PatternTester from './PatternTester';
import MyMenu from './MyMenu'; // MyMenu 임포트

const MyLayout = (props) => <Layout {...props} appBar={() => null} menu={MyMenu} />;

const App = () => (
  <Admin dataProvider={dataProvider} layout={MyLayout} dashboard={FileIndexer}>
    <CustomRoutes>
      <Route path="/pattern-tester" element={<PatternTester />} />
    </CustomRoutes>
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