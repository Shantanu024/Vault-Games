import axios, { AxiosError } from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Suppress console logs during tests
const originalLog = console.log;
const originalError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});

describe('E2E: Complete User Flow', () => {
  let accessToken: string;
  let userId: string;
  let userUsername = `testuser_${Date.now()}`;
  const testPassword = 'TestPass123!';
  const testEmail = `${userUsername}@test.com`;

  // Test 1: User Registration
  test('User can register with valid credentials', async () => {
    const response = await API.post('/auth/register', {
      username: userUsername,
      email: testEmail,
      password: testPassword,
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('user');
    expect(response.data.data).toHaveProperty('accessToken');
    expect(response.data.data.user.username).toBe(userUsername);

    accessToken = response.data.data.accessToken;
    userId = response.data.data.user.id;
  });

  // Test 2: User Login
  test('User can login and receive access token', async () => {
    const response = await API.post('/auth/login', {
      email: testEmail,
      password: testPassword,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('accessToken');
    expect(response.data.data).toHaveProperty('user');

    accessToken = response.data.data.accessToken;
  });

  // Test 3: Get User Profile
  test('User can fetch their profile with game stats', async () => {
    const response = await API.get(`/users/${userUsername}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.user).toHaveProperty('id', userId);
    expect(response.data.data.user).toHaveProperty('stats');
    expect(response.data.data.user.stats).toHaveProperty('totalGames', 0);
    expect(response.data.data.user.stats).toHaveProperty('wins', 0);
  });

  // Test 4: Update Profile
  test('User can update profile information', async () => {
    const response = await API.patch(
      '/users/profile',
      {
        displayName: 'Test Player',
        bio: 'Gaming enthusiast',
        country: 'USA',
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.displayName).toBe('Test Player');
    expect(response.data.data.bio).toBe('Gaming enthusiast');
    expect(response.data.data.country).toBe('USA');
  });

  // Test 5: Record Game Result (Mines)
  test('User can record a Mines game result', async () => {
    const response = await API.post(
      '/games/record-result',
      {
        gameType: 'MINES',
        result: 'WIN',
        score: 150,
        duration: 45,
        coinsEarned: 50,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('id');
  });

  // Test 6: Record Game Result (Word Jumble)
  test('User can record a Word Jumble game result', async () => {
    const response = await API.post(
      '/games/record-result',
      {
        gameType: 'WORD_JUMBLE',
        result: 'WIN',
        score: 200,
        duration: 60,
        coinsEarned: 75,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
  });

  // Test 7: Get User Game Stats
  test('User can fetch game statistics', async () => {
    const response = await API.get('/games/stats', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.stats).toHaveProperty('totalGames', 2);
    expect(response.data.data.stats).toHaveProperty('wins', 2);
    expect(response.data.data.stats).toHaveProperty('losses', 0);
    expect(response.data.data.stats.winRate).toBe(100);
    expect(response.data.data.stats.totalCoinsEarned).toBe(125);
  });

  // Test 8: Updated Profile Reflects New Stats
  test('Profile now shows updated game stats', async () => {
    const response = await API.get(`/users/${userUsername}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.data.user.stats.totalGames).toBe(2);
    expect(response.data.data.user.stats.wins).toBe(2);
  });

  // Test 9: Save and Retrieve Chat Messages
  test('User can send and retrieve chat messages', async () => {
    // Send message
    const sendResponse = await API.post(
      '/chat/message',
      {
        messages: [{ role: 'user', content: 'How do I play Mines?' }],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(sendResponse.status).toBe(200);
    expect(sendResponse.data.success).toBe(true);
    expect(sendResponse.data.data).toHaveProperty('reply');

    // Retrieve history
    const historyResponse = await API.get('/chat/history?limit=10', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.data.success).toBe(true);
    expect(Array.isArray(historyResponse.data.data.messages)).toBe(true);
    expect(historyResponse.data.data.messages.length).toBeGreaterThan(0);
  });

  // Test 10: Get Chat Statistics
  test('User can fetch chat statistics', async () => {
    const response = await API.get('/chat/stats', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.stats).toHaveProperty('totalMessages');
    expect(response.data.data.stats).toHaveProperty('messagesByRole');
  });

  // Test 11: Search Users
  test('User can search for other users', async () => {
    const response = await API.get(`/users/search?q=${userUsername}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data.users)).toBe(true);
    expect(response.data.data.users.length).toBeGreaterThan(0);
    expect(response.data.data.users[0].username).toBe(userUsername);
  });

  // Test 12: Get Active Games
  test('User can fetch active games', async () => {
    const response = await API.get('/games/active', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data.games)).toBe(true);
    expect(response.data.data.games.length).toBeGreaterThan(0);
    expect(response.data.data.games[0]).toHaveProperty('id');
    expect(response.data.data.games[0]).toHaveProperty('name');
  });

  // Test 13: Leaderboard Access
  test('User can fetch leaderboard', async () => {
    const response = await API.get('/users/leaderboard', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data.users)).toBe(true);
  });

  // Test 14: User Logout
  test('User can logout successfully', async () => {
    const response = await API.post(
      '/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  // Test 15: Token Validation After Logout
  test('Logout clears authentication and invalidates token for protected routes', async () => {
    try {
      await API.get(`/users/${userUsername}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});

describe('E2E: Error Handling & Validation', () => {
  // Test 1: Invalid Login Credentials
  test('Login with invalid credentials returns 401', async () => {
    try {
      await API.post('/auth/login', {
        email: 'nonexistent@test.com',
        password: 'WrongPassword123',
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
    }
  });

  // Test 2: Missing Required Fields
  test('Registration without required fields returns 400', async () => {
    try {
      await API.post('/auth/register', {
        email: 'test@test.com',
        // missing password and username
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
    }
  });

  // Test 3: Weak Password Validation
  test('Registration with weak password returns validation error', async () => {
    try {
      await API.post('/auth/register', {
        username: `testuser_${Date.now()}_weak`,
        email: `test_${Date.now()}_weak@test.com`,
        password: 'weak', // Too weak
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
    }
  });

  // Test 4: Protected Route Without Token
  test('Accessing protected route without token returns 401', async () => {
    try {
      await API.get('/games/stats');
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });

  // Test 5: Invalid Game Type
  test('Recording game with invalid gameType returns validation error', async () => {
    // First, login a user
    const user = await API.post('/auth/register', {
      username: `testgame_${Date.now()}`,
      email: `testgame_${Date.now()}@test.com`,
      password: 'TestPass123!',
    });
    const token = user.data.data.accessToken;

    try {
      await API.post(
        '/games/record-result',
        {
          gameType: 'INVALID_GAME',
          result: 'WIN',
          score: 100,
          duration: 30,
          coinsEarned: 50,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
    }
  });
});

describe('E2E: Rate Limiting', () => {
  let token: string;

  beforeAll(async () => {
    const user = await API.post('/auth/register', {
      username: `ratelimit_${Date.now()}`,
      email: `ratelimit_${Date.now()}@test.com`,
      password: 'TestPass123!',
    });
    token = user.data.data.accessToken;
  });

  // Test 1: Chat Rate Limiting
  test('Chat endpoint enforces rate limiting', async () => {
    const promises = [];
    // Try to send more than 20 messages in 60 seconds
    for (let i = 0; i < 25; i++) {
      promises.push(
        API.post(
          '/chat/message',
          { messages: [{ role: 'user', content: `Message ${i}` }] },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch((e: AxiosError) => e.response)
      );
    }

    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter((r: any) => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  }, 120000);
});
