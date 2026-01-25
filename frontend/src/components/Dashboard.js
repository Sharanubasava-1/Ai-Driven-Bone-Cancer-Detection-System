// src/components/Dashboard.js
import React from 'react';

const Dashboard = ({ history }) => {
    if (!history || history.length === 0) {
        return <div>No analysis history available.</div>;
    }

    return (
        <div className="dashboard-container">
            <h2>Analysis History</h2>
            <table className="history-table">
                <thead>
                    <tr>
                        <th>Analysis ID</th>
                        <th>Filename</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((item) => (
                        <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.filename}</td>
                            <td>{item.classification.predicted_class}</td>
                            <td>{(item.classification.confidence * 100).toFixed(1)}%</td>
                            <td>{new Date(item.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard;