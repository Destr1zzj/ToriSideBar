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

/**
 * Check whether the DOM selection is inside an empty task-list item.
 * Returns the containing <li> element if so, otherwise null.
 */
function getEmptyTaskItem(): HTMLLIElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.getRangeAt(0).startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  if (!(node instanceof Element)) return null;

  const li = node.closest("li");
  if (!li) return null;

  // Must be a task item and empty (no text after the checkbox).
  const checkbox = li.querySelector('input[type="checkbox"]');
  if (!checkbox) return null;
  const clone = li.cloneNode(true) as HTMLElement;
  clone.querySelector('input[type="checkbox"]')?.remove();
  const text = clone.textContent?.replace(/\u200B/g, "").trim();
  if (text && text.length > 0) return null;

  return li as HTMLLIElement;
}

/** Find the index of an <li> among its sibling <li> elements. */
function getTaskItemIndex(li: HTMLLIElement): number {
  const parent = li.parentElement;
  if (!parent) return -1;
  const siblings = Array.from(parent.children).filter(
    (el) => el.tagName === "LI"
  );
  return siblings.indexOf(li);
}

/** Place the caret at the start of an element's content. */
function moveCaretToStart(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
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

          const irElement = (vditor as any).vditor?.ir?.element as
            | HTMLElement
            | undefined;
          if (!irElement) return;

          // Workaround for Vditor IR mode task-list backspace:
          // In an empty task item, backspace should first remove the checkbox
          // marker (task -> bullet), then on the next backspace remove the list
          // marker (bullet -> empty paragraph). This matches standard editor
          // behaviour and avoids the cursor jumping caused by Vditor deleting
          // the whole marker at once.
          irElement.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key !== "Backspace" && e.key !== "Delete") return;

            const li = getEmptyTaskItem();
            if (!li) return;

            const taskIndex = getTaskItemIndex(li);
            if (taskIndex < 0) return;

            e.preventDefault();
            e.stopImmediatePropagation();

            try {
              const value = vditor.getValue();
              const lines = value.split("\n");
              let lineIndex = -1;
              let count = 0;
              for (let i = 0; i < lines.length; i++) {
                if (/^[-*]\s+\[[xX ]\]\s*$/.test(lines[i]) || /^[-*]\s*$/.test(lines[i])) {
                  if (count === taskIndex) {
                    lineIndex = i;
                    break;
                  }
                  count++;
                }
              }
              if (lineIndex < 0) return;

              const line = lines[lineIndex];
              let newLine: string;
              let targetSelector: string | null = null;

              const taskMatch = line.match(/^([-*])\s+\[[xX ]\]\s*$/);
              if (taskMatch) {
                // First backspace: remove the checkbox, keep a plain list item.
                newLine = `${taskMatch[1]} `;
                targetSelector = "li";
              } else if (/^[-*]\s*$/.test(line)) {
                // Second backspace: remove the list marker, create empty paragraph.
                newLine = "";
                targetSelector = 'p[data-block="0"]';
              } else {
                return;
              }

              lines[lineIndex] = newLine;
              vditor.setValue(lines.join("\n"));
              vditor.focus();

              // Restore caret position after Vditor re-renders.
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (targetSelector === "li") {
                    const listItems = irElement.querySelectorAll("li");
                    const targetLi = listItems[taskIndex];
                    if (targetLi) {
                      const textSpan = targetLi.querySelector('[data-block="0"]') || targetLi;
                      moveCaretToStart(textSpan);
                    }
                  } else if (targetSelector) {
                    const paragraphs = irElement.querySelectorAll(targetSelector);
                    const targetP = paragraphs[paragraphs.length - 1];
                    if (targetP) {
                      moveCaretToStart(targetP);
                    }
                  }
                });
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
