/**
 * 轻量 Markdown 解析器（面向 WXML 渲染，不依赖 npm）
 * 输出块级节点树，行内元素解析为 spans 数组：
 *   span: { t: 'text'|'bold'|'italic'|'code'|'link', text, url? }
 * 块级类型：h1-h4 / p / ul / quote / table / hr / code
 * 覆盖 ROS2 周报实际用到的语法：标题、加粗、行内代码、链接、
 * 无序列表、表格、引用、分割线、 fenced 代码块。
 */

/** 行内解析：code > bold-italic > bold > italic > link，按出现顺序切分 */
function parseInline(text) {
  const spans = [];
  let rest = text || '';
  const re = /(`[^`]+`)|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]*\]\([^)]+\))|(\[\d+\](?!\())/;
  let guard = 0;
  while (rest.length && guard < 500) {
    guard++;
    const m = rest.match(re);
    if (!m) {
      if (rest) spans.push({ t: 'text', text: rest });
      break;
    }
    if (m.index > 0) spans.push({ t: 'text', text: rest.slice(0, m.index) });
    const tok = m[0];
    if (m[1]) {
      spans.push({ t: 'code', text: tok.slice(1, -1) });
    } else if (m[2]) {
      spans.push({ t: 'bold-italic', text: tok.slice(3, -3) });
    } else if (m[3]) {
      spans.push({ t: 'bold', text: tok.slice(2, -2) });
    } else if (m[4]) {
      spans.push({ t: 'italic', text: tok.slice(1, -1) });
    } else if (m[5]) {
      const lm = tok.match(/\[([^\]]*)\]\(([^)]+)\)/);
      spans.push({ t: 'link', text: lm[1] || lm[2], url: lm[2] });
    } else if (m[6]) {
      spans.push({ t: 'ref', text: tok.slice(1, -1) });
    }
    rest = rest.slice(m.index + tok.length);
  }
  return spans.length ? spans : [{ t: 'text', text: text || '' }];
}

/** 表格行切分（容忍首尾竖线与空格） */
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function isTableSep(line) {
  return /^\|?[\s:|-]+\|/.test(line) && /-{2,}/.test(line);
}

/**
 * 解析 Markdown 全文为块数组
 */
function parse(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) { i++; continue; }

    // fenced 代码块
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 跳过结尾 ```
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length, 4);
      blocks.push({ type: 'h' + level, spans: parseInline(h[2].trim()) });
      i++;
      continue;
    }

    // 表格（当前行以 | 开头且下一行是分隔行）
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitTableRow(line).map(parseInline);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[i]).map(parseInline));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // 引用块（连续 > 行合并为一个 quote，内部按段落处理）
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', spans: parseInline(buf.join(' ').trim()) });
      continue;
    }

    // 无序列表（连续 -/* 行；缩进的续行并入上一项）
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        let text = lines[i].replace(/^\s*[-*]\s+/, '').trim();
        i++;
        // 续行：缩进且非新列表项/块级起头的非空行，合并进当前条目
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^(#{1,6}\s|```|>\s?)/.test(lines[i])
        ) {
          text += ' ' + lines[i].trim().replace(/\s{2,}$/, '');
          i++;
        }
        items.push({
          indent: Math.min(Math.floor(indent / 2), 2),
          spans: parseInline(text)
        });
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 有序列表（连续 1. 2. 行；续行规则同无序列表）
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const num = parseInt(lines[i].match(/^\s*(\d+)\./)[1], 10);
        let text = lines[i].replace(/^\s*\d+\.\s+/, '').trim();
        i++;
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^(#{1,6}\s|```|>\s?)/.test(lines[i])
        ) {
          text += ' ' + lines[i].trim().replace(/\s{2,}$/, '');
          i++;
        }
        items.push({ num, spans: parseInline(text) });
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // 参考链接定义（连续 [n]: 标题 — URL 行，研究周报尾部参考链接节）
    if (/^\[\d+\]:\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\[\d+\]:\s+/.test(lines[i])) {
        const m = lines[i].match(/^\[(\d+)\]:\s+(.*)$/);
        const body = m[2].trim();
        const um = body.match(/^(.*?)\s*(https?:\/\/\S+)$/);
        items.push({
          num: parseInt(m[1], 10),
          title: um ? um[1].replace(/[\s—–-]+$/, '').trim() : body,
          url: um ? um[2] : ''
        });
        i++;
      }
      blocks.push({ type: 'refs', items });
      continue;
    }

    // 普通段落（合并到空行为止）
    const buf = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*[-*]\s|\s*\d+\.\s|>\s?|(-{3,}|\*{3,})\s*$)/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', spans: parseInline(buf.join(' ')) });
  }
  return blocks;
}

/** 去除行内 Markdown 标记，得到纯文本 */
function stripInline(text) {
  return String(text || '')
    .replace(/\[\^[^\]]*\]/g, '') // 脚注引用 [^1]
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function spansText(spans) {
  return (spans || []).map(s => s.text).join('');
}

function truncate(text, maxLen) {
  const t = String(text || '').trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).replace(/[\s，、；：:.,．]*$/, '') + '…';
}

/** 列表项导语：优先首个加粗片段，否则取首个冒号/句号前文本 */
function itemLead(item) {
  const bold = (item.spans || []).find(
    s => (s.t === 'bold' || s.t === 'bold-italic') && s.text.trim().length >= 2
  );
  if (bold) return stripInline(bold.text);
  const plain = stripInline(spansText(item.spans));
  const at = plain.search(/[：:。；;]/);
  return at > 0 ? plain.slice(0, at) : plain;
}

/** h2 章节内容 → 摘要文本：含列表则拼接各项导语，否则取首个段落/引用 */
function sectionText(section) {
  const list = section.find(b => b.type === 'ol' || b.type === 'ul');
  if (list) {
    return list.items.map(itemLead).filter(Boolean).join(' · ');
  }
  const p = section.find(b => b.type === 'p' || b.type === 'quote');
  return p ? stripInline(spansText(p.spans)) : '';
}

/**
 * 从周报 Markdown 提取列表摘要（全文或前几 KB 片段均可）。
 * 适配数据仓库的历代格式：
 *   1) 文首引用/段落内含「总判断」（ROS2 早期）
 *   2) ## 总判断 / ## 导读 / ## 概览 章节（近期格式）
 *   3) 兜底取第一个 h2 章节内容
 */
function extractSummary(mdText, maxLen) {
  maxLen = maxLen || 100;
  const blocks = parse(mdText);
  const firstH2 = blocks.findIndex(b => b.type === 'h2');

  // 1) 文首（首个 h2 之前）引用/段落内含「总判断」或「本周聚焦」
  const head = firstH2 < 0 ? blocks : blocks.slice(0, firstH2);
  for (const b of head) {
    if (b.type !== 'quote' && b.type !== 'p') continue;
    const plain = stripInline(spansText(b.spans));
    const at = plain.indexOf('总判断');
    if (at >= 0) {
      return truncate(plain.slice(at).replace(/^总判断[：:]?\s*/, ''), maxLen);
    }
    const focus = plain.indexOf('本周聚焦');
    if (focus >= 0) {
      const t = plain
        .slice(focus)
        .replace(/^本周聚焦[：:]?\s*/, '')
        .replace(/\s*编辑[：:].*$/, '')
        .replace(/\s*\|.*$/, '');
      return truncate(t, maxLen);
    }
  }

  // 取 idx 处 h2 章节内容（到下一个 h2/hr 为止）
  const pickSection = idx => {
    const section = [];
    for (let j = idx + 1; j < blocks.length; j++) {
      if (blocks[j].type === 'h2' || blocks[j].type === 'hr') break;
      section.push(blocks[j]);
    }
    return sectionText(section);
  };

  // 2) 摘要章节
  const idx = blocks.findIndex(
    b => b.type === 'h2' && /总判断|导读|概览/.test(spansText(b.spans))
  );
  if (idx >= 0) return truncate(pickSection(idx), maxLen);

  // 3) 兜底：第一个 h2 章节
  if (firstH2 >= 0) return truncate(pickSection(firstH2), maxLen);

  // 4) 兜底：首个段落
  const p = blocks.find(b => b.type === 'p');
  return truncate(p ? stripInline(spansText(p.spans)) : '', maxLen);
}

module.exports = { parse, parseInline, extractSummary };
