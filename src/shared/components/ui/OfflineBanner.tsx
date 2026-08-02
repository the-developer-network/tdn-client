import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useI18n } from "../../hooks/useI18n";

export function OfflineBanner() {
    const isOnline = useNetworkStatus();
    const { t } = useI18n();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-zinc-900 border-b border-red-500/30 px-4 py-2 text-sm text-red-400">
            <WifiOff size={14} />
            <span>{t("offline.message")}</span>
        </div>
    );
}
