import React from 'react';
import './App.css';
import FileList from './components/FileList';
import FileChangePatternList from './components/FileChangePatternList'; // FileChangePatternList 컴포넌트 임포트

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Clear File Frontend</h1>
      </header>
      <main>
        <FileList />
        <hr /> {/* 구분선 추가 */}
        <FileChangePatternList /> {/* FileChangePatternList 컴포넌트 렌더링 */}
      </main>
    </div>
  );
}

export default App;
