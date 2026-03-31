import Navbar from '../home/components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black selection:bg-white/20 selection:text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="pt-32 md:pt-40 flex-grow max-w-3xl mx-auto px-6 pb-32 w-full">
        
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">
            Last Updated: March 30, 2026
          </p>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. Data We Collect</h2>
            <p className="mb-4">
              At The Developer Network (TDN), we take your privacy seriously. When you use our platform, we collect the following information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Your email address, username, and password provided during registration.</li>
              <li>Your GitHub, X, or other social media account profiles if you choose to connect them.</li>
              <li>Your posts, comments, and interaction data on the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. How We Use Your Data</h2>
            <p>
              We use the data we collect solely to ensure the platform operates smoothly, to personalize your community experience, and to enhance your security. Your data is never sold to third parties for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. Cookies</h2>
            <p>
              We use essential cookies to keep your session active, remember your dark/light theme preferences, and analyze platform performance. You can delete cookies at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. Contact</h2>
            <p>
              For any questions regarding our privacy policy, data deletion requests, or suggestions, feel free to reach out:
              <a href="mailto:contact@developernetwork.net" className="text-white hover:underline ml-2">
                contact@developernetwork.net
              </a>
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}