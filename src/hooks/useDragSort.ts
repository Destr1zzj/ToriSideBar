import { useState, useCallback, useRef, useEffect } from "react";

interface DragSortState {
  draggingIndex: number | null;
  dragOverIndex: number | null;
  mouseOffset: number;
}

const MOVE_THRESHOLD = 5; // px: drag starts after moving this far

/**
 * Custom drag-sort hook using mouse events.
 * Distinguishes between a "click" (tiny movement) and a "drag".
 *
 * When dragging, the dragged item scales up and follows the cursor.
 * Other items slide out of the way with smooth CSS transitions.
 */
export function useDragSort(
  itemCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
  onClick?: (index: number) => void
) {
  const [state, setState] = useState<DragSortState>({
    draggingIndex: null,
    dragOverIndex: null,
    mouseOffset: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const containerRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const stepRef = useRef(50); // item height + gap, measured on drag start

  const handleDragStart = useCallback((index: number) => {
    hasMovedRef.current = false;
    startPosRef.current = null;

    // Measure the exact vertical step (item height + flex gap)
    if (containerRef.current && containerRef.current.children.length >= 2) {
      const c = containerRef.current.children;
      const r0 = (c[0] as HTMLElement).getBoundingClientRect();
      const r1 = (c[1] as HTMLElement).getBoundingClientRect();
      stepRef.current = r1.top - r0.top;
    }

    setState({ draggingIndex: index, dragOverIndex: null, mouseOffset: 0 });
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
        setState((prev) => ({
          ...prev,
          mouseOffset: e.clientY - startPosRef.current!.y,
        }));
      } else {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      const children = Array.from(
        containerRef.current.children
      ) as HTMLElement[];
      if (children.length === 0) return;

      let targetIndex: number | null = null;

      // Find which item the mouse is currently over.
      // Skip the dragged item because its visual position is offset by transform.
      for (let i = 0; i < children.length; i++) {
        if (i === stateRef.current.draggingIndex) continue;
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

      setState({ draggingIndex: null, dragOverIndex: null, mouseOffset: 0 });
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

  /** Compute the inline style for each list item during drag. */
  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => {
      const { draggingIndex, dragOverIndex, mouseOffset } = stateRef.current;

      if (draggingIndex === null) return {};

      // The dragged item scales up and follows the mouse
      if (index === draggingIndex) {
        return {
          transform: `translateY(${mouseOffset}px) scale(1.08)`,
          zIndex: 10,
          transition: "none",
        };
      }

      if (dragOverIndex === null) return {};

      // Other items slide out of the way
      let offset = 0;
      if (draggingIndex < dragOverIndex) {
        // Dragging downward: items between source and target shift UP
        if (index > draggingIndex && index <= dragOverIndex) {
          offset = -stepRef.current;
        }
      } else if (draggingIndex > dragOverIndex) {
        // Dragging upward: items between target and source shift DOWN
        if (index >= dragOverIndex && index < draggingIndex) {
          offset = stepRef.current;
        }
      }

      if (offset !== 0) {
        return {
          transform: `translateY(${offset}px)`,
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
        };
      }

      return {};
    },
    []
  );

  return {
    containerRef,
    draggingIndex: state.draggingIndex,
    dragOverIndex: state.dragOverIndex,
    getItemStyle,
    handleDragStart,
  };
}
