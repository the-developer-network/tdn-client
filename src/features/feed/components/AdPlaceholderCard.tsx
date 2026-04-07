import { useEffect } from "react";

declare global {
    interface Window {
        adsbygoogle: object[];
    }
}

const AD_SLOT = "9769473609";

export function AdPlaceholderCard() {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // AdSense script not loaded
        }
    }, []);

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
            <ins
                className="adsbygoogle block"
                data-ad-client="ca-pub-1924397942162309"
                data-ad-slot={AD_SLOT}
                data-ad-format="fluid"
                data-ad-layout-key="-ed+5p-2-bb+pw"
            />
        </div>
    );
}
