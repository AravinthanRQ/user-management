import request from 'supertest';
import express from 'express';
import authRoutes from '../controllers/auth.controller';
import { User } from '../entity/User';
import { errorHandler } from '../middlewares/error';

jest.mock('../data-source', () => ({
  userRepository: {
    findOne: jest.fn(),
    save: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../utils', () => ({
  generateToken: jest.fn().mockReturnValue('mocked_token'),
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

describe('Auth routes', () => {
  const { userRepository } = require('../data-source');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SALT_ROUNDS = '10';
    process.env.JWT_SECRET = 'testsecret';
  });

  describe('POST /auth/register', () => {
    it('should register new user and return user object without password', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const savedUserInstance = new User();
      savedUserInstance.id = 1;
      savedUserInstance.email = 'test@example.com';
      savedUserInstance.password = 'hashed_password';

      userRepository.save.mockResolvedValue(savedUserInstance);

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'testpass' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('New user created successfully');
      expect(res.body.data.token).toBe('mocked_token');
      expect(res.body.data.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 400 if user already exists', async () => {
        const existingUserInstance = new User();
        existingUserInstance.id = 1;
        existingUserInstance.email = 'test@example.com';
        existingUserInstance.password = 'hashed_password';
        userRepository.findOne.mockResolvedValue(existingUserInstance);
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'test@example.com', password: 'testpass' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('User already exists');
    });
  });


  describe('POST /auth/login', () => {
    it('should login existing user and return token', async () => {
      const existingUserInstance = new User();
      existingUserInstance.id = 1;
      existingUserInstance.email = 'test@example.com';
      existingUserInstance.password = 'hashed_password';
      userRepository.findOne.mockResolvedValue(existingUserInstance);

      (require('bcrypt').compare as jest.Mock).mockResolvedValue(true);


      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'testpass' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login Successful!');
      expect(res.body.data.token).toBe('mocked_token');
    });

    it('should return 400 if user does not exist', async () => {
        userRepository.findOne.mockResolvedValue(null);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'testpass' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("User doesn't exist");
    });

    it('should return 403 for unauthorized credentials', async () => {
        const existingUserInstance = new User();
        existingUserInstance.id = 1;
        existingUserInstance.email = 'test@example.com';
        existingUserInstance.password = 'hashed_password';
        userRepository.findOne.mockResolvedValue(existingUserInstance);
        (require('bcrypt').compare as jest.Mock).mockResolvedValue(false);

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Unauthorized credentials');
    });
  });
});