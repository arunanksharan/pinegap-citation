'use client';

import ControlPanel from '@/components/ui/ControlPanel';
import FileViewer from '@/components/ui/FileViewer';

export default function HomePage() {
  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left Panel (Controls) */}
      <div className="w-1/2 border-r border-border overflow-y-auto min-h-0">
        <ControlPanel />
      </div>

      {/* Right Panel (File Viewer) */}
      <div className="w-1/2 flex flex-col overflow-y-auto min-h-0">
        <FileViewer />
      </div>
    </main>
  );
}
