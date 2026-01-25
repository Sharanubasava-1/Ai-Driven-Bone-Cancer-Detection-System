AI-Driven Bone Cancer Detection System
An end-to-end AI-powered medical imaging system for bone cancer detection and analysis using Deep Learning, featuring segmentation, classification, and a full-stack web interface.

Project Overview
Bone cancer diagnosis from medical images is a complex and time-consuming process. This project aims to assist medical professionals by providing an automated AI-based system that:
Detects bone cancer from X-ray
Segments the affected region
Classifies images as Normal / Malignant
Generates structured diagnostic reports
Provides a user-friendly web interface
The system integrates CNN-based classification, U-Net-based segmentation, and a Flask + React full-stack application.

Key Features
✅ Bone cancer image classification using CNN
✅ Tumor segmentation using U-Net
✅ Flask-based REST API backend
✅ React-based frontend dashboard
✅ Image upload & prediction workflow
✅ PDF report generation
✅ Dockerized deployment support

Deep Learning Models Used
| Task           | Model              
 --------------   ------------------ 
  Segmentation     U-Net              
  Classification   CNN                
  Framework        TensorFlow / Keras 

  **Trained models are not included in this repository due to size limits**

**Tech Stack**
🔹 Backend
-Python
-Flask
-TensorFlow / Keras
-OpenCV
-NumPy, Pandas

🔹 Frontend
-React.js
-HTML, CSS, JavaScript

🔹 DevOps
-Docker
-Docker Compose
-Git & GitHub

**Project Structure **
Bone-Cancer-Detection/
│
├── backend/
│   ├── flask_app.py
│   ├── train_model.py
│   ├── requirements.txt
│   ├── templates/
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .gitignore
└── README.md

**How to Run the Project**
1. Clone Repository
git clone https://github.com/Sharanubasava-1/Bone-Cancer-Detection.git
cd Bone-Cancer-Detection

2. Backend Setup (Local)
cd backend
pip install -r requirements.txt
python flask_app.py

Backend runs at:
http://localhost:5000

3. Frontend Setup
cd frontend
npm install
npm start

Frontend runs at:
http://localhost:3000

4. Run Using Docker (Recommended)
docker-compose up --build

Output
-Prediction: Normal / Malignant
-Segmented tumor region
-Auto-generated PDF medical report
-Confidence scores
