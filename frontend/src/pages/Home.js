// src/pages/Home.js
import React from 'react';

const Home = () => {
    return (
        <div className="home-container">
            <h1>Welcome to AI-Driven Bone Cancer Detection</h1>
            <p>
                This system uses advanced deep learning techniques to assist medical professionals in
                detecting bone cancer early from X-ray, MRI, and CT scan images.
            </p>
            <p>
                Upload medical images to get automated tumor segmentation and classification results
                with diagnostic confidence and clinical recommendations.
            </p>
            <p>
                Please navigate to the Upload page to begin analysis.
            </p>
        </div>
    );
};

export default Home;
