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
  const re = /(`[^`]+`)|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]*\]\([^)]+\))/;
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

    // 无序列表（连续 -/* 行）
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        items.push({
          indent: Math.min(Math.floor(indent / 2), 2),
          spans: parseInline(lines[i].replace(/^\s*[-*]\s+/, '').trim())
        });
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 普通段落（合并到空行为止）
    const buf = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*[-*]\s|>\s?|(-{3,}|\*{3,})\s*$)/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', spans: parseInline(buf.join(' ')) });
  }
  return blocks;
}

module.exports = { parse, parseInline };
