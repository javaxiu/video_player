import puppeteer from 'puppeteer';


export default new class {
  browser;
  pageMap = new Map();
  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return this.browser;
  }
  /**
   * 
   * @param {String} url 
   * @returns {import('puppeteer').Page}
   */
  async getPuppeteerPage(url) {
    if (this.pageMap.has(url)) {
      return this.pageMap.get(url);
    }
    try {
      // 启动浏览器实例
      const browser = await this.getBrowser();  
      const page = await browser.newPage();
      // 设置更真实的浏览器头信息
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      // 导航到目标URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      console.log('Puppeteer请求成功:', url);
      this.pageMap.set(url, page);
      return page;
    } catch (error) {
      console.error('Puppeteer请求失败:', error.message);
      return [];
    }
  }
  /**
   * 获取页面数据
   * @param {String} url 目标URL
   * @param {Function} fn 要在页面中执行的函数
   * @returns {Promise<ReturnType<typeof fn>>} 返回fn函数执行的结果Promise
   */
  async getData(url, fn) {
    const page = await this.getPuppeteerPage(url);
    try {
      // 在页面中执行传入的异步函数
      const result = await page.evaluate(fn);
      console.log('页面执行JS成功:', url, result);
      return result;
    } catch (error) {
      console.error('页面执行JS失败:', error.message);
      return null;
    }
  }
}

