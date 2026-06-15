import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";

export interface MarkdownEditorRef {
  insertTodo: () => void;
}

interface MarkdownEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

/** Check whether the DOM selection is inside an empty task-list item. */
function getEmptyTaskItemIndex(): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.getRangeAt(0).startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  if (!(node instanceof Element)) return null;

  const li = node.closest("li");
  if (!li) return null;

  // Must contain a checkbox to be a task item.
  if (!li.querySelector('input[type="checkbox"]')) return null;

  // Consider the item empty if, after removing the checkbox, there is no text.
  const clone = li.cloneNode(true) as HTMLElement;
  clone.querySelector('input[type="checkbox"]')?.remove();
  const text = clone.textContent?.replace(/\u200B/g, "").trim();
  if (text && text.length > 0) return null;

  const parent = li.parentElement;
  if (!parent) return null;
  const siblings = Array.from(parent.children).filter(
    (el) => el.tagName === "LI"
  );
  const index = siblings.indexOf(li);
  return index >= 0 ? index : null;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ markdown, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vditorRef = useRef<Vditor | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const vditor = new Vditor(container, {
        mode: "ir",
        theme: "classic",
        value: markdown,
        toolbar: [],
        toolbarConfig: { hide: true },
        outline: { enable: false, position: "left" },
        preview: { markdown: { autoSpace: true } },
        cache: { enable: false },
        placeholder: "",
        input: (value) => {
          onChange(value);
        },
        after: () => {
          vditorRef.current = vditor;
          setReady(true);

          // Workaround for Vditor IR mode: pressing Backspace inside an empty
          // task-list item gets stuck because the non-editable checkbox blocks
          // the default contenteditable deletion. Detect this state and remove
          // the empty task item from the markdown source.
          const irElement = (vditor as any).vditor?.ir?.element;
          if (!irElement) return;

          irElement.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key !== "Backspace" && e.key !== "Delete") return;

            const taskIndex = getEmptyTaskItemIndex();
            if (taskIndex === null) return;

            e.preventDefault();
            try {
              const before = vditor.getValue();
              const lines = before.split("\n");
              let lineIndex = -1;
              let count = 0;
              for (let i = 0; i < lines.length; i++) {
                if (/^[-*]\s+\[[xX ]\]\s*/.test(lines[i])) {
                  if (count === taskIndex) {
                    lineIndex = i;
                    break;
                  }
                  count++;
                }
              }
              if (lineIndex < 0) return;

              // Replace the empty task-list item with a paragraph containing a
              // zero-width space. A plain empty line after a list is ignored by
              // Markdown, so we need a visible paragraph to place the cursor in.
              // The zero-width space is invisible and will be removed when the
              // user starts typing or deletes the empty paragraph.
              lines.splice(lineIndex, 1, "\u200B");
              vditor.setValue(lines.join("\n"));
              vditor.focus();

              // setValue resets the cursor. Wait for Vditor to re-render, then
              // place the cursor at the very beginning of the newly created
              // paragraph so the user can type from the start of the line.
              requestAnimationFrame(() => {
                setTimeout(() => {
                  const paragraphs = irElement.querySelectorAll('p[data-block="0"]');
                  const lastP = paragraphs[paragraphs.length - 1];
                  if (!lastP) return;
                  const range = document.createRange();
                  range.selectNodeContents(lastP);
                  range.collapse(true);
                  const sel = window.getSelection();
                  if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }, 50);
              });
            } catch {
              /* ignore */
            }
          });
        },
      });

      return () => {
        try {
          vditor.destroy();
        } catch {
          /* ignore */
        }
        vditorRef.current = null;
      };
    }, []);

    // Sync external markdown changes (e.g. initial load or parent updates).
    useEffect(() => {
      const vditor = vditorRef.current;
      if (!ready || !vditor) return;
      try {
        const current = vditor.getValue();
        if (current !== markdown) {
          vditor.setValue(markdown);
        }
      } catch {
        /* ignore */
      }
    }, [markdown, ready]);

    useImperativeHandle(ref, () => ({
      insertTodo: () => {
        const vditor = vditorRef.current;
        if (!vditor) return;
        try {
          const current = vditor.getValue();
          const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
          vditor.insertValue(prefix + "- [ ] ");
        } catch {
          /* ignore */
        }
      },
    }));

    return <div ref={containerRef} className="vditor-note-editor" />;
  }
);

MarkdownEditor.displayName = "MarkdownEditor";
