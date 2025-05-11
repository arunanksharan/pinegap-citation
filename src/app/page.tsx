'use client';

import ControlPanel from '@/components/ui/ControlPanel';
import FileViewer from '@/components/ui/FileViewer';

export default function HomePage() {
  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left Panel (Controls) */}
      <div className="w-1/3 lg:w-1/4 border-r border-border overflow-y-auto">
        <ControlPanel />
      </div>

      {/* Right Panel (File Viewer) */}
      <div className="flex-1 overflow-y-auto">
        <FileViewer />
      </div>
    </main>
  );
}
