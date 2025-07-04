import { useState, useRef } from "react";
import { client } from "../lib/client";

interface ImportResults {
  connections: { imported: number; skipped: number; errors: string[] };
  schedules: { imported: number; skipped: number; errors: string[] };
  backups: { imported: number; skipped: number; errors: string[] };
}

export const ImportExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // Use window.open for downloads to bypass CORS issues
      // The browser will handle the download automatically with proper headers
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const exportUrl = `${backendUrl}/api/import-export/export`;
      window.open(exportUrl, "_blank");

      // Give some time for the download to start before clearing the loading state
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setIsExporting(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);
      setImportResults(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await client.api["import-export"].import.post({ file });

      if (response.data && "results" in response.data) {
        setImportResults(response.data.results as ImportResults);
      } else {
        throw new Error("Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearResults = () => {
    setImportResults(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Import & Export
        </h1>
        <p className="text-gray-600">
          Export your database connections, schedules, and backup files to a ZIP
          archive, or import them from a previous export.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <span className="text-blue-600 text-xl">📤</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Download all your connections, schedules, and backup files in a
            single ZIP file.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Database connections (without passwords)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Backup schedules and settings
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Backup files and metadata
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </div>
            ) : (
              "Export All Data"
            )}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <span className="text-green-600 text-xl">📥</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Import Data</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Restore your data from a previously exported ZIP file.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-yellow-500 mr-2">⚠️</span>
              Existing data will be preserved
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-yellow-500 mr-2">⚠️</span>
              Duplicate names may be created
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-blue-500 mr-2">ℹ️</span>
              Only accepts ZIP files from this app
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleImport}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleFileSelect}
            disabled={isImporting}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImporting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </div>
            ) : (
              "Select ZIP File to Import"
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={clearResults}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Import Results
            </h3>
            <button
              type="button"
              onClick={clearResults}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connections */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Connections</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Imported:</span>
                  <span className="font-medium">
                    {importResults.connections.imported}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Skipped:</span>
                  <span className="font-medium">
                    {importResults.connections.skipped}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Errors:</span>
                  <span className="font-medium">
                    {importResults.connections.errors.length}
                  </span>
                </div>
              </div>
              {importResults.connections.errors.length > 0 && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600">
                      View errors
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {importResults.connections.errors.map((error) => (
                        <li key={error} className="text-red-600 pl-2">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>

            {/* Schedules */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Schedules</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Imported:</span>
                  <span className="font-medium">
                    {importResults.schedules.imported}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Skipped:</span>
                  <span className="font-medium">
                    {importResults.schedules.skipped}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Errors:</span>
                  <span className="font-medium">
                    {importResults.schedules.errors.length}
                  </span>
                </div>
              </div>
              {importResults.schedules.errors.length > 0 && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600">
                      View errors
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {importResults.schedules.errors.map((error) => (
                        <li key={error} className="text-red-600 pl-2">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>

            {/* Backups */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Backup Files</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Imported:</span>
                  <span className="font-medium">
                    {importResults.backups.imported}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Skipped:</span>
                  <span className="font-medium">
                    {importResults.backups.skipped}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Errors:</span>
                  <span className="font-medium">
                    {importResults.backups.errors.length}
                  </span>
                </div>
              </div>
              {importResults.backups.errors.length > 0 && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600">
                      View errors
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {importResults.backups.errors.map((error) => (
                        <li key={error} className="text-red-600 pl-2">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Success!</strong> Your data has been imported. You may
              need to refresh other pages to see the new items.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
