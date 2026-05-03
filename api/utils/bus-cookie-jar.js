import fetch from 'node-fetch';
import * as HttpsProxyAgent from 'https-proxy-agent';

const proxy = 'http://127.0.0.1:7897';
const httpsAgent = new HttpsProxyAgent.HttpsProxyAgent(proxy);

function busFetchAgent() {
  if (typeof process !== 'undefined' && (process.env.BUS_NO_AGENT === '1' || process.env.FANBUS_NO_AGENT === '1')) {
    return undefined;
  }
  return httpsAgent;
}

function readBusOrigin() {
  if (typeof process !== 'undefined' && process.env.BUS_FORUM_ORIGIN) {
    return String(process.env.BUS_FORUM_ORIGIN).replace(/\/$/, '');
  }
  return 'https://www.busjav.cyou';
}

const BUS_DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const BUS_DEFAULT_SEC_CH_UA = '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"';

/** Set-Cookie 首段 name=value（分号后为属性，忽略） */
function parseSetCookiePair(setCookieLine) {
  if (!setCookieLine || typeof setCookieLine !== 'string') return null;
  const semicolon = setCookieLine.indexOf(';');
  const pair = (semicolon === -1 ? setCookieLine : setCookieLine.slice(0, semicolon)).trim();
  const eq = pair.indexOf('=');
  if (eq < 1) return null;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  if (!name) return null;
  return { name, value };
}

function buildSeedRequestHeaders() {
  const env = typeof process !== 'undefined' ? process.env : {};
  const ua = env.BUS_USER_AGENT || BUS_DEFAULT_UA;
  const secChUa = env.BUS_SEC_CH_UA || BUS_DEFAULT_SEC_CH_UA;
  const acceptLang = env.BUS_ACCEPT_LANGUAGE || 'zh-CN,zh;q=0.9';
  return {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': env.BUS_ACCEPT_ENCODING || 'gzip, deflate, br',
    'Accept-Language': acceptLang,
    'Cache-Control': 'max-age=0',
    Connection: 'keep-alive',
    Priority: 'u=0, i',
    'Sec-CH-UA': secChUa,
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': ua,
  };
}

/**
 * 访问站点根路径一次，收集 Set-Cookie，并在后续请求里带上；响应里的 Set-Cookie 会持续合并。
 */
export function createBusCookieManager() {
  const origin = () => readBusOrigin();
  /** @type {Map<string, string>} */
  const jar = new Map();
  let seededAfterSuccess = false;
  /** @type {Promise<void> | null} */
  let seeding = null;

  function ingestFromResponse(res) {
    try {
      const raw = typeof res.headers.raw === 'function' ? res.headers.raw() : {};
      const lines = raw['set-cookie'];
      if (!lines) return;
      const arr = Array.isArray(lines) ? lines : [lines];
      for (const line of arr) {
        const p = parseSetCookiePair(line);
        if (p) jar.set(p.name, p.value);
      }
    } catch (e) {
      console.log('busCookieJar.ingestFromResponse', e);
    }
  }

  function getCookieHeader() {
    if (jar.size === 0) return '';
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async function ensureSeeded() {
    if (seededAfterSuccess) return;
    if (seeding) return seeding;

    const seedUrl = `${origin()}/`;
    seeding = (async () => {
      const init = {
        method: 'GET',
        headers: buildSeedRequestHeaders(),
        redirect: 'follow',
      };
      const a = busFetchAgent();
      if (a) init.agent = a;
      const res = await fetch(seedUrl, init);
      ingestFromResponse(res);
      await res.text();
      seededAfterSuccess = true;
    })()
      .catch((err) => {
        console.log('busCookieJar.ensureSeeded', seedUrl, err);
        throw err;
      })
      .finally(() => {
        seeding = null;
      });

    return seeding;
  }

  function reset() {
    jar.clear();
    seededAfterSuccess = false;
  }

  return {
    ensureSeeded,
    ingestFromResponse,
    getCookieHeader,
    reset,
  };
}

let singleton;
export function getBusCookieManager() {
  if (!singleton) singleton = createBusCookieManager();
  return singleton;
}

export function resetBusCookieJar() {
  if (singleton) singleton.reset();
  singleton = undefined;
}

/**
 * 与 bus 页面、Chrome 拉图片一致的外发选项（含 cookie jar），供 /img-proxy 使用。
 * @param {string} targetUrl 绝对地址
 * @param {{ directUpstream?: boolean }} [opts] directUpstream 为 true 时不使用 7897 上游代理
 */
export async function getBusImgProxyRequestOptions(targetUrl, opts = {}) {
  const mgr = getBusCookieManager();
  try {
    await mgr.ensureSeeded();
  } catch (e) {
    console.log('getBusImgProxyRequestOptions ensureSeeded', e?.message || e);
  }

  const env = typeof process !== 'undefined' ? process.env : {};
  const busOrigin = readBusOrigin();
  let secFetchSite = 'cross-site';
  try {
    if (new URL(targetUrl).origin === new URL(busOrigin).origin) {
      secFetchSite = 'same-origin';
    }
  } catch {
    /* keep cross-site */
  }

  const ua = env.BUS_USER_AGENT || BUS_DEFAULT_UA;
  const secChUa = env.BUS_SEC_CH_UA || BUS_DEFAULT_SEC_CH_UA;
  const acceptLang = env.BUS_ACCEPT_LANGUAGE || 'zh-CN,zh;q=0.9';
  const referer =
    env.BUS_IMG_REFERER ||
    env.BUS_REFERER ||
    `${busOrigin}/forum.php?mod=forumdisplay&fid=2&filter=lastpost&orderby=lastpost`;

  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Encoding': env.BUS_ACCEPT_ENCODING || 'gzip, deflate, br',
    'Accept-Language': acceptLang,
    Connection: 'keep-alive',
    Priority: 'u=1, i',
    Referer: referer,
    'Sec-CH-UA': secChUa,
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': secFetchSite,
    'User-Agent': ua,
  };

  const cookieHeader = mgr.getCookieHeader();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const useHttps = targetUrl.startsWith('https:');
  const agent =
    useHttps && !opts.directUpstream ? busFetchAgent() : undefined;

  return { headers, agent };
}
