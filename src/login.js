const nodeFetch = require('node-fetch');

const origin = 'https://undercards.net';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function createAgent() {
  const proxy = process.env.ALL_PROXY;
  if (!proxy) return undefined;
  const { SocksProxyAgent } = require('socks-proxy-agent');
  return new SocksProxyAgent(proxy, { keepAlive: true });
}

const agent = createAgent();

function fetch(url, options = {}) {
  return nodeFetch(url, {
    agent,
    ...options,
    headers: {
      'User-Agent': userAgent,
      ...options.headers,
    },
  });
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
