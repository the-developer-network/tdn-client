import Navbar from '../home/components/Navbar';
import Footer from '../components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-black selection:bg-white/20 selection:text-white font-sans flex flex-col">
      <Navbar />
      
      {/* Main Content */}
      <main className="pt-32 md:pt-40 flex-grow max-w-3xl mx-auto px-6 pb-32 w-full">
        
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">
            Last Updated: March 30, 2026
          </p>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. Acceptance</h2>
            <p>
              By accessing and using The Developer Network (TDN) platform, you are deemed to have fully accepted these terms of service. If you do not agree with any part of these terms, you should not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. User Responsibilities</h2>
            <p className="mb-4">
              To maintain the quality and safety of our developer community, all users are required to comply with the following rules:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Use respectful language toward other members. Hate speech and harassment are strictly prohibited.</li>
              <li>Do not share malware, viruses, or code that enables unauthorized access such as exploits.</li>
              <li>Do not post spam, irrelevant advertisements, or fraudulent job listings.</li>
              <li>Do not share proprietary source code containing copyright violations or code that does not belong to you without permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. Account Suspension & Termination</h2>
            <p>
              TDN administration reserves the right to suspend or permanently delete accounts that violate the terms of service without prior notice. Users may also request the deletion of their accounts at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. Disclaimer</h2>
            <p>
              Code snippets, job listings, and external links shared on the platform are the sole responsibility of their respective users. TDN does not guarantee the accuracy, security, or uninterrupted availability of any shared content.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}