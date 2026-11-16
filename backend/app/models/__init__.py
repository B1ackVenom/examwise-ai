# Import all models here so Alembic can discover them.
from app.models.base import Base  # noqa: F401
from app.models.user import User, RefreshToken  # noqa: F401
from app.models.notebook import SubjectNotebook, NotebookPage, NotebookStickyNote  # noqa: F401
from app.models.course import Course, CourseEnrollment, CourseModule, LearningResource  # noqa: F401
from app.models.question import ImportantQuestion, StudentQuestionBookmark  # noqa: F401
from app.models.practice import PracticePaper, PracticeQuestion, PracticeAttempt  # noqa: F401
from app.models.exam import Exam, ExamQuestion, RubricCriteria  # noqa: F401
from app.models.submission import Submission, QuestionEvaluation  # noqa: F401
from app.models.audit import AuditEvent  # noqa: F401
from app.models.marksheet import MarksheetBatch, MarksheetRecord, PublishedResult  # noqa: F401
from app.models.ai_config import AIProviderConfig, AITaskRoutingOverride  # noqa: F401
