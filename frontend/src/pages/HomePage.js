import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
    return (
        <div className="page-shell">
            <section className="hero-panel">
                <div className="hero-copy">
                    <p className="eyebrow">Clinical AI for orthopaedic review</p>
                    <h2>Faster review for bone imaging, with a patient-first workflow.</h2>
                    <p>
                        BoneScan Care presents scan analysis in a hospital-style interface so clinicians can review uploads, track prior studies, and generate clear reports without losing context.
                    </p>

                    <div className="hero-actions">
                        <Link className="button" to="/analysis">Start analysis</Link>
                        <Link className="ghost-button" to="/history">View history</Link>
                    </div>
                </div>

                <div className="hero-aside">
                    <div className="summary-card">
                        <p className="eyebrow">Service snapshot</p>
                        <strong className="section-title">Multimodal screening assistant</strong>
                        <span className="detail-text">
                            Built to organize patient uploads, summarize model findings, and surface recommendations in a format that feels close to a real clinical dashboard.
                        </span>
                    </div>

                    <div className="metric-grid">
                        <div className="metric-card">
                            <strong>01</strong>
                            <span>Upload and validate a scan</span>
                        </div>
                        <div className="metric-card">
                            <strong>02</strong>
                            <span>Review model confidence and guidance</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-block content-panel">
                <div className="section-header">
                    <div>
                        <h3 className="section-title">Designed for a believable care workflow</h3>
                        <p className="section-lead">
                            The interface emphasizes the same kinds of details a real diagnostic support tool would present: scan status, patient identity, confidence, follow-up recommendations, and history.
                        </p>
                    </div>
                    <Link className="link-button" to="/analysis">Open analysis workspace</Link>
                </div>

                <div className="grid-3">
                    <article className="workflow-card">
                        <span className="workflow-index">1</span>
                        <strong>Scan intake</strong>
                        <span className="card-copy">Clear upload panel, patient identifiers, and validation for the user account tied to the case.</span>
                    </article>
                    <article className="workflow-card">
                        <span className="workflow-index">2</span>
                        <strong>Clinical review</strong>
                        <span className="card-copy">Prediction, confidence, and recommendation are displayed in a structured results card for quick review.</span>
                    </article>
                    <article className="workflow-card">
                        <span className="workflow-index">3</span>
                        <strong>Audit trail</strong>
                        <span className="card-copy">Previously analyzed cases remain accessible in history so staff can revisit earlier reports quickly.</span>
                    </article>
                </div>
            </section>
        </div>
    );
}
