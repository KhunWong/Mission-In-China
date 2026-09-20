// 内容目录 seam：吃下两个内容库的记录与站点元数据，吐出时间线清单或校验错误列表。
// 本模块不做磁盘 IO；读盘在 scripts/build.js。

const SLUG_PATTERN = /^\d{3,4}-[a-z0-9]+(-[a-z0-9]+)*$/;
const FIELD_KEYS = ['title', 'year', 'description', 'category'];

// 轨道由内容库推出；category 由各条记录的 frontmatter 自定。
const COLLECTIONS = {
  china: { side: 'top', keys: FIELD_KEYS },
  church: { side: 'bottom', keys: FIELD_KEYS },
};

export function buildTimelineManifest({ entries, siteMeta }) {
  const errors = [];
  const events = [];
  for (const entry of entries) {
    if (entry.markdown == null) continue; // 没有文章文件的目录不进清单
    const event = toEvent(entry, errors);
    if (event) events.push(event);
  }
  if (errors.length > 0) return { ok: false, errors };
  events.sort((a, b) => a.year - b.year);
  return { ok: true, manifest: { meta: siteMeta, events } };
}

function toEvent(entry, errors) {
  const label = `${entry.collection}/${entry.slug}`;
  const errorCount = errors.length;
  const collection = COLLECTIONS[entry.collection];
  if (!collection) {
    errors.push(`${label}: 未知内容库`);
    return null;
  }
  if (!SLUG_PATTERN.test(entry.slug)) {
    errors.push(`${label}: 非法 slug，应为「年份-英文短名」，如 1807-morrison-canton`);
  }
  const parsed = parseMarkdown(entry.markdown);
  if (!parsed) {
    errors.push(`${label}: 缺少 frontmatter`);
    return null;
  }
  const { fields, hasBody, badLines } = parsed;
  for (const line of badLines) {
    errors.push(`${label}: frontmatter 无法解析的行「${line}」`);
  }
  for (const key of Object.keys(fields)) {
    if (!collection.keys.includes(key)) errors.push(`${label}: 不允许的字段 ${key}`);
  }
  for (const key of collection.keys) {
    if (!fields[key] || !fields[key].trim()) errors.push(`${label}: 缺少必填字段 ${key}`);
  }
  if (fields.year && !/^\d+$/.test(fields.year)) {
    errors.push(`${label}: year 必须是整数年份`);
  }
  if (errors.length > errorCount) return null;
  return {
    slug: entry.slug,
    collection: entry.collection,
    year: Number(fields.year),
    title: fields.title,
    description: fields.description,
    category: fields.category,
    side: collection.side,
    path: entry.path,
    hasBody,
  };
}

// 解析 frontmatter 的一个扁平子集：每行一个 `key: value`，值可加引号。
function parseMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const fields = {};
  const badLines = [];
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const separator = line.indexOf(': ');
    if (separator <= 0) {
      badLines.push(line);
      continue;
    }
    let value = line.slice(separator + 2).trim();
    if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }
    fields[line.slice(0, separator).trim()] = value;
  }
  return { fields, hasBody: match[2].trim().length > 0, badLines };
}
