import fetch from 'node-fetch';
import * as HttpsProxyAgent from 'https-proxy-agent';
import * as cheerio from 'cheerio';

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