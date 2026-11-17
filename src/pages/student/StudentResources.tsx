import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useRole } from '../../context/RoleContext';
import { LearningResource, ResourceFileType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  UploadCloud,
  Search,
  Download,
  Trash2,
  File,
} from 'lucide-react';

export const StudentResources: React.FC = () => {
  const { user } = useRole();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || 'all';
  const initialModuleId = searchParams.get('moduleId') || 'all';

  const [courses] = useState(() => apiClient.getCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<LearningResource[]>(() => apiClient.getResources());
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<LearningResource | null>(null);

  const { success, info } = useToast();

  const availableModules = useMemo(() => {
    if (selectedCourseId === 'all') return [];
    return apiClient.getModules(selectedCourseId);
  }, [selectedCourseId]);

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchCourse = selectedCourseId === 'all' || res.courseId === selectedCourseId;
      const matchModule = selectedModuleId === 'all' || res.moduleId === selectedModuleId;
      const matchType = selectedType === 'all' || res.type === selectedType;
      const matchSearch =
        res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCourse && matchModule && matchType && matchSearch;
    });
  }, [resources, selectedCourseId, selectedModuleId, selectedType, searchQuery]);

  const handleUpload = (file: { name: string; size: number }) => {
    setIsUploading(true);
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: ResourceFileType = 'pdf';
    if (extension === 'docx') type = 'docx';
    else if (extension === 'pptx') type = 'pptx';
    else if (extension === 'txt') type = 'txt';

    const targetCourseId = selectedCourseId !== 'all' ? selectedCourseId : (courses[0]?.id || 'general');
    const modules = targetCourseId !== 'general' ? apiClient.getModules(targetCourseId) : [];
    const targetModuleId = selectedModuleId !== 'all' ? selectedModuleId : (modules[0]?.id || 'general');

    apiClient.addResource({
      courseId: targetCourseId,
      moduleId: targetModuleId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: `Uploaded file (${file.name})`,
      type,
      fileSize: `${Math.max(0.1, file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: user?.name || 'User',
      tags: [],
    });

    setResources(apiClient.getResources());
    setIsUploading(false);
    success(`Resource "${file.name}" added.`);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleConfirmDelete = () => {
    if (!resourceToDelete) return;
    apiClient.deleteResource(resourceToDelete.id);
    setResources(apiClient.getResources());
    info(`Removed "${resourceToDelete.title}".`);
    setResourceToDelete(null);
  };

  const handleDownload = (res: LearningResource) => {
    const course = courses.find((c) => c.id === res.courseId);
    const content = `# ${res.title}
Course: ${course ? `${course.code} - ${course.title}` : res.courseId}
Module: ${res.moduleId}
Format: ${res.type.toUpperCase()} (${res.fileSize})
Uploaded by: ${res.uploadedBy} on ${res.uploadedAt}
${res.tags.length > 0 ? `Tags: ${res.tags.join(', ')}\n` : ''}
---

## Syllabus & Resource Notes

${res.description}

---
*Generated & downloaded from ExamWise AI Learning Resource Repository*
`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanFileName = res.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanFileName}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Downloaded "${res.title}" study resource.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Learning Resources & Syllabus Repository
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Upload and organize lecture slides, papers, and study notes across courses.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging
            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]'
            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--muted-foreground)/0.5)]'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.12)] flex items-center justify-center text-[hsl(var(--accent-text))]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
            {isUploading ? 'Uploading file...' : 'Drag & drop notes or study documents here'}
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-sm">
            Supported formats: PDF, DOCX, PPTX, or TXT.
          </p>

          <label className="mt-2 inline-flex items-center px-3.5 py-1.5 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium cursor-pointer transition-colors">
            <span>Browse Files</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            aria-label="Search resources"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
        </div>

        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setSelectedModuleId('all');
          }}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}: {c.title}
            </option>
          ))}
        </select>

        <select
          value={selectedModuleId}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          disabled={selectedCourseId === 'all'}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
        >
          <option value="all">All Modules</option>
          {availableModules.map((m) => (
            <option key={m.id} value={m.id}>
              Module {m.order}: {m.title}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        >
          <option value="all">All File Types</option>
          <option value="pdf">PDF Documents</option>
          <option value="pptx">PowerPoint Slides</option>
          <option value="docx">Word Notes</option>
          <option value="txt">Text Files</option>
        </select>
      </div>

      {/* Resources Table / List */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Showing {filteredResources.length} learning resources</span>
          <span className="font-mono">{filteredResources.length} total entries</span>
        </div>

        {filteredResources.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <File className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No resources uploaded yet
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Upload lecture notes or syllabi above to populate this repository.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {filteredResources.map((res) => {
              const course = courses.find((c) => c.id === res.courseId);
              return (
                <div
                  key={res.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[hsl(var(--secondary)/0.5)] transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-[hsl(var(--accent-text))] bg-[hsl(var(--primary)/0.12)] px-1.5 py-0.5 rounded">
                        {res.type}
                      </span>
                      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {res.title}
                      </h3>
                    </div>

                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">
                      {res.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] pt-0.5">
                      <span>{course ? `${course.code}` : 'General'}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{res.fileSize}</span>
                      <span>·</span>
                      <span>Uploaded {res.uploadedAt}</span>
                      <span>·</span>
                      <span>By {res.uploadedBy}</span>
                    </div>

                    {res.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {res.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[11px] text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-2 py-0.5 rounded-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border))]">
                    <button
                      onClick={() => handleDownload(res)}
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors cursor-pointer"
                      title="Download resource"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setResourceToDelete(res)}
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Resource"
        message={`Remove "${resourceToDelete?.title || ''}" from your study resources?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
};
