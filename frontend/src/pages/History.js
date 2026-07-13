import React, { useState } from 'react';
import axios from 'axios';
import './History.css';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    const trimmed = userId.trim();
    if (!trimmed) {
      setHistory([]);
      setError('Please enter a user id.');
      setLastFetched(new Date().toLocaleString());
      return;
    }

    try {
      setLoading(true);
      setError('');
      setHistory([]);

      const response = await axios.get('http://localhost:5000/api/report', {
        params: { userid: trimmed }
      });

      console.log('API Response:', response.data);

      // Backend returns: [ { status, results, count }, 200 ]
      const payload = Array.isArray(response.data) ? response.data[0] : response.data;

      if (payload && payload.status === 'success') {
        setHistory(payload.results || []);
      } else {
        setError(payload?.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Failed to fetch history. Check console/network.');
    } finally {
      setLoading(false);
      setLastFetched(new Date().toLocaleString());
    }
  };

  const handleClear = () => {
    setUserId('');
    setHistory([]);
    setError('');
    setLastFetched(null);
  };

  return (
    <div className="history-container">
      <h2 className="history-title">History</h2>

      <div className="history-controls">
        <input
          type="text"
          placeholder="Enter your user id (e.g. 1212)"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="history-input"
        />
        <button onClick={fetchHistory} className="history-button primary" disabled={loading}>
          {loading ? 'Loading...' : 'Load History'}
        </button>
        <button onClick={handleClear} className="history-button secondary">
          Clear
        </button>
      </div>

      <div className="history-meta">
        {lastFetched && <p>Last fetched: {lastFetched}</p>}
      </div>

      {loading && <p>Loading history...</p>}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {!loading && !error && history.length === 0 && (
        <p>No records to show. Enter a user id and click "Load History".</p>
      )}

      {history.length > 0 && (
        <ul className="history-list" style={{ listStyle: 'none', padding: 0 }}>
          {history.map((item, idx) => (
            <li key={item.id || idx} style={{ border: '1px solid #ddd', padding: 15, marginBottom: 15, borderRadius: 8 }}>
              {item.publicurl && (
                <img
                  src={item.publicurl}
                  alt="Scan"
                  style={{ maxWidth: 300, display: 'block', marginBottom: 10 }}
                />
              )}
              <div>
                <h4>{item.patientname || item.patient_name || item.extra?.patient_name || item.rawrow?.patientname || item.rawrow?.patient_name || item.userid || 'Unknown patient'}</h4>
                <p><strong>Prediction:</strong> {item.prediction || item.extra?.prediction || item.rawrow?.prediction || 'Not available'}</p>
                <p><strong>Confidence:</strong> {item.confidence != null ? `${item.confidence}%` : (item.extra?.confidence != null ? `${item.extra.confidence}%` : (item.rawrow?.confidence != null ? `${item.rawrow.confidence}%` : 'Not available'))}</p>
                <p><strong>Recommendation:</strong> {item.recommendation || item.extra?.recommendation || item.rawrow?.recommendation || 'Not available'}</p>
                <p style={{ color: '#666', fontSize: 12 }}>
                  {item.createdat || item.created_at || item.extra?.created_at || item.rawrow?.created_at ? new Date(item.createdat || item.created_at || item.extra?.created_at || item.rawrow?.created_at).toLocaleString() : 'Not available'}
                </p>
              </div>
              <div style={{ marginTop: 10 }}>
                {item.downloadreporturl && (
                  <a href={item.downloadreporturl}>
                    <button style={{ marginRight: 10 }}>Download Report</button>
                  </a>
                )}
                {item.publicurl && (
                  <a href={item.publicurl} target="_blank" rel="noopener noreferrer">
                    <button>Open Image</button>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default History;