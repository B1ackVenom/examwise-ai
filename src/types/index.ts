export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  role: UserRole;
  department: string;
  institution: string;
  roleLabel: string;
  accentColor?: string;
  semester?: string;
  specialization?: string;
  isCustom?: boolean;
}

export interface NotebookPage {
  id: string;
  title: string;
  unitOrChapter: string;
  date: string;
  cuePoints: string[]; // Cornell notes cue column: keywords, formulas, questions
  mainContent: string; // Ruled lines notes content
  summary: string;     // Cornell notes summary at bottom
  tags: string[];
}

export interface NotebookStickyNote {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'cyan' | 'lime' | 'lavender';
  createdAt: string;
}

export interface SubjectNotebook {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  instructor: string;
  semester: string;
  colorTheme: 'navy' | 'emerald' | 'crimson' | 'amethyst' | 'amber' | 'slate' | 'teal';
  targetGrade: string;
  targetExamDate?: string;
  description: string;
  units: string[];
  pages: NotebookPage[];
  stickyNotes: NotebookStickyNote[];
  progressPercent: number;
  lastStudiedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  instructor: string;
  department: string;
  semester: string;
  credits: number;
  modulesCount: number;
  enrolledStudentsCount: number;
  progress: number; // 0 - 100 for student
  academicYear: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  order: number; // 1 to 5
  title: string;
  description: string;
  resourceCount: number;
  learningHours: number;
  status: 'completed' | 'in_progress' | 'not_started';
  keyTopics: string[];
}

export type ResourceFileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'notes';
export type ResourceProcessingStatus = 'ready' | 'processing' | 'indexed';

export interface LearningResource {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  type: ResourceFileType;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  status: ResourceProcessingStatus;
  tags: string[];
  downloadsCount: number;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type BloomsTaxonomy = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate';

export interface ImportantQuestion {
  id: string;
  courseId: string;
  moduleId: string;
  question: string;
  marks: number;
  difficulty: QuestionDifficulty;
  importanceRating: 'Very High' | 'High' | 'Medium';
  frequencyScore: number; // e.g. appeared in 4 previous exams
  bloomsTaxonomy: BloomsTaxonomy;
  sourceResources: string[];
  expectedKeyPoints: string[];
  modelAnswer: string;
  isBookmarked: boolean;
  confidenceLabel?: string;
}

export interface PracticeQuestion {
  id: string;
  paperId: string;
  questionNumber: number;
  questionText: string;
  type: 'mcq' | 'short_answer';
  marks: number;
  options?: string[];
  correctAnswer: string | number; // index or string
  explanation: string;
  userResponse?: string | number;
}

export interface PracticeAttempt {
  id: string;
  paperId: string;
  startedAt: string;
  completedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  answers: Record<string, string | number>;
  topicBreakdown: { topic: string; score: number; total: number }[];
}

export interface PracticePaper {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  difficulty: QuestionDifficulty;
  status: 'available' | 'in_progress' | 'submitted';
  questions: PracticeQuestion[];
  attempts: PracticeAttempt[];
}

export type ExamStatus =
  | 'draft'
  | 'published'
  | 'evaluation_in_progress'
  | 'awaiting_approval'
  | 'completed';

export interface RubricCriterion {
  id: string;
  name: string;
  maxMarks: number;
  partialCreditRule: string;
  description: string;
}

export interface AnswerKey {
  expectedAnswer: string;
  keyConcepts: string[];
  acceptableAlternatives: string[];
  guidanceNotes: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionNumber: number;
  text: string;
  type: 'descriptive' | 'short' | 'analytical';
  maxMarks: number;
  isRequired: boolean;
  answerKey: AnswerKey;
  rubric: RubricCriterion[];
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  code: string;
  date: string;
  durationMinutes: number;
  maxMarks: number;
  passingMarks: number;
  status: ExamStatus;
  submissionsCount: number;
  evaluatedCount: number;
  approvedCount: number;
  selectedModules: number[];
  questions: ExamQuestion[];
  createdAt: string;
}

export type SubmissionStatus =
  | 'pending'
  | 'in_review'
  | 'reviewed'
  | 'approved'
  | 'published';

export interface QuestionEvaluation {
  questionNumber: number;
  maxMarks: number;
  ocrExtractedText: string;
  ocrConfidence: number; // 0 to 100
  isOcrEdited: boolean;
  teacherCorrectedText?: string;
  aiProposedMarks: number;
  aiConfidence: number;
  aiExplanation: string;
  criterionMarks: Record<string, number>;
  teacherFinalMarks: number;
  isOverridden: boolean;
  overrideReason?: string;
  feedbackComments: string;
  isReviewed: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: 'ai_suggested' | 'ocr_corrected' | 'marks_overridden' | 'marked_reviewed' | 'approved' | 'published';
  questionNumber?: number;
  previousValue?: string | number;
  newValue?: string | number;
  reason?: string;
  user: string;
}

export interface ScannedPageThumbnail {
  pageNumber: number;
  label: string;
  detectedQuestionNumbers: number[];
  imageUrl?: string;
}

export interface Submission {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  submittedAt: string;
  pageCount: number;
  avgOcrConfidence: number;
  status: SubmissionStatus;
  reviewerId?: string;
  reviewerName?: string;
  questionsEvaluation: QuestionEvaluation[];
  totalAwardedMarks: number;
  totalMaxMarks: number;
  isTeacherApproved: boolean;
  isPublished: boolean;
  publishedAt?: string;
  auditEvents: AuditEvent[];
  pages: ScannedPageThumbnail[];
}

export interface MarksheetRecord {
  id: string;
  marksheetId: string;
  studentRoll: string;
  studentName: string;
  subjectMarks: {
    subjectCode: string;
    subjectName: string;
    obtained: number;
    max: number;
  }[];
  extractedTotal: number;
  calculatedTotal: number;
  totalMax: number;
  percentage: number;
  arithmeticValid: boolean;
  warnings: string[];
  status: 'extracted' | 'verified' | 'flagged';
  verifiedBy?: string;
}

export interface MarksheetBatch {
  id: string;
  fileName: string;
  examName: string;
  semester: string;
  uploadedAt: string;
  totalRows: number;
  validRows: number;
  flaggedRows: number;
  status: 'ready' | 'processing';
  records: MarksheetRecord[];
}

export interface PublishedStudentResult {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  studentRoll: string;
  studentName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  approvalStatus: 'approved' | 'pending';
  publicationStatus: 'published' | 'draft';
  publishedDate?: string;
  questionScores: { questionNumber: number; awarded: number; max: number }[];
}
