import { useState } from "react";
import { saveProject, removeSavedProject } from "../../apiServices";

export default function ProjectCard({ project, onUnsave, onApplyNow }) {
  const [isSaved, setIsSaved] = useState(project.isSaved === true || project.isSaved === 1);
  const toggleSave = async () => {
    try {
      if (isSaved) {
        await removeSavedProject(project.id);
        setIsSaved(false);
        if (onUnsave) onUnsave(project.id);
      } else {
        await saveProject(project.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Save/Remove error:", err);
    }
  };
  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-md transition-all group">
      <button onClick={toggleSave} className="absolute top-4 right-4 text-2xl z-10 hover:scale-110 transition-transform">{isSaved ? "❤️" : "♡"}</button>
      <h3 className="font-semibold text-lg text-slate-900 pr-8">{project.title}</h3>
      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{project.pDesc}</p>
      <div className="mt-6 grid grid-cols-2 text-sm text-slate-500">
        <div>Budget: <span className="font-semibold text-slate-900">${Number(project.budget).toLocaleString()}</span></div>
        <div className="text-right">Deadline: <span className="font-medium">{new Date(project.deadline).toLocaleDateString()}</span></div>
      </div>
      <div className="mt-2 text-xs text-slate-500">Client: <span className="font-medium text-slate-700">{project.clientName}</span></div>
      <button onClick={() => onApplyNow?.(project)}
        className="mt-6 w-full bg-[#1a3c2e] hover:bg-[#2a5c46] text-white font-semibold py-3 rounded-2xl text-sm transition">Apply Now</button>
      {}
    </div>
  );
}