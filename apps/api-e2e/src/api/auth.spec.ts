import axios, { AxiosRequestConfig } from 'axios';

// CI and apps/api/.env set APP_ORIGIN to the web dev server.
const APP_ORIGIN = 'http://localhost:4200';
const RAW: AxiosRequestConfig = { maxRedirects: 0, validateStatus: () => true };

describe('GET /api/auth/google/start', () => {
  it('sends the browser to Google and remembers the sign-in in a cookie', async () => {
    const res = await axios.get(`/api/auth/google/start`, { ...RAW, params: { returnTo: '/people' } });
    const cookies: string[] = res.headers['set-cookie'] ?? [];

    expect(res.status).toBe(302);
    expect(res.headers['location']).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(cookies.some((cookie) => cookie.startsWith('__Host-sign-in='))).toBe(true);
  });
});

describe('POST /api/auth/sign-out', () => {
  it('rejects a request without Origin', async () => {
    const res = await axios.post(`/api/auth/sign-out`, null, RAW);

    expect(res.status).toBe(403);
  });

  it('signs out a request from the web app even without a session', async () => {
    const res = await axios.post(`/api/auth/sign-out`, null, { ...RAW, headers: { Origin: APP_ORIGIN } });

    expect(res.status).toBe(204);
  });
});
