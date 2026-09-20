# Mission-In-China
基督新教在中国大陆地区的工作数据库的可视化（1807-1953）

该网站作为教会内部课程《基督新教入华史》的辅助工具。

课程的文字版链接如下，感兴趣可以阅读：
https://khunblog.substack.com

## 写一条时间线记录

内容在 `content/` 下两个库：

- `content/china/`：中国历史
- `content/church/`：教会史

每条记录一个文件夹，文件夹名是 `年份-英文短名`，例如 `1807-morrison-canton`。正文写在 `index.md`，图片等资源放在同一文件夹，正文里用相对路径引用：`![马礼逊像](robert-morrison.jpg)`。没有 `index.md` 的文件夹不会上线。

`index.md` 开头必须是 frontmatter，每行一个 `key: value`。两个库字段相同：`title`、`year`（整数年份）、`description`、`category`。

```
---
title: 马礼逊抵达广州
year: 1807
description: Robert Morrison 抵达广州，成为第一位来华的新教传教士。
category: 新教历史
---
```

frontmatter 后面可以写正文，也可以只留元数据。
