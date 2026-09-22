import React, { useMemo, useState } from 'react';
import { detectDependencies } from '../utils/sandpackUtils';
import { sanitizeCodeForSandpack } from '../utils/codeSanitizer';
import SandpackErrorMonitor from './SandpackErrorMonitor';
import { SandpackPreview, SandpackProvider, SandpackLayout } from '@codesandbox/sandpack-react';

interface FullPagePreviewProps {
  files: Record<string, any>;
}

const FullPagePreview: React.FC<FullPagePreviewProps> = ({ files }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState<boolean>(true);

  // Convert liveFiles to Sandpack format with automatic syntax sanitization
  const sandpackFiles = useMemo(() => {
    if (!files) return {};
    const spFiles: Record<string, { code: string }> = {};
    for (const [path, content] of Object.entries(files)) {
      const rawCode = typeof content === "string" ? content : content?.content || "";
      spFiles[path] = { code: sanitizeCodeForSandpack(rawCode, path) };
    }
    return spFiles;
  }, [files]);

  const dependencies = useMemo(() => {
    if (!files) return {};
    return detectDependencies(files);
  }, [files]);

  return (
    <div className="h-screen w-screen bg-white overflow-hidden">
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        customSetup={{ dependencies }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          ],
          logLevel: 0,
        }}
        className="h-full w-full"
      >
        <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />
        <SandpackLayout className="h-full w-full border-none! bg-transparent!">
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay={showErrorOverlay}
            className="h-full w-full"
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};

export default FullPagePreview;
