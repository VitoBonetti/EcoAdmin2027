FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite, exposing it to the host network
CMD ["npm", "run", "dev", "--", "--host"]