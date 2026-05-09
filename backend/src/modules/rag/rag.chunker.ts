import type { Chunk } from "./rag.types";

const DEFAULT_MAX_CHARS = 1200;

/**
 * Chunking simples e auditável para markdown:
 *
 * - **heading-aware**: cada heading (#..######) começa nova seção;
 * - mantém `headingPath` (cadeia de títulos) para ancoragem semântica;
 * - se a seção exceder `maxChars`, quebra por parágrafos com packing greedy;
 * - se um parágrafo sozinho exceder `maxChars`, faz hard-split em fatias.
 *
 * Heurística "boa o suficiente" — quando precisar de tokenizer real
 * (ex.: limite de 8k tokens por chunk para um modelo específico), trocar
 * por contagem por tokens sem mudar a forma do `Chunk`.
 */
export function chunkMarkdown(
  md: string,
  opts: { maxChars?: number } = {}
): Chunk[] {
  const max = Math.max(200, opts.maxChars ?? DEFAULT_MAX_CHARS);
  const lines = md.split(/\r?\n/);

  type Section = { headingPath: string[]; lines: string[] };
  const sections: Section[] = [{ headingPath: [], lines: [] }];
  const stack: string[] = [];

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      const hashes = m[1] ?? "#";
      const level = hashes.length;
      const title = (m[2] ?? "").trim();
      while (stack.length >= level) stack.pop();
      stack.push(title);
      sections.push({
        headingPath: [...stack],
        lines: [`${hashes} ${title}`],
      });
    } else {
      const last = sections[sections.length - 1]!;
      last.lines.push(line);
    }
  }

  const chunks: Chunk[] = [];
  let id = 0;

  for (const section of sections) {
    const text = section.lines.join("\n").trim();
    if (!text) continue;

    if (text.length <= max) {
      chunks.push({
        id: id++,
        headingPath: section.headingPath,
        content: text,
        chars: text.length,
      });
      continue;
    }

    const paras = text.split(/\n{2,}/);
    let buf = "";
    const flush = () => {
      if (!buf) return;
      chunks.push({
        id: id++,
        headingPath: section.headingPath,
        content: buf,
        chars: buf.length,
      });
      buf = "";
    };

    for (const para of paras) {
      const candidate = buf ? `${buf}\n\n${para}` : para;
      if (candidate.length <= max) {
        buf = candidate;
        continue;
      }
      flush();
      if (para.length > max) {
        for (let i = 0; i < para.length; i += max) {
          const slice = para.slice(i, i + max);
          chunks.push({
            id: id++,
            headingPath: section.headingPath,
            content: slice,
            chars: slice.length,
          });
        }
      } else {
        buf = para;
      }
    }
    flush();
  }

  return chunks;
}
