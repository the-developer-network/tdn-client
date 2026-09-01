import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { useI18n } from "../shared/hooks/useI18n";

export default function PrivacyPolicyPage() {
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
                        {t("legal.privacyTitle")}
                    </h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-8 text-ink/80 text-sm leading-relaxed">
                <div>
                    <p className="text-ink/40 text-xs mb-4">
                        {t("legal.lastUpdated")}
                    </p>
                    <p>{t("privacy.intro")}</p>
                </div>

                {/* 1 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s1Title")}
                    </h2>
                    <p className="mb-3 font-medium text-ink/60">
                        {t("privacy.s1EmailLead")}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-ink/70 mb-4">
                        <li>{t("privacy.s1Email")}</li>
                        <li>{t("privacy.s1Username")}</li>
                        <li>{t("privacy.s1Password")}</li>
                    </ul>
                    <p className="mb-3 font-medium text-ink/60">
                        {t("privacy.s1OauthLead")}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-ink/70 mb-4">
                        <li>{t("privacy.s1OauthEmail")}</li>
                        <li>{t("privacy.s1OauthName")}</li>
                        <li>{t("privacy.s1OauthAvatar")}</li>
                    </ul>
                    <p className="text-ink/60">{t("privacy.s1OauthNote")}</p>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s2Title")}
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("privacy.s2Account")}</li>
                        <li>{t("privacy.s2Interact")}</li>
                        <li>{t("privacy.s2Email")}</li>
                        <li>{t("privacy.s2Abuse")}</li>
                        <li>{t("privacy.s2Improve")}</li>
                    </ul>
                    <p className="mt-3">{t("privacy.s2Note")}</p>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s3Title")}
                    </h2>
                    <p className="mb-3">{t("privacy.s3Lead")}</p>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("privacy.s3SignedIn")}</li>
                        <li>{t("privacy.s3Prefs")}</li>
                        <li>{t("privacy.s3Security")}</li>
                    </ul>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s4Title")}
                    </h2>
                    <p className="mb-3">{t("privacy.s4Lead")}</p>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("privacy.s4Hash")}</li>
                        <li>{t("privacy.s4Jwt")}</li>
                        <li>{t("privacy.s4Tls")}</li>
                        <li>{t("privacy.s4OpenSource")}</li>
                    </ul>
                </section>

                {/* 5 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s5Title")}
                    </h2>
                    <p>{t("privacy.s5Body")}</p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s6Title")}
                    </h2>
                    <p className="mb-3">{t("privacy.s6Lead")}</p>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>
                            <span className="text-ink/80">
                                {t("privacy.s6Google")}
                            </span>{" "}
                            {t("privacy.s6GoogleBody")}
                        </li>
                        <li>
                            <span className="text-ink/80">
                                {t("privacy.s6Github")}
                            </span>{" "}
                            {t("privacy.s6GithubBody")}
                        </li>
                        <li>
                            <span className="text-ink/80">
                                {t("privacy.s6Cloudflare")}
                            </span>{" "}
                            {t("privacy.s6CloudflareBody")}
                        </li>
                    </ul>
                    <p className="mt-3">{t("privacy.s6Note")}</p>
                </section>

                {/* 7 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s7Title")}
                    </h2>
                    <p className="mb-3">{t("privacy.s7Lead")}</p>
                    <ul className="list-disc list-inside space-y-2 text-ink/70">
                        <li>{t("privacy.s7Access")}</li>
                        <li>{t("privacy.s7Correct")}</li>
                        <li>{t("privacy.s7Delete")}</li>
                        <li>{t("privacy.s7Object")}</li>
                    </ul>
                    <p className="mt-3">{t("privacy.s7Note")}</p>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-ink font-bold text-base mb-3">
                        {t("privacy.s8Title")}
                    </h2>
                    <p>{t("privacy.s8Body")}</p>
                </section>

                <div className="border-t border-ink/10 pt-6 text-ink/40 text-xs">
                    {t("privacy.footer")}{" "}
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
