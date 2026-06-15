export type MarkdownBlockType = "heading" | "todo" | "list" | "paragraph" | "empty";

export interface MarkdownBlock {
  type: MarkdownBlockType;
  level?: number;
  checked?: boolean;
  text: string;
  raw: string;
  lineIndex: number;
}

export interface TodoOptions {
  checked: boolean;
}

export interface HeadingOptions {
  level: number;
}

export function buildRaw(
  type: MarkdownBlockType,
  text: string,
  options?: TodoOptions | HeadingOptions
): string {
  switch (type) {
    case "heading":
      return `${"#".repeat((options as HeadingOptions)?.level ?? 1)} ${text}`;
    case "todo":
      return `- [${(options as TodoOptions)?.checked ? "x" : " "}] ${text}`;
    case "list":
      return `- ${text}`;
    case "paragraph":
    default:
      return text;
  }
}

export function updateLine(content: string, lineIndex: number, newRaw: string): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  lines[lineIndex] = newRaw;
  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderInline(text: string): string {
  let html = escapeHtml(text);
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  html = html.replace(/(^|[^*])\*(.+?)\*(?![*])/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_(.+?)_(?![_])/g, "$1<em>$2</em>");
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function detectTodo(raw: string): { checked: boolean; text: string } | null {
  const match = raw.match(/^\s*[-*]\s+\[(x|X| )\]\s+(.*)$/);
  if (!match) return null;
  return {
    checked: match[1].toLowerCase() === "x",
    text: match[2].trim(),
  };
}

function detectList(raw: string): string | null {
  const match = raw.match(/^\s*[-*]\s+(.*)$/);
  if (!match) return null;
  return match[1].trim();
}

function detectHeading(raw: string): { level: number; text: string } | null {
  const match = raw.match(/^(#{1,6})\s+(.*)$/);
  if (!match) return null;
  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      blocks.push({ type: "empty", text: "", raw, lineIndex: i });
      continue;
    }

    const heading = detectHeading(raw);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading.level,
        text: heading.text,
        raw,
        lineIndex: i,
      });
      continue;
    }

    const todo = detectTodo(raw);
    if (todo) {
      blocks.push({
        type: "todo",
        checked: todo.checked,
        text: todo.text,
        raw,
        lineIndex: i,
      });
      continue;
    }

    const list = detectList(raw);
    if (list !== null) {
      blocks.push({
        type: "list",
        text: list,
        raw,
        lineIndex: i,
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: trimmed,
      raw,
      lineIndex: i,
    });
  }

  return blocks;
}

/**
 * Toggle the todo checkbox at the given raw line index.
 * Returns the new content string.
 */
export function toggleTodo(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;

  const raw = lines[lineIndex];
  const todo = detectTodo(raw);
  if (!todo) return content;

  const newMark = todo.checked ? " " : "x";
  lines[lineIndex] = raw.replace(/^(\s*[-*]\s+\[)[xX ](\]\s+.*)$/, `$1${newMark}$2`);
  return lines.join("\n");
}

/**
 * Update the text of a todo item at the given raw line index.
 * Returns the new content string.
 */
export function updateTodoText(content: string, lineIndex: number, newText: string): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  const raw = lines[lineIndex];
  const todo = detectTodo(raw);
  if (!todo) return content;
  lines[lineIndex] = raw.replace(/^(\s*[-*]\s+\[[xX ]\]\s+).*$/, `$1${newText}`);
  return lines.join("\n");
}
