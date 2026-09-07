/**
 * GitHub 数据源封装（多频道）
 * 周报列表：GitHub Contents API（列出 reports/ 目录）
 * 周报内容：raw.githubusercontent.com 直取 Markdown 原文
 * 周报摘要：Range 拉取文件前 8KB 提取，结果写入本地缓存
 */

const md = require('./markdown');

const app = getApp();

function channels() {
  return (app && app.globalData && app.globalData.channels) || [];
}

function getChannel(key) {
  const list = channels();
  return list.find(c => c.key === key) || list[0];
}

function request(url, extraHeader) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      // User-Agent 是 WebView 禁改头，设置了也会被运行时丢弃并告警，此处不设
      header: Object.assign(
        { 'Accept': 'application/vnd.github+json' },
        extraHeader
      ),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: reject
    });
  });
}

/** 获取指定频道的周报列表，按日期倒序：[{ name, date, title }] */
function listReports(channelKey) {
  const ch = getChannel(channelKey);
  const url = `https://api.github.com/repos/${ch.repo}/contents/${ch.reportsPath}?ref=${ch.branch}`;
  return request(url).then(files => {
    return files
      .filter(f => f.type === 'file' && /^\d{4}-\d{2}-\d{2}-weekly\.md$/.test(f.name))
      .map(f => {
        const date = f.name.slice(0, 10);
        return { name: f.name, date, title: `${ch.name} · ${date}` };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });
}

/** 获取某一期周报的 Markdown 原文 */
function getReport(channelKey, name) {
  const ch = getChannel(channelKey);
  const url = `https://raw.githubusercontent.com/${ch.repo}/${ch.branch}/${ch.reportsPath}/${name}`;
  return request(url);
}

/** 获取某期周报的列表摘要（仅拉前 8KB 解析；周刊内容不可变，结果本地缓存） */
function getReportSummary(channelKey, name) {
  const cacheKey = `summary:v1:${channelKey}:${name}`;
  let cached = '';
  try {
    cached = wx.getStorageSync(cacheKey);
  } catch (e) {}
  if (cached) return Promise.resolve(cached);

  const ch = getChannel(channelKey);
  const url = `https://raw.githubusercontent.com/${ch.repo}/${ch.branch}/${ch.reportsPath}/${name}`;
  return request(url, { Range: 'bytes=0-8191' }).then(text => {
    const summary = md.extractSummary(text);
    if (summary) {
      try {
        wx.setStorageSync(cacheKey, summary);
      } catch (e) {}
    }
    return summary;
  });
}

module.exports = { channels, getChannel, listReports, getReport, getReportSummary };
