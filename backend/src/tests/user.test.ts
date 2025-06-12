import request from 'supertest';
import express from 'express';
import userRoutes from '../controllers/user.controller';
import { User } from '../entity/User';

process.env.SALT_ROUNDS = '10';
process.env.JWT_SECRET = 'testsecret';

jest.mock('../data-source', () => ({
  userRepository: {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_new_password'),
  compare: jest.fn(),
}));

jest.mock('../middlewares/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: String(req.params.id) };
    next();
  },
}));

jest.mock('../middlewares/validation', () => ({
  validate: () => (_req: any, _res: any, next: any) => {
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User routes', () => {
  const mockUserRepo = require('../data-source').userRepository;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /users – should return all users without passwords', async () => {
    const user1 = new User();
    user1.id = 1;
    user1.email = 'a@example.com';
    user1.password = 'password1';

    const user2 = new User();
    user2.id = 2;
    user2.email = 'b@example.com';
    user2.password = 'password2';

    mockUserRepo.find.mockResolvedValue([user1, user2]);
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({ id: 1, email: 'a@example.com' });
    expect(res.body.data[0].password).toBeUndefined();
    expect(res.body.data[1]).toEqual({ id: 2, email: 'b@example.com' });
    expect(res.body.data[1].password).toBeUndefined();
  });

  it('GET /users/:id – should return one user without password', async () => {
    const user = new User();
    user.id = 1;
    user.email = 'a@example.com';
    user.password = 'password1';

    mockUserRepo.findOneBy.mockResolvedValue(user);
    const res = await request(app).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 1, email: 'a@example.com' });
    expect(res.body.data.password).toBeUndefined();
  });

  it('PUT /users/:id – should update user info and return updated user without password', async () => {
    const existingUser = new User();
    existingUser.id = 1;
    existingUser.email = 'old@example.com';
    existingUser.password = 'old_hashed_password';
    mockUserRepo.findOneBy.mockResolvedValue(existingUser);

    const updatedUserPayload = { email: 'new@example.com', password: 'newpass' };

    mockUserRepo.save.mockImplementation(async (userInstancePassedFromRoute: User) => {
        const savedUser = new User();
        Object.assign(savedUser, userInstancePassedFromRoute);
        return savedUser;
    });

    const res = await request(app)
      .put('/users/1')
      .send(updatedUserPayload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User updated successfully');
    expect(res.body.data).toEqual({ id: 1, email: 'new@example.com' });
    expect(res.body.data.password).toBeUndefined();
    expect(mockUserRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        email: 'new@example.com',
        password: 'hashed_new_password'
    }));
  });

  it('DELETE /users/:id – should delete user', async () => {
    const userToDelete = new User();
    userToDelete.id = 1;
    userToDelete.email = 'a@example.com';
    userToDelete.password = 'password1';
    mockUserRepo.findOneBy.mockResolvedValue(userToDelete);
    mockUserRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

    const res = await request(app).delete('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted successfully');
  });
});