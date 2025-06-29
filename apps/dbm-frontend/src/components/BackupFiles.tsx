import { useState, useEffect } from "react";
import { client } from "../lib/client";

interface BackupFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  status: string;
  errorMessage: string | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
  createdAt: string | Date;
  scheduleName: string | null;
  connectionName: string | null;
  postgresqlVersion?: string | null;
}

interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalStorageBytes: number;
  totalStorageMB: number;
}

export const BackupFiles = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [backupsResponse, statsResponse] = await Promise.all([
        client.backups.get({
          query: {
            limit: "100",
            offset: "0",
          },
        }),
        client.backups.stats.summary.get(),
      ]);

      if (backupsResponse.data) {
        setBackups(backupsResponse.data.backups);
      }
      if (statsResponse.data) {
        setStats(statsResponse.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch backup data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id: string, _fileName: string) => {
    try {
      setDownloadingId(id);

      // Use window.open for downloads to bypass CORS issues
      // The browser will handle the download automatically with proper headers
      const downloadUrl = `http://localhost:3000/backups/${id}/download`;
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download backup file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this backup file?")) {
      try {
        await client.backups({ id }).delete();
        await fetchData();
      } catch (error) {
        console.error("Failed to delete backup:", error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading backup files...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Backup Files</h2>
        <p className="text-gray-600 mt-1">
          View, download, and manage your database backup files
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Total Backups</h3>
            <p className="text-2xl font-bold">{stats.totalBackups}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.completedBackups}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Failed</h3>
            <p className="text-2xl font-bold text-red-600">
              {stats.failedBackups}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
            <p className="text-2xl font-bold">{stats.totalStorageMB} MB</p>
          </div>
        </div>
      )}

      {/* Backup Files List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No backup files found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {backup.fileName}
                      </div>
                      {backup.postgresqlVersion && (
                        <div className="text-xs text-gray-500 mt-1">
                          PostgreSQL {backup.postgresqlVersion}
                        </div>
                      )}
                      {backup.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          {backup.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.connectionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.scheduleName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          backup.status
                        )}`}
                      >
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(backup.fileSizeBytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {new Date(backup.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(backup.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {backup.status === "completed" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownload(backup.id, backup.fileName)
                            }
                            disabled={downloadingId === backup.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {downloadingId === backup.id
                              ? "Downloading..."
                              : "Download"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(backup.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
