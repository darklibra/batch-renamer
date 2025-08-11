import { useState, useEffect } from "react";

export const useFiles = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_REACT_APP_API_BASE_URL}/files`)
      .then(res => res.json())
      .then(setFiles);
  }, []);

  return files;
};