import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { Course, CourseModule } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useRole } from '../../context/RoleContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  Layers,
  Clock,
  FolderArchive,
} from 'lucide-react';

export const CourseModuleManagement: React.FC = () => {
  const { user } = useRole();
  const [courses, setCourses] = useState<Course[]>(() => apiClient.getCourses());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => courses[0] || null);

  // Course Modal state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    code: '',
    title: '',
    description: '',
    instructor: user?.name || '',
    department: user?.department || '',
    semester: '',
    credits: 4,
    academicYear: '',
  });

  // Add Module state
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [newModuleFormData, setNewModuleFormData] = useState({
    title: '',
    description: '',
    learningHours: 10,
    keyTopics: '',
  });

  // Module Edit state
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: '',
    learningHours: 10,
    keyTopics: '',
  });

  // Delete Course state
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const { success, info, error } = useToast();

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModules = selectedCourse ? apiClient.getModules(selectedCourse.id) : [];

  const handleOpenCreateCourse = () => {
    setCourseFormData({
      code: '',
      title: '',
      description: '',
      instructor: user?.name || '',
      department: user?.department || '',
      semester: '',
      credits: 4,
      academicYear: '',
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.code.trim() || !courseFormData.title.trim()) {
      error('Please fill in course code and title.');
      return;
    }

    const created = apiClient.createCourse({
      code: courseFormData.code.trim(),
      title: courseFormData.title.trim(),
      description: courseFormData.description.trim(),
      instructor: courseFormData.instructor.trim() || user?.name || '',
      department: courseFormData.department.trim(),
      semester: courseFormData.semester.trim(),
      credits: Number(courseFormData.credits) || 0,
      academicYear: courseFormData.academicYear.trim(),
    });
    const updated = apiClient.getCourses();
    setCourses(updated);
    setSelectedCourse(created);
    setIsCourseModalOpen(false);
    success(`Course ${created.code} created.`);
  };

  const handleDeleteCourse = () => {
    if (!courseToDelete) return;
    apiClient.deleteCourse(courseToDelete.id);
    const updated = apiClient.getCourses();
    setCourses(updated);
    if (selectedCourse?.id === courseToDelete.id) {
      setSelectedCourse(updated[0] || null);
    }
    setCourseToDelete(null);
    info(`Course ${courseToDelete.code} deleted.`);
  };

  const handleOpenAddModule = () => {
    setNewModuleFormData({
      title: '',
      description: '',
      learningHours: 10,
      keyTopics: '',
    });
    setIsAddModuleModalOpen(true);
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!newModuleFormData.title.trim()) {
      error('Please enter a module title.');
      return;
    }

    apiClient.createModule(selectedCourse.id, {
      title: newModuleFormData.title.trim(),
      description: newModuleFormData.description.trim(),
      learningHours: Number(newModuleFormData.learningHours) || 0,
      keyTopics: newModuleFormData.keyTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    const updatedCourses = apiClient.getCourses();
    setCourses(updatedCourses);
    setSelectedCourse(updatedCourses.find((c) => c.id === selectedCourse.id) || selectedCourse);
    setIsAddModuleModalOpen(false);
    success(`Added module "${newModuleFormData.title.trim()}" to ${selectedCourse.code}.`);
  };

  const handleOpenEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setModuleFormData({
      title: mod.title,
      description: mod.description,
      learningHours: mod.learningHours,
      keyTopics: mod.keyTopics.join(', '),
    });
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    apiClient.updateModule(editingModule.id, {
      title: moduleFormData.title.trim(),
      description: moduleFormData.description.trim(),
      learningHours: Number(moduleFormData.learningHours),
      keyTopics: moduleFormData.keyTopics.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setEditingModule(null);
    success(`Updated Module ${editingModule.order}: ${moduleFormData.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Course & Module Management
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Organize degree curriculum, add syllabus modules, and assign structured learning targets.
          </p>
        </div>

        <button
          onClick={handleOpenCreateCourse}
          className="px-3.5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Main Split Layout: Courses Selector & Module Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course Selector (1 col) */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              aria-label="Search courses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="space-y-2">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((c) => {
                const isSelected = selectedCourse?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourse(c)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                        : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[hsl(var(--accent-text))]">
                          {c.code}
                        </span>
                        {c.semester && (
                          <>
                            <span className="text-[hsl(var(--muted-foreground))] text-xs">·</span>
                            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{c.semester}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[hsl(var(--foreground))] line-clamp-1">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {c.modulesCount} modules · {c.enrolledStudentsCount} students
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(c);
                      }}
                      className="p-1 text-[hsl(var(--muted-foreground))] hover:text-rose-500 transition-colors"
                      title="Delete course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center border border-dashed border-[hsl(var(--border))] rounded-lg space-y-2">
                <BookOpen className="w-6 h-6 mx-auto text-[hsl(var(--muted-foreground))]" />
                <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                  No courses created yet
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Create your first course to organize syllabus modules.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Course Modules (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCourse ? (
            <>
              {/* Course Header Banner */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono font-bold text-[hsl(var(--accent-text))]">
                      {selectedCourse.code}
                    </span>
                    {selectedCourse.department && (
                      <>
                        <span className="text-[hsl(var(--muted-foreground))]">·</span>
                        <span className="text-[hsl(var(--muted-foreground))]">{selectedCourse.department}</span>
                      </>
                    )}
                    {selectedCourse.semester && (
                      <>
                        <span className="text-[hsl(var(--muted-foreground))]">·</span>
                        <span className="text-[hsl(var(--muted-foreground))]">{selectedCourse.semester}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] font-display">
                    {selectedCourse.title}
                  </h2>
                  {selectedCourse.description && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xl">
                      {selectedCourse.description}
                    </p>
                  )}
                </div>

                <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1 shrink-0 text-left sm:text-right">
                  {selectedCourse.instructor && (
                    <div>Instructor: <strong className="text-[hsl(var(--foreground))]">{selectedCourse.instructor}</strong></div>
                  )}
                  <div>Credits: <strong className="text-[hsl(var(--foreground))]">{selectedCourse.credits}</strong></div>
                  {selectedCourse.academicYear && (
                    <div>Academic Year: <strong className="text-[hsl(var(--foreground))]">{selectedCourse.academicYear}</strong></div>
                  )}
                </div>
              </div>

              {/* Modules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[hsl(var(--accent-text))]" />
                    <span>Curriculum Modules ({currentModules.length})</span>
                  </h3>
                  <button
                    onClick={handleOpenAddModule}
                    className="px-3 py-1.5 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/0.8)] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Module</span>
                  </button>
                </div>

                {currentModules.length > 0 ? (
                  currentModules.map((mod) => (
                    <div
                      key={mod.id}
                      className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs space-y-2.5 transition-colors hover:border-[hsl(var(--muted-foreground)/0.4)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center font-mono text-xs font-bold text-[hsl(var(--foreground))]">
                            {mod.order}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">
                              {mod.title}
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEditModule(mod)}
                          className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent-text))] rounded hover:bg-[hsl(var(--secondary))] transition-colors"
                          title="Edit module content"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {mod.description && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed pl-8">
                          {mod.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] pl-8 pt-1">
                        <span className="flex items-center gap-1">
                          <FolderArchive className="w-3.5 h-3.5" /> {mod.resourceCount} files
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {mod.learningHours} hours
                        </span>
                      </div>

                      {mod.keyTopics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-8 pt-1">
                          {mod.keyTopics.map((topic, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-2 py-0.5 rounded-sm"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl space-y-2">
                    <Layers className="w-7 h-7 mx-auto text-[hsl(var(--muted-foreground))]" />
                    <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      No modules added to {selectedCourse.code} yet
                    </div>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Click "Add Module" to structure syllabus units and topics.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {courses.length === 0
                  ? 'Create a course to get started'
                  : 'Select a course to inspect and edit its modules'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Create New Course"
        description="Define course details and syllabus metadata."
      >
        <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={courseFormData.code}
                onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Credits
              </label>
              <input
                type="number"
                value={courseFormData.credits}
                onChange={(e) => setCourseFormData({ ...courseFormData, credits: Number(e.target.value) })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Course Title *
            </label>
            <input
              type="text"
              required
              value={courseFormData.title}
              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Description
            </label>
            <textarea
              rows={3}
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Department
              </label>
              <input
                type="text"
                value={courseFormData.department}
                onChange={(e) => setCourseFormData({ ...courseFormData, department: e.target.value })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Semester
              </label>
              <input
                type="text"
                value={courseFormData.semester}
                onChange={(e) => setCourseFormData({ ...courseFormData, semester: e.target.value })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Instructor
              </label>
              <input
                type="text"
                value={courseFormData.instructor}
                onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Academic Year
              </label>
              <input
                type="text"
                value={courseFormData.academicYear}
                onChange={(e) => setCourseFormData({ ...courseFormData, academicYear: e.target.value })}
                className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] font-medium transition-colors"
            >
              Create Course
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Module Modal */}
      <Modal
        isOpen={isAddModuleModalOpen}
        onClose={() => setIsAddModuleModalOpen(false)}
        title="Add Curriculum Module"
        description={selectedCourse?.code}
      >
        <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Module Title *
            </label>
            <input
              type="text"
              required
              value={newModuleFormData.title}
              onChange={(e) => setNewModuleFormData({ ...newModuleFormData, title: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Syllabus Description
            </label>
            <textarea
              rows={3}
              value={newModuleFormData.description}
              onChange={(e) => setNewModuleFormData({ ...newModuleFormData, description: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Recommended Learning Hours
            </label>
            <input
              type="number"
              value={newModuleFormData.learningHours}
              onChange={(e) => setNewModuleFormData({ ...newModuleFormData, learningHours: Number(e.target.value) })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Key Topics (Comma-separated)
            </label>
            <input
              type="text"
              value={newModuleFormData.keyTopics}
              onChange={(e) => setNewModuleFormData({ ...newModuleFormData, keyTopics: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={() => setIsAddModuleModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] font-medium transition-colors"
            >
              Add Module
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Module Modal */}
      <Modal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        title={`Edit Module ${editingModule?.order}: Curriculum Content`}
        description={selectedCourse?.code}
      >
        <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Module Title *
            </label>
            <input
              type="text"
              required
              value={moduleFormData.title}
              onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Syllabus Description
            </label>
            <textarea
              rows={3}
              value={moduleFormData.description}
              onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Recommended Learning Hours
            </label>
            <input
              type="number"
              value={moduleFormData.learningHours}
              onChange={(e) => setModuleFormData({ ...moduleFormData, learningHours: Number(e.target.value) })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="font-semibold text-[hsl(var(--foreground))]">
              Key Topics (Comma-separated)
            </label>
            <input
              type="text"
              value={moduleFormData.keyTopics}
              onChange={(e) => setModuleFormData({ ...moduleFormData, keyTopics: e.target.value })}
              className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={() => setEditingModule(null)}
              className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] font-medium transition-colors"
            >
              Save Module Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Confirm */}
      <ConfirmDialog
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
        title="Delete Course and Modules"
        message={`Are you sure you want to delete ${courseToDelete?.code} (${courseToDelete?.title}) and all of its associated modules?`}
        confirmLabel="Delete Course"
        variant="danger"
      />
    </div>
  );
};
