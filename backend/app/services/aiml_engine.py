from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, List, Set, Tuple


# ── Stopwords for Academic Text ──────────────────────────────────────────────
_ACADEMIC_STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "will", "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

# ── Bloom's Taxonomy Cognitive Action Verb Lexicon ────────────────────────────
_BLOOMS_VERB_MAP: dict[str, str] = {
    # Level 1: Remember
    "define": "Remember", "list": "Remember", "state": "Remember", "name": "Remember",
    "recall": "Remember", "identify": "Remember", "label": "Remember", "match": "Remember",
    "recite": "Remember", "reproduce": "Remember",
    # Level 2: Understand
    "explain": "Understand", "describe": "Understand", "summarize": "Understand",
    "classify": "Understand", "discuss": "Understand", "paraphrase": "Understand",
    "illustrate": "Understand", "indicate": "Understand", "clarify": "Understand",
    # Level 3: Apply
    "apply": "Apply", "calculate": "Apply", "solve": "Apply", "demonstrate": "Apply",
    "implement": "Apply", "execute": "Apply", "compute": "Apply", "operate": "Apply",
    "modify": "Apply", "use": "Apply", "derive": "Apply",
    # Level 4: Analyze
    "analyze": "Analyze", "compare": "Analyze", "contrast": "Analyze", "differentiate": "Analyze",
    "distinguish": "Analyze", "examine": "Analyze", "categorize": "Analyze", "deconstruct": "Analyze",
    "investigate": "Analyze", "deduce": "Analyze",
    # Level 5: Evaluate
    "evaluate": "Evaluate", "justify": "Evaluate", "critique": "Evaluate", "appraise": "Evaluate",
    "judge": "Evaluate", "assess": "Evaluate", "defend": "Evaluate", "validate": "Evaluate",
    "verify": "Evaluate", "prioritize": "Evaluate",
    # Level 6: Create
    "design": "Create", "develop": "Create", "construct": "Create", "formulate": "Create",
    "synthesize": "Create", "propose": "Create", "architect": "Create", "generate": "Create",
}


def _stem_word(word: str) -> str:
    """Lightweight academic morphological root stemmer."""
    w = word.lower()
    w = re.sub(r"(ing|tion|tions|ed|es|s|ly|ment|al|ive|ity|ous)$", "", w)
    return w if len(w) >= 3 else word.lower()


def _extract_features(text: str) -> list[str]:
    raw_words = [w for w in re.sub(r"[^\w\s]", " ", text.lower()).split() if len(w) > 1]
    filtered = [w for w in raw_words if w not in _ACADEMIC_STOPWORDS]
    stems = [_stem_word(w) for w in filtered]

    # Character trigrams for root/subword robustness across morphological variations
    subwords = []
    for w in filtered:
        if len(w) >= 3:
            subwords.extend([w[i : i + 3] for i in range(len(w) - 2)])

    return stems + subwords


def compute_vector_cosine_similarity(text_a: str, text_b: str) -> float:
    """
    Computes mathematical Cosine Similarity between two texts in sublinear TF-IDF vector space.
    Cosine Similarity = (A . B) / (||A|| * ||B||)
    """
    fa = _extract_features(text_a)
    fb = _extract_features(text_b)
    if not fa or not fb:
        return 0.0

    ca = Counter(fa)
    cb = Counter(fb)

    # Sublinear TF scaling: 1 + ln(tf)
    tf_a = {k: 1.0 + math.log(v) for k, v in ca.items()}
    tf_b = {k: 1.0 + math.log(v) for k, v in cb.items()}

    all_terms = set(tf_a.keys()).union(set(tf_b.keys()))

    dot_product = sum(tf_a.get(term, 0.0) * tf_b.get(term, 0.0) for term in all_terms)
    norm_a = math.sqrt(sum(val * val for val in tf_a.values()))
    norm_b = math.sqrt(sum(val * val for val in tf_b.values()))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    similarity = dot_product / (norm_a * norm_b)
    return round(max(0.0, min(1.0, similarity)), 4)


def compute_concept_recall(student_text: str, key_concepts: list[str]) -> Tuple[float, list[str], list[str]]:
    """
    Computes exact Concept Coverage Recall against expected rubric key points.
    Returns: (recall_percentage, matched_concepts, missing_concepts)
    """
    if not key_concepts:
        return 1.0, [], []

    student_lower = student_text.lower()
    matched = []
    missing = []

    for concept in key_concepts:
        concept_clean = concept.strip()
        if not concept_clean:
            continue
        concept_terms = [_stem_word(w) for w in re.sub(r"[^\w\s]", " ", concept_clean.lower()).split() if len(w) > 2 and w not in _ACADEMIC_STOPWORDS]
        if not concept_terms:
            matched.append(concept_clean)
            continue

        # Check full string or term overlaps
        if concept_clean.lower() in student_lower:
            matched.append(concept_clean)
        else:
            match_count = sum(1 for term in concept_terms if term in student_lower)
            if match_count >= max(1, math.ceil(len(concept_terms) * 0.5)):
                matched.append(concept_clean)
            else:
                missing.append(concept_clean)

    recall = len(matched) / len(key_concepts) if key_concepts else 1.0
    return round(recall, 4), matched, missing


