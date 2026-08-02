import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { useI18n } from "../shared/hooks/useI18n";
import type { TranslationKey } from "../shared/i18n/translations";

const InstagramIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
    >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
);

const GitHubIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

interface Social {
    id: string;
    name: string;
    handle: string;
    url: string;
    descriptionKey: TranslationKey;
    icon: React.ReactNode;
    hoverBorder: string;
    hoverShadow: string;
    hoverIcon: string;
}

const socials: Social[] = [
    {
        id: "instagram",
        name: "Instagram",
        handle: "@devnetworknet",
        url: "https://www.instagram.com/devnetworknet/",
        descriptionKey: "socials.instagramDescription",
        icon: <InstagramIcon />,
        hoverBorder: "group-hover:border-pink-500/50",
        hoverShadow: "group-hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]",
        hoverIcon: "group-hover:text-pink-400",
    },
    {
        id: "twitter",
        name: "X (Twitter)",
        handle: "@devnetworknet",
        url: "https://x.com/devnetworknet",
        descriptionKey: "socials.xDescription",
        icon: <XIcon />,
        hoverBorder: "group-hover:border-white/30",
        hoverShadow: "group-hover:shadow-[0_0_24px_rgba(255,255,255,0.05)]",
        hoverIcon: "group-hover:text-white",
    },
    {
        id: "github",
        name: "GitHub",
        handle: "the-developer-network",
        url: "https://github.com/the-developer-network/",
        descriptionKey: "socials.githubDescription",
        icon: <GitHubIcon />,
        hoverBorder: "group-hover:border-violet-500/50",
        hoverShadow: "group-hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]",
        hoverIcon: "group-hover:text-violet-400",
    },
];

export default function SocialsPage() {
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-base font-bold text-white">
                        {t("socials.title")}
                    </h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-6">
                {/* Intro */}
                <p className="text-white/40 text-sm leading-relaxed">
                    {t("socials.intro")}
                </p>

                {/* Social Cards */}
                <div className="space-y-3">
                    {socials.map((social) => (
                        <a
                            key={social.id}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.06] ${social.hoverBorder} ${social.hoverShadow}`}
                        >
                            {/* Platform Icon */}
                            <div
                                className={`mt-0.5 flex-shrink-0 text-white/40 transition-colors duration-300 ${social.hoverIcon}`}
                            >
                                {social.icon}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-semibold text-sm">
                                        {social.name}
                                    </span>
                                    <span className="text-white/30 text-xs font-mono truncate">
                                        {social.handle}
                                    </span>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    {t(social.descriptionKey)}
                                </p>
                            </div>

                            {/* External link indicator */}
                            <div className="mt-0.5 flex-shrink-0 text-white/20 group-hover:text-white/50 transition-colors duration-300">
                                <ExternalLink size={14} />
                            </div>
                        </a>
                    ))}
                </div>

                <div className="border-t border-white/10 pt-6 text-white/25 text-xs">
                    {t("socials.footer")}
                </div>
            </div>
        </PageShell>
    );
}
