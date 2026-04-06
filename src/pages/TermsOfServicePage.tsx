import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";

export default function TermsOfServicePage() {
    const navigate = useNavigate();

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
                        Terms of Service
                    </h1>
                </div>
            </div>

            <div className="px-6 py-8 max-w-2xl space-y-8 text-white/80 text-sm leading-relaxed">
                <div>
                    <p className="text-white/40 text-xs mb-4">
                        Last updated: April 2026
                    </p>
                    <p>
                        Welcome to TDN (The Developer Network). By accessing or
                        using TDN, you agree to be bound by these Terms of
                        Service. If you do not agree, please do not use the
                        platform.
                    </p>
                </div>

                {/* 1 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        1. Acceptance of Terms
                    </h2>
                    <p>
                        By creating an account, browsing the platform, or
                        interacting with any content on TDN, you acknowledge
                        that you have read, understood, and agree to these
                        Terms. These Terms apply to all users — registered or
                        not.
                    </p>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        2. Eligibility
                    </h2>
                    <p>
                        You must be at least 13 years of age to use TDN. By
                        using TDN, you represent that you meet this requirement.
                        Users under the age of 18 should use the platform only
                        with parental or guardian consent.
                    </p>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        3. Community Standards
                    </h2>
                    <p className="mb-3">
                        TDN is a professional developer community. All users are
                        expected to engage respectfully and constructively. The
                        following content is strictly prohibited:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>
                            Sexually explicit, pornographic, or erotic content
                            of any kind
                        </li>
                        <li>
                            Hate speech, harassment, threats, or discriminatory
                            language
                        </li>
                        <li>Spam, phishing, or deceptive content</li>
                        <li>
                            Malware, exploits, or content promoting unauthorized
                            access to systems
                        </li>
                        <li>
                            Content that violates any applicable law or
                            regulation
                        </li>
                        <li>
                            Impersonation of other individuals, organizations,
                            or entities
                        </li>
                    </ul>
                    <p className="mt-3">
                        Violation of these standards may result in content
                        removal, account suspension, or permanent ban without
                        notice.
                    </p>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        4. User Content
                    </h2>
                    <p className="mb-3">
                        You retain ownership of the content you post on TDN.
                        However, by posting content, you grant TDN a
                        non-exclusive, royalty-free, worldwide license to
                        display, distribute, and promote your content within the
                        platform.
                    </p>
                    <p>
                        You are solely responsible for the content you share.
                        TDN does not endorse, verify, or guarantee the accuracy
                        of user-generated content.
                    </p>
                </section>

                {/* 5 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        5. Open Source & Transparency
                    </h2>
                    <p className="mb-3">
                        TDN is an open source project. The source code for the
                        client application is publicly available. We believe in
                        transparency — you can inspect how the platform is built
                        and verify our security practices yourself.
                    </p>
                    <p>
                        Contributing to TDN's open source repositories is
                        welcome and governed by the respective repository's
                        license and contribution guidelines.
                    </p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        6. Account Security
                    </h2>
                    <p className="mb-3">
                        You are responsible for maintaining the confidentiality
                        of your account credentials. Do not share your password
                        with anyone. TDN will never ask for your password via
                        email or any communication channel.
                    </p>
                    <p>
                        If you suspect unauthorized access to your account,
                        please change your password immediately and contact
                        support.
                    </p>
                </section>

                {/* 7 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        7. Third-Party Authentication
                    </h2>
                    <p>
                        TDN supports sign-in via Google and GitHub (OAuth 2.0).
                        When you authenticate using these providers, TDN only
                        receives your public profile information (such as your
                        email address and display name) as permitted by those
                        services. Your Google or GitHub password is never
                        transmitted to or stored by TDN.
                    </p>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        8. Termination
                    </h2>
                    <p>
                        TDN reserves the right to suspend or terminate your
                        account at any time, with or without notice, for
                        violations of these Terms or for any conduct deemed
                        harmful to the community or platform. You may also
                        delete your account at any time through the platform
                        settings.
                    </p>
                </section>

                {/* 9 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        9. Disclaimer of Warranties
                    </h2>
                    <p>
                        TDN is provided "as is" without warranties of any kind,
                        either express or implied. We do not guarantee
                        uninterrupted access to the platform and are not liable
                        for any loss of data or damages resulting from use of
                        the service.
                    </p>
                </section>

                {/* 10 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        10. Changes to These Terms
                    </h2>
                    <p>
                        We may update these Terms from time to time. Continued
                        use of TDN after changes are posted constitutes
                        acceptance of the revised Terms. We encourage you to
                        review this page periodically.
                    </p>
                </section>

                <div className="border-t border-white/10 pt-6 text-white/40 text-xs">
                    Questions? Reach out to us via the platform or through our
                    open source repositories.
                </div>
            </div>
        </PageShell>
    );
}
