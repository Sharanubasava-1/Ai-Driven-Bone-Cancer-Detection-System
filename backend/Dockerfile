# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install all required system dependencies for WeasyPrint and OpenCV
# Inside D:\Project\IDK\backend\Dockerfile

RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libcairo2 \
    fonts-dejavu-core \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the dependencies file
COPY requirements.txt .

# Install Python packages
RUN pip install --default-timeout=600 --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Run the app using gunicorn
# In Dockerfile, change CMD:
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "flask_app:app"]
