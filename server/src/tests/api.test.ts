import request from 'supertest';
import app from '../index';

describe('API Endpoint Tests', () => {
  test('GET / should return welcome message', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toEqual({
      message: 'Welcome to the AI Math Chatbot API'
    });
  });

  test('GET /chats/ should return empty array initially', async () => {
    const response = await request(app)
      .get('/chats/')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /chats/ should create a new chat', async () => {
    const response = await request(app)
      .post('/chats/')
      .send({ title: 'Test Chat' })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title', 'Test Chat');
    expect(response.body).toHaveProperty('create_time');
  });

  test('Invalid endpoint should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.body).toEqual({
      detail: 'Not found'
    });
  });
});