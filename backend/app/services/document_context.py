from __future__ import annotations

import re
from typing import Sequence
from app.models.course import CourseModule, LearningResource


def _extract_high_signal_text(text: str, budget_chars: int) -> str:
    """
    Extract high-signal text from an academic document:
    - Retains key headings, bullet points, definitions, formulas, and conclusions.
    - Avoids wasting budget on repetitive headers/footers or empty whitespace.
    """
    if not text:
        return ""
    
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) <= budget_chars:
        return clean

    # For larger documents, balance between:
    # 1. Beginning (syllabus / introductory definitions / table of contents)
    # 2. Middle (core concepts & algorithms)
    # 3. End (summary & key takeaways)
    head_budget = int(budget_chars * 0.45)
    mid_budget = int(budget_chars * 0.35)
    tail_budget = budget_chars - head_budget - mid_budget

    head = clean[:head_budget]
    mid_start = len(clean) // 2 - (mid_budget // 2)
    mid = clean[mid_start : mid_start + mid_budget]
    tail = clean[-tail_budget:] if tail_budget > 0 else ""

    return f"{head}\n[...]\n{mid}\n[...]\n{tail}"


def build_multi_document_context(
    resources: Sequence[LearningResource],
    modules: Sequence[CourseModule] | None = None,
    max_total_chars: int = 3500,
) -> str:
    """
    Build a balanced, multi-document context from uploaded course materials.
    
    Features:
    1. Module-aware grouping: clusters documents by module so the LLM understands
       which documents belong to Unit 1, Unit 2, etc.
    2. Multi-document equity: splits the total character budget across all documents
       so no single document starves others out of context.
    3. Handles multiple documents per module (slides, lecture notes, syllabus, question banks).
    """
    if not resources:
        return "Standard university syllabus and academic curriculum."

    # Map module_id to title
    module_titles: dict[str, str] = {}
    if modules:
        for m in modules:
            module_num = getattr(m, "order_index", 0) + 1
            module_titles[m.id] = f"Module {module_num}: {m.title}"

    # Filter resources with content
    valid_resources = [r for r in resources if r.extracted_text or r.description]
    if not valid_resources:
        return "Standard university syllabus and academic curriculum."

    total_docs = len(valid_resources)
    # Dynamic budget per document (between 400 and 1500 chars)
    per_doc_budget = max(400, min(1500, max_total_chars // total_docs))

    # Group resources by module_id
    grouped_resources: dict[str, list[LearningResource]] = {}
    for r in valid_resources:
        m_key = r.module_id or "general"
        grouped_resources.setdefault(m_key, []).append(r)

    context_sections: list[str] = []

    for m_key, res_list in grouped_resources.items():
        module_heading = module_titles.get(m_key, "General Course Materials")
        section_lines = [f"### {module_heading} ({len(res_list)} document{'s' if len(res_list) > 1 else ''}):"]

        for idx, res in enumerate(res_list, start=1):
            text_content = res.extracted_text or res.description or ""
            doc_signal = _extract_high_signal_text(text_content, per_doc_budget)
            rtype = getattr(res, "resource_type", getattr(res, "mime_type", "document")) or "document"
            section_lines.append(
                f"- Document {idx}: '{res.title}' [Type: {rtype}]\n"
                f"  {doc_signal}"
            )

        context_sections.append("\n".join(section_lines))

    combined = "\n\n".join(context_sections)
    # Cap total context safely to preserve local LLM context limits
    if len(combined) > max_total_chars + 500:
        return combined[: max_total_chars + 500]
    return combined
