use crate::error::Error;

#[tauri::command]
pub fn read_pdf_file(path: String) -> Result<String, Error> {
    pot_withpdf_pdf_io::read_pdf_file(&path).map_err(|err| Error::Message(err.to_string()))
}

#[tauri::command]
pub fn write_pdf_file(path: String, base64: String) -> Result<(), Error> {
    pot_withpdf_pdf_io::write_pdf_file(&path, &base64)
        .map_err(|err| Error::Message(err.to_string()))
}

#[tauri::command]
pub fn write_text_file(path: String, text: String) -> Result<(), Error> {
    pot_withpdf_pdf_io::write_text_file(&path, &text)
        .map_err(|err| Error::Message(err.to_string()))
}
