# WayToRobots 微信小程序

WayToRobots 公众号配套微信小程序，用于浏览 **ROS2 技术周报**（每周一更新）与 **机器人研究周报**（每周五更新）。

## 功能

- **双频道周报**：首页顶部切换「ROS2 周报 / 机器人研究周报」，按日期倒序展示历史周报，支持下拉刷新
- **周报详情**：内置轻量 Markdown 渲染器，完整呈现标题层级、加粗、行内代码、链接、有序/无序列表（含缩进续行合并）、表格、引用、分割线与代码块；外部链接点击复制到剪贴板
- **关于页**：公众号二维码（支持长按识别 / 点击预览）与数据源仓库地址

## 数据来源

周报内容直接来自 GitHub 开源仓库，无需自建后端：

| 频道 | 仓库 | 更新频率 |
|---|---|---|
| ROS2 周报 | [ros2-weekly-digest](https://github.com/loonglee2025/ros2-weekly-digest) | 每周一 |
| 机器人研究周报 | [robot-research-weekly](https://github.com/loonglee2025/robot-research-weekly) | 每周五 |

- 列表：`GET https://api.github.com/repos/<repo>/contents/reports`
- 内容：`https://raw.githubusercontent.com/<repo>/main/reports/<date>-weekly.md`

周报由 Hermes Agent 定时任务（ROS2 Weekly Digest / Robotic Research Weekly）自动生成并推送到对应仓库。新增频道只需在 `app.js` 的 `channels` 数组中追加配置。

## 项目结构

```
├── app.js / app.json / app.wxss   # 全局配置（tabBar：周报 / 关于）
├── pages/
│   ├── index/                     # 周报列表页（下拉刷新）
│   ├── detail/                    # 周报详情页（Markdown 渲染）
│   └── about/                     # 关于页（公众号二维码）
├── utils/
│   ├── api.js                     # GitHub 数据源封装
│   └── markdown.js                # 轻量 Markdown 解析器（零依赖）
└── assets/waytorobots_qr.jpg      # 公众号二维码
```

## 本地调试

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 「导入项目」选择本仓库目录；无 AppID 可选择「测试号」（项目已预置 `touristappid`）
3. 项目设置中 `urlCheck` 已关闭（`project.config.json`），开发环境可直接请求 GitHub 接口

## 发布前配置（重要）

正式上线前，需在[小程序管理后台](https://mp.weixin.qq.com) → 开发管理 → 服务器域名中，将以下域名加入 **request 合法域名**：

- `https://api.github.com`
- `https://raw.githubusercontent.com`

同时把 `project.config.json` 中的 `appid` 替换为真实小程序 AppID，并恢复 `urlCheck: true`。

## 说明

- Markdown 解析器已通过全部历史周报（14 期、961 个块级节点）的解析验证
- 小程序内无法直接跳转外部网页，所有链接采用「点击复制」交互

## 关注公众号

本仓库配套公众号 **WayToRobots**，持续分享 ROS 2 实战教程、机器人技术周报与行业观察，扫码关注获取更多内容：

<img src="assets/waytorobots_qr.jpg" alt="WayToRobots 公众号二维码" width="300">
