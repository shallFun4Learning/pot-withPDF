use crate::config::{get, set};
use log::info;

pub fn check_update(_app_handle: tauri::AppHandle) {
    let enable = match get("check_update") {
        Some(v) => v.as_bool().unwrap_or(false),
        None => {
            set("check_update", false);
            false
        }
    };

    if enable {
        info!("Updater checks are disabled for the pot-withPDF fork.");
    }
}
