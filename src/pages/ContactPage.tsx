import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { SEO } from "../shared/components/ui/SEO";
import { useI18n } from "../shared/hooks/useI18n";

export default function ContactPage() {
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                title={t("contact.seoTitle")}
                description={t("contact.seoDescription")}
                canonical="/contact"
            />

            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-ground/80 backdrop-blur-md border-b border-ink/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-ink/10 transition-colors text-ink/70 hover:text-ink"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-base font-bold text-ink">
                        {t("contact.title")}
                    </h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-8 text-ink/80 text-sm leading-relaxed">
                <div>
                    <p className="text-ink/40 text-xs mb-6">
                        {t("legal.lastUpdated")}
                    </p>
                    <p>{t("contact.intro")}</p>
                </div>

                <section>
                    <h2 className="text-ink font-bold text-base mb-4">
                        {t("contact.generalTitle")}
                    </h2>
                    <a
                        href="mailto:contact@developernetwork.net"
                        className="inline-flex items-center gap-3 bg-surface-1 border border-ink/10 rounded-2xl px-5 py-4 hover:bg-surface-2 hover:border-ink/20 transition-all"
                    >
                        <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                        <span className="text-ink font-medium">
                            contact@developernetwork.net
                        </span>
                    </a>
                    <p className="mt-4 text-ink/50">
                        {t("contact.responseTime")}
                    </p>
                </section>

                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("contact.aboutTitle")}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("contact.aboutAccount")}</li>
                        <li>{t("contact.aboutAbuse")}</li>
                        <li>{t("contact.aboutPrivacy")}</li>
                        <li>{t("contact.aboutBugs")}</li>
                        <li>{t("contact.aboutBusiness")}</li>
                        <li>{t("contact.aboutAds")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("contact.openSourceTitle")}
                    </h2>
                    <p className="text-ink/70">{t("contact.openSourceBody")}</p>
                </section>

                <div className="border-t border-ink/10 pt-6 text-ink/40 text-xs">
                    {t("legal.brand")} ·{" "}
                    <a
                        href="/privacy"
                        className="hover:text-ink/60 transition-colors"
                    >
                        {t("legal.privacyTitle")}
                    </a>{" "}
                    ·{" "}
                    <a
                        href="/terms"
                        className="hover:text-ink/60 transition-colors"
                    >
                        {t("legal.termsTitle")}
                    </a>
                </div>
            </div>
        </PageShell>
    );
}
