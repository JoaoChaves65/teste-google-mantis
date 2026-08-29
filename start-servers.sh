#!/bin/bash
set -e

# Start API server
cd /home/joaomarcos/teste-do-mantis/packages/api-secure
nohup node dist/main.js > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "API Server started with PID: $API_PID"

# Wait for API to be ready
for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null; then
    echo "API server is ready"
    break
  fi
  sleep 1
done

# Start Web server
cd /home/joaomarcos/teste-do-mantis/packages/web
nohup npm run dev > /tmp/web-server.log 2>&1 &
WEB_PID=$!
echo "Web Server started with PID: $WEB_PID"

# Wait for Web to be ready
for i in {1..30}; do
  if curl -s http://localhost:5173 > /dev/null; then
    echo "Web server is ready"
    break
  fi
  sleep 1
done

echo "Both servers are running"
echo "API PID: $API_PID"
echo "WEB PID: $WEB_PID"

# Keep script running
wait $API_PID $WEB_PID
