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
                params: { userid: userId.trim }
            });

            console.log('API Response:', response.data);

            if (response.data.status === 'success') {
                setHistory(response.data.results || []);
            } else {
                setError(response.data.error || 'Unknown error');
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
                    placeholder="Enter your user id (e.g. id_21)"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="history-input"
                />
                <button onClick={fetchHistory} className="history-button primary">
                    Load History
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
                <ul className="history-list">
                    {history.map((item, idx) => (
                        <li key={item.id || idx} className="history-item">
                            {item.publicurl && (
                                <img
                                    src={item.publicurl}
                                    alt="Scan"
                                    className="history-image"
                                />
                            )}
                            <div className="history-details">
                                <h4>{item.patientname || 'Unknown patient'}</h4>
                                <p><strong>Prediction:</strong> {item.prediction || 'N/A'}</p>
                                <p><strong>Confidence:</strong> {item.confidence != null ? `${item.confidence}%` : 'N/A'}</p>
                                <p><strong>Recommendation:</strong> {item.recommendation || 'N/A'}</p>
                                <p className="history-time">
                                    {item.createdat ? new Date(item.createdat).toLocaleString() : 'N/A'}
                                </p>
                            </div>
                            <div className="history-actions">
                                {item.downloadreporturl && (
                                    <a href={item.downloadreporturl}>
                                        <button>Download Report</button>
                                    </a>
                                )}
                                {item.publicurl && (
                                    <a href={item.publicurl} target="_blank" rel="noopener noreferrer">
                                        <button style={{ marginLeft: 8 }}>Open Image</button>
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
