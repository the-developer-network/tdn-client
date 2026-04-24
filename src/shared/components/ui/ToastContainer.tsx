import { X } from "lucide-react";
import { useToastStore } from "../../store/toast.store";

const typeStyles = {
    error: "bg-zinc-900 border-red-500/40 text-red-400",
    success: "bg-zinc-900 border-green-500/40 text-green-400",
    info: "bg-zinc-900 border-white/20 text-white/80",
};

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none sm:right-6">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm shadow-lg pointer-events-auto animate-in fade-in slide-in-from-bottom-2 ${typeStyles[toast.type]}`}
                >
                    <span className="flex-1 leading-snug">{toast.message}</span>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        aria-label="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
