import { useEffect, useState, useCallback } from "react";
import { fetchSavedProjects, removeSavedProject } from "../apiServices";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/project/ProjectCard";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";

export default function FreelancerFavorites() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSavedProjects();
      setProjects(data.projects || []);
    } catch (err) {
      setError("Failed to load saved projects");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleUnsave = async (projectID) => {
    try {
      await removeSavedProject(projectID);
      setProjects((prev) => prev.filter((p) => p.id !== projectID));
    } catch (err) {
      console.error("Failed to unsave", err);
    }
  };
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <h1 className="text-3xl font-semibold text-slate-900 mb-6">My Favorites</h1>
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">{error}</div>}
            {loading ? (
              <Loading/>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 text-slate-500">You have no saved projects yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} onUnsave={handleUnsave}/>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}