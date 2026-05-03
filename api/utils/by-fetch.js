import fetch from 'node-fetch';
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import { getBusCookieManager } from './bus-cookie-jar.js';

const proxy = 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent.HttpsProxyAgent(proxy);

// 缓存对象，用于存储专辑列表数据
const albumsCache = new Map();

export const getAlbums = (url) => {
  // 如果缓存中存在该URL的数据，直接返回
  if (albumsCache.has(url)) {
    return Promise.resolve(albumsCache.get(url));
  }
  console.log('fetch  -  ', url);
  const r = fetch(url, { agent })
    .then(res => res.text())
    .then(res => cheerio.load(res))
    .then($ => {
      const albums = [];
      $('.list .item').each((i, el) => {
        albums.push({
          id: $(el).find('a').attr('href')?.match(/id-(\w+)\.html/)?.[1],
          url: $(el).find('a').attr('href'),
          name: $(el).find('div:nth-child(3)').text(),
          cover: $(el).find('a div img').attr('src')
        });
      });
      return albums;
    });
  // 将请求结果存入缓存
  albumsCache.set(url, r);
  return r;
}

// 缓存对象，用于存储已请求过的数据
const albumsPhotosCache = new Map();

export const getAlbumsPhotos = (url) => {
  // 如果缓存中存在该URL的数据，直接返回
  if (albumsPhotosCache.has(url)) {
    return Promise.resolve(albumsPhotosCache.get(url));
  }
  const r = fetch(url, { agent })
    .then(res => res.text())
    .then(res => cheerio.load(res))
    .then($ => {
      // document.querySelector("body > div.main > div > div.body > div.article.mask > div.photos > a:nth-child(1) > figure > img")
      const photo = $('body > div.main > div > div.body > div.article.mask > div.photos > a:nth-child(1) > figure > img');
      const src = photo.attr('src');
      const total = $("#tab_1 > div:nth-child(2)").text();
      return {
        src: src?.replace(/[\w]+.webp/, ''),
        total: Number(total?.match(/\d+/)?.[0]) || total,
      }
    });
  // 将请求结果存入缓存
  albumsPhotosCache.set(url, r);
  return r;
}

export const getTyyPageList = (page = 1, authorid = null) => {
  let url = `https://www.t66y.com/thread0806.php?fid=25&page=${page}`;
  if (authorid) {
    url += `&search=${authorid}`;
  }
  console.log(url);
  return fetch(url, { agent })
    .then(res => res.text())
    .then(res => cheerio.load(res))
    .then($ => {
      const pageUrls = [];
      $('body table td a[id]').each((i, el) => {
        const href = $(el).attr('href');
        if (href?.includes('htm_data')) {
          pageUrls.push(`https://www.t66y.com${href}`);
        }
      });
      return pageUrls;
    })
    .catch(err => {
      console.log('getTyyPageList', err);
      return [];
    });
}

const BUS_FORUM_ORIGIN =
  typeof process !== 'undefined' && process.env.BUS_FORUM_ORIGIN
    ? String(process.env.BUS_FORUM_ORIGIN).replace(/\/$/, '')
    : 'https://www.busjav.cyou';
const BUS_FORUM_BASE = `${BUS_FORUM_ORIGIN}/forum/`;

const BUS_DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const BUS_DEFAULT_SEC_CH_UA = '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"';

/**
 * 与浏览器导航请求对齐；Cookie 由 bus-cookie-jar 在首次请求前访问根路径注入。
 * @param {{ referer?: string; secFetchSite?: string }} [opts]
 */
const busFetchHeaders = (opts = {}) => {
  const env = typeof process !== 'undefined' ? process.env : {};
  const referer =
    opts.referer ||
    env.BUS_REFERER ||
    `${BUS_FORUM_ORIGIN}/uncensored`;
  const ua = env.BUS_USER_AGENT || BUS_DEFAULT_UA;
  const secChUa = env.BUS_SEC_CH_UA || BUS_DEFAULT_SEC_CH_UA;
  const acceptLang = env.BUS_ACCEPT_LANGUAGE || 'zh-CN,zh;q=0.9';
  const secFetchSite = opts.secFetchSite || env.BUS_SEC_FETCH_SITE || 'same-origin';

  const h = {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': env.BUS_ACCEPT_ENCODING || 'gzip, deflate, br',
    'Accept-Language': acceptLang,
    'Cache-Control': 'max-age=0',
    Connection: 'keep-alive',
    Priority: 'u=0, i',
    Referer: referer,
    'Sec-CH-UA': secChUa,
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': secFetchSite,
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': ua,
  };
  return h;
};

