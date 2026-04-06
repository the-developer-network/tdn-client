import { Megaphone } from "lucide-react";

export function AdPlaceholderCard() {
    return (
        <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase tracking-wider text-white/20">
                    Sponsored
                </span>
                <span className="text-[9px] uppercase tracking-wider border border-white/10 rounded-full px-2 py-0.5 text-white/20">
                    Ad
                </span>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] aspect-video w-full">
                <Megaphone className="w-5 h-5 text-white/20" />
                <span className="text-xs text-white/20">Advertisement</span>
            </div>
        </div>
    );
}
