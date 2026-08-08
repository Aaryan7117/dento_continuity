import Link from "next/link";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top navigation */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/front-desk" className="text-lg font-semibold text-gray-900 tracking-tight">
            DENTO <span className="text-blue-600">Continuity</span>
          </Link>
          <nav className="flex gap-1">
            <Link
              href="/front-desk"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Front Desk
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="text-sm text-gray-500">
          Demo mode — no auth
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-6 py-4">
        {children}
      </main>
    </div>
  );
}