def compute_hybrid_evaluation_score(
    max_marks: float,
    ai_proposed_marks: float,
    student_text: str,
    model_answer: str,
    key_concepts: list[str],
) -> dict[str, Any]:
    """
    Dual-Engine Hybrid Grading:
    Combines mathematical Cosine Similarity + Concept Recall Matrix + LLM proposed score.
    """
    cos_sim = compute_vector_cosine_similarity(student_text, model_answer)
    concept_recall, matched, missing = compute_concept_recall(student_text, key_concepts)

    # Deterministic NLP Score (out of max_marks)
    # 50% Cosine Similarity + 50% Concept Recall
    deterministic_factor = (cos_sim * 0.5) + (concept_recall * 0.5)
    deterministic_marks = round(deterministic_factor * max_marks, 2)

    # Hybrid blending: 40% Deterministic NLP + 60% LLM Rubric Evaluation
    blended_marks = round((0.40 * deterministic_marks) + (0.60 * ai_proposed_marks), 2)
    bounded_marks = max(0.0, min(float(max_marks), blended_marks))

    return {
        "max_marks": max_marks,
        "llm_proposed_marks": ai_proposed_marks,
        "cosine_similarity": cos_sim,
        "concept_recall": concept_recall,
        "matched_concepts": matched,
        "missing_concepts": missing,
        "deterministic_nlp_marks": deterministic_marks,
        "recommended_hybrid_marks": bounded_marks,
        "confidence_index": round((cos_sim * 0.6) + (concept_recall * 0.4), 2),
    }


def classify_blooms_taxonomy(question_text: str) -> dict[str, Any]:
    """
    Classifies examination questions into revised Bloom's Taxonomy cognitive levels.
    """
    tokens = [w.lower() for w in re.sub(r"[^\w\s]", " ", question_text).split() if w]
    detected_levels = []

    for word in tokens:
        if word in _BLOOMS_VERB_MAP:
            detected_levels.append(_BLOOMS_VERB_MAP[word])

    # If first word or modal matches, weight heavily
    first_few = tokens[:3]
    for word in first_few:
        if word in _BLOOMS_VERB_MAP:
            detected_levels.insert(0, _BLOOMS_VERB_MAP[word])

    difficulty_weights = {
        "Remember": 1,
        "Understand": 2,
        "Apply": 3,
        "Analyze": 4,
        "Evaluate": 5,
        "Create": 6,
    }

    # Select highest cognitive level among detected verbs to accurately capture peak rigor
    primary_level = max(detected_levels, key=lambda lvl: difficulty_weights.get(lvl, 2)) if detected_levels else "Understand"

    cognitive_depth = difficulty_weights.get(primary_level, 2)
    is_hots = cognitive_depth >= 4  # Higher-Order Thinking Skills

    return {
        "blooms_level": primary_level,
        "cognitive_depth_score": cognitive_depth,
        "is_higher_order_thinking": is_hots,
        "classification_category": "HOTS (Higher-Order)" if is_hots else "LOTS (Lower-Order)",
    }


@dataclass
class StudentFeatureVector:
    practice_attempts_count: int
    practice_average_percentage: float
    weak_topics_count: int
    study_notebook_pages: int
    completion_velocity_ratio: float = 1.0  # < 1.0 = fast, 1.0 = nominal, > 1.2 = slow


def predict_student_performance(features: StudentFeatureVector) -> dict[str, Any]:
    """
    Supervised predictive performance forecaster & at-risk classifier.
    Predicts expected End-Term exam score and assigns student to actionable risk tiers.
    """
    w_practice = 0.65
    w_weakness = -0.15
    w_velocity = -0.05
    w_engagement = 0.15

    norm_practice = features.practice_average_percentage / 100.0
    norm_weakness = min(1.0, features.weak_topics_count / 5.0)
    norm_velocity = max(0.0, min(1.0, (features.completion_velocity_ratio - 0.5) / 1.0))
    norm_engagement = min(1.0, features.study_notebook_pages / 10.0)

    score_factor = (
        (w_practice * norm_practice)
        + (w_weakness * norm_weakness)
        + (w_velocity * norm_velocity)
        + (w_engagement * norm_engagement)
        + 0.20
    )

    predicted_percentage = max(15.0, min(98.0, round(score_factor * 100, 1)))

    if predicted_percentage < 45.0:
        risk_tier = "HIGH_RISK"
        risk_label = "High Risk of Academic Probation"
        badge_color = "#ef4444"
        intervention = "Immediate 1-on-1 tutoring on foundational units required. Re-take practice tests."
    elif predicted_percentage < 70.0:
        risk_tier = "MODERATE_RISK"
        risk_label = "Moderate Risk — Targeted Revision Needed"
        badge_color = "#f59e0b"
        intervention = "Focus revision on identified weak modules and review Cornell summary cues."
    else:
        risk_tier = "EXAM_READY"
        risk_label = "Exam Ready (Target: Distinction / Grade O)"
        badge_color = "#10b981"
        intervention = "Maintain active recall rhythm and simulate full 120-minute timed mock exams."

    return {
        "predicted_percentage": predicted_percentage,
        "predicted_endterm_score_50m": round((predicted_percentage / 100.0) * 50, 1),
        "predicted_midterm_score_25m": round((predicted_percentage / 100.0) * 25, 1),
        "risk_tier": risk_tier,
        "risk_label": risk_label,
        "badge_color": badge_color,
        "intervention_plan": intervention,
        "confidence_interval": f"{max(0, predicted_percentage - 5):.1f}% - {min(100, predicted_percentage + 5):.1f}%",
    }
