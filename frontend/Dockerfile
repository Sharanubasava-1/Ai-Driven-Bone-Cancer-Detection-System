# --- Stage 1: Build the React Application ---
# Use an official Node.js image as the builder
FROM node:18-slim AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# after npm install / npm ci step
RUN chmod +x ./node_modules/.bin/* || true
RUN npm run build

# Build the application for production
RUN npm run build


# --- Stage 2: Serve the Application with Nginx ---
# Use a lightweight Nginx image to serve the static files
FROM nginx:stable-alpine

# Copy the built static files from the 'build' stage
COPY --from=build /app/build /usr/share/nginx/html

# Tell Docker that the container listens on port 80
EXPOSE 80

# The default command to start Nginx
CMD ["nginx", "-g", "daemon off;"]