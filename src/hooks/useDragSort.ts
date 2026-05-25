import { useState, useCallback, useRef, useEffect } from "react";

interface DragSortState {
  draggingIndex: number | null;
  dragOverIndex: number | null;
}

const MOVE_THRESHOLD = 5; // px: drag starts after moving this far

/**
 * Custom drag-sort hook using mouse events.
 * Distinguishes between a "click" (tiny movement) and a "drag".
 * When a click is detected, onClick(index) is called instead of reordering.
 */
export function useDragSort(
  itemCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
  onClick?: (index: number) => void
) {
  const [state, setState] = useState<DragSortState>({
    draggingIndex: null,
    dragOverIndex: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const containerRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback((index: number) => {
    hasMovedRef.current = false;
    startPosRef.current = null;
    setState({ draggingIndex: index, dragOverIndex: null });
  }, []);

  useEffect(() => {
    if (state.draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Track whether the mouse has moved enough to count as a drag
      if (startPosRef.current) {
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
          hasMovedRef.current = true;
        }
      } else {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      const children = Array.from(
        containerRef.current.children
      ) as HTMLElement[];
      if (children.length === 0) return;

      let targetIndex: number | null = null;

      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === null) {
        targetIndex = children.length - 1;
      }

      targetIndex = Math.max(0, Math.min(targetIndex, itemCount - 1));

      if (targetIndex !== stateRef.current.dragOverIndex) {
        setState((prev) => ({ ...prev, dragOverIndex: targetIndex }));
      }
    };

    const handleMouseUp = () => {
      const { draggingIndex, dragOverIndex } = stateRef.current;

      if (!hasMovedRef.current && draggingIndex !== null) {
        // It was a click, not a drag
        onClickRef.current?.(draggingIndex);
      } else if (
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

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
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
