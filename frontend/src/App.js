// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import History from './components/History';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  return (
    <div className="container">
      <header className="header">
        <h1>AI-Driven Bone Cancer Detection System</h1>
        <p>Advanced Medical Image Analysis with Deep Learning</p>
      </header>

      <nav className="tabs">
        <TabButton id="upload" activeTab={activeTab} setActiveTab={setActiveTab}>Upload</TabButton>
        <TabButton id="history" activeTab={activeTab} setActiveTab={setActiveTab}>History</TabButton>
        <TabButton id="about" activeTab={activeTab} setActiveTab={setActiveTab}>About</TabButton>
      </nav>

      <main className="content-card">
        {activeTab === 'upload' && <UploadPage onSuccess={() => setHistoryRefreshTrigger(t => t + 1)} />}
        {activeTab === 'history' && <HistoryPage refreshTrigger={historyRefreshTrigger} />}
        {activeTab === 'about' && <AboutPage />}
      </main>
    </div>
  );
}

const TabButton = ({ id, activeTab, setActiveTab, children }) => (
  <button
    className={`tab-button ${activeTab === id ? 'active' : ''}`}
    onClick={() => setActiveTab(id)}
  >
    {children}
  </button>
);

/* ---------------- UploadPage ---------------- */
const UploadPage = ({ onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [patientName, setPatientName] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const validateUserId = (value) => {
    if (!value || value.trim() === '') return 'User ID is required';
    const cleaned = value.trim();
    const ok = /^[A-Za-z0-9_-]+$/.test(cleaned);
    return ok ? '' : 'User ID may contain only letters, numbers, hyphen (-) and underscore (_)';
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    // validation
    const uidErr = validateUserId(userId);
    if (uidErr) {
      setError(uidErr);
      return;
    }
    if (!selectedFile || !patientName) {
      setError('Please select an image and enter a patient name.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_name', patientName);
    formData.append('userid', userId);

    try {
      const response = await axios.post(`${API_URL}/api/predict`, formData, {
        headers: {
          'X-User-Id': userId,
          'Accept': 'application/json'
          // do NOT set Content-Type; axios handles boundary
        },
        timeout: 60000
      });

      if (response.data?.status === 'error' || response.data?.error) {
        setError(response.data.error || response.data?.message || 'Server returned an error.');
      } else {
        setResult(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      }
    } catch (err) {
      console.error('Upload error', err);
      setError(err.response?.data?.error || err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="spinner"></div>;

  if (result) return (
    <ResultsDisplay
      result={result}
      preview={preview}
      onReset={() => { setResult(null); setPreview(''); setSelectedFile(null); setPatientName(''); setUserId(''); }}
    />
  );

  return (
    <div>
      <h2>Medical Image Upload</h2>
      <form id="upload-form" onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
        <label htmlFor="file-input" className="drop-zone">
          {preview ? <img src={preview} alt="Preview" className="image-preview" /> : <p>Drop medical image here or <span className="browse-link">browse files</span></p>}
        </label>
        <input type="file" id="file-input" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

        {preview && (
          <div className="patient-name-input">
            <input
              type="text"
              placeholder="Enter Patient Name or ID"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />
          </div>
        )}

        {/* User ID input */}
        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Enter your user id (e.g. test_user_123)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: 8, width: 320 }}
            autoComplete="off"
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Provide your <strong>user id</strong> so results are stored under your account.
          </div>
        </div>

        {error && <div className="content-card error-card" style={{ marginTop: 12 }}>{error}</div>}

        <button type="submit" className="button" disabled={!selectedFile || !patientName || !userId}>Analyze Image</button>
      </form>
    </div>
  );
};

/* ------------- ResultsDisplay (Upload success) -------------- */
const ResultsDisplay = ({ result, preview, onReset }) => {
  if (!result || !result.prediction) {
    const errorMessage = result?.error || "The analysis did not return a valid result. Please try again.";
    return (
      <div>
        <h2>Analysis Failed</h2>
        <p className="error-card">{errorMessage}</p>
        <button className="button" onClick={onReset}>Analyze Another Image</button>
      </div>
    );
  }

  const downloadUrl = new URL(`${API_URL}/download_report`);
  downloadUrl.searchParams.append('prediction', result.prediction);
  downloadUrl.searchParams.append('confidence', result.confidence);
  downloadUrl.searchParams.append('recommendation', result.recommendation);
  downloadUrl.searchParams.append('image_name', result.image_name || result.local_filename || '');
  downloadUrl.searchParams.append('patient_name', result.patient_name || '');

  return (
    <div>
      <h2>Analysis Complete</h2>
      <div className="results-grid">
        <img src={preview} alt="Analyzed" className="image-preview" />
        <div className="results-info">
          <p><strong>Patient:</strong> {result.patient_name}</p>
          <p><strong>Prediction:</strong> <span className={result.prediction === 'Malignant' ? 'prediction-malignant' : ''}>{result.prediction}</span></p>
          <p><strong>Confidence:</strong> {result.confidence}%</p>
          <p><strong>Recommendation:</strong> {result.recommendation}</p>
        </div>
      </div>

      <a href={downloadUrl.href} className="button download-button">Download PDF Report</a>
      <button className="button" onClick={onReset}>Analyze Another Image</button>
    </div>
  );
};

/* ---------------- HistoryPage ---------------- */
const HistoryPage = ({ refreshTrigger }) => {
  const [userId, setUserId] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [lastQueried, setLastQueried] = useState(null);

  useEffect(() => {
    // If parent triggers a refresh and we've previously fetched for a user, re-query
    if (refreshTrigger && userId) {
      fetchHistory(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const validateUserId = (value) => {
    if (!value || value.trim() === '') return 'User ID is required';
    const cleaned = value.trim();
    const ok = /^[A-Za-z0-9_-]+$/.test(cleaned);
    return ok ? '' : 'User ID may contain only letters, numbers, hyphen (-) and underscore (_)';
  };

  const fetchHistory = async (uid) => {
    const uidErr = validateUserId(uid);
    if (uidErr) {
      setError(uidErr);
      return;
    }

    setFetching(true);
    setError('');
    setRecords([]);

    try {
      const resp = await axios.get(`${API_URL}/api/report`, {
        params: { userid: uid },
        headers: { Accept: 'application/json' },
        timeout: 30000
      });

      console.log('History API response:', resp.data);

      // NEW LINE - Add this:
      const payload = Array.isArray(resp.data) ? resp.data[0] : resp.data;

      // UPDATED - Change all resp.data to payload:
      if (!payload || payload.status !== 'success') {
        setError(payload?.error || 'Server returned an error while fetching history.');
      } else {
        const results = payload.results || [];
        setRecords(results);
        setLastQueried(new Date().toLocaleString());
      }

    } catch (err) {
      console.error('History fetch error', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch history from server.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <h2>History</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Enter your user id (e.g. 1212)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: 8, width: 320 }}
        />
        <button
          className="button"
          onClick={() => fetchHistory(userId)}
          disabled={!userId || fetching}
        >
          {fetching ? 'Loading...' : 'Load History'}
        </button>
        <button
          className="button"
          onClick={() => { setUserId(''); setRecords([]); setError(''); setLastQueried(null); }}
        >
          Clear
        </button>
      </div>

      {error && <div className="content-card error-card" style={{ marginBottom: 12 }}>{error}</div>}
      {lastQueried && <div style={{ marginBottom: 12, color: '#666' }}>Last fetched: {lastQueried}</div>}

      {fetching && <div className="spinner" />}

      {!fetching && records.length === 0 && !error && (
        <div style={{ color: '#666' }}>No records to show. Enter a user id and click "Load History".</div>
      )}

      <div className="history-grid" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {records.map((r) => {
          const basename = r.imagepath ? r.imagepath.split('/').pop() : (r.extra?.localfilename || '');
          const imgSrc = r.publicurl || r.signedurl || r.backenduploadurl || (basename ? `${API_URL}/uploads/${encodeURIComponent(basename)}` : '');
          const created = r.createdat ? new Date(r.createdat).toLocaleString() : r.createdat || 'N/A';
          return (
            <div key={r.id || r.extra?.localfilename || Math.random()} className="card">
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f6f6f6' }}>
                {imgSrc ? <img src={imgSrc} alt="thumb" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#999' }}>No preview</div>}
              </div>

              <div style={{ padding: 12 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.patientname || r.extra?.patient_name || 'Unknown patient'}</p>
                <p style={{ margin: '6px 0 0' }}><strong>Prediction:</strong> <span className={r.prediction === 'Malignant' ? 'prediction-malignant' : ''}>{r.prediction || 'N/A'}</span></p>
                <p style={{ margin: '6px 0 0' }}><strong>Confidence:</strong> {r.confidence != null ? `${r.confidence}%` : 'N/A'}</p>
                <p style={{ margin: '6px 0 0', color: '#666' }}><small>{created}</small></p>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {r.downloadreporturl && <a href={r.downloadreporturl} className="button" target="_blank" rel="noreferrer">Download Report</a>}
                  {imgSrc && <a href={imgSrc} className="button" target="_blank" rel="noreferrer">Open Image</a>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- About ---------------- */
const AboutPage = () => (
  <div className="about-section">
    <h2>About Our System</h2>
    <p className="lead">
      This application leverages state-of-the-art deep learning to provide a rapid, data-driven preliminary analysis of medical images for signs of bone cancer, serving as a valuable tool for medical professionals.
    </p>
  </div>
);

export default App;
