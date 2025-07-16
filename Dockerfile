FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy all source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "cd backend && npm start"]
