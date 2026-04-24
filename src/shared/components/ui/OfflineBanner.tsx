import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export function OfflineBanner() {
    const isOnline = useNetworkStatus();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-zinc-900 border-b border-red-500/30 px-4 py-2 text-sm text-red-400">
            <WifiOff size={14} />
            <span>You are offline. Some features may not be available.</span>
        </div>
    );
}
