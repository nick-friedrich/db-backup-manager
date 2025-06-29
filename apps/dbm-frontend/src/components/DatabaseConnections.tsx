import { useState, useEffect } from "react";
import { client } from "../lib/client";

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  postgresqlVersion?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ConnectionForm {
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface ConnectionStringForm {
  name: string;
  connectionString: string;
}

export const DatabaseConnections = () => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<DatabaseConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState<ConnectionForm>({
    name: "",
    type: "postgresql",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
  });
  const [connectionStringData, setConnectionStringData] =
    useState<ConnectionStringForm>({
      name: "",
      connectionString: "",
    });

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await client.connections.get();
      if (response.data) {
        setConnections(response.data.connections);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConnection) {
        await client.connections({ id: editingConnection.id }).put(formData);
      } else {
        await client.connections.post(formData);
      }
      await fetchConnections();
      resetForm();
    } catch (error) {
      console.error("Failed to save connection:", error);
    }
  };

  const handleEdit = (connection: DatabaseConnection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: "", // Don't populate password for security
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this connection?")) {
      try {
        await client.connections({ id }).delete();
        await fetchConnections();
      } catch (error) {
        console.error("Failed to delete connection:", error);
      }
    }
  };

  const testConnection = async (id: string) => {
    try {
      setTestingConnection(id);
      const response = await client.connections({ id }).test.post();
      if (response.data?.success) {
        alert("Connection successful!");
      } else {
        alert(`Connection failed: ${response.data?.message}`);
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      alert("Connection test failed");
    } finally {
      setTestingConnection(null);
    }
  };

  const parseConnectionString = (connectionString: string) => {
    try {
      // Parse PostgreSQL connection string: postgresql://user:password@host:port/database
      const url = new URL(connectionString);
      return {
        type: "postgresql",
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        username: url.username,
        password: url.password,
      };
    } catch (_error) {
      throw new Error(
        "Invalid connection string format. Expected: postgresql://user:password@host:port/database"
      );
    }
  };

  const handleConnectionStringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parseConnectionString(
        connectionStringData.connectionString
      );
      const connectionData = {
        name: connectionStringData.name,
        ...parsed,
      };

      await client.connections.post(connectionData);
      await fetchConnections();
      resetConnectionStringForm();
    } catch (error) {
      console.error("Failed to save connection:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to parse connection string"
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "postgresql",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
    });
    setEditingConnection(null);
    setShowForm(false);
  };

  const resetConnectionStringForm = () => {
    setConnectionStringData({
      name: "",
      connectionString: "",
    });
    setShowConnectionString(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading connections...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Database Connections
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your database connections for automated backups
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowConnectionString(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Import Connection String
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Connection
          </button>
        </div>
      </div>

      {/* Connection String Form */}
      {showConnectionString && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Import Connection String
          </h3>
          <form onSubmit={handleConnectionStringSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="conn-string-name"
                className="block text-sm font-medium mb-1"
              >
                Connection Name
              </label>
              <input
                id="conn-string-name"
                type="text"
                value={connectionStringData.name}
                onChange={(e) =>
                  setConnectionStringData({
                    ...connectionStringData,
                    name: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="My Production Database"
                required
              />
            </div>
            <div>
              <label
                htmlFor="conn-string-url"
                className="block text-sm font-medium mb-1"
              >
                PostgreSQL Connection String
              </label>
              <input
                id="conn-string-url"
                type="text"
                value={connectionStringData.connectionString}
                onChange={(e) =>
                  setConnectionStringData({
                    ...connectionStringData,
                    connectionString: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="postgresql://username:password@host:5432/database"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: postgresql://username:password@host:port/database
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Import Connection
              </button>
              <button
                type="button"
                onClick={resetConnectionStringForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingConnection ? "Edit Connection" : "Add New Connection"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="conn-name"
                className="block text-sm font-medium mb-1"
              >
                Name
              </label>
              <input
                id="conn-name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="conn-type"
                className="block text-sm font-medium mb-1"
              >
                Type
              </label>
              <select
                id="conn-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                disabled
              >
                <option value="postgresql">PostgreSQL</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Currently only PostgreSQL is supported
              </p>
            </div>
            <div>
              <label
                htmlFor="conn-host"
                className="block text-sm font-medium mb-1"
              >
                Host
              </label>
              <input
                id="conn-host"
                type="text"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="conn-port"
                className="block text-sm font-medium mb-1"
              >
                Port
              </label>
              <input
                id="conn-port"
                type="number"
                value={formData.port}
                onChange={(e) =>
                  setFormData({ ...formData, port: parseInt(e.target.value) })
                }
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="conn-database"
                className="block text-sm font-medium mb-1"
              >
                Database
              </label>
              <input
                id="conn-database"
                type="text"
                value={formData.database}
                onChange={(e) =>
                  setFormData({ ...formData, database: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="conn-username"
                className="block text-sm font-medium mb-1"
              >
                Username
              </label>
              <input
                id="conn-username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="col-span-2">
              <label
                htmlFor="conn-password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="conn-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                required={!editingConnection}
                placeholder={
                  editingConnection
                    ? "Leave blank to keep current password"
                    : ""
                }
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                {editingConnection ? "Update" : "Create"} Connection
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {connections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No database connections configured yet.
          </div>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{connection.name}</h3>
                  <p className="text-gray-600">
                    {connection.type} • {connection.host}:{connection.port}/
                    {connection.database}
                  </p>
                  <p className="text-sm text-gray-500">
                    User: {connection.username} • Status:{" "}
                    {connection.isActive ? "Active" : "Inactive"}
                    {connection.postgresqlVersion && (
                      <span> • PostgreSQL {connection.postgresqlVersion}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => testConnection(connection.id)}
                    disabled={testingConnection === connection.id}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {testingConnection === connection.id
                      ? "Testing..."
                      : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(connection)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(connection.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
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
