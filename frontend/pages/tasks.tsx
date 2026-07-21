import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import {
  getCompanyTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} from "../services/taskApi";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());

  const companyName = workspace?.name || "Active Company";

  useEffect(() => {
    function syncWorkspace() {
      setWorkspace(getActiveWorkspace());
    }

    syncWorkspace();

    window.addEventListener(
      getWorkspaceChangedEventName(),
      syncWorkspace
    );
    window.addEventListener("storage", syncWorkspace);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        syncWorkspace
      );
      window.removeEventListener("storage", syncWorkspace);
    };
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [workspace?.id]);

  async function loadTasks() {
    try {
      setLoading(true);

      const companyId = workspace?.id;

      if (!companyId) {
        setTasks([]);
        return;
      }

      const data = await getCompanyTasks(companyId);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask() {
    try {
      setCreating(true);

      const companyId = workspace?.id;

      if (!companyId) {
        alert("Select or create a company first.");
        return;
      }

      if (!title.trim()) {
        alert("Task title is required.");
        return;
      }

      await createTask({
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        status: "pending",
      });

      setTitle("");
      setDescription("");

      await loadTasks();

      alert("Task created successfully.");
    } catch (err: any) {
      console.error("CREATE TASK ERROR:", err);
      alert(err?.message || "Failed to create task.");
    } finally {
      setCreating(false);
    }
  }

  async function completeTask(taskId: string) {
    await updateTaskStatus(taskId, "completed");
    await loadTasks();
  }

  async function removeTask(taskId: string) {
    if (!confirm("Delete this task?")) return;

    await deleteTask(taskId);
    await loadTasks();
  }

  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.length - completed;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">Tasks</p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Manage company execution.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Create, complete, and manage operational tasks for {companyName}.
                Sonny, Hermes, Reports, and the Company Control Center use these
                tasks to understand company progress.
              </p>
            </div>

            <button
              onClick={loadTasks}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
            >
              Refresh Tasks
            </button>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Total Tasks" value={String(tasks.length)} icon="✅" />
            <Stat title="Pending" value={String(pending)} icon="⏳" />
            <Stat title="Completed" value={String(completed)} icon="🟢" />
            <Stat title="Sonny Sync" value="Active" icon="🤖" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold">Company Tasks</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tasks connected to company operations and AI workflow.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-slate-500 mt-5">Loading company tasks...</p>
              ) : tasks.length === 0 ? (
                <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-yellow-700">
                  No tasks yet. Create your first operational task from the
                  panel on the right.
                </div>
              ) : (
                <div className="space-y-3 mt-5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:justify-between gap-4"
                    >
                      <div>
                        <p className="font-bold">{task.title}</p>

                        <p className="text-sm text-slate-500 mt-1">
                          {task.description || "No description"}
                        </p>

                        <StatusBadge status={task.status} />
                      </div>

                      <div className="flex gap-2 h-fit">
                        {task.status !== "completed" && (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition"
                          >
                            Complete
                          </button>
                        )}

                        <button
                          onClick={() => removeTask(task.id)}
                          className="border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Create Task</h2>

                <div className="space-y-4 mt-5">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500"
                  />

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task description"
                    className="w-full border border-slate-200 rounded-xl p-3 min-h-[120px] outline-none focus:border-violet-500"
                  />

                  <button
                    onClick={handleCreateTask}
                    disabled={creating}
                    className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold disabled:bg-slate-300 hover:bg-violet-700 transition"
                  >
                    {creating ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Sonny Task Engine</h2>

                <p className="text-violet-100 text-sm mt-2">
                  Tasks created here feed Sonny AI COO, Hermes Compliance,
                  Company Control Center, Reports Center, and operating progress.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Mini title="Pending" value={String(pending)} />
                  <Mini title="Completed" value={String(completed)} />
                  <Mini title="Sync" value="Active" />
                  <Mini title="Owner" value="Sonny" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Recommended Tasks</h2>

                <div className="space-y-3 mt-5">
                  <Recommendation
                    text="Upload KYB documents"
                    onClick={() => {
                      setTitle("Upload KYB documents");
                      setDescription(
                        "Upload KYB document package to improve Hermes compliance readiness."
                      );
                    }}
                  />
                  <Recommendation
                    text="Review trade license"
                    onClick={() => {
                      setTitle("Review trade license");
                      setDescription(
                        "Review and approve the company trade license in Document Vault."
                      );
                    }}
                  />
                  <Recommendation
                    text="Activate headquarters"
                    onClick={() => {
                      setTitle("Activate headquarters");
                      setDescription(
                        "Choose and activate a Hub71 headquarters from Office Marketplace."
                      );
                    }}
                  />
                  <Recommendation
                    text="Generate operating report"
                    onClick={() => {
                      setTitle("Generate operating report");
                      setDescription(
                        "Generate a company operating report from Reports Center."
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function Recommendation({ text, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-left hover:bg-white transition"
    >
      <span className="font-semibold">{text}</span>
      <span className="text-violet-700 font-bold">Use</span>
    </button>
  );
}