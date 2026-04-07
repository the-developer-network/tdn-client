import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { SEO } from "../shared/components/ui/SEO";

export default function ContactPage() {
    const navigate = useNavigate();

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                title="Contact — TDN"
                description="Get in touch with the TDN team."
                canonical="/contact"
            />

            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-base font-bold text-white">Contact</h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-8 text-white/80 text-sm leading-relaxed">
                <div>
                    <p className="text-white/40 text-xs mb-6">
                        Last updated: April 2026
                    </p>
                    <p>
                        Have a question, feedback, or need to report an issue?
                        We'd love to hear from you. Reach out to the TDN team
                        using the contact information below.
                    </p>
                </div>

                <section>
                    <h2 className="text-white font-bold text-base mb-4">
                        General & Support Inquiries
                    </h2>
                    <a
                        href="mailto:contact@developernetwork.net"
                        className="inline-flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 hover:bg-zinc-800 hover:border-white/20 transition-all"
                    >
                        <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                        <span className="text-white font-medium">
                            contact@developernetwork.net
                        </span>
                    </a>
                    <p className="mt-4 text-white/50">
                        We aim to respond to all emails within 2–3 business
                        days.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        What Can You Contact Us About?
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>Account issues or access problems</li>
                        <li>Reporting abusive or policy-violating content</li>
                        <li>Privacy or data requests (GDPR / CCPA)</li>
                        <li>Bug reports and feature suggestions</li>
                        <li>Business or partnership inquiries</li>
                        <li>Advertising-related questions</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        Open Source
                    </h2>
                    <p className="text-white/70">
                        TDN is open source. For code contributions, bug reports,
                        or technical discussions, you can open an issue or pull
                        request directly in our GitHub repositories.
                    </p>
                </section>

                <div className="border-t border-white/10 pt-6 text-white/40 text-xs">
                    TDN — The Developer Network ·{" "}
                    <a
                        href="/privacy"
                        className="hover:text-white/60 transition-colors"
                    >
                        Privacy Policy
                    </a>{" "}
                    ·{" "}
                    <a
                        href="/terms"
                        className="hover:text-white/60 transition-colors"
                    >
                        Terms of Service
                    </a>
                </div>
            </div>
        </PageShell>
    );
}
