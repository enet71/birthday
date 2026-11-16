import axios from 'axios';

describe('GET /api/me', () => {
  it('rejects a request without an access token', async () => {
    const res = await axios.get(`/api/me`, { validateStatus: () => true });

    expect(res.status).toBe(401);
  });
});
