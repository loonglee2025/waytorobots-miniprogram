App({
  globalData: {
    // 周报频道配置：列表与详情页共用
    channels: [
      {
        key: 'ros2',
        name: 'ROS2 周报',
        subtitle: 'ROS 2 核心动态 · 每周一更新',
        repo: 'loonglee2025/ros2-weekly-digest',
        branch: 'main',
        reportsPath: 'reports'
      },
      {
        key: 'robot-research',
        name: '机器人研究周报',
        subtitle: '具身智能 · 论文与行业前沿 · 每周五更新',
        repo: 'loonglee2025/robot-research-weekly',
        branch: 'main',
        reportsPath: 'reports'
      }
    ]
  }
});
