use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicI32, AtomicU32, AtomicU8};
use std::sync::{Mutex, LazyLock};

/// Whether the settings panel is open (pauses auto-hide animation).
pub static BAR_EXPANDED: AtomicBool = AtomicBool::new(false);

/// Trigger zone width in pixels.
pub static TRIGGER_WIDTH: AtomicU32 = AtomicU32::new(30);

/// Whether the bar has been "unlocked" by entering the trigger zone.
pub static TRIGGER_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Target visibility state set by the decision thread, read by the animation thread.
pub static BAR_TARGET_VISIBLE: AtomicBool = AtomicBool::new(false);

/// Target x position for animation thread (set by expand/collapse to avoid jump).
pub static BAR_TARGET_X: AtomicI32 = AtomicI32::new(0);

/// Current monitor's work_area right edge (set by decision thread, read by animation thread).
pub static BAR_SCREEN_RIGHT: AtomicI32 = AtomicI32::new(0);

/// Current monitor's work_area left edge (set by decision thread, read by animation thread).
pub static BAR_SCREEN_LEFT: AtomicI32 = AtomicI32::new(0);

/// Current monitor's work_area top edge (set by decision thread, read by animation thread).
pub static BAR_SCREEN_TOP: AtomicI32 = AtomicI32::new(0);

/// Bar position: 0 = left edge, 1 = right edge.
pub static BAR_POSITION: AtomicU8 = AtomicU8::new(1);

/// Leftmost monitor edge across all displays (for left-docked bar).
pub static BAR_FIXED_LEFT: AtomicI32 = AtomicI32::new(0);

/// Rightmost monitor edge across all displays (for right-docked bar).
pub static BAR_FIXED_RIGHT: AtomicI32 = AtomicI32::new(0);

/// When true, the auto-hide thread has published at least one valid
/// monitor info frame. Prevents the animation thread from running
/// before the first monitor scan (and avoids the false "screen_right==0"
/// stall when the mouse is on the leftmost monitor whose right edge is 0).
pub static MONITOR_INFO_READY: AtomicBool = AtomicBool::new(false);

/// When true, the auto-hide thread is paused so the bar stays visible
/// during drag-to-sort operations.
pub static DRAGGING: AtomicBool = AtomicBool::new(false);

/// When true, the bar is locked visible by the global shortcut.
/// Auto-hide is suspended until the shortcut is pressed again or the
/// user clicks outside the bar/app area.
pub static BAR_LOCKED: AtomicBool = AtomicBool::new(false);

/// Parent -> child window label mapping.
pub static CHILD_WINDOWS: LazyLock<Mutex<HashMap<String, Vec<String>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
