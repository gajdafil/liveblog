import React from 'react';
import type { ConnectionStatus } from '../../types/database';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ status }) => {
  if (status === 'connected') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        title="Živá synchronizace je aktivní"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Živě připojeno
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20"
        title="Jste offline. Zprávy se dosynchronizují po obnovení připojení."
      >
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Offline režim
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
      Synchronizuji…
    </span>
  );
};
