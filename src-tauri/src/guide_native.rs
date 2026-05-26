use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use winapi::shared::minwindef::{DWORD, LPVOID, UINT};
use winapi::shared::windef::{HWND, POINT, SIZE};
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::wingdi::{
    CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject,
    SelectObject, BI_RGB, BITMAPINFO, BITMAPINFOHEADER, BLENDFUNCTION, AC_SRC_ALPHA,
    AC_SRC_OVER, DIB_RGB_COLORS,
};
use winapi::um::winuser::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, GetDC, RegisterClassExW, ReleaseDC,
    ShowWindow, UnregisterClassW, UpdateLayeredWindow, SW_SHOW, WNDCLASSEXW,
    WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT, WS_POPUP,
};

// ULW_ALPHA is 0x00000002 — not always exposed in winapi 0.3, hardcode to be safe.
const ULW_ALPHA: DWORD = 2;

static GUIDE_STATE: Mutex<Option<Arc<AtomicBool>>> = Mutex::new(None);

unsafe extern "system" fn guide_wndproc(
    hwnd: HWND,
    msg: UINT,
    wparam: usize,
    lparam: isize,
) -> isize {
    DefWindowProcW(hwnd, msg, wparam, lparam)
}

/// Show a native layered-window glow guide at the specified screen position.
/// Runs an ice-blue breathing animation for up to 10 seconds, or until
/// `close_guide()` is called. Uses a dedicated thread for the window lifecycle.
pub fn show_guide(x: i32, y: i32, width: i32, height: i32) {
    // Ensure any previous guide is torn down before starting a new one.
    close_guide();

    let stop_flag = Arc::new(AtomicBool::new(false));
    {
        let mut state = GUIDE_STATE.lock().unwrap();
        *state = Some(stop_flag.clone());
    }

    std::thread::spawn(move || {
        unsafe {
            let hinstance = GetModuleHandleW(std::ptr::null());

            // ------------------------------------------------------------------
            // Register window class
            // ------------------------------------------------------------------
            let class_name: Vec<u16> = "ToriSidebarGuide\0".encode_utf16().collect();
            let mut wcex: WNDCLASSEXW = std::mem::zeroed();
            wcex.cbSize = std::mem::size_of::<WNDCLASSEXW>() as u32;
            wcex.lpfnWndProc = Some(guide_wndproc);
            wcex.hInstance = hinstance;
            wcex.lpszClassName = class_name.as_ptr();
            wcex.hbrBackground = std::ptr::null_mut();
            RegisterClassExW(&wcex);

            // ------------------------------------------------------------------
            // Create layered popup window (no borders, no background, click-through)
            // ------------------------------------------------------------------
            let hwnd = CreateWindowExW(
                WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
                class_name.as_ptr(),
                std::ptr::null(),
                WS_POPUP,
                x,
                y,
                width,
                height,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                hinstance,
                std::ptr::null_mut(),
            );

            if hwnd.is_null() {
                let mut state = GUIDE_STATE.lock().unwrap();
                *state = None;
                return;
            }

            ShowWindow(hwnd, SW_SHOW);

            // ------------------------------------------------------------------
            // Create a 32bpp top-down DIB section for per-pixel alpha compositing
            // ------------------------------------------------------------------
            let mut bmi: BITMAPINFO = std::mem::zeroed();
            bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
            bmi.bmiHeader.biWidth = width;
            bmi.bmiHeader.biHeight = -height; // negative = top-down
            bmi.bmiHeader.biPlanes = 1;
            bmi.bmiHeader.biBitCount = 32;
            bmi.bmiHeader.biCompression = BI_RGB;

            let hdc_screen = GetDC(std::ptr::null_mut());
            let hdc_mem = CreateCompatibleDC(hdc_screen);
            let mut bits: LPVOID = std::ptr::null_mut();
            let hbm = CreateDIBSection(
                hdc_mem,
                &bmi,
                DIB_RGB_COLORS,
                &mut bits,
                std::ptr::null_mut(),
                0,
            );
            let old_bmp = SelectObject(hdc_mem, hbm as _);
            ReleaseDC(std::ptr::null_mut(), hdc_screen);

            let pixel_count = (width * height) as usize;
            let pixels = std::slice::from_raw_parts_mut(bits as *mut u32, pixel_count);

            // ------------------------------------------------------------------
            // Animation loop (~30 fps, 10 s max)
            // ------------------------------------------------------------------
            let start = std::time::Instant::now();
            let duration = std::time::Duration::from_secs(10);

            let center_x = width as f32 / 2.0;
            let sigma_core = width as f32 * 0.22;
            let sigma_halo = width as f32 * 0.9;
            let two_pi_over_period = std::f32::consts::PI / 1.2; // 2.4 s period

            while !stop_flag.load(Ordering::SeqCst) && start.elapsed() < duration {
                let elapsed = start.elapsed().as_secs_f32();
                // Breathe: 0.5 .. 1.0 sine wave (2.4 s cycle)
                let breathe = 0.5 + 0.5 * (elapsed * two_pi_over_period).sin();
                // Brightness: 0.85 .. 1.25
                let brightness = 0.85 + 0.4 * (breathe - 0.5) * 2.0;

                for py in 0..height {
                    let vy = py as f32 / (height.saturating_sub(1)).max(1) as f32;
                    // Vertical parabolic fade (middle bright, edges dark)
                    let vertical = 1.0 - (2.0 * vy - 1.0).abs().powf(2.0);

                    for px in 0..width {
                        let dx = (px as f32 - center_x).abs();

                        // Two gaussians: tight core + wide halo
                        let core = (-(dx * dx) / (sigma_core * sigma_core)).exp();
                        let halo = (-(dx * dx) / (sigma_halo * sigma_halo)).exp();
                        let mut intensity =
                            (core * 1.0 + halo * 0.35) * vertical * breathe * brightness;

                        intensity = intensity.min(1.0);

                        // Ice-blue #38bdf8 -> (R=56, G=189, B=248)
                        let r = (56.0 * intensity).min(255.0) as u8;
                        let g = (189.0 * intensity).min(255.0) as u8;
                        let b = (248.0 * intensity).min(255.0) as u8;
                        let a = (255.0 * intensity) as u8;

                        let idx = (py * width + px) as usize;
                        // 32bpp DIB is BGRA in memory (little-endian u32: 0xAARRGGBB)
                        pixels[idx] = ((a as u32) << 24)
                            | ((r as u32) << 16)
                            | ((g as u32) << 8)
                            | (b as u32);
                    }
                }

                // Push the bitmap to the screen through the DWM compositor
                let pt_dst = POINT { x, y };
                let size_dst = SIZE { cx: width, cy: height };
                let pt_src = POINT { x: 0, y: 0 };
                let mut blend: BLENDFUNCTION = std::mem::zeroed();
                blend.BlendOp = AC_SRC_OVER;
                blend.SourceConstantAlpha = 255; // use per-pixel alpha
                blend.AlphaFormat = AC_SRC_ALPHA;

                UpdateLayeredWindow(
                    hwnd,
                    std::ptr::null_mut(),
                    &pt_dst as *const POINT as *mut POINT,
                    &size_dst as *const SIZE as *mut SIZE,
                    hdc_mem,
                    &pt_src as *const POINT as *mut POINT,
                    0,
                    &blend as *const BLENDFUNCTION as *mut BLENDFUNCTION,
                    ULW_ALPHA,
                );

                std::thread::sleep(std::time::Duration::from_millis(33));
            }

            // ------------------------------------------------------------------
            // Cleanup
            // ------------------------------------------------------------------
            SelectObject(hdc_mem, old_bmp);
            DeleteObject(hbm as _);
            DeleteDC(hdc_mem);
            DestroyWindow(hwnd);
            UnregisterClassW(class_name.as_ptr(), hinstance);
        }

        let mut state = GUIDE_STATE.lock().unwrap();
        *state = None;
    });
}

/// Signal the guide animation thread to stop and clean up its window.
pub fn close_guide() {
    let flag = {
        let mut state = GUIDE_STATE.lock().unwrap();
        state.take()
    };
    if let Some(f) = flag {
        f.store(true, Ordering::SeqCst);
    }
}
