use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum PdfIoError {
    #[error("PDF path is empty")]
    EmptyPath,
    #[error("Only .pdf files are supported")]
    InvalidExtension,
    #[error("Only .md and .markdown files are supported for text exports")]
    InvalidTextExtension,
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Base64(#[from] base64::DecodeError),
}

fn ensure_pdf_path(path: &str) -> Result<(), PdfIoError> {
    if path.trim().is_empty() {
        return Err(PdfIoError::EmptyPath);
    }

    let extension = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "pdf" {
        return Err(PdfIoError::InvalidExtension);
    }

    Ok(())
}

fn ensure_text_export_path(path: &str) -> Result<(), PdfIoError> {
    if path.trim().is_empty() {
        return Err(PdfIoError::EmptyPath);
    }

    let extension = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "md" && extension != "markdown" {
        return Err(PdfIoError::InvalidTextExtension);
    }

    Ok(())
}

pub fn read_pdf_file(path: &str) -> Result<String, PdfIoError> {
    ensure_pdf_path(path)?;
    let bytes = fs::read(path)?;
    Ok(general_purpose::STANDARD.encode(bytes))
}

pub fn write_pdf_file(path: &str, base64: &str) -> Result<(), PdfIoError> {
    ensure_pdf_path(path)?;
    let bytes = general_purpose::STANDARD.decode(base64.as_bytes())?;
    fs::write(path, bytes)?;
    Ok(())
}

pub fn write_text_file(path: &str, text: &str) -> Result<(), PdfIoError> {
    ensure_text_export_path(path)?;
    fs::write(path, text)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{read_pdf_file, write_pdf_file, write_text_file};
    use base64::{engine::general_purpose, Engine as _};
    use std::env;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_pdf_path(name: &str) -> String {
        let mut path = env::temp_dir();
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!("pot-withpdf-{stamp}-{name}.pdf"));
        path.to_string_lossy().to_string()
    }

    fn temp_markdown_path(name: &str) -> String {
        let mut path = env::temp_dir();
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!("pot-withpdf-{stamp}-{name}.md"));
        path.to_string_lossy().to_string()
    }

    #[test]
    fn read_and_write_pdf_roundtrip() {
        let path = temp_pdf_path("roundtrip");
        let bytes = b"%PDF-1.4\nroundtrip\n%%EOF";
        let base64 = general_purpose::STANDARD.encode(bytes);

        write_pdf_file(&path, &base64).unwrap();
        let read_back = read_pdf_file(&path).unwrap();

        assert_eq!(general_purpose::STANDARD.decode(read_back).unwrap(), bytes);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn reject_non_pdf_path() {
        let result = read_pdf_file("/tmp/not-a-pdf.txt");
        assert!(result.is_err());
    }

    #[test]
    fn reject_empty_path() {
        let result = write_pdf_file("", "Zm9v");
        assert!(result.is_err());
    }

    #[test]
    fn surface_write_failures() {
        let result = write_pdf_file("/definitely/missing/folder/fail.pdf", "Zm9v");
        assert!(result.is_err());
    }

    #[test]
    fn write_markdown_export() {
        let path = temp_markdown_path("extracts");
        write_text_file(&path, "# Extracts\n").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "# Extracts\n");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn reject_non_markdown_export_path() {
        let result = write_text_file("/tmp/not-markdown.txt", "hello");
        assert!(result.is_err());
    }
}
