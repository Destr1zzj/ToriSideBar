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
