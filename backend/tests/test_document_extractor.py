from __future__ import annotations

import io
import pytest
import docx
from pptx import Presentation

from app.services.document_extractor import DocumentExtractionError, DocumentExtractor


class TestDocumentExtractor:
    def test_extract_plain_text(self):
        text = "Chapter 1: Principles of Operating Systems\nProcess management and scheduling."
        extracted = DocumentExtractor.extract_text_from_bytes(text.encode("utf-8"), "notes.txt")
        assert "Process management and scheduling" in extracted

    def test_extract_docx(self):
        doc = docx.Document()
        doc.add_heading("Computer Architecture", 0)
        doc.add_paragraph("Pipelining increases CPU instruction throughput.")
        table = doc.add_table(rows=1, cols=2)
        table.rows[0].cells[0].text = "Hazard"
        table.rows[0].cells[1].text = "Data Dependency"

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)

        extracted = DocumentExtractor.extract_text_from_bytes(buf.read(), "architecture.docx")
        assert "Computer Architecture" in extracted
        assert "Pipelining increases CPU instruction throughput." in extracted
        assert "Hazard | Data Dependency" in extracted

    def test_extract_pptx(self):
        prs = Presentation()
        blank_slide_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_slide_layout)
        tx_box = slide.shapes.add_textbox(0, 0, 100, 100)
        tf = tx_box.text_frame
        p = tf.paragraphs[0]
        p.text = "Slide 1: Database Normalization"

        buf = io.BytesIO()
        prs.save(buf)
        buf.seek(0)

        extracted = DocumentExtractor.extract_text_from_bytes(buf.read(), "lecture.pptx")
        assert "Slide 1: Database Normalization" in extracted

    def test_unsupported_format_raises_error(self):
        with pytest.raises(DocumentExtractionError):
            DocumentExtractor.extract_text_from_bytes(b"invalid data", "archive.zip")
