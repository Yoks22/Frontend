# Stage 1: Build the React/Static app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
ARG REACT_APP_BACKEND_API_URL
ENV REACT_APP_BACKEND_API_URL=$REACT_APP_BACKEND_API_URL

RUN npm install
COPY . .
# Keeping your CI=false fix
RUN CI=false npm run build

# Stage 2: Serve the app using a Node server
FROM node:18-alpine
WORKDIR /app

# Install 'serve' globally to host the static build folder
RUN npm install -g serve

# Copy only the built files from the build stage
COPY --from=build /app/build ./build

# Expose port 3000 (the default for the 'serve' package)
EXPOSE 3000

# Run 'serve' on port 3000
CMD ["serve", "-s", "build", "-l", "3000"]
