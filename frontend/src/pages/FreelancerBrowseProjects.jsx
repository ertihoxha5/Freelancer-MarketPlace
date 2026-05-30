import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchBrowseProjects, submitApplication } from '../apiServices.js';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ProjectCard from '../components/project/ProjectCard.jsx';
import ProjectFilters from '../components/project/ProjectFilters.jsx';
import Loading from '../components/Loading.jsx';

export default function FreelancerBrowseProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    sort: 'newest',
    categoryID: '',
    skillIds: '',
  });
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [applyForm, setApplyForm] = useState({
    coverLetter: '',
    bidAmount: '',
    estimatedDays: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [cvError, setCvError] = useState('');

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read file.'));
      reader.readAsDataURL(file);
    });
  }

  const loadProjects = useCallback(async (currentFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBrowseProjects(currentFilters);
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadProjects(filters);
  }, [filters, loadProjects]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const openApplyModal = useCallback((project) => {
    setSelectedProject(project);
    setApplyForm({ coverLetter: '', bidAmount: '', estimatedDays: '' });
    setCvFile(null);
    setSubmitError('');
    setSubmitSuccess('');
    setCvFileName('');
    setCvError('');
    setApplyModalOpen(true);
  }, []);

  const closeApplyModal = useCallback(() => {
    if (submitting) return;
    setApplyModalOpen(false);
    setSelectedProject(null);
    setSubmitError('');
    setSubmitSuccess('');
    setCvFile(null);
    setCvFileName('');
    setCvError('');
  }, [submitting]);

  const handleApplySubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitError('');
    setSubmitSuccess('');

    if (!applyForm.coverLetter.trim()) {
      setSubmitError('Cover letter is required.');
      return;
    }

    setSubmitting(true);
    try {
      let attachmentBase64 = null;
      let attachmentName = null;
      if (cvFile instanceof File) {
        attachmentBase64 = await readFileAsDataUrl(cvFile);
        attachmentName = cvFile.name;
      }
      await submitApplication(selectedProject.id, {
        coverLetter: applyForm.coverLetter.trim(),
        bidAmount: applyForm.bidAmount ? Number(applyForm.bidAmount) : null,
        estimatedDays: applyForm.estimatedDays ? Number(applyForm.estimatedDays) : null,
        attachmentBase64,
        attachmentName,
      });
      setSubmitSuccess('Application submitted successfully.');
      setTimeout(() => {
        setApplyModalOpen(false);
        setSelectedProject(null);
        setSubmitSuccess('');
      }, 1000);
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  }, [applyForm, selectedProject, cvFile]);

  const memoizedProjects = useMemo(() => projects, [projects]);
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header/>
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-slate-900">Browse Projects</h1>
              <p className="mt-2 text-slate-600">Discover open projects that match your skills and experience.</p>
            </div>
            <ProjectFilters currentFilters={filters}  onFilterChange={handleFilterChange} />
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">{error}</div>}
            {loading ? (
              <Loading/>
            ) : memoizedProjects.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">No projects match your current filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memoizedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onApplyNow={openApplyModal}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {applyModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Apply to Project</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedProject.title}</p>
              </div>
              <button
                type="button"
                onClick={closeApplyModal}
                disabled={submitting}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-5 p-6">
              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {submitSuccess}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cover Letter <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={applyForm.coverLetter}
                  onChange={(e) => setApplyForm((prev) => ({ ...prev, coverLetter: e.target.value }))}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-300 p-4 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
                  placeholder="Explain why you are the best fit for this project..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Proposed Budget ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={applyForm.bidAmount}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, bidAmount: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
                    placeholder="2500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Estimated Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={applyForm.estimatedDays}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, estimatedDays: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
                    placeholder="14"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Upload CV / Resume
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    setCvError('');
                    if (!file) {
                      setCvFile(null);
                      setCvFileName('');
                      return;
                    }
                    const allowed = [
                      'application/pdf',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'text/plain',
                    ];
                    if (!allowed.includes(file.type)) {
                      setCvError('Please upload a PDF, DOC, DOCX, or TXT file.');
                      e.target.value = '';
                      setCvFile(null);
                      setCvFileName('');
                      return;
                    }
                    if (file.size > 8 * 1024 * 1024) {
                      setCvError('CV file must be smaller than 8MB.');
                      e.target.value = '';
                      setCvFile(null);
                      setCvFileName('');
                      return;
                    }
                    setCvFile(file);
                    setCvFileName(file.name);
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
                <p className="mt-2 text-xs text-slate-500">
                  PDF, DOC, DOCX, or TXT only. This file is attached to your application.
                </p>
                {cvFileName ? (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Selected file: {cvFileName}
                  </p>
                ) : null}
                {cvError ? (
                  <p className="mt-2 text-xs font-medium text-red-600">{cvError}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeApplyModal}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-[#1a3c2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5c46] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
