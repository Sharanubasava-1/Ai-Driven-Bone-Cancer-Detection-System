// src/pages/Upload.js
import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import Results from '../components/Results';

const Upload = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [patientName, setPatientName] = useState('');  // ADD THIS
  const [fileToUpload, setFileToUpload] = useState(null);
  const [userIdError, setUserIdError] = useState('');

  // Validate user-id
  const validateUserId = (value) => {
    if (!value || value.trim() === '') return 'User ID is required';
    const cleaned = value.trim();
    const ok = /^[A-Za-z0-9_-]+$/.test(cleaned);
    return ok ? '' : 'User ID may contain only letters, numbers, hyphen (-) and underscore (_)';
  };

  const onUserIdChange = (e) => {
    const v = e.target.value;
    setUserId(v);
    const err = validateUserId(v);
    setUserIdError(err);
  };

  // Receive selected file from ImageUpload component
  const handleFileSelected = (file) => {
    setFileToUpload(file);
  };

  const handleUpload = async () => {
    setResult(null);
    setLoading(true);

    // Final validation
    const err = validateUserId(userId);
    if (err) {
      setUserIdError(err);
      setLoading(false);
      return;
    }

    if (!fileToUpload) {
      setResult({ error: 'No file selected' });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('userid', userId);  // CHANGED: removed underscore
    formData.append('patientname', patientName);  // ADD THIS

    // Debug log
    console.log("DEBUG — FormData entries:");
    for (let pair of formData.entries()) {
      console.log("  ", pair[0], "=>", pair[1]);
    }

    console.log("DEBUG — Sending with header X-User-Id:", userId);

    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: formData,
        mode: 'cors',
        headers: {
          'X-User-Id': userId,
          'Accept': 'application/json'
          // DO NOT SET Content-Type
        }
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        data = {
          error: 'Invalid JSON response from server',
          status: response.status,
          details: String(parseErr)
        };
      }

      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      setResult({ error: 'Error uploading or processing the image.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setResult(null);
    setFileToUpload(null);
  };

  return (
    <div className="upload-page">
      {!result ? (
        <div>
          {/* USER ID INPUT */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="userIdInput" style={{ display: 'block', marginBottom: 6 }}>
              User ID (required)
            </label>

            <input
              id="userIdInput"
              type="text"
              value={userId}
              onChange={onUserIdChange}
              placeholder="Enter your user id (e.g. test_user_123)"
              style={{ padding: 8, width: 320 }}
              autoComplete="off"
            />

            {userIdError && (
              <div style={{ color: 'crimson', marginTop: 6 }}>{userIdError}</div>
            )}

            <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
              This textbox accepts only your <strong>user id</strong>, not the patient name.
            </div>
          </div>

          {/* PATIENT NAME INPUT - ADD THIS ENTIRE SECTION */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="patientNameInput" style={{ display: 'block', marginBottom: 6 }}>
              Patient Name (optional)
            </label>

            <input
              id="patientNameInput"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
              style={{ padding: 8, width: 320 }}
              autoComplete="off"
            />
          </div>

          {/* FILE UPLOAD */}
          <ImageUpload onSelectFile={handleFileSelected} loading={loading} />

          {/* UPLOAD BUTTON */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleUpload}
              disabled={!!userIdError || !userId || !fileToUpload || loading}
              style={{
                padding: '8px 16px',
                cursor: (!!userIdError || !userId || !fileToUpload) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Uploading...' : 'Upload & Analyze'}
            </button>
          </div>

          {fileToUpload && (
            <div style={{ marginTop: 10, color: '#333' }}>
              Selected file: <strong>{fileToUpload.name}</strong>
            </div>
          )}
        </div>
      ) : (
        <Results results={result} onNewAnalysis={handleNewAnalysis} />
      )}
    </div>
  );
};

export default Upload;