/** 与 tyy 共用代理；若被拦截可设 BUS_NO_AGENT=1 或 FANBUS_NO_AGENT=1 直连 */
const busFetchInit = (opts = {}) => {
  const init = { headers: busFetchHeaders(opts) };
  const noAgent =
    typeof process !== 'undefined' &&
    (process.env.BUS_NO_AGENT === '1' || process.env.FANBUS_NO_AGENT === '1');
  if (noAgent) {
    return init;
  }
  init.agent = agent;
  return init;
};

/** 先保证 cookie jar 已用根路径预热，再发起请求并合并响应 Set-Cookie */
async function busFetch(url, initOpts = {}) {
  const jar = getBusCookieManager();
  await jar.ensureSeeded();
  const init = busFetchInit(initOpts);
  const cookieHeader = jar.getCookieHeader();
  if (cookieHeader) {
    init.headers = { ...init.headers, Cookie: cookieHeader };
  }
  const res = await fetch(url, init);
  jar.ingestFromResponse(res);
  return res;
}

function resolveFanbusHref(href) {
  if (!href) return '';
  try {
    const normalized = href.replace(/&amp;/g, '&');
    return new URL(normalized, BUS_FORUM_BASE).href;
  } catch {
    return '';
  }
}

function isLikelyPostImage(url, $img) {
  const u = url.toLowerCase();
  if ($img.closest('.favatar, .avatar, .pls').length && !$img.closest('.t_fsz').length) return false;
  if (u.includes('static/image/smiley/')) return false;
  if (u.includes('template/')) return false;
  if (u.includes('static/image/common/')) return false;
  if (u.includes('/data/attachment/forum/ads/')) return false;
  if (u.includes('noavatar')) return false;
  if (u.includes('_avatar_middle') || u.includes('_avatar_small')) return false;
  if ($img.hasClass('avatar-pic')) return false;
  if ($img.attr('src')?.includes('noLogin.png')) return false;
  if ($img.hasClass('zoom')) return true;
  if (u.includes('data/attachment')) return true;
  if (u.includes('forum.javcdn.cc')) return true;
  if (u.includes('imgur.com')) return true;
  if (u.startsWith('http') && (u.includes('.jpeg') || u.includes('.jpg') || u.includes('.png') || u.includes('.webp')))
    return true;
  return false;
}

function collectImagesFromMessage($, $root) {
  const images = [];
  const seen = new Set();
  const $msg = $root.find('.t_fsz').first();
  const $scope = $msg.length ? $msg : $root;
  $scope.find('img').each((_, el) => {
    const $el = $(el);
    const raw =
      $el.attr('src') || $el.attr('data-src') || $el.attr('file') || $el.attr('zoomfile') || $el.attr('ess-data');
    if (!raw || raw.startsWith('data:')) return;
    let absUrl;
    try {
      absUrl = raw.includes('://') ? raw : new URL(raw, BUS_FORUM_BASE).href;
    } catch {
      return;
    }
    if (!isLikelyPostImage(absUrl, $el)) return;
    if (seen.has(absUrl)) return;
    seen.add(absUrl);
    images.push(absUrl);
  });
  return images;
}

function extractTextFromMessageRoot($, $root) {
  const $msg = $root.find('.t_fsz').first();
  const $scope = $msg.length ? $msg : $root;
  const clone = $scope.clone();
  clone.find('script,style,noscript,iframe,img').remove();
  return clone
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const busForumListUrl = (p = 1) =>
  p <= 1
    ? `${BUS_FORUM_BASE}forum.php?mod=forumdisplay&fid=2&filter=lastpost&orderby=lastpost`
    : `${BUS_FORUM_BASE}forum.php?mod=forumdisplay&fid=2&filter=lastpost&orderby=lastpost&page=${p}`;

export const getBusForumListEntries = (page = 1) => {
  const url = busForumListUrl(page);
  const fetchOpts =
    page <= 1
      ? {}
      : { referer: busForumListUrl(page - 1) };
  return busFetch(url, fetchOpts)
    .then((res) => res.text())
    .then((html) => {
      const $ = cheerio.load(html);
      const byTid = new Map();
      $('tbody[id^="normalthread_"]').each((_, el) => {
        const $a = $(el).find('.post_infolist_tit a.s').first();
        const href = $a.attr('href');
        if (!href) return;
        const tid = href.match(/tid=(\d+)/)?.[1];
        if (!tid || byTid.has(tid)) return;
        const title = $a.text().trim();
        const threadUrl = resolveFanbusHref(href);
        if (threadUrl) byTid.set(tid, { title, url: threadUrl });
      });
      return Array.from(byTid.values());
    })
    .catch((err) => {
      console.log('getBusForumListEntries', err);
      return [];
    });
};

const busThreadDetailCache = {};
export const getBusThreadDetail = (/** @type {string} */ url) => {
  if (busThreadDetailCache[url] !== undefined) {
    return Promise.resolve(busThreadDetailCache[url]);
  }
  const t = Date.now();
  return busFetch(url, { referer: busForumListUrl(1) })
    .then((res) => res.text())
    .then((html) => {
      const $ = cheerio.load(html);
      const rawTitle = $('#thread_subject').text().replace(/\s*\[複製鏈接\].*/s, '').trim();
      const titleLines = rawTitle.split(/\n/).map((s) => s.trim()).filter(Boolean);
      let title = titleLines[0] || rawTitle;
      if (!title) title = $('title').text().split('-')[0].trim();
      const textParts = [];
      const images = [];
      const seenImg = new Set();

      const pushBlock = ($block, label) => {
        const text = extractTextFromMessageRoot($, $block);
        if (text) textParts.push(`[${label}]\n${text}`);
        collectImagesFromMessage($, $block).forEach((u) => {
          if (!seenImg.has(u)) {
            seenImg.add(u);
            images.push(u);
          }
        });
      };

      const $main = $('.plc.nthread_first').first();
      if ($main.length) pushBlock($main, '主贴');

      $('div.nthread_postbox:not(.nthread_firstpostbox)').each((idx, el) => {
        pushBlock($(el), `${idx + 2}#`);
      });

      const out = { title, text: textParts.join('\n\n'), images, url };
      busThreadDetailCache[url] = out;
      return out;
    })
    .catch((err) => {
      console.log('getBusThreadDetail', url, err);
      busThreadDetailCache[url] = false;
      return false;
    })
    .finally(() => {
      console.log('getBusThreadDetail', url, Date.now() - t);
    });
};

/** @param {number} page */
export const getBusForumPageDetails = async (page = 1) => {
  const entries = await getBusForumListEntries(page);
  const slice = entries.slice(0, 20);
  const details = await Promise.all(slice.map((e) => getBusThreadDetail(e.url)));
  return details
    .map((d, i) => {
      if (!d) return null;
      if (!d.title && slice[i]?.title) d.title = slice[i].title;
      return d;
    })
    .filter(Boolean);
};

const cachePageDetail = {};
export const getImagesT6yy = (/** @type {string} */ url) => {
  if (cachePageDetail[url] !== undefined) {
    return Promise.resolve(cachePageDetail[url]);
  }
  const t = Date.now();
  // 使用fetch获取内容
  return fetch(url, { agent })
    .then(res => res.text())
    .then(html => {
      const $ = cheerio.load(html);
      const authoridMatch = html.match(/var authorid = (\d+);/);
      const authorid = authoridMatch ? authoridMatch[1] : null;
      const timestampMatch = html.match(/Posted:\s*<span\s+data-timestamp="(\d+)">/);
      const timestamp = timestampMatch ? Number(timestampMatch[1]) : null;
      const images = [];
      // 获取所有table img元素
      $('table img').each((i, el) => {
        const imgSrc = $(el).attr('ess-data');
        if (imgSrc) {
          images.push(imgSrc);
        }
      });
      const text = $('body table .tpc_content.do_not_catch').text().replace(/\t/g, '').split('\n').filter(Boolean).slice(0, -1).join('\n');
      const title = $('body table h4.f16').text();
      if (!images.length) {
        console.log('没有图片', url);
        cachePageDetail[url] = false;
        return;
      }
      cachePageDetail[url] = { title, text, images, url, authorid, timestamp };
      return cachePageDetail[url];
    })
    .catch(err => {
      console.log('getImagesT6yy', url, err);
      cachePageDetail[url] = false;
      return false;
    })
    .finally(() => {
      console.log('getImagesT6yy', url, Date.now() - t);
    });
}

// getBusForumListEntries(1);

// getAlbumsPhotos('https://xchina.biz/photo/id-681d013e31283.html')
// .then(res => {
//   console.log(res);
// })

// getAlbums('https://xchina.biz/photos/album-2/2.html').then(res => {
//   console.log(res);
// })

// getImagesT6yy(6810453).then(res => {
//   console.log(res);
// })

// getTyyPageList(1).then(res => {
//   console.log(res);
// })