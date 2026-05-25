import { useState, useCallback, useRef, useEffect } from "react";

interface DragSortState {
  draggingIndex: number | null;
  dragOverIndex: number | null;
}

/**
 * Custom drag-sort hook using mouse events instead of HTML5 DnD.
 * Works reliably inside Tauri WebView2 where HTML5 drag-and-drop has
 * known issues with dataTransfer and drop event handling.
 */
export function useDragSort(
  itemCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void
) {
  const [state, setState] = useState<DragSortState>({
    draggingIndex: null,
    dragOverIndex: null,
  });

  // Keep latest state accessible inside event listeners without re-binding
  const stateRef = useRef(state);
  stateRef.current = state;

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((index: number) => {
    setState({ draggingIndex: index, dragOverIndex: null });
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    if (state.draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const children = Array.from(
        containerRef.current.children
      ) as HTMLElement[];
      if (children.length === 0) return;

      let targetIndex: number | null = null;

      // Find which item the mouse is currently over.
      // Use the mid-point of each item for stable detection.
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          targetIndex = i;
          break;
        }
      }

      // If below all mid-points, target is the last item
      if (targetIndex === null) {
        targetIndex = children.length - 1;
      }

      // Clamp to valid range just in case
      targetIndex = Math.max(0, Math.min(targetIndex, itemCount - 1));

      if (targetIndex !== stateRef.current.dragOverIndex) {
        setState((prev) => ({ ...prev, dragOverIndex: targetIndex }));
      }
    };

    const handleMouseUp = () => {
      const { draggingIndex, dragOverIndex } = stateRef.current;
      if (
        draggingIndex !== null &&
        dragOverIndex !== null &&
        draggingIndex !== dragOverIndex
      ) {
        onReorder(draggingIndex, dragOverIndex);
      }
      setState({ draggingIndex: null, dragOverIndex: null });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [state.draggingIndex, itemCount, onReorder]);

  return {
    containerRef,
    draggingIndex: state.draggingIndex,
    dragOverIndex: state.dragOverIndex,
    handleDragStart,
  };
}
