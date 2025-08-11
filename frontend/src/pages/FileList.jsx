import React, { useState } from "react";
import { useFiles } from "../hooks/useFiles";

export default function FileList() {
  const files = useFiles();
  const [destination, setDestination] = useState("");

  const handleCopy = async (sourcePath) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_BASE_URL}/files/copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: sourcePath,
          destination: destination,
        }),
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error copying file:", error);
      alert("Failed to copy file.");
    }
  };

  return (
    <div>
      <h2>File List</h2>
      <div>
        <label htmlFor="destination-path">Destination Path:</label>
        <input
          id="destination-path"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g., /organized/2023/08/"
        />
      </div>
      <ul>
        {files.map((file) => (
          <li key={file.name}>
            {file.name} ({file.path})
            <button onClick={() => handleCopy(file.path)}>Copy</button>
          </li>
        ))}
      </ul>
    </div>
  );
}