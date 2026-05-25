import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DragSortState {
  draggingIndex: number | null;
  dragOverIndex: number | null;
  mouseOffset: number;
}

const MOVE_THRESHOLD = 5; // px: drag starts after moving this far
const SCROLL_MARGIN = 28; // px from container edge to trigger auto-scroll
const SCROLL_SPEED = 4;   // px per frame

/**
 * Custom drag-sort hook using mouse events.
 * Distinguishes between a "click" (tiny movement) and a "drag".
 *
 * When dragging, the dragged item scales up and follows the cursor.
 * Other items slide out of the way with smooth CSS transitions.
 * Auto-scrolls the list when the mouse hovers near the top/bottom edge.
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
  const origScrollTopRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  /** Compute which slot the mouse is hovering over. */
  const computeTargetIndex = useCallback((mouseY: number): number => {
    const container = containerRef.current;
    const rects = origRectsRef.current;
    if (!container || rects.length === 0) return 0;

    const scrollDelta = container.scrollTop - origScrollTopRef.current;
    const firstTop = rects[0].top;
    const relativeY = mouseY - firstTop + scrollDelta;
    let targetIndex = Math.round(relativeY / stepRef.current);
    return Math.max(0, Math.min(targetIndex, itemCount - 1));
  }, [itemCount]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;

    const tick = () => {
      const container = containerRef.current;
      if (!container || stateRef.current.draggingIndex === null) {
        stopAutoScroll();
        return;
      }

      const rect = container.getBoundingClientRect();
      const mouseY = lastMouseYRef.current;
      let scrolled = false;

      if (mouseY < rect.top + SCROLL_MARGIN) {
        const old = container.scrollTop;
        container.scrollTop -= SCROLL_SPEED;
        scrolled = container.scrollTop !== old;
      } else if (mouseY > rect.bottom - SCROLL_MARGIN) {
        const old = container.scrollTop;
        container.scrollTop += SCROLL_SPEED;
        scrolled = container.scrollTop !== old;
      }

      if (scrolled) {
        // Recompute target index and mouse offset after scrolling so the
        // dragged item and drop target stay aligned with the cursor.
        const targetIndex = computeTargetIndex(mouseY);
        const scrollDelta = container.scrollTop - origScrollTopRef.current;
        const startY = startPosRef.current?.y ?? mouseY;
        const mouseOffset = mouseY - startY + scrollDelta;

        setState((prev) => ({
          ...prev,
          dragOverIndex: targetIndex,
          mouseOffset,
        }));
      }

      autoScrollRafRef.current = requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = requestAnimationFrame(tick);
  }, [computeTargetIndex, stopAutoScroll]);

  const handleDragStart = useCallback((index: number) => {
    hasMovedRef.current = false;
    startPosRef.current = null;

    // Tell the Rust backend to pause auto-hide while dragging
    invoke("set_dragging", { dragging: true }).catch(() => {});

    // Measure the exact vertical step (item height + flex gap)
    // and record original rects so mouse-to-index mapping stays accurate
    // even after other items are shifted by transforms or the list scrolls.
    if (containerRef.current) {
      const children = Array.from(containerRef.current.children) as HTMLElement[];
      origRectsRef.current = children.map((el) => el.getBoundingClientRect());
      origScrollTopRef.current = containerRef.current.scrollTop;
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

      lastMouseYRef.current = e.clientY;

      // Track whether the mouse has moved enough to count as a drag
      if (startPosRef.current) {
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
          hasMovedRef.current = true;
        }

        const scrollDelta =
          containerRef.current.scrollTop - origScrollTopRef.current;
        setState((prev) => ({
          ...prev,
          mouseOffset: e.clientY - startPosRef.current!.y + scrollDelta,
        }));
      } else {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      const targetIndex = computeTargetIndex(e.clientY);
      if (targetIndex !== stateRef.current.dragOverIndex) {
        setState((prev) => ({ ...prev, dragOverIndex: targetIndex }));
      }

      // Kick off auto-scroll if the mouse is near the container edge
      startAutoScroll();
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
      stopAutoScroll();
      invoke("set_dragging", { dragging: false }).catch(() => {});
    };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      stopAutoScroll();
      invoke("set_dragging", { dragging: false }).catch(() => {});
    };
  }, [state.draggingIndex, onReorder, startAutoScroll, stopAutoScroll, computeTargetIndex]);

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
