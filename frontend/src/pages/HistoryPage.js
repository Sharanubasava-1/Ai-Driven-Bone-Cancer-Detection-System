import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL, USER_ID_PATTERN } from '../config';

export function HistoryPage() {
    const [userId, setUserId] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastFetched, setLastFetched] = useState('');

    const validationError = useMemo(() => {
        const cleaned = userId.trim();
        if (!cleaned) {
            return 'Please enter a user ID.';
        }

        return USER_ID_PATTERN.test(cleaned)
            ? ''
            : 'User ID may contain only letters, numbers, hyphen, and underscore.';
    }, [userId]);

    const fetchHistory = async (event) => {
        event.preventDefault();

        if (validationError) {
            setHistory([]);
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.get(`${API_URL}/api/report`, {
                params: { userid: userId.trim() }
            });

            const payload = Array.isArray(response.data) ? response.data[0] : response.data;
            if (payload?.status === 'success') {
                setHistory(payload.results || []);
                setLastFetched(new Date().toLocaleString());
            } else {
                setHistory([]);
                setError(payload?.error || 'No history found for this user.');
            }
        } catch (historyError) {
            setHistory([]);
            setError(historyError.response?.data?.error || 'Failed to fetch history.');
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setUserId('');
        setHistory([]);
        setError('');
        setLastFetched('');
    };

    return (
        <div className="page-shell">
            <section className="section-block content-panel">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Analysis history</p>
                        <h2 className="section-title">Review prior cases by user ID.</h2>
                        <p className="section-lead">
                            This page behaves like an audit log for a clinical imaging application, showing earlier predictions, timestamps, and report links in one place.
                        </p>
                    </div>
                </div>

                <div className="history-layout">
                    <form className="history-card" onSubmit={fetchHistory}>
                        <label className="label-small" htmlFor="history-user-id">User ID</label>
                        <div className="history-toolbar" style={{ marginTop: '0.55rem' }}>
                            <input
                                id="history-user-id"
                                className="history-input"
                                type="text"
                                placeholder="Enter user id"
                                value={userId}
                                onChange={(event) => setUserId(event.target.value)}
                                autoComplete="off"
                            />
                            <button className="button" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Load history'}</button>
                            <button className="ghost-button" type="button" onClick={clearForm}>Clear</button>
                        </div>

                        {error && <div className="error-card" style={{ marginTop: '1rem' }}>{error}</div>}

                        <div className="summary-card" style={{ marginTop: '1rem' }}>
                            <strong>Last fetched</strong>
                            <span>{lastFetched || 'Not yet loaded'}</span>
                        </div>

                        <div className="summary-card" style={{ marginTop: '1rem' }}>
                            <strong>Privacy note</strong>
                            <span>Results are scoped to the supplied user ID and should be treated as protected clinical information.</span>
                        </div>
                    </form>

                    <aside className="history-card">
                        {loading ? (
                            <div className="loading-state"><div className="spinner" /></div>
                        ) : history.length > 0 ? (
                            <div className="history-list">
                                {history.map((item, index) => {
                                    const patientLabel = item.patientname || item.patient_name || item.extra?.patient_name || item.rawrow?.patientname || item.rawrow?.patient_name || item.userid || 'Unknown patient';
                                    const confidenceValue = item.confidence != null
                                        ? `${item.confidence}%`
                                        : item.extra?.confidence != null
                                            ? `${item.extra.confidence}%`
                                            : item.rawrow?.confidence != null
                                                ? `${item.rawrow.confidence}%`
                                                : 'Not available';
                                    const timestampValue = item.createdat || item.created_at || item.extra?.created_at || item.rawrow?.created_at;

                                    return (
                                        <article className="history-card" key={item.id || index}>
                                            <div className="history-card-head">
                                                <div>
                                                    <p className="eyebrow">Case {index + 1}</p>
                                                    <h3>{patientLabel}</h3>
                                                </div>
                                                <span className={`pill ${String(item.prediction || item.extra?.prediction || item.rawrow?.prediction || '').toLowerCase() === 'malignant' ? 'pill-danger' : 'pill-neutral'}`}>
                                                    {item.prediction || item.extra?.prediction || item.rawrow?.prediction || 'Pending'}
                                                </span>
                                            </div>

                                            {item.publicurl && (
                                                <div className="history-image-frame">
                                                    <img src={item.publicurl} alt="Historical scan" />
                                                </div>
                                            )}

                                            <div className="detail-row">
                                                <span className="detail-label">Confidence</span>
                                                <strong>{confidenceValue}</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Recommendation</span>
                                                <strong>{item.recommendation || item.extra?.recommendation || item.rawrow?.recommendation || 'Not available'}</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Timestamp</span>
                                                <strong>{timestampValue ? new Date(timestampValue).toLocaleString() : 'Not available'}</strong>
                                            </div>

                                            <div className="button-row">
                                                {item.downloadreporturl && <a className="ghost-button" href={item.downloadreporturl}>Download report</a>}
                                                {item.publicurl && <a className="ghost-button" href={item.publicurl} target="_blank" rel="noopener noreferrer">Open image</a>}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="story-card">
                                <p className="eyebrow">No records loaded</p>
                                <h3 className="card-title">Search a user ID to populate the timeline.</h3>
                                <p className="detail-text">The history panel will render previous reports as soon as the backend returns results.</p>
                            </div>
                        )}
                    </aside>
                </div>
            </section>
        </div>
    );
}
