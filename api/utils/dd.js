fetch('https://www.busjav.cyou/forum/forum.php?mod=forumdisplay&fid=2&filter=lastpost&orderby=lastpost')
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    console.log($);
  })