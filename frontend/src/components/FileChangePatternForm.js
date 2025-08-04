import React, { useState, useEffect } from 'react';

function FileChangePatternForm({ pattern, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [replacementFormat, setReplacementFormat] = useState('');

  useEffect(() => {
    if (pattern) {
      setName(pattern.name);
      setRegexPattern(pattern.regex_pattern);
      setReplacementFormat(pattern.replacement_format);
    } else {
      setName('');
      setRegexPattern('');
      setReplacementFormat('');
    }
  }, [pattern]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, regex_pattern: regexPattern, replacement_format: replacementFormat });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>이름:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>정규식 패턴:</label>
        <input
          type="text"
          value={regexPattern}
          onChange={(e) => setRegexPattern(e.target.value)}
          required
        />
      </div>
      <div>
        <label>교체 형식:</label>
        <input
          type="text"
          value={replacementFormat}
          onChange={(e) => setReplacementFormat(e.target.value)}
          required
        />
      </div>
      <button type="submit">{pattern ? '수정' : '생성'}</button>
      <button type="button" onClick={onCancel}>취소</button>
    </form>
  );
}

export default FileChangePatternForm;
