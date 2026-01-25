import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// --- CORRECTED IMPORT PATH ---
// It should look for 'App' in the current directory ('./'), not a sub-directory.
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
