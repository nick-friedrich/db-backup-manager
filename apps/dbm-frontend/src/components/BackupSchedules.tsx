import { useState, useEffect } from "react";
import { client } from "../lib/client";

interface BackupSchedule {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRunAt: string | Date | null;
  nextRunAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  connectionId: string;
  connectionName: string | null;
}

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
}

interface ScheduleForm {
  name: string;
  cronExpression: string;
  timezone: string;
  connectionId: string;
}

export const BackupSchedules = () => {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(
    null
  );
  const [formData, setFormData] = useState<ScheduleForm>({
    name: "",
    cronExpression: "0 2 * * *", // Daily at 2 AM
    timezone: "UTC",
    connectionId: "",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesResponse, connectionsResponse] = await Promise.all([
        client.schedules.get(),
        client.connections.get(),
      ]);

      if (schedulesResponse.data) {
        setSchedules(schedulesResponse.data.schedules);
      }
      if (connectionsResponse.data) {
        setConnections(connectionsResponse.data.connections);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await client.schedules({ id: editingSchedule.id }).put(formData);
      } else {
        await client.schedules.post(formData);
      }
      await fetchData();
      resetForm();
    } catch (error) {
      console.error("Failed to save schedule:", error);
    }
  };

  const handleEdit = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      connectionId: schedule.connectionId,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      try {
        await client.schedules({ id }).delete();
        await fetchData();
      } catch (error) {
        console.error("Failed to delete schedule:", error);
      }
    }
  };

  const toggleSchedule = async (id: string) => {
    try {
      await client.schedules({ id }).toggle.post();
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const runNow = async (id: string) => {
    try {
      await client.schedules({ id }).run.post();
      alert("Backup triggered successfully!");
    } catch (error) {
      console.error("Failed to trigger backup:", error);
      alert("Failed to trigger backup");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cronExpression: "0 2 * * *",
      timezone: "UTC",
      connectionId: "",
    });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const cronPresets = [
    { label: "Every hour", value: "0 * * * *" },
    { label: "Daily at 2 AM", value: "0 2 * * *" },
    { label: "Weekly (Sunday 2 AM)", value: "0 2 * * 0" },
    { label: "Monthly (1st at 2 AM)", value: "0 2 1 * *" },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Backup Schedules</h2>
          <p className="text-gray-600 mt-1">
            Automate your database backups with scheduled jobs
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="schedule-name"
                className="block text-sm font-medium mb-1"
              >
                Name
              </label>
              <input
                id="schedule-name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="schedule-connection"
                className="block text-sm font-medium mb-1"
              >
                Database Connection
              </label>
              <select
                id="schedule-connection"
                value={formData.connectionId}
                onChange={(e) =>
                  setFormData({ ...formData, connectionId: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select a connection</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="schedule-cron"
                className="block text-sm font-medium mb-1"
              >
                Schedule (Cron Expression)
              </label>
              <select
                id="schedule-cron"
                value={formData.cronExpression}
                onChange={(e) =>
                  setFormData({ ...formData, cronExpression: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                {cronPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="schedule-custom-cron"
                className="block text-sm font-medium mb-1"
              >
                Custom Cron Expression
              </label>
              <input
                id="schedule-custom-cron"
                type="text"
                value={formData.cronExpression}
                onChange={(e) =>
                  setFormData({ ...formData, cronExpression: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="0 2 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: minute hour day month weekday
              </p>
            </div>
            <div>
              <label
                htmlFor="schedule-timezone"
                className="block text-sm font-medium mb-1"
              >
                Timezone
              </label>
              <select
                id="schedule-timezone"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {editingSchedule ? "Update" : "Create"} Schedule
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No backup schedules configured yet.
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{schedule.name}</h3>
                  <p className="text-gray-600">
                    Connection: {schedule.connectionName} • Schedule:{" "}
                    {schedule.cronExpression} ({schedule.timezone})
                  </p>
                  <div className="text-sm text-gray-500 mt-1">
                    <p>Status: {schedule.isActive ? "Active" : "Inactive"}</p>
                    {schedule.lastRunAt && (
                      <p>
                        Last run:{" "}
                        {new Date(schedule.lastRunAt).toLocaleString()}
                      </p>
                    )}
                    {schedule.nextRunAt && (
                      <p>
                        Next run:{" "}
                        {new Date(schedule.nextRunAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => runNow(schedule.id)}
                    className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                  >
                    Run Now
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSchedule(schedule.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      schedule.isActive
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white`}
                  >
                    {schedule.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(schedule)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
