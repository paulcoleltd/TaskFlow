import { memo } from 'react';
import { cn } from '../../lib/utils';

/* ── Inline parser — bold, italic, code, links ─────────── */
function parseInline(text: string): React.ReactNode[] {
  // Pattern order matters: bold before italic, code before both
  const tokens: React.ReactNode[] = [];
  // Regex: `` `code` `` | **bold** | __bold__ | *italic* | _italic_ | [text](url)
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*(?!\*)[^*]+(?<!\*)\*(?!\*)|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) tokens.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith('`'))     tokens.push(<code key={match.index} className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-[#06091A] text-cyan-300 border border-[#1C3054]">{m.slice(1, -1)}</code>);
    else if (m.startsWith('**') || m.startsWith('__')) tokens.push(<strong key={match.index} className="font-semibold text-slate-100">{m.slice(2, -2)}</strong>);
    else if (m.startsWith('*') || m.startsWith('_'))   tokens.push(<em key={match.index} className="italic text-slate-300">{m.slice(1, -1)}</em>);
    else if (m.startsWith('[')) {
      const linkText = m.match(/\[([^\]]+)\]/)?.[1] ?? '';
      const rawHref = m.match(/\(([^)]+)\)/)?.[1] ?? '';
      // Security: only allow safe URL schemes — block javascript:, data:, vbscript: etc.
      const safeHref = /^(https?:\/\/|mailto:|\/)/i.test(rawHref) ? rawHref : '#';
      tokens.push(<a key={match.index} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">{linkText}</a>);
    }
    last = match.index + m.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

/* ── Block parser ─────────────────────────────────────── */
function parseBlocks(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { i++; continue; }

    // Heading
    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      const cls = level === 1
        ? 'text-base font-bold text-white mt-3 mb-1'
        : level === 2
          ? 'text-sm font-bold text-slate-100 mt-2.5 mb-1'
          : 'text-xs font-bold text-slate-200 mt-2 mb-0.5 uppercase tracking-wider';
      nodes.push(<div key={key++} className={cls}>{parseInline(text)}</div>);
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push(<hr key={key++} className="border-[#1C3054] my-3" />);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={key++} className="border-l-2 border-blue-500/50 pl-3 py-0.5 text-slate-400 italic text-xs my-2">
          {quoteLines.map((l, j) => <span key={j}>{parseInline(l)}{j < quoteLines.length - 1 && <br />}</span>)}
        </blockquote>
      );
      continue;
    }

    // Fenced code block
    if (line.startsWith('```')) {
      line.slice(3); // language tag reserved for future syntax highlighting
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre key={key++} className="bg-[#06091A] border border-[#1C3054] rounded-xl px-3 py-2.5 overflow-x-auto my-2">
          <code className="text-xs font-mono text-cyan-300 leading-relaxed">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={key++} className="space-y-0.5 my-1.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0 mt-1.5" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={key++} className="space-y-0.5 my-1.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-slate-600 font-mono text-[10px] w-4 flex-shrink-0 mt-0.5 text-right">{j + 1}.</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Checkbox list (- [ ] item, - [x] item)
    if (/^-\s\[[ xX]\]\s/.test(line)) {
      const items: { done: boolean; text: string }[] = [];
      while (i < lines.length && /^-\s\[[ xX]\]\s/.test(lines[i])) {
        const done = /^-\s\[[xX]\]/.test(lines[i]);
        const text = lines[i].replace(/^-\s\[[ xX]\]\s/, '');
        items.push({ done, text });
        i++;
      }
      nodes.push(
        <ul key={key++} className="space-y-0.5 my-1.5">
          {items.map((item, j) => (
            <li key={j} className={cn('flex items-start gap-2 text-xs', item.done ? 'text-slate-500' : 'text-slate-400')}>
              <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 text-[8px]', item.done ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-[#1C3054]')}>
                {item.done && '✓'}
              </span>
              <span className={item.done ? 'line-through' : ''}>{parseInline(item.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph — collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|[-*+]\s|\d+\.\s|-\s\[[ xX]\]|>|\`\`\`|---|\*\*\*|___)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push(
        <p key={key++} className="text-xs text-slate-400 leading-relaxed">
          {paraLines.map((l, j) => (
            <span key={j}>{parseInline(l)}{j < paraLines.length - 1 && <br />}</span>
          ))}
        </p>
      );
    }
  }

  return nodes;
}

/* ── Public component ─────────────────────────────────── */
interface MarkdownProps {
  children: string;
  className?: string;
}

export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  if (!children?.trim()) return null;
  const blocks = parseBlocks(children);
  return (
    <div className={cn('space-y-1.5 min-w-0', className)}>
      {blocks}
    </div>
  );
});
