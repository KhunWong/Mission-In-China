# Mission-In-China
基督教在中国大陆地区的传教历史的可视化（635-1953）

该网站作为教会内部课程《基督新教入华史》的辅助工具。
网站以年代为横轴，下方是基督教传教大事件，上方是对应时期的中国历史大事件。点击可以查看事件具体内容。

课程的文字版链接如下，感兴趣可以阅读：
https://khunblog.substack.com


## 如何加入一个新事件

- `content/china/`：中国历史 的事件库
- `content/church/`：教会史 的事件库

每条记录都有一个文件夹，文件夹名是事件名 `年份-英文短名` 例如：“马礼逊抵达广州”是 `1807-morrison-canton`。具体内容写在该文件夹下的 `index.md`中，格式如下：

```
---
title: 马礼逊抵达广州
year: 1807
description: Robert Morrison 抵达广州，成为第一位来华的新教传教士。
category: 新教历史
---
正文（详细内容）
```

每个事件文档可以写正文（详细内容），也可以不写，但必须保留元数据：`title`、`year`（整数年份）、`description`、`category`。

图片等资源与事件文档 `index.md` 在同一文件夹中，正文引用图片，使用相对路径：`![马礼逊像](robert-morrison.jpg)`。没有 `index.md` 的文件夹不会上线。