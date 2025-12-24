const https = require('https');
const needle = require('needle');

const body = process.env.UC_LOGIN;

async function login(url) {
  const hostname = 'undercards.net';
  const options = {
    hostname: hostname,
    port: 443,
    path: encodeURI('/SignIn'),
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      Connection: 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': body ? body.length : 0,
      Host: hostname,
      Origin: `https://${hostname}`,
      Referer: `https://${hostname}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      if (res.statusCode !== 302 && res.statusCode !== 200) {
        reject(res);
      } else resolve(res)
    });
    //req.on("error", console.error.bind(console));
    if (body) req.write(body);
    req.end();
  }).then(({ headers }) => `${headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ')};`)
  .then((cookie) => needle('get', url, {
    headers: { cookie },
  }));
}

module.exports = login;
