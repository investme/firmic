import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import {
  getCompanyTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} from "../services/taskApi";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);

      const companyId = localStorage.getItem("company_id");

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
    const companyId = localStorage.getItem("company_id");

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
      title,
      description,
      status: "pending",
    });

    setTitle("");
    setDescription("");
    await loadTasks();
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
      <FirmicSidebar active="Tasks" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-slate-500 mt-1">
              Create, complete, and manage company tasks connected to Sonny.
            </p>
          </div>

          <button
            onClick={loadTasks}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Refresh
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
            <h2 className="text-xl font-bold">Company Tasks</h2>

            {loading ? (
              <p className="text-slate-500 mt-5">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-slate-500 mt-5">No tasks yet.</p>
            ) : (
              <div className="space-y-3 mt-5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold">{task.title}</p>
                      <p className="text-sm text-slate-500">
                        {task.description || "No description"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Status: {task.status}
                      </p>
                    </div>

                    <div className="flex gap-2 h-fit">
                      {task.status !== "completed" && (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold"
                        >
                          Complete
                        </button>
                      )}

                      <button
                        onClick={() => removeTask(task.id)}
                        className="border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold"
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
                  className="w-full border border-slate-200 rounded-xl p-3"
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description"
                  className="w-full border border-slate-200 rounded-xl p-3 min-h-[120px]"
                />

                <button
                  onClick={handleCreateTask}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold"
                >
                  Create Task
                </button>
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Sonny Task Engine</h2>
              <p className="text-violet-100 text-sm mt-2">
                Tasks created here can feed Sonny, Company Control Center,
                Reports, and Hermes workflows.
              </p>
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