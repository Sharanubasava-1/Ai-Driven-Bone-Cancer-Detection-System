import React from 'react';

export function AboutPage() {
    return (
        <div className="page-shell">
            <section className="section-block content-panel">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">About the platform</p>
                        <h2 className="section-title">A realistic front end for clinical decision support.</h2>
                        <p className="section-lead">
                            This project packages the analysis pipeline inside a modern healthcare-style interface so the experience feels closer to a hospital imaging portal than a proof-of-concept demo.
                        </p>
                    </div>
                </div>

                <div className="grid-2">
                    <div className="info-card">
                        <h3 className="card-title">What it does</h3>
                        <p className="card-copy">
                            Users can upload a scan, associate it with a patient record, review the model output, download a report, and revisit prior results from the history page.
                        </p>
                    </div>
                    <div className="info-card">
                        <h3 className="card-title">How it is presented</h3>
                        <p className="card-copy">
                            The design uses clinical navigation, soft data cards, structured metrics, and muted colors to resemble a professional healthcare application without becoming sterile.
                        </p>
                    </div>
                    <div className="info-card">
                        <h3 className="card-title">Model support</h3>
                        <p className="card-copy">
                            The UI is prepared for classification, confidence, recommendation, and report-generation responses from the backend API.
                        </p>
                    </div>
                    <div className="info-card">
                        <h3 className="card-title">Clinical note</h3>
                        <p className="card-copy">
                            Output should be treated as decision support and reviewed by qualified medical professionals before any patient-facing action is taken.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
