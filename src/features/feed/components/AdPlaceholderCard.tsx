import { Mail } from "lucide-react";

export function AdPlaceholderCard() {
    return (
        <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase tracking-wider text-white/20">
                    Promotion
                </span>
                <span className="text-[9px] uppercase tracking-wider border border-white/10 rounded-full px-2 py-0.5 text-white/20">
                    Ad
                </span>
            </div>
            <a
                href="mailto:contact@developernetwork.net?subject=Advertising%20on%20TDN"
                className="flex items-center gap-4 rounded-xl bg-zinc-900 border border-white/10 p-4 hover:bg-zinc-800 hover:border-white/20 transition-all"
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 shrink-0">
                    <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                        Want to reach developers?
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                        Advertise on TDN —{" "}
                        <span className="text-blue-400">
                            contact@developernetwork.net
                        </span>
                    </p>
                </div>
            </a>
        </div>
    );
}
