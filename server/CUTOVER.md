# Node.js Backend Mirror - Cutover Guide

## Overview

This document provides a step-by-step guide to migrate from the Python FastAPI backend to the Node.js Express backend while maintaining 100% API compatibility.

## Pre-Migration Checklist

- [ ] Python backend is running and functional
- [ ] Database backup created (`cp aichatbot.db aichatbot.db.backup`)
- [ ] Environment variables documented
- [ ] File upload directories noted
- [ ] Frontend applications identified and tested

## Migration Steps

### Phase 1: Preparation

1. **Install Node.js Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment from Python backend
   cp ../backend/.env.example .env
   # Edit .env with your actual values:
   # - GEMINI_API_KEY
   # - HUGGINGFACE_API_TOKEN
   # - DATABASE_URL=file:../aichatbot.db (use same SQLite file)
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client (uses existing SQLite database)
   npx prisma generate
   
   # Verify database connectivity
   npx prisma db pull
   ```

### Phase 2: Validation Testing

4. **Build and Test**
   ```bash
   # Build TypeScript
   npm run build
   
   # Run tests
   npm test
   
   # Start development server (different port for testing)
   PORT=8001 npm run dev
   ```

5. **API Contract Validation**
   ```bash
   # Test root endpoint
   curl http://localhost:8001/
   # Expected: {"message":"Welcome to the AI Math Chatbot API"}
   
   # Test chat creation
   curl -X POST http://localhost:8001/chats/ -H "Content-Type: application/json" -d '{}'
   # Expected: 201 status with chat object
   
   # Test file upload (if you have test files)
   curl -X POST http://localhost:8001/files/upload -F "file=@test.txt"
   # Expected: 201 status with file metadata
   ```

### Phase 3: Production Cutover

6. **Stop Python Backend**
   ```bash
   # Find and stop Python backend process
   ps aux | grep uvicorn
   kill <python_backend_pid>
   ```

7. **Start Node.js Backend**
   ```bash
   # Start on same port as Python (8000)
   npm start
   # or
   PORT=8000 npm start
   ```

8. **Health Checks**
   ```bash
   # Verify API is responding
   curl http://localhost:8000/
   curl http://localhost:8000/chats/
   
   # Check logs for any errors
   tail -f logs/*.log  # if logging to files
   ```

### Phase 4: Frontend Integration

9. **Test Frontend Applications**
   - Load each frontend application
   - Test chat creation and messaging
   - Test file upload functionality
   - Test speech-to-text (if used)
   - Verify streaming responses work

10. **Monitor for Issues**
    - Watch server logs for errors
    - Monitor response times
    - Check error rates
    - Verify file uploads are working

## Reverse Proxy Configuration

If using nginx or similar:

```nginx
# Update upstream to point to Node.js
upstream api_backend {
    server localhost:8000;  # Node.js server
    # server localhost:8000;  # Python server (commented out)
}

location /api/ {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Important for SSE streaming
    proxy_buffering off;
    proxy_cache off;
}
```

## Rollback Procedure

If issues occur, immediately rollback:

1. **Stop Node.js Backend**
   ```bash
   pkill -f "node.*index.js"
   ```

2. **Start Python Backend**
   ```bash
   cd ../backend
   source venv/bin/activate  # or your virtual environment
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Verify Python Backend**
   ```bash
   curl http://localhost:8000/
   # Should return Python FastAPI response
   ```

## Data Consistency

### Database
- **Same SQLite file**: Both backends use identical database
- **No schema changes**: Prisma schema mirrors SQLAlchemy exactly
- **Transaction compatibility**: Both use same transaction patterns

### File Storage  
- **Same directories**: UPLOAD_DIR and AUDIO_DIR unchanged
- **Same file naming**: UUID + extension pattern preserved
- **Same cleanup**: Temporary file handling identical

### Environment Variables
- **Same names**: All environment variables have identical names
- **Same defaults**: Default values preserved
- **Same validation**: Error messages for missing variables identical

## Monitoring & Alerts

### Key Metrics to Watch
- **Response time**: Should be similar to Python backend
- **Error rates**: Monitor 4xx/5xx responses
- **Memory usage**: Node.js typically uses less memory
- **File upload success rate**: Critical for user experience
- **Streaming connection stability**: Important for chat functionality

### Log Files to Monitor
- Application logs (console output)
- Error logs (uncaught exceptions)
- Database query logs (if enabled)
- File upload logs

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -i :8000
   kill <pid_using_port>
   ```

2. **Database Connection Failed**
   - Verify DATABASE_URL path is correct
   - Check file permissions on aichatbot.db
   - Ensure Prisma client is generated

3. **Missing API Keys**
   - Check .env file exists and has correct values
   - Verify GEMINI_API_KEY and HUGGINGFACE_API_TOKEN

4. **File Upload Issues**
   - Check UPLOAD_DIR exists and is writable
   - Verify MAX_FILE_SIZE settings
   - Check disk space

5. **Streaming Not Working**
   - Verify SSE headers are being sent
   - Check for proxy buffering issues
   - Monitor WebSocket upgrade headers

## Performance Comparison

### Expected Changes
- **Startup time**: Node.js typically faster
- **Memory usage**: Generally lower than Python
- **Request throughput**: Should be comparable
- **Streaming performance**: Similar latency

### Optimization Tips
- Enable gzip compression
- Use PM2 for production process management
- Configure proper logging levels
- Monitor garbage collection

## Success Criteria

Migration is successful when:
- [ ] All API endpoints return identical responses
- [ ] File uploads work with same size limits
- [ ] Streaming responses maintain same format
- [ ] Database operations complete successfully
- [ ] Error messages match Python backend exactly
- [ ] Frontend applications work without modification
- [ ] Performance metrics are acceptable

## Support Contacts

- **Backend Issues**: Check server logs first
- **Database Issues**: Verify Prisma connectivity
- **API Contract Issues**: Compare with Python backend responses
- **Performance Issues**: Monitor resource usage

---

**Remember**: This migration maintains 100% backward compatibility. No frontend changes should be required.