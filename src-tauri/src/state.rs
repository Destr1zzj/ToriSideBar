use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicI32, AtomicU32};
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

/// Current monitor's work_area top edge (set by decision thread, read by animation thread).
pub static BAR_SCREEN_TOP: AtomicI32 = AtomicI32::new(0);

/// Parent -> child window label mapping.
pub static CHILD_WINDOWS: LazyLock<Mutex<HashMap<String, Vec<String>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
