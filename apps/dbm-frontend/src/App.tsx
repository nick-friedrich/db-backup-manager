import { authClient } from "./lib/auth-client";
import { AuthForm } from "./components/AuthForm";
import { Layout } from "./components/Layout";
import { DatabaseConnections } from "./components/DatabaseConnections";
import { BackupSchedules } from "./components/BackupSchedules";
import { BackupFiles } from "./components/BackupFiles";
import { ImportExport } from "./components/ImportExport";
import { Routes, Route, Navigate } from "react-router";

function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Database Backup Manager
            </h1>
            <p className="text-gray-600">
              Secure PostgreSQL backup automation
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DatabaseConnections />} />
        <Route path="schedules" element={<BackupSchedules />} />
        <Route path="files" element={<BackupFiles />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
