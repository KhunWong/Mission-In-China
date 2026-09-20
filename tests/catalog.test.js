import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineManifest } from '../scripts/catalog.js';

const siteMeta = {
  title: '福音入华',
  startYear: 618,
  endYear: 2025,
  initialYear: 1807,
  pixelsPerYear: 8,
};

function markdown(fields, body = '') {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

function entry(collection, slug, fields, body = '') {
  return {
    collection,
    slug,
    path: `content/${collection}/${slug}/index.md`,
    markdown: markdown(fields, body),
  };
}

test('合法的 china / church 记录进入清单，category 原样采用，清单按年份排序', () => {
  const result = buildTimelineManifest({
    siteMeta,
    entries: [
      entry('church', '1807-morrison-canton', {
        title: '马礼逊抵达广州',
        year: '1807',
        description: 'Robert Morrison 抵达广州，成为第一位来华的新教传教士。',
        category: '天主教',
      }),
      entry('china', '618-tang-founded', {
        title: '唐朝建立',
        year: '618',
        description: '李渊建立唐朝，中国进入开放繁盛的时代。',
        category: '隋唐史',
      }),
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.meta, siteMeta);
  assert.deepEqual(
    result.manifest.events.map((event) => event.slug),
    ['618-tang-founded', '1807-morrison-canton'],
  );

  const [china, church] = result.manifest.events;
  assert.deepEqual(china, {
    slug: '618-tang-founded',
    collection: 'china',
    year: 618,
    title: '唐朝建立',
    description: '李渊建立唐朝，中国进入开放繁盛的时代。',
    category: '隋唐史',
    side: 'top',
    path: 'content/china/618-tang-founded/index.md',
    hasBody: false,
  });
  assert.equal(church.category, '天主教');
  assert.equal(church.side, 'bottom');
  assert.equal(church.year, 1807);
});

test('多写字段、缺 category 时构建失败', () => {
  const result = buildTimelineManifest({
    siteMeta,
    entries: [
      entry('china', '618-tang-founded', {
        title: '唐朝建立',
        year: '618',
        description: '李渊建立唐朝。',
      }),
      entry('church', '1865-taylor-cim', {
        title: '戴德生创立内地会',
        year: '1865',
        description: 'James Hudson Taylor 创立 China Inland Mission。',
        category: '新教历史',
        mission: 'CIM',
      }),
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.every((message) => typeof message === 'string' && message.length > 0));
  assert.ok(result.errors.some((message) => message.includes('china/618-tang-founded') && message.includes('category')));
  assert.ok(result.errors.some((message) => message.includes('church/1865-taylor-cim') && message.includes('mission')));
});

test('缺必填项、非法 slug 时构建失败', () => {
  const result = buildTimelineManifest({
    siteMeta,
    entries: [
      entry('church', '1807-morrison-canton', {
        title: '马礼逊抵达广州',
        year: '1807',
        category: '新教历史',
      }),
      entry('china', '960-song-founded', {
        title: '宋朝建立',
        description: '赵匡胤建立宋朝。',
        category: '中国历史',
      }),
      entry('china', '1840-Opium War', {
        title: '鸦片战争',
        year: '1840',
        description: '第一次鸦片战争爆发。',
        category: '中国历史',
      }),
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors.some((message) => message.includes('church/1807-morrison-canton') && message.includes('description')));
  assert.ok(result.errors.some((message) => message.includes('china/960-song-founded') && message.includes('year')));
  assert.ok(result.errors.some((message) => message.includes('china/1840-Opium War') && message.includes('slug')));
});

test('没有文章文件的目录不进清单；无正文 hasBody 为假，有正文为真', () => {
  const withBody = entry('church', '1807-morrison-canton', {
    title: '马礼逊抵达广州',
    year: '1807',
    description: 'Robert Morrison 抵达广州。',
    category: '新教历史',
  }, '\n1807 年，马礼逊抵达广州。\n');
  const withoutFile = {
    collection: 'china',
    slug: '1912-republic',
    path: 'content/china/1912-republic/index.md',
    markdown: null,
  };
  const frontmatterOnly = entry('china', '618-tang-founded', {
    title: '唐朝建立',
    year: '618',
    description: '李渊建立唐朝。',
    category: '中国历史',
  });

  const result = buildTimelineManifest({ siteMeta, entries: [withBody, withoutFile, frontmatterOnly] });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.manifest.events.map((event) => `${event.slug}:${event.hasBody}`),
    ['618-tang-founded:false', '1807-morrison-canton:true'],
  );
});
