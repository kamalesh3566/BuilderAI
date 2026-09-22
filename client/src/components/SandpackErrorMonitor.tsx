import { useSandpack } from '@codesandbox/sandpack-react';
import React, { useEffect } from 'react';

interface SandpackErrorMonitorProps {
  onErrorChange: (hasError: boolean) => void;
}

const SandpackErrorMonitor: React.FC<SandpackErrorMonitorProps> = ({ onErrorChange }) => {
  const { sandpack } = useSandpack();
  const { error } = sandpack;

  useEffect(() => {
    if (error) {
      const msg = (typeof error === 'string' ? error : (error as any)?.message) || '';
      const isNetworkError =
        msg.includes('Failed to fetch') ||
        msg.includes('col.csbops.io') ||
        msg.includes('ERR_CONNECTION_TIMED_OUT') ||
        msg.includes('net::ERR');

      if (isNetworkError) {
        onErrorChange(false);
        return;
      }
    }
    onErrorChange(true);
  }, [error, onErrorChange]);

  return null;
};

export default SandpackErrorMonitor;
