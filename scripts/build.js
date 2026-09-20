// 构建：扫 content/china 与 content/church 两个内容库，校验并生成时间线清单，
// 把页面、清单和各记录文件夹原样放进 dist/。本地与 Netlify 跑同一套构建。
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimelineManifest } from './catalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const siteMeta = JSON.parse(readFileSync(join(root, 'site.json'), 'utf8'));

const entries = [];
for (const collection of ['china', 'church']) {
  const dir = join(root, 'content', collection);
  if (!existsSync(dir)) continue;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const article = join(dir, item.name, 'index.md');
    entries.push({
      collection,
      slug: item.name,
      path: `content/${collection}/${item.name}/index.md`,
      markdown: existsSync(article) ? readFileSync(article, 'utf8') : null,
    });
  }
}

const result = buildTimelineManifest({ entries, siteMeta });
if (!result.ok) {
  console.error('内容库校验失败：');
  for (const message of result.errors) console.error(`  ${message}`);
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const file of ['index.html', 'timeline.css', 'timeline.js']) {
  copyFileSync(join(root, file), join(dist, file));
}
writeFileSync(join(dist, 'timeline-manifest.json'), JSON.stringify(result.manifest));
for (const entry of entries) {
  if (entry.markdown == null) continue; // 半成品目录不上线
  cpSync(join(root, 'content', entry.collection, entry.slug), join(dist, 'content', entry.collection, entry.slug), { recursive: true });
}
console.log(`已生成 dist/：${result.manifest.events.length} 条记录`);
