# B站字幕提取器

从 B 站视频页面提取字幕的 Chrome 扩展。

## 功能特性

- 🎯 **元素选择器** - 通过点击页面元素自动获取 CSS 选择器
- ⚡ **实时提取** - 自动检测并提取字幕变化
- 💾 **自动保存** - 记住用户使用的选择器
- 📤 **多种导出** - 支持 JSON 文件导出和剪贴板复制

## 目录结构

```
subtitle-extractor/
├── manifest.json          # 扩展配置文件
├── background/
│   └── background.js     # 后台 Service Worker
├── content/
│   └── content.js         # 内容脚本（注入 B 站页面）
├── popup/
│   ├── popup.html         # 弹出面板
│   └── popup.js           # 弹出面板逻辑
└── icons/
    └── icon.png           # 扩展图标
```

## 安装步骤

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `subtitle-extractor` 文件夹

## 使用方法

1. 打开 B 站视频页面
2. 点击扩展图标打开 popup 面板
3. 使用 **🎯 选择元素** 按钮或手动输入 CSS 选择器
4. 点击 **▶ 开始提取** 启动字幕提取
5. 提取完成后点击 **📄 导出为 JSON** 或 **📋 复制数组到剪贴板**

## 手动选择器示例

如果元素选择器不起手动了，可以尝试以下选择器：

```
.bili-subtitle-x-subtitle-panel-text
```

## 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 访问当前活动标签页 |
| `storage` | 保存用户设置和选择器 |
| `clipboardWrite` | 复制字幕到剪贴板 |
