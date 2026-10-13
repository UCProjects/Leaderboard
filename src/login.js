const { setTimeout: sleep } = require('node:timers/promises');
const nodeFetch = require('node-fetch');

const origin = 'https://undercards.net';
const attempts = 3;
const retryDelay = 30000;
const timeout = 150000;
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function createAgent() {
  const proxy = process.env.ALL_PROXY;
  if (!proxy) return undefined;
  const { SocksProxyAgent } = require('socks-proxy-agent');
  return new SocksProxyAgent(proxy, { keepAlive: true });
}

const agent = createAgent();

async function fetch(url, options = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await nodeFetch(url, {
        agent,
        timeout,
        ...options,
        headers: {
          'User-Agent': userAgent,
          ...options.headers,
        },
      });
      if (res.status < 500 || attempt >= attempts) return res;
      console.error(`Attempt ${attempt} failed: ${res.status}`);
    } catch (e) {
      if (attempt >= attempts) throw e;
      console.error(`Attempt ${attempt} failed: ${e.message}`);
    }
    await sleep(retryDelay * attempt);
  }
}

async function login() {
  const body = process.env.UC_LOGIN;
  if (!body) throw new Error('Missing login');
  const res = await fetch(`${origin}/SignIn`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: origin,
      Referer: origin,
    },
    body,
  });
  if (res.status !== 302 && res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  const cookies = res.headers.raw()['set-cookie'];
  if (!cookies || !cookies.length) throw new Error('Login failed: no session cookie');
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function loadJson(url) {
  const cookie = await login();
  const res = await fetch(url, { headers: { cookie } });
  console.log(res.status);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

module.exports = loadJson;
