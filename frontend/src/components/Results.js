import React from 'react';
import './Results.css';

function Results({ predictionResult, onReset, imagePreview }) {

    if (!predictionResult || !predictionResult.classification) {
        return <p className="error-message">Error: Analysis data is missing or incomplete.</p>;
    }

    const { id, classification, analysis } = predictionResult; // 'segmentation' is no longer needed here
    const predictionClass = classification.predicted_class === 'Malignant' ? 'malignant' : 'benign';

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const downloadUrl = `${apiUrl}/api/report/${id}/download`;

    return (
        <div className="results-view">
            <h2 className="results-title">Analysis Complete</h2>

            <div className="results-main-content">
                <div className="results-visuals">
                    {imagePreview && (
                        <div className="image-box">
                            <h3 className="visual-title">Original Image</h3>
                            <img src={imagePreview} alt="Original Upload" className="result-image" />
                        </div>
                    )}
                    {/* --- SEGMENTATION MASK SECTION HAS BEEN REMOVED --- */}
                </div>

                <div className="results-analysis">
                    <div className="result-item">
                        <span className="result-label">Prediction:</span>
                        <span className={`result-value ${predictionClass}`}>{classification.predicted_class}</span>
                    </div>
                    <div className="result-item">
                        <span className="result-label">Confidence Level:</span>
                        <span className="result-value">
                            {analysis.confidence_level} ({(classification.confidence * 100).toFixed(2)}%)
                        </span>
                    </div>
                    <div className="recommendation">
                        <h4>Recommendation:</h4>
                        <p>{analysis.recommendation}</p>
                    </div>
                </div>
            </div>

            <div className="button-group">
                <button onClick={onReset} className="button">Analyze Another Image</button>
                <a href={downloadUrl} className="button button-secondary" target="_blank" rel="noopener noreferrer">
                    📄 Download Report (PDF)
                </a>
            </div>
        </div>
    );
}

export default Results;
