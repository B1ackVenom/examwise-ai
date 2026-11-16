from __future__ import annotations

import io
from pathlib import Path
from typing import BinaryIO

from pypdf import PdfReader
import docx
from pptx import Presentation


class DocumentExtractionError(Exception):
    """Raised when document text extraction fails."""
    pass


class DocumentExtractor:
    """
    Extracts plain text from digital academic documents.
    Supports PDF, DOCX, PPTX, and TXT/Markdown.
    NOTE: OCR is explicitly deferred; this extracts native text streams only.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}

    @classmethod
    def extract_text_from_bytes(cls, content: bytes, filename: str) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix not in cls.SUPPORTED_EXTENSIONS:
            raise DocumentExtractionError(f"Unsupported file format: '{suffix}'. Supported: {cls.SUPPORTED_EXTENSIONS}")

        file_stream = io.BytesIO(content)
        if suffix == ".pdf":
            return cls._extract_pdf(file_stream)
        elif suffix == ".docx":
            return cls._extract_docx(file_stream)
        elif suffix == ".pptx":
            return cls._extract_pptx(file_stream)
        elif suffix in (".txt", ".md"):
            return cls._extract_plain(content)
        else:
            raise DocumentExtractionError(f"Unhandled extension: {suffix}")

    @classmethod
    def extract_text_from_file(cls, file_path: str | Path) -> str:
        path = Path(file_path)
        if not path.is_file():
            raise DocumentExtractionError(f"File not found: {file_path}")
        with open(path, "rb") as f:
            return cls.extract_text_from_bytes(f.read(), path.name)

    @classmethod
    def _extract_pdf(cls, stream: io.BytesIO) -> str:
        try:
            reader = PdfReader(stream)
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    pages_text.append(f"--- Page {i + 1} ---\n{text.strip()}")
            return "\n\n".join(pages_text).strip()
        except Exception as e:
            raise DocumentExtractionError(f"Failed to extract PDF text: {e}") from e

    @classmethod
    def _extract_docx(cls, stream: io.BytesIO) -> str:
        try:
            doc = docx.Document(stream)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)
            return "\n\n".join(paragraphs).strip()
        except Exception as e:
            raise DocumentExtractionError(f"Failed to extract DOCX text: {e}") from e

    @classmethod
    def _extract_pptx(cls, stream: io.BytesIO) -> str:
        try:
            prs = Presentation(stream)
            slides_text = []
            for i, slide in enumerate(prs.slides):
                slide_lines = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            line = "".join(run.text for run in paragraph.runs).strip()
                            if line:
                                slide_lines.append(line)
                if slide_lines:
                    slides_text.append(f"--- Slide {i + 1} ---\n" + "\n".join(slide_lines))
            return "\n\n".join(slides_text).strip()
        except Exception as e:
            raise DocumentExtractionError(f"Failed to extract PPTX text: {e}") from e

    @classmethod
    def _extract_plain(cls, content: bytes) -> str:
        for encoding in ("utf-8", "latin-1", "cp1252"):
            try:
                return content.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="replace").strip()
