FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy all source code
COPY . .

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start the application (now we're already in backend directory)
CMD ["npm", "start"]
