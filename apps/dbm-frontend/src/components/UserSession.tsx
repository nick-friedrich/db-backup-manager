import { authClient } from "../lib/auth-client";

export function UserSession() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    refetch(); // Refresh session state
  };

  if (isPending) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse text-center">Loading session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-600 text-center">
          Session error: {error.message}
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // No session, show auth form instead
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-green-600">
        Welcome Back!
      </h2>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-semibold text-gray-700 mb-2">User Information</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">ID:</span> {session.user.id}
            </p>
            <p>
              <span className="font-medium">Name:</span> {session.user.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {session.user.email}
            </p>
            <p>
              <span className="font-medium">Email Verified:</span>{" "}
              {session.user.emailVerified ? "Yes" : "No"}
            </p>
            {session.user.image && (
              <p>
                <span className="font-medium">Avatar:</span>
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="inline w-8 h-8 rounded-full ml-2"
                />
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-semibold text-gray-700 mb-2">
            Session Information
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Session ID:</span>{" "}
              {session.session.id}
            </p>
            <p>
              <span className="font-medium">Expires:</span>{" "}
              {new Date(session.session.expiresAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">IP Address:</span>{" "}
              {session.session.ipAddress || "Not recorded"}
            </p>
            <p>
              <span className="font-medium">User Agent:</span>{" "}
              {session.session.userAgent
                ? `${session.session.userAgent.substring(0, 50)}...`
                : "Not recorded"}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={refetch}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Refresh Session
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
