import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL, USER_ID_PATTERN } from '../config';

export function AnalysisPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [patientName, setPatientName] = useState('');
    const [userId, setUserId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const validationError = useMemo(() => {
        const cleaned = userId.trim();
        if (!cleaned) {
            return 'User ID is required.';
        }

        return USER_ID_PATTERN.test(cleaned)
            ? ''
            : 'User ID may contain only letters, numbers, hyphen, and underscore.';
    }, [userId]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setSelectedFile(file);
        setError('');
        setResult(null);

        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (validationError) {
            setError(validationError);
            return;
        }

        if (!selectedFile || !patientName.trim()) {
            setError('Please choose a scan and enter a patient name or identifier.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('patient_name', patientName.trim());
        formData.append('userid', userId.trim());

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await axios.post(`${API_URL}/api/predict`, formData, {
                headers: {
                    'X-User-Id': userId.trim(),
                    Accept: 'application/json'
                },
                timeout: 60000
            });

            if (response.data?.status === 'error' || response.data?.error) {
                setError(response.data.error || response.data?.message || 'The server returned an error.');
                return;
            }

            setResult(response.data);
        } catch (uploadError) {
            setError(uploadError.response?.data?.error || uploadError.message || 'Unexpected analysis failure.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setPreview('');
        setPatientName('');
        setUserId('');
        setResult(null);
        setError('');
    };

    const downloadUrl = useMemo(() => {
        if (!result?.prediction) {
            return '';
        }

        const url = new URL(`${API_URL}/download_report`);
        url.searchParams.append('prediction', result.prediction || '');
        url.searchParams.append('confidence', result.confidence || '');
        url.searchParams.append('recommendation', result.recommendation || '');
        url.searchParams.append('image_name', result.image_name || result.local_filename || '');
        url.searchParams.append('patient_name', result.patient_name || patientName.trim());
        return url.href;
    }, [patientName, result]);

    return (
        <div className="page-shell">
            <section className="section-block content-panel">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Analysis workspace</p>
                        <h2 className="section-title">Upload a scan for structured review.</h2>
                        <p className="section-lead">
                            This panel mirrors the workflow of a real diagnostic support application: identify the case, upload the image, and review the model output in a concise clinical summary.
                        </p>
                    </div>
                    <Link className="ghost-button" to="/history">Open history</Link>
                </div>

                <div className="analysis-layout">
                    <form className="form-card" onSubmit={handleUpload}>
                        <label className="upload-dropzone" htmlFor="file-input">
                            {preview ? (
                                <img src={preview} alt="Selected scan preview" className="image-preview" />
                            ) : (
                                <div className="upload-dropzone-inner">
                                    <span className="upload-dropzone-icon">+</span>
                                    <strong>Drop the scan here</strong>
                                    <span className="detail-text">or browse to select an image from your device</span>
                                </div>
                            )}
                        </label>
                        <input id="file-input" type="file" accept="image/*" onChange={handleFileChange} hidden />

                        <div className="field-grid" style={{ marginTop: '1rem' }}>
                            <div className="field-group">
                                <label htmlFor="patient-name">Patient name or ID</label>
                                <input
                                    id="patient-name"
                                    type="text"
                                    value={patientName}
                                    onChange={(event) => setPatientName(event.target.value)}
                                    placeholder="Enter patient name or identifier"
                                />
                            </div>

                            <div className="field-group">
                                <label htmlFor="user-id">User ID</label>
                                <input
                                    id="user-id"
                                    type="text"
                                    value={userId}
                                    onChange={(event) => setUserId(event.target.value)}
                                    placeholder="Enter your user id"
                                    autoComplete="off"
                                />
                                <div className="field-help">Results are stored against this user ID for later review.</div>
                            </div>
                        </div>

                        {error && <div className="error-card" style={{ marginTop: '1rem' }}>{error}</div>}

                        <div className="button-row">
                            <button className="button" type="submit" disabled={isLoading || !selectedFile || !patientName.trim() || !userId.trim() || Boolean(validationError)}>
                                {isLoading ? 'Analyzing...' : 'Analyze scan'}
                            </button>
                            <button className="ghost-button" type="button" onClick={resetForm} disabled={isLoading && !result}>
                                Reset
                            </button>
                        </div>
                    </form>

                    <aside className="result-card">
                        {isLoading ? (
                            <div className="loading-state"><div className="spinner" /></div>
                        ) : result?.prediction ? (
                            <div className="result-details">
                                <div className="result-summary">
                                    <div>
                                        <p className="eyebrow">Analysis complete</p>
                                        <h3 className="card-title">Case summary</h3>
                                    </div>
                                    <span className={`pill ${result.prediction === 'Malignant' ? 'pill-danger' : 'pill-neutral'}`}>{result.prediction}</span>
                                </div>

                                <div className="result-grid">
                                    <div className="result-image-frame">
                                        <img src={preview} alt="Uploaded scan" />
                                    </div>

                                    <div>
                                        <div className="detail-row">
                                            <span className="detail-label">Patient</span>
                                            <strong>{result.patient_name || patientName.trim()}</strong>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Confidence</span>
                                            <strong>{result.confidence ?? 'Not available'}{result.confidence != null ? '%' : ''}</strong>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Recommendation</span>
                                            <strong>{result.recommendation || 'Not available'}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="button-row">
                                    <a className="button" href={downloadUrl}>Download report</a>
                                    <Link className="ghost-button" to="/history">Review history</Link>
                                    <button className="ghost-button" type="button" onClick={resetForm}>Analyze another</button>
                                </div>
                            </div>
                        ) : (
                            <div className="story-card">
                                <p className="eyebrow">What to expect</p>
                                <h3 className="card-title">Analysis results will appear here.</h3>
                                <p className="detail-text">
                                    After upload, the panel updates with the prediction, confidence, recommendation, and a downloadable report link.
                                </p>
                                <div className="grid-2">
                                    <div className="summary-card">
                                        <strong>Patient context</strong>
                                        <span>Linked to a user-scoped audit trail</span>
                                    </div>
                                    <div className="summary-card">
                                        <strong>Clinical output</strong>
                                        <span>Structured interpretation and follow-up guidance</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </section>
        </div>
    );
}
