import {
  Course,
  CourseModule,
  LearningResource,
  ImportantQuestion,
  PracticePaper,
  PracticeAttempt,
  Exam,
  Submission,
  MarksheetBatch,
  MarksheetRecord,
  PublishedStudentResult,
  QuestionEvaluation,
  AuditEvent,
} from '../types';
import {
  initialCourses,
  initialModules,
  initialResources,
  initialImportantQuestions,
  initialPracticePapers,
  initialExams,
  initialSubmissions,
  initialMarksheetBatches,
  initialPublishedResults,
} from './mockData';

const STORAGE_KEYS = {
  COURSES: 'examwise_courses',
  MODULES: 'examwise_modules',
  RESOURCES: 'examwise_resources',
  QUESTIONS: 'examwise_important_questions',
  PRACTICE_PAPERS: 'examwise_practice_papers',
  EXAMS: 'examwise_exams',
  SUBMISSIONS: 'examwise_submissions',
  MARKSHEET_BATCHES: 'examwise_marksheet_batches',
  PUBLISHED_RESULTS: 'examwise_published_results',
  ACCESS_TOKEN: 'examwise_access_token',
};

function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

class ExamWiseApiClient {
  private baseUrl = '/api/v1';

  // ── Authentication & Token Management ─────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 360000); // 6 min timeout for deep local LLM generation

    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalid
        console.warn('Unauthorized request to', url);
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status} at ${url}:`, errorText);
        return null;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      console.warn(`Network/API error fetching ${url}:`, err);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Auth Endpoints ────────────────────────────────────────────────────────
  async loginApi(email: string, password: string): Promise<{ access_token: string; token_type: string } | null> {
    const res = await this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async signupApi(data: { email: string; password: string; full_name: string; role: string }): Promise<{ access_token: string } | null> {
    const res = await this.request<{ access_token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async getMeApi(): Promise<{ id: string; email: string; full_name: string; role: string } | null> {
    return this.request<{ id: string; email: string; full_name: string; role: string }>('/auth/me');
  }

  async logoutApi(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // ── Dual-Mode Backend Synchronization ─────────────────────────────────────
  async syncFromBackend(): Promise<void> {
    try {
      // 1. Fetch courses
      const backendCourses = await this.request<any[]>('/courses/');
      if (backendCourses && Array.isArray(backendCourses) && backendCourses.length > 0) {
        const mappedCourses: Course[] = backendCourses.map((bc) => ({
          id: bc.id,
          code: bc.code || 'CS-GEN',
          title: bc.title,
          description: bc.description || '',
          instructor: 'Faculty Examiner',
          department: bc.department || 'Computer Science',
          semester: bc.semester || 'Semester VI',
          credits: bc.credits || 3,
          modulesCount: bc.modules?.length || 0,
          enrolledStudentsCount: 42,
          progress: 65,
          academicYear: bc.academic_year || '2025-26',
        }));

        setStoredItem(STORAGE_KEYS.COURSES, mappedCourses);

        // Fetch modules for the first active course
        for (const c of mappedCourses) {
          const backendModules = await this.request<any[]>(`/courses/${c.id}/modules`);
          if (backendModules && Array.isArray(backendModules) && backendModules.length > 0) {
            const mappedModules: CourseModule[] = backendModules.map((bm) => ({
              id: bm.id,
              courseId: bm.course_id,
              order: bm.order_index,
              title: bm.title,
              description: bm.description || '',
              resourceCount: 2,
              learningHours: bm.learning_hours || 10,
              status: (bm.status as any) || 'not_started',
              keyTopics: bm.key_topics_json ? JSON.parse(bm.key_topics_json) : [],
            }));
            const currentModules = this.getModules();
            const filtered = currentModules.filter((m) => m.courseId !== c.id);
            setStoredItem(STORAGE_KEYS.MODULES, [...filtered, ...mappedModules]);
          }
        }
      }

      // 2. Fetch exams
      const firstCourseId = this.getCourses()[0]?.id;
      if (firstCourseId) {
        const backendExams = await this.request<any[]>(`/exams/courses/${firstCourseId}`);
        if (backendExams && Array.isArray(backendExams) && backendExams.length > 0) {
          const mappedExams: Exam[] = backendExams.map((be) => ({
            id: be.id,
            courseId: be.course_id,
            title: be.title,
            code: be.code || 'EX-01',
            date: be.date || new Date().toISOString().split('T')[0],
            durationMinutes: be.duration_minutes,
            maxMarks: be.total_marks,
            passingMarks: be.passing_marks,
            status: be.status as any,
            submissionsCount: be.submissions_count || 0,
            evaluatedCount: be.evaluated_count || 0,
            approvedCount: be.approved_count || 0,
            selectedModules: [1, 2],
            questions: (be.questions || []).map((q: any) => ({
              id: q.id,
              examId: be.id,
              questionNumber: q.question_number,
              text: q.question_text,
              type: 'descriptive' as const,
              maxMarks: q.max_marks,
              isRequired: q.is_compulsory ?? true,
              answerKey: {
                expectedAnswer: q.model_answer || '',
                keyConcepts: q.key_concepts || [],
                acceptableAlternatives: [],
                guidanceNotes: '',
              },
              rubric: (q.rubric_criteria || []).map((r: any) => ({
                id: r.id,
                name: r.criterion,
                maxMarks: r.max_marks,
                partialCreditRule: '',
                description: r.description || '',
              })),
            })),
            createdAt: be.created_at || new Date().toISOString().split('T')[0],
          }));
          setStoredItem(STORAGE_KEYS.EXAMS, mappedExams);
        }
      }

      // 3. Fetch Marksheets & Batches
      const backendBatches = await this.request<any[]>('/marksheets/batches');
      if (backendBatches && Array.isArray(backendBatches) && backendBatches.length > 0) {
        const mappedBatches: MarksheetBatch[] = backendBatches.map((bb) => ({
          id: bb.id,
          fileName: `${bb.title || 'Marksheet_Batch'}.csv`,
          examName: bb.title,
          semester: bb.academic_term || 'Semester VI',
          uploadedAt: bb.created_at || new Date().toLocaleString(),
          totalRows: bb.total_records || 0,
          validRows: bb.verified_records || 0,
          flaggedRows: (bb.total_records || 0) - (bb.verified_records || 0),
          status: bb.status === 'published' ? 'ready' : 'processing',
          records: (bb.records || []).map((br: any) => ({
            id: br.id,
            marksheetId: bb.id,
            studentRoll: br.student_id,
            studentName: 'Student Name',
            subjectMarks: br.breakdown_json ? JSON.parse(br.breakdown_json) : [],
            extractedTotal: br.total_marks || 0,
            calculatedTotal: br.total_marks || 0,
            totalMax: br.max_marks || 100,
            percentage: Math.round(((br.total_marks || 0) / (br.max_marks || 100)) * 100),
            arithmeticValid: br.is_verified,
            warnings: [],
            status: br.is_verified ? 'verified' : 'flagged',
          })),
        }));
        setStoredItem(STORAGE_KEYS.MARKSHEET_BATCHES, mappedBatches);
      }
    } catch (err) {
      console.warn('Sync from backend encountered a non-blocking error:', err);
    }
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  getCourses(): Course[] {
    return getStoredItem<Course[]>(STORAGE_KEYS.COURSES, initialCourses);
  }

  getCourseById(id: string): Course | undefined {
    return this.getCourses().find((c) => c.id === id);
  }

  createCourse(courseData: Omit<Course, 'id' | 'modulesCount' | 'enrolledStudentsCount' | 'progress'>): Course {
    const courses = this.getCourses();
    const newId = `crs-${Date.now().toString(36)}`;
    const newCourse: Course = {
      ...courseData,
      id: newId,
      modulesCount: 0,
      enrolledStudentsCount: 0,
      progress: 0,
    };
    courses.push(newCourse);
    setStoredItem(STORAGE_KEYS.COURSES, courses);

    // Sync to backend asynchronously
    this.request('/courses/', {
      method: 'POST',
      body: JSON.stringify({
        title: courseData.title,
        code: courseData.code,
        description: courseData.description,
        department: courseData.department,
        semester: courseData.semester,
        credits: courseData.credits,
        academic_year: courseData.academicYear,
      }),
    }).catch((err) => console.warn('Background course creation sync failed:', err));

    return newCourse;
  }

  createModule(
    courseId: string,
    moduleData: Omit<CourseModule, 'id' | 'courseId' | 'order' | 'resourceCount' | 'status'>
  ): CourseModule {
    const modules = this.getModules();
    const courseModules = modules.filter((m) => m.courseId === courseId);
    const nextOrder = courseModules.length > 0 ? Math.max(...courseModules.map((m) => m.order)) + 1 : 1;
    const newModule: CourseModule = {
      ...moduleData,
      id: `mod-${courseId}-${Date.now().toString(36)}`,
      courseId,
      order: nextOrder,
      resourceCount: 0,
      status: 'not_started',
    };
    modules.push(newModule);
    setStoredItem(STORAGE_KEYS.MODULES, modules);

    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      course.modulesCount = courseModules.length + 1;
      setStoredItem(STORAGE_KEYS.COURSES, courses);
    }

    // Sync to backend asynchronously
    this.request(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({
        title: moduleData.title,
        description: moduleData.description,
        order_index: nextOrder,
        learning_hours: moduleData.learningHours || 10,
        key_topics: moduleData.keyTopics || [],
      }),
    }).catch((err) => console.warn('Background module creation sync failed:', err));

    return newModule;
  }

  updateCourse(id: string, updates: Partial<Course>): Course | undefined {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    courses[index] = { ...courses[index], ...updates };
    setStoredItem(STORAGE_KEYS.COURSES, courses);

    this.request(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        department: updates.department,
        semester: updates.semester,
        credits: updates.credits,
        academic_year: updates.academicYear,
      }),
    }).catch((err) => console.warn('Background course update sync failed:', err));

    return courses[index];
  }

  deleteCourse(id: string): boolean {
    const courses = this.getCourses().filter((c) => c.id !== id);
    setStoredItem(STORAGE_KEYS.COURSES, courses);
    const modules = this.getModules().filter((m) => m.courseId !== id);
    setStoredItem(STORAGE_KEYS.MODULES, modules);

    this.request(`/courses/${id}`, { method: 'DELETE' }).catch((err) =>
      console.warn('Background course deletion sync failed:', err)
    );

    return true;
  }

  // ── Modules ───────────────────────────────────────────────────────────────
  getModules(courseId?: string): CourseModule[] {
    const modules = getStoredItem<CourseModule[]>(STORAGE_KEYS.MODULES, initialModules);
    if (courseId) {
      return modules.filter((m) => m.courseId === courseId).sort((a, b) => a.order - b.order);
    }
    return modules;
  }

  getModuleById(id: string): CourseModule | undefined {
    return this.getModules().find((m) => m.id === id);
  }

  updateModule(moduleId: string, updates: Partial<CourseModule>): CourseModule | undefined {
    const modules = this.getModules();
    const index = modules.findIndex((m) => m.id === moduleId);
    if (index === -1) return undefined;
    modules[index] = { ...modules[index], ...updates };
    setStoredItem(STORAGE_KEYS.MODULES, modules);
    return modules[index];
  }

  // ── Resources ─────────────────────────────────────────────────────────────
  getResources(filter?: { courseId?: string; moduleId?: string; type?: string; search?: string }): LearningResource[] {
    let resources = getStoredItem<LearningResource[]>(STORAGE_KEYS.RESOURCES, initialResources);
    if (filter?.courseId) {
      resources = resources.filter((r) => r.courseId === filter.courseId);
    }
    if (filter?.moduleId) {
      resources = resources.filter((r) => r.moduleId === filter.moduleId);
    }
    if (filter?.type && filter.type !== 'all') {
      resources = resources.filter((r) => r.type === filter.type);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      resources = resources.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return resources;
  }

  addResource(resourceData: Omit<LearningResource, 'id' | 'uploadedAt' | 'downloadsCount' | 'status'>): LearningResource {
    const resources = this.getResources();
    const newResource: LearningResource = {
      ...resourceData,
      id: `res-${Date.now().toString(36)}`,
      uploadedAt: new Date().toISOString().split('T')[0],
      downloadsCount: 0,
      status: 'ready',
    };
    resources.unshift(newResource);
    setStoredItem(STORAGE_KEYS.RESOURCES, resources);

    const modules = this.getModules();
    const targetModule = modules.find((m) => m.id === resourceData.moduleId);
    if (targetModule) {
      targetModule.resourceCount += 1;
      setStoredItem(STORAGE_KEYS.MODULES, modules);
    }

    return newResource;
  }

  deleteResource(id: string): boolean {
    const resources = this.getResources();
    const target = resources.find((r) => r.id === id);
    const filtered = resources.filter((r) => r.id !== id);
    setStoredItem(STORAGE_KEYS.RESOURCES, filtered);

    if (target) {
      const modules = this.getModules();
      const targetModule = modules.find((m) => m.id === target.moduleId);
      if (targetModule && targetModule.resourceCount > 0) {
        targetModule.resourceCount -= 1;
        setStoredItem(STORAGE_KEYS.MODULES, modules);
      }
    }
    return true;
  }

  // ── Important Questions ───────────────────────────────────────────────────
  getImportantQuestions(filter?: {
    courseId?: string;
    moduleId?: string;
    difficulty?: string;
    search?: string;
    bookmarkedOnly?: boolean;
  }): ImportantQuestion[] {
    let questions = getStoredItem<ImportantQuestion[]>(STORAGE_KEYS.QUESTIONS, initialImportantQuestions);
    if (filter?.courseId && filter.courseId !== 'all') {
      questions = questions.filter((q) => q.courseId === filter.courseId);
    }
    if (filter?.moduleId && filter.moduleId !== 'all') {
      questions = questions.filter((q) => q.moduleId === filter.moduleId);
    }
    if (filter?.difficulty && filter.difficulty !== 'all') {
      questions = questions.filter((q) => q.difficulty === filter.difficulty);
    }
    if (filter?.bookmarkedOnly) {
      questions = questions.filter((q) => q.isBookmarked);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      questions = questions.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.expectedKeyPoints.some((kp) => kp.toLowerCase().includes(q)) ||
          item.modelAnswer.toLowerCase().includes(q)
      );
    }
    return questions;
  }

  toggleBookmarkQuestion(id: string): boolean {
    const questions = this.getImportantQuestions();
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) return false;
    questions[index].isBookmarked = !questions[index].isBookmarked;
    setStoredItem(STORAGE_KEYS.QUESTIONS, questions);
    return questions[index].isBookmarked;
  }

  exportQuestionsCsv(questions: ImportantQuestion[]): string {
    const headers = ['Question ID', 'Course ID', 'Difficulty', 'Marks', 'Frequency', 'Question Text', 'Model Answer'];
    const rows = questions.map((q) => [
      q.id,
      q.courseId,
      q.difficulty,
      q.marks,
      q.frequencyScore,
      `"${q.question.replace(/"/g, '""')}"`,
      `"${q.modelAnswer.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // ── AI Question Prediction ────────────────────────────────────────────────
  async predictQuestionsAI(
    courseId: string,
    moduleId?: string,
    count: number = 3,
    difficulty: string = 'medium',
    focusTopic?: string
  ): Promise<ImportantQuestion[]> {
    const response = await this.request<any[]>('/questions/predict', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        module_id: moduleId,
        count,
        difficulty,
        focus_topic: focusTopic,
      }),
    });

    if (response && Array.isArray(response) && response.length > 0) {
      const mapped: ImportantQuestion[] = response.map((q) => ({
        id: q.id || `iq-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        courseId,
        moduleId: q.module_id || moduleId || 'mod-1',
        question: q.question_text,
        marks: q.marks || 5,
        difficulty: (q.difficulty as any) || 'medium',
        importanceRating: 'Very High',
        frequencyScore: q.frequency || 3,
        bloomsTaxonomy: (q.blooms_level as any) || 'Analyze',
        sourceResources: ['Course Materials & Syllabus'],
        expectedKeyPoints: q.key_points_json ? JSON.parse(q.key_points_json) : [],
        modelAnswer: q.expected_answer || '',
        isBookmarked: false,
        confidenceLabel: 'AI Predicted High Probability',
      }));

      // Merge into local storage
      const existing = this.getImportantQuestions();
      const merged = [...mapped, ...existing];
      setStoredItem(STORAGE_KEYS.QUESTIONS, merged);
      return mapped;
    }

    return [];
  }

  // ── Practice Papers ───────────────────────────────────────────────────────
  getPracticePapers(courseId?: string): PracticePaper[] {
    let papers = getStoredItem<PracticePaper[]>(STORAGE_KEYS.PRACTICE_PAPERS, initialPracticePapers);
    if (courseId) {
      papers = papers.filter((p) => p.courseId === courseId);
    }
    return papers;
  }

  getPracticePaperById(id: string): PracticePaper | undefined {
    return this.getPracticePapers().find((p) => p.id === id);
  }

  // ── AI Practice Paper Generation ──────────────────────────────────────────
  async generatePracticePaperAI(
    courseId: string,
    examType: 'mid_term' | 'end_term',
    title?: string,
    focusModules?: string[]
  ): Promise<PracticePaper | null> {
    const response = await this.request<any>('/practice/generate', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        exam_type: examType,
        title: title || `${examType === 'mid_term' ? 'Mid-Term' : 'End-Term'} AI Generated Practice Paper`,
        focus_modules: focusModules,
      }),
    });

    if (response && response.id) {
      const mappedPaper: PracticePaper = {
        id: response.id,
        courseId: response.course_id,
        title: response.title,
        description: `Comprehensive AI-generated examination (${examType.toUpperCase()}) covering all prescribed modules without MCQs.`,
        durationMinutes: response.duration_minutes || (examType === 'mid_term' ? 60 : 120),
        totalMarks: response.total_marks || (examType === 'mid_term' ? 25 : 50),
        questionCount: response.questions?.length || 0,
        difficulty: 'medium',
        status: 'available',
        questions: (response.questions || []).map((q: any) => ({
          id: q.id,
          paperId: response.id,
          questionNumber: q.question_number,
          questionText: q.question_text,
          type: 'short_answer',
          marks: q.marks,
          correctAnswer: q.model_answer || '',
          explanation: q.explanation || '',
        })),
        attempts: [],
      };

      const papers = this.getPracticePapers();
      papers.unshift(mappedPaper);
      setStoredItem(STORAGE_KEYS.PRACTICE_PAPERS, papers);
      return mappedPaper;
    }

    return null;
  }

  submitPracticeAttempt(paperId: string, answers: Record<string, string | number>): PracticeAttempt | undefined {
    const papers = this.getPracticePapers();
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return undefined;

    let score = 0;
    const totalMarks = paper.totalMarks;

    paper.questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (q.type === 'mcq') {
        if (Number(userAnswer) === Number(q.correctAnswer)) {
          score += q.marks;
        }
      } else {
        if (
          typeof userAnswer === 'string' &&
          userAnswer.trim().length > 0 &&
          String(q.correctAnswer).trim().toLowerCase() === userAnswer.trim().toLowerCase()
        ) {
          score += q.marks;
        }
      }
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const newAttempt: PracticeAttempt = {
      id: `att-${Date.now().toString(36)}`,
      paperId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: Math.round(score * 10) / 10,
      totalMarks,
      percentage,
      answers,
      topicBreakdown: paper.questions.map((q) => ({
        topic: `Question ${q.questionNumber}`,
        score:
          q.type === 'mcq' && Number(answers[q.id]) === Number(q.correctAnswer)
            ? q.marks
            : 0,
        total: q.marks,
      })),
    };

    paper.attempts.unshift(newAttempt);
    paper.status = 'submitted';
    setStoredItem(STORAGE_KEYS.PRACTICE_PAPERS, papers);

    // Sync attempt to backend
    this.request(`/practice/papers/${paperId}/attempts`, {
      method: 'POST',
      body: JSON.stringify({
        answers: Object.entries(answers).map(([qId, ans]) => ({
          question_id: qId,
          student_answer: String(ans),
        })),
      }),
    }).catch((err) => console.warn('Background practice attempt sync failed:', err));

    return newAttempt;
  }

  // ── Exams ─────────────────────────────────────────────────────────────────
  getExams(courseId?: string): Exam[] {
    let exams = getStoredItem<Exam[]>(STORAGE_KEYS.EXAMS, initialExams);
    if (courseId) {
      exams = exams.filter((e) => e.courseId === courseId);
    }
    return exams;
  }

  getExamById(id: string): Exam | undefined {
    return this.getExams().find((e) => e.id === id);
  }

  createExam(examData: Omit<Exam, 'id' | 'submissionsCount' | 'evaluatedCount' | 'approvedCount' | 'createdAt'>): Exam {
    const exams = this.getExams();
    const newExam: Exam = {
      ...examData,
      id: `exam-${Date.now().toString(36)}`,
      submissionsCount: 0,
      evaluatedCount: 0,
      approvedCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    exams.unshift(newExam);
    setStoredItem(STORAGE_KEYS.EXAMS, exams);

    // Sync to backend asynchronously
    this.request('/exams/', {
      method: 'POST',
      body: JSON.stringify({
        course_id: examData.courseId,
        title: examData.title,
        exam_type: examData.maxMarks <= 25 ? 'mid_term' : 'end_term',
        duration_minutes: examData.durationMinutes,
        total_marks: examData.maxMarks,
        passing_marks: examData.passingMarks,
        questions: (examData.questions || []).map((q) => ({
          question_number: q.questionNumber,
          question_text: q.text,
          max_marks: q.maxMarks,
          is_compulsory: q.isRequired,
          model_answer: q.answerKey.expectedAnswer,
          key_concepts: q.answerKey.keyConcepts,
          rubric_criteria: (q.rubric || []).map((r, idx) => ({
            criterion: r.name,
            max_marks: r.maxMarks,
            description: r.description,
            order_index: idx + 1,
          })),
        })),
      }),
    }).catch((err) => console.warn('Background exam creation sync failed:', err));

    return newExam;
  }

  updateExam(id: string, updates: Partial<Exam>): Exam | undefined {
    const exams = this.getExams();
    const index = exams.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    exams[index] = { ...exams[index], ...updates };
    setStoredItem(STORAGE_KEYS.EXAMS, exams);
    return exams[index];
  }

  deleteExam(id: string): boolean {
    const exams = this.getExams().filter((e) => e.id !== id);
    setStoredItem(STORAGE_KEYS.EXAMS, exams);
    return true;
  }

  // ── Evaluation Submissions ────────────────────────────────────────────────
  getSubmissions(examId?: string): Submission[] {
    let submissions = getStoredItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, initialSubmissions);
    if (examId) {
      submissions = submissions.filter((s) => s.examId === examId);
    }
    return submissions;
  }

  getSubmissionById(id: string): Submission | undefined {
    return this.getSubmissions().find((s) => s.id === id);
  }

  // ── AI Evaluation Trigger ─────────────────────────────────────────────────
  async evaluateSubmissionAI(submissionId: string): Promise<Submission | null> {
    const response = await this.request<any>(`/evaluation/submissions/${submissionId}/evaluate-ai`, {
      method: 'POST',
    });

    if (response) {
      const sub = this.getSubmissionById(submissionId);
      if (sub && response.evaluations) {
        sub.questionsEvaluation = response.evaluations.map((ev: any, idx: number) => ({
          questionNumber: idx + 1,
          maxMarks: 10,
          ocrExtractedText: ev.student_answer || '',
          ocrConfidence: 95,
          isOcrEdited: false,
          aiProposedMarks: ev.ai_proposed_marks,
          aiConfidence: 92,
          aiExplanation: ev.ai_explanation || '',
          criterionMarks: {},
          teacherFinalMarks: ev.ai_proposed_marks,
          isOverridden: false,
          feedbackComments: '',
          isReviewed: false,
        }));
        sub.totalAwardedMarks = response.total_score || sub.totalAwardedMarks;
        sub.status = 'reviewed';
        const allSubs = this.getSubmissions();
        const sIdx = allSubs.findIndex((s) => s.id === submissionId);
        if (sIdx !== -1) {
          allSubs[sIdx] = sub;
          setStoredItem(STORAGE_KEYS.SUBMISSIONS, allSubs);
        }
        return sub;
      }
    }
    return null;
  }

  updateQuestionEvaluation(
    submissionId: string,
    questionNumber: number,
    patch: Partial<QuestionEvaluation>
  ): Submission | undefined {
    const submissions = this.getSubmissions();
    const subIndex = submissions.findIndex((s) => s.id === submissionId);
    if (subIndex === -1) return undefined;

    const sub = submissions[subIndex];
    const qIndex = sub.questionsEvaluation.findIndex((q) => q.questionNumber === questionNumber);
    if (qIndex === -1) return undefined;

    const prevQ = sub.questionsEvaluation[qIndex];
    const updatedQ = { ...prevQ, ...patch };
    sub.questionsEvaluation[qIndex] = updatedQ;

    sub.totalAwardedMarks = sub.questionsEvaluation.reduce(
      (sum, q) => sum + (q.teacherFinalMarks !== undefined ? q.teacherFinalMarks : q.aiProposedMarks),
      0
    );

    if (sub.status === 'pending') {
      sub.status = 'in_review';
    }

    submissions[subIndex] = sub;
    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);
    return sub;
  }

  overrideMarks(
    submissionId: string,
    questionNumber: number,
    newMarks: number,
    overrideReason: string,
    teacherName: string
  ): Submission | undefined {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;

    const q = sub.questionsEvaluation.find((item) => item.questionNumber === questionNumber);
    if (!q) return undefined;

    const oldMarks = q.teacherFinalMarks;
    q.teacherFinalMarks = newMarks;
    q.isOverridden = true;
    q.overrideReason = overrideReason;

    const auditEvent: AuditEvent = {
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString(),
      action: 'marks_overridden',
      questionNumber,
      previousValue: `${oldMarks} marks`,
      newValue: `${newMarks} marks`,
      reason: overrideReason,
      user: teacherName,
    };
    sub.auditEvents.push(auditEvent);

    sub.totalAwardedMarks = sub.questionsEvaluation.reduce((sum, item) => sum + item.teacherFinalMarks, 0);
    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);

    // Sync override to backend
    this.request(`/evaluation/submissions/${submissionId}/questions/${questionNumber}/override`, {
      method: 'PATCH',
      body: JSON.stringify({
        teacher_marks: newMarks,
        teacher_comment: overrideReason,
      }),
    }).catch((err) => console.warn('Background marks override sync failed:', err));

    return sub;
  }

  updateOcrText(
    submissionId: string,
    questionNumber: number,
    correctedText: string,
    teacherName: string
  ): Submission | undefined {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;

    const q = sub.questionsEvaluation.find((item) => item.questionNumber === questionNumber);
    if (!q) return undefined;

    q.teacherCorrectedText = correctedText;
    q.isOcrEdited = true;

    sub.auditEvents.push({
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString(),
      action: 'ocr_corrected',
      questionNumber,
      reason: 'Manual OCR correction entered by instructor',
      user: teacherName,
    });

    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);
    return sub;
  }

  markQuestionReviewed(submissionId: string, questionNumber: number, teacherName: string): Submission | undefined {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;

    const q = sub.questionsEvaluation.find((item) => item.questionNumber === questionNumber);
    if (!q) return undefined;

    q.isReviewed = true;
    sub.auditEvents.push({
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString(),
      action: 'marked_reviewed',
      questionNumber,
      user: teacherName,
    });

    if (sub.questionsEvaluation.every((item) => item.isReviewed)) {
      sub.status = 'reviewed';
    }

    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);
    return sub;
  }

  approveSubmission(submissionId: string, reviewerName: string): Submission | undefined {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;

    sub.isTeacherApproved = true;
    sub.status = 'approved';
    sub.reviewerName = reviewerName;

    sub.auditEvents.push({
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString(),
      action: 'approved',
      reason: `Final marks confirmed by ${reviewerName} at ${sub.totalAwardedMarks}/${sub.totalMaxMarks}`,
      user: reviewerName,
    });

    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);

    // Sync to published results table as approved draft
    const publishedResults = this.getPublishedResults();
    const existing = publishedResults.find((r) => r.studentRoll === sub.studentRoll && r.examId === sub.examId);
    const percentage = Math.round((sub.totalAwardedMarks / sub.totalMaxMarks) * 100);
    const grade =
      percentage >= 90 ? 'O (Outstanding)' : percentage >= 80 ? 'A+ (Excellent)' : percentage >= 70 ? 'A (Very Good)' : 'B+ (Good)';

    if (existing) {
      existing.totalMarks = sub.totalAwardedMarks;
      existing.percentage = percentage;
      existing.approvalStatus = 'approved';
      existing.grade = grade;
    } else {
      publishedResults.push({
        id: `res-${sub.id}`,
        examId: sub.examId,
        examTitle: sub.examTitle,
        courseCode: sub.courseCode,
        studentRoll: sub.studentRoll,
        studentName: sub.studentName,
        totalMarks: sub.totalAwardedMarks,
        maxMarks: sub.totalMaxMarks,
        percentage,
        grade,
        approvalStatus: 'approved',
        publicationStatus: 'draft',
        questionScores: sub.questionsEvaluation.map((q) => ({
          questionNumber: q.questionNumber,
          awarded: q.teacherFinalMarks,
          max: q.maxMarks,
        })),
      });
    }
    setStoredItem(STORAGE_KEYS.PUBLISHED_RESULTS, publishedResults);

    // Sync to backend
    this.request(`/evaluation/submissions/${submissionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer_name: reviewerName }),
    }).catch((err) => console.warn('Background submission approval sync failed:', err));

    return sub;
  }

  publishSubmission(submissionId: string): Submission | undefined {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;

    sub.isPublished = true;
    sub.status = 'published';
    sub.publishedAt = new Date().toLocaleString();

    sub.auditEvents.push({
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString(),
      action: 'published',
      reason: 'Result released to student portal',
      user: sub.reviewerName || 'Chief Examiner',
    });

    setStoredItem(STORAGE_KEYS.SUBMISSIONS, submissions);

    const publishedResults = this.getPublishedResults();
    const res = publishedResults.find((r) => r.studentRoll === sub.studentRoll && r.examId === sub.examId);
    if (res) {
      res.publicationStatus = 'published';
      res.publishedDate = new Date().toISOString().split('T')[0];
      setStoredItem(STORAGE_KEYS.PUBLISHED_RESULTS, publishedResults);
    }

    // Sync to backend
    this.request(`/evaluation/submissions/${submissionId}/publish`, {
      method: 'POST',
    }).catch((err) => console.warn('Background submission publish sync failed:', err));

    return sub;
  }

  // ── Marksheet Verification ────────────────────────────────────────────────
  getMarksheetBatches(): MarksheetBatch[] {
    return getStoredItem<MarksheetBatch[]>(STORAGE_KEYS.MARKSHEET_BATCHES, initialMarksheetBatches);
  }

  getMarksheetBatchById(id: string): MarksheetBatch | undefined {
    return this.getMarksheetBatches().find((b) => b.id === id);
  }

  uploadMarksheetBatch(fileName: string, examName: string, semester: string): MarksheetBatch {
    const batches = this.getMarksheetBatches();
    const newBatchId = `mb-${Date.now().toString(36)}`;
    const newBatch: MarksheetBatch = {
      id: newBatchId,
      fileName,
      examName,
      semester,
      uploadedAt: new Date().toLocaleString(),
      totalRows: 0,
      validRows: 0,
      flaggedRows: 0,
      status: 'processing',
      records: [],
    };

    batches.unshift(newBatch);
    setStoredItem(STORAGE_KEYS.MARKSHEET_BATCHES, batches);
    return newBatch;
  }

  updateMarksheetRecord(
    batchId: string,
    recordId: string,
    subjectIndex: number,
    newObtainedMarks: number
  ): MarksheetRecord | undefined {
    const batches = this.getMarksheetBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return undefined;

    const record = batch.records.find((r) => r.id === recordId);
    if (!record) return undefined;

    if (record.subjectMarks[subjectIndex]) {
      record.subjectMarks[subjectIndex].obtained = newObtainedMarks;
    }

    const calculated = record.subjectMarks.reduce((sum, s) => sum + s.obtained, 0);
    record.calculatedTotal = calculated;
    record.arithmeticValid = record.extractedTotal === calculated;

    if (record.arithmeticValid) {
      record.warnings = [];
      record.status = 'verified';
    } else {
      record.warnings = [
        `Arithmetic Mismatch: Sum of individual marks (${calculated}) does not match extracted total (${record.extractedTotal}). Discrepancy: ${calculated - record.extractedTotal > 0 ? '+' : ''}${calculated - record.extractedTotal}.`,
      ];
      record.status = 'flagged';
    }

    record.percentage = Math.round((calculated / record.totalMax) * 1000) / 10;

    batch.flaggedRows = batch.records.filter((r) => !r.arithmeticValid).length;
    batch.validRows = batch.records.length - batch.flaggedRows;

    setStoredItem(STORAGE_KEYS.MARKSHEET_BATCHES, batches);

    // Sync to backend
    this.request(`/marksheets/batches/${batchId}/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        total_marks: calculated,
        is_verified: record.arithmeticValid,
      }),
    }).catch((err) => console.warn('Background marksheet record update sync failed:', err));

    return record;
  }

  updateExtractedTotal(batchId: string, recordId: string, newTotal: number): MarksheetRecord | undefined {
    const batches = this.getMarksheetBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return undefined;

    const record = batch.records.find((r) => r.id === recordId);
    if (!record) return undefined;

    record.extractedTotal = newTotal;
    record.arithmeticValid = record.extractedTotal === record.calculatedTotal;

    if (record.arithmeticValid) {
      record.warnings = [];
      record.status = 'verified';
    } else {
      record.warnings = [
        `Arithmetic Mismatch: Sum of subject marks (${record.calculatedTotal}) ≠ extracted total (${newTotal}).`,
      ];
      record.status = 'flagged';
    }

    batch.flaggedRows = batch.records.filter((r) => !r.arithmeticValid).length;
    batch.validRows = batch.records.length - batch.flaggedRows;

    setStoredItem(STORAGE_KEYS.MARKSHEET_BATCHES, batches);
    return record;
  }

  verifyMarksheetRecord(batchId: string, recordId: string, reviewerName: string): MarksheetRecord | undefined {
    const batches = this.getMarksheetBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return undefined;

    const record = batch.records.find((r) => r.id === recordId);
    if (!record) return undefined;

    record.status = 'verified';
    record.verifiedBy = reviewerName;

    setStoredItem(STORAGE_KEYS.MARKSHEET_BATCHES, batches);
    return record;
  }

  exportMarksheetCsv(batchId: string): string {
    const batch = this.getMarksheetBatchById(batchId);
    if (!batch) return '';

    const headers = ['Roll Number', 'Student Name', 'Extracted Total', 'Calculated Total', 'Percentage', 'Arithmetic Status', 'Verified By'];
    const rows = batch.records.map((r) => [
      r.studentRoll,
      `"${r.studentName}"`,
      r.extractedTotal,
      r.calculatedTotal,
      `${r.percentage}%`,
      r.arithmeticValid ? 'VALID' : 'MISMATCH_FLAGGED',
      r.verifiedBy ? `"${r.verifiedBy}"` : 'Pending',
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  // ── Published Results & Reports ───────────────────────────────────────────
  getPublishedResults(examId?: string): PublishedStudentResult[] {
    let results = getStoredItem<PublishedStudentResult[]>(STORAGE_KEYS.PUBLISHED_RESULTS, initialPublishedResults);
    if (examId) {
      results = results.filter((r) => r.examId === examId);
    }
    return results;
  }

  publishResult(resultId: string): PublishedStudentResult | undefined {
    const results = this.getPublishedResults();
    const res = results.find((r) => r.id === resultId);
    if (!res) return undefined;

    res.publicationStatus = 'published';
    res.publishedDate = new Date().toISOString().split('T')[0];
    setStoredItem(STORAGE_KEYS.PUBLISHED_RESULTS, results);
    return res;
  }

  exportResultsCsv(results: PublishedStudentResult[]): string {
    const headers = ['Student Roll', 'Student Name', 'Course', 'Exam Title', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'Approval Status', 'Publication Status', 'Date'];
    const rows = results.map((r) => [
      r.studentRoll,
      `"${r.studentName}"`,
      r.courseCode,
      `"${r.examTitle}"`,
      r.totalMarks,
      r.maxMarks,
      `${r.percentage}%`,
      r.grade,
      r.approvalStatus,
      r.publicationStatus,
      r.publishedDate || 'Unpublished',
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  // ── Immutable Audit Trail ─────────────────────────────────────────────────
  async fetchBackendAuditLogs(examId?: string, submissionId?: string): Promise<AuditEvent[]> {
    const query = new URLSearchParams();
    if (examId) query.set('exam_id', examId);
    if (submissionId) query.set('submission_id', submissionId);

    const logs = await this.request<any[]>(`/audit/?${query.toString()}`);
    if (logs && Array.isArray(logs)) {
      return logs.map((l) => ({
        id: l.id,
        timestamp: l.created_at || new Date().toLocaleString(),
        action: l.action as any,
        questionNumber: l.question_number,
        previousValue: l.previous_value,
        newValue: l.new_value,
        reason: l.reason,
        user: l.actor_id || 'System Auditor',
      }));
    }
    return [];
  }

  clearLocalData(): void {
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.removeItem(STORAGE_KEYS.MODULES);
    localStorage.removeItem(STORAGE_KEYS.RESOURCES);
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.PRACTICE_PAPERS);
    localStorage.removeItem(STORAGE_KEYS.EXAMS);
    localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.MARKSHEET_BATCHES);
    localStorage.removeItem(STORAGE_KEYS.PUBLISHED_RESULTS);
    this.clearToken();
  }
}

export const apiClient = new ExamWiseApiClient();
