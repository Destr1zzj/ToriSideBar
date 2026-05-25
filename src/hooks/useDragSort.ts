import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const origRectsRef = useRef<DOMRect[]>([]); // original rects before any transform

  const handleDragStart = useCallback((index: number) => {
    hasMovedRef.current = false;
    startPosRef.current = null;

    // Tell the Rust backend to pause auto-hide while dragging
    invoke("set_dragging", { dragging: true }).catch(() => {});

    // Measure the exact vertical step (item height + flex gap)
    // and record original rects so mouse-to-index mapping stays accurate
    // even after other items are shifted by transforms.
    if (containerRef.current) {
      const children = Array.from(containerRef.current.children) as HTMLElement[];
      origRectsRef.current = children.map((el) => el.getBoundingClientRect());
      if (children.length >= 2) {
        stepRef.current = origRectsRef.current[1].top - origRectsRef.current[0].top;
      }
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

      const rects = origRectsRef.current;
      if (rects.length === 0) return;

      // Use the original (un-transformed) positions to compute the target slot.
      // relativeY = how far below the first item's original top the mouse is.
      // Rounding by step gives stable boundaries between slots.
      const firstTop = rects[0].top;
      const relativeY = e.clientY - firstTop;
      let targetIndex = Math.round(relativeY / stepRef.current);
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
      invoke("set_dragging", { dragging: false }).catch(() => {});
    };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      invoke("set_dragging", { dragging: false }).catch(() => {});
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
