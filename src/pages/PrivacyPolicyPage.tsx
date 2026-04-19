import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";

export default function PrivacyPolicyPage() {
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
                        Privacy Policy
                    </h1>
                </div>
            </div>

            <div className="px-4 sm:px-6 py-8 max-w-full sm:max-w-2xl space-y-8 text-white/80 text-sm leading-relaxed">
                <div>
                    <p className="text-white/40 text-xs mb-4">
                        Last updated: April 2026
                    </p>
                    <p>
                        Your privacy is important to us. This Privacy Policy
                        explains what information TDN (The Developer Network)
                        collects, how we use it, and the choices you have. By
                        using TDN, you agree to the practices described in this
                        policy.
                    </p>
                </div>

                {/* 1 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        1. Information We Collect
                    </h2>
                    <p className="mb-3 font-medium text-white/60">
                        When you register with an email and password:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-white/70 mb-4">
                        <li>Email address</li>
                        <li>Username</li>
                        <li>
                            Password — stored as a secure one-way hash (argon2).
                            We never store or transmit your plain-text password.
                        </li>
                    </ul>
                    <p className="mb-3 font-medium text-white/60">
                        When you register or sign in with Google or GitHub:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-white/70 mb-4">
                        <li>Email address (provided by the OAuth provider)</li>
                        <li>Display name (if available)</li>
                        <li>Profile picture URL (if available)</li>
                    </ul>
                    <p className="text-white/60">
                        We do not receive, request, or store your Google or
                        GitHub password. These services do not share it — and we
                        never ask for it.
                    </p>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        2. How We Use Your Information
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>To create and manage your account</li>
                        <li>
                            To allow you to post content, follow users, and
                            interact with the community
                        </li>
                        <li>
                            To send transactional emails such as email
                            verification and password reset
                        </li>
                        <li>
                            To detect and prevent abuse, spam, or policy
                            violations
                        </li>
                        <li>To improve and maintain the platform</li>
                    </ul>
                    <p className="mt-3">
                        We do not sell your personal data to third parties. We
                        do not use your data for advertising profiling.
                    </p>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        3. Cookies & Local Storage
                    </h2>
                    <p className="mb-3">
                        By using TDN, you agree to our use of cookies and
                        browser local storage. We use these technologies to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>
                            Keep you signed in across sessions (authentication
                            tokens)
                        </li>
                        <li>Remember your preferences and interface state</li>
                        <li>
                            Maintain security by validating your session on each
                            request
                        </li>
                    </ul>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        4. Security
                    </h2>
                    <p className="mb-3">
                        We take security seriously. Here's what we do to protect
                        your data:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>
                            Passwords are hashed using bcrypt — a one-way
                            algorithm. Even in the unlikely event of a data
                            breach, your password cannot be recovered from the
                            stored hash.
                        </li>
                        <li>
                            Authentication uses short-lived JWT access tokens
                            paired with secure refresh tokens.
                        </li>
                        <li>
                            All traffic between your browser and our servers is
                            encrypted via HTTPS/TLS.
                        </li>
                        <li>
                            TDN is open source — our client-side code is
                            publicly auditable. We believe transparency
                            strengthens trust.
                        </li>
                    </ul>
                </section>

                {/* 5 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        5. Data Retention
                    </h2>
                    <p>
                        Your account data is retained as long as your account is
                        active. If you delete your account, your personal
                        information will be removed from our systems within a
                        reasonable period, except where retention is required by
                        law. Some content you posted (e.g. comments) may remain
                        in anonymized form.
                    </p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        6. Third-Party Services
                    </h2>
                    <p className="mb-3">
                        TDN integrates with the following third-party services:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>
                            <span className="text-white/80">Google OAuth</span>{" "}
                            — for sign-in. Governed by Google's Privacy Policy.
                        </li>
                        <li>
                            <span className="text-white/80">GitHub OAuth</span>{" "}
                            — for sign-in. Governed by GitHub's Privacy Policy.
                        </li>
                        <li>
                            <span className="text-white/80">
                                Cloudflare Workers
                            </span>{" "}
                            — for platform hosting and delivery.
                        </li>
                    </ul>
                    <p className="mt-3">
                        Each of these services has its own privacy policy. We
                        encourage you to review them.
                    </p>
                </section>

                {/* 7 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        7. Your Rights
                    </h2>
                    <p className="mb-3">You have the right to:</p>
                    <ul className="list-disc list-inside space-y-2 text-white/70">
                        <li>Access the personal data we hold about you</li>
                        <li>
                            Correct inaccurate information through your profile
                            settings
                        </li>
                        <li>Delete your account and associated data</li>
                        <li>
                            Object to processing of your data where applicable
                        </li>
                    </ul>
                    <p className="mt-3">
                        To exercise these rights, use the account settings or
                        contact us through the platform.
                    </p>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-white font-bold text-base mb-3">
                        8. Changes to This Policy
                    </h2>
                    <p>
                        We may update this Privacy Policy from time to time. We
                        will notify users of significant changes through the
                        platform. Continued use after updates constitutes
                        acceptance of the revised policy.
                    </p>
                </section>

                <div className="border-t border-white/10 pt-6 text-white/40 text-xs">
                    Questions about your privacy? Email us at{" "}
                    <a
                        href="mailto:contact@developernetwork.net"
                        className="hover:text-white/60 transition-colors"
                    >
                        contact@developernetwork.net
                    </a>
                    .
                </div>
            </div>
        </PageShell>
    );
}
