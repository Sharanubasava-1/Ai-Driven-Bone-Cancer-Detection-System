#!/bin/bash

clear 

IMAGE_NAME="idk:latest"
CONTAINER_NAME="idk_container"

echo "🔍 Stopping existing container (if running)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🧹 Removing old image..."
docker rmi $IMAGE_NAME 2>/dev/null || true

echo "🔨 Building new image ($IMAGE_NAME)..."
docker build -t $IMAGE_NAME .

echo "🚀 Starting new container..."
docker run -d --name $CONTAINER_NAME -p 80:80 $IMAGE_NAME

echo "✅ Deployment complete!"
docker ps -a
