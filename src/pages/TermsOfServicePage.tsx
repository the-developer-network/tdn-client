import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { useI18n } from "../shared/hooks/useI18n";

export default function TermsOfServicePage() {
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
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
                        {t("legal.termsTitle")}
                    </h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-8 text-ink/80 text-sm leading-relaxed">
                <div>
                    <p className="text-ink/40 text-xs mb-4">
                        {t("legal.lastUpdated")}
                    </p>
                    <p>{t("terms.intro")}</p>
                </div>

                {/* 1 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s1Title")}
                    </h2>
                    <p>{t("terms.s1Body")}</p>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s2Title")}
                    </h2>
                    <p>{t("terms.s2Body")}</p>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s3Title")}
                    </h2>
                    <p className="mb-3">{t("terms.s3Lead")}</p>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("terms.s3Explicit")}</li>
                        <li>{t("terms.s3Hate")}</li>
                        <li>{t("terms.s3Spam")}</li>
                        <li>{t("terms.s3Malware")}</li>
                        <li>{t("terms.s3Illegal")}</li>
                        <li>{t("terms.s3Impersonation")}</li>
                    </ul>
                    <p className="mt-3">{t("terms.s3Note")}</p>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s4Title")}
                    </h2>
                    <p className="mb-3">{t("terms.s4Body1")}</p>
                    <p>{t("terms.s4Body2")}</p>
                </section>

                {/* 5 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s5Title")}
                    </h2>
                    <p className="mb-3">{t("terms.s5Body1")}</p>
                    <p>{t("terms.s5Body2")}</p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s6Title")}
                    </h2>
                    <p className="mb-3">{t("terms.s6Body1")}</p>
                    <p>{t("terms.s6Body2")}</p>
                </section>

                {/* 7 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s7Title")}
                    </h2>
                    <p>{t("terms.s7Body")}</p>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s8Title")}
                    </h2>
                    <p>{t("terms.s8Body")}</p>
                </section>

                {/* 9 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s9Title")}
                    </h2>
                    <p>{t("terms.s9Body")}</p>
                </section>

                {/* 10 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("terms.s10Title")}
                    </h2>
                    <p>{t("terms.s10Body")}</p>
                </section>

                <div className="border-t border-ink/10 pt-6 text-ink/40 text-xs">
                    {t("terms.footer")}{" "}
                    <a
                        href="mailto:contact@developernetwork.net"
                        className="hover:text-ink/60 transition-colors"
                    >
                        contact@developernetwork.net
                    </a>
                    .
                </div>
            </div>
        </PageShell>
    );
}
