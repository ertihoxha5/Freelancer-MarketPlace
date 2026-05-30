import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchFreelancerProjectDetails, submitApplication } from '../apiServices.js';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';

export default function FreelancerMakeApplication() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
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
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchFreelancerProjectDetails(projectId);
        if (active) setProject(data?.project ?? { title: `Project #${projectId}` });
      } catch {
        if (active) setProject({ title: `Project #${projectId}` });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [projectId]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    if (!form.coverLetter.trim()) {
      setError("Cover letter is required");
      setSubmitting(false);
      return;
    }
    try {
      let attachmentBase64 = null;
      let attachmentName = null;
      if (cvFile instanceof File) {
        attachmentBase64 = await readFileAsDataUrl(cvFile);
        attachmentName = cvFile.name;
      }
      await submitApplication(projectId, {
        coverLetter: form.coverLetter.trim(),
        bidAmount: form.bidAmount ? Number(form.bidAmount) : null,
        estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : null,
        attachmentBase64,
        attachmentName,
      });
      setSuccess("Application submitted successfully!");
      setTimeout(() => navigate('/freelancer/applications'), 1800);
    } catch (err) {
      setError(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-8">
            <h1 className="text-3xl font-semibold mb-1">Make an Application</h1>
            <p className="text-slate-600 mb-8">
              {loading ? "Loading project..." : project?.title || `Project #${projectId}`}
            </p>
            {success && <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-2xl">{success}</div>}
            {error && <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-2xl">{error}</div>}
            <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Cover Letter <span className="text-red-500">*</span></label>
                <textarea name="coverLetter" value={form.coverLetter}
                  onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} rows={8}
                  className="w-full border border-slate-300 rounded-2xl p-4 focus:ring-2 focus:ring-[#1a3c2e]" placeholder="Explain why you are the best candidate for this project..." required/>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Proposed Budget ($)</label>
                  <input type="number" name="bidAmount" value={form.bidAmount}
                    onChange={(e) => setForm({ ...form, bidAmount: e.target.value })}
                    className="w-full border border-slate-300 rounded-2xl p-4" placeholder="2500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Days</label>
                  <input type="number" name="estimatedDays" value={form.estimatedDays}
                    onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                    className="w-full border border-slate-300 rounded-2xl p-4" placeholder="14"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Upload CV / Resume</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => {
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
                  className="w-full border border-slate-300 rounded-2xl p-4 bg-white"
                />
                <p className="mt-2 text-xs text-slate-500">PDF, DOC, DOCX, or TXT only.</p>
                {cvFileName ? <p className="mt-2 text-xs font-medium text-emerald-700">Selected file: {cvFileName}</p> : null}
                {cvError ? <p className="mt-2 text-xs font-medium text-red-600">{cvError}</p> : null}
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#1a3c2e] text-white font-semibold py-4 rounded-2xl hover:bg-[#2a5c46] disabled:opacity-50">
                {submitting ? "Submitting Application..." : "Submit Application"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
