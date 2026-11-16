import { SubjectNotebook, NotebookPage, NotebookStickyNote } from '../types';

const STORAGE_KEY = 'examwise_subject_notebooks_v2';

export const notebookService = {
  getNotebooks: (): SubjectNotebook[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback to empty
    }
    return [];
  },

  saveNotebooks: (notebooks: SubjectNotebook[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
  },

  getNotebookById: (id: string): SubjectNotebook | undefined => {
    const list = notebookService.getNotebooks();
    return list.find((n) => n.id === id);
  },

  createNotebook: (data: {
    subjectCode: string;
    subjectTitle: string;
    instructor: string;
    semester?: string;
    colorTheme?: SubjectNotebook['colorTheme'];
    targetGrade?: string;
    targetExamDate?: string;
    description?: string;
    units?: string[];
  }): SubjectNotebook => {
    const notebooks = notebookService.getNotebooks();
    const newNotebook: SubjectNotebook = {
      id: `nb-${Date.now()}`,
      subjectCode: data.subjectCode.toUpperCase().trim(),
      subjectTitle: data.subjectTitle.trim(),
      instructor: data.instructor.trim(),
      semester: (data.semester || '').trim(),
      colorTheme: data.colorTheme || 'navy',
      targetGrade: (data.targetGrade || '').trim(),
      targetExamDate: data.targetExamDate || '',
      description: (data.description || '').trim(),
      units: (data.units || []).map((u) => u.trim()).filter(Boolean),
      pages: [],
      stickyNotes: [],
      progressPercent: 0,
      lastStudiedAt: 'Just created',
    };

    const updated = [newNotebook, ...notebooks];
    notebookService.saveNotebooks(updated);
    return newNotebook;
  },

  updateNotebook: (id: string, updates: Partial<SubjectNotebook>): SubjectNotebook | undefined => {
    const notebooks = notebookService.getNotebooks();
    let updatedTarget: SubjectNotebook | undefined;
    const updatedList = notebooks.map((n) => {
      if (n.id === id) {
        updatedTarget = { ...n, ...updates };
        return updatedTarget;
      }
      return n;
    });
    if (updatedTarget) {
      notebookService.saveNotebooks(updatedList);
    }
    return updatedTarget;
  },

  deleteNotebook: (id: string): void => {
    const notebooks = notebookService.getNotebooks();
    const filtered = notebooks.filter((n) => n.id !== id);
    notebookService.saveNotebooks(filtered);
  },

  addPageToNotebook: (
    notebookId: string,
    pageData: {
      title: string;
      unitOrChapter: string;
      cuePoints: string[];
      mainContent: string;
      summary: string;
      tags: string[];
    }
  ): NotebookPage => {
    const notebooks = notebookService.getNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) throw new Error('Notebook not found');

    const newPage: NotebookPage = {
      id: `page-${Date.now()}`,
      title: pageData.title.trim() || 'Untitled Lecture Notes',
      unitOrChapter: pageData.unitOrChapter.trim() || 'General',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      cuePoints: pageData.cuePoints.filter(Boolean),
      mainContent: pageData.mainContent,
      summary: pageData.summary,
      tags: pageData.tags.filter(Boolean),
    };

    target.pages.push(newPage);
    target.lastStudiedAt = 'Just now';
    target.progressPercent = Math.min(100, target.progressPercent + 10);
    notebookService.saveNotebooks(notebooks);
    return newPage;
  },

  deletePageFromNotebook: (notebookId: string, pageId: string): void => {
    const notebooks = notebookService.getNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) return;
    target.pages = target.pages.filter((p) => p.id !== pageId);
    notebookService.saveNotebooks(notebooks);
  },

  addStickyNote: (notebookId: string, text: string, color: NotebookStickyNote['color']): NotebookStickyNote => {
    const notebooks = notebookService.getNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) throw new Error('Notebook not found');

    const newSticky: NotebookStickyNote = {
      id: `sn-${Date.now()}`,
      text: text.trim(),
      color,
      createdAt: 'Just now',
    };

    target.stickyNotes.unshift(newSticky);
    notebookService.saveNotebooks(notebooks);
    return newSticky;
  },

  deleteStickyNote: (notebookId: string, stickyId: string): void => {
    const notebooks = notebookService.getNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) return;
    target.stickyNotes = target.stickyNotes.filter((s) => s.id !== stickyId);
    notebookService.saveNotebooks(notebooks);
  },

  clearAllNotebooks: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
