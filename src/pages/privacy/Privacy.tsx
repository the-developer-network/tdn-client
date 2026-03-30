import Navbar from '../home/components/Navbar';
import Footer from '../home/components/Footer';

export default function Privacy() {
  return (
    // Main wrapper matching the dark aesthetic
    <div className="min-h-screen bg-black selection:bg-white/20 selection:text-white font-sans flex flex-col">
      {/* Reusing the Navbar from the home module */}
      <Navbar />
      
      {/* Main content area with strict max-width for optimal reading experience */}
      <main className="pt-32 md:pt-40 flex-grow max-w-3xl mx-auto px-6 pb-32 w-full">
        
        {/* Page Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">
            Gizlilik Politikası
          </h1>
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">
            Son Güncelleme: 30 Mart 2026
          </p>
        </div>

        {/* Content Typography Strategy: High line-height, text-white/70 for body, white for headings */}
        <div className="space-y-12 text-white/70 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. Topladığımız Veriler</h2>
            <p className="mb-4">
              The Developer Network (TDN) olarak gizliliğinize büyük önem veriyoruz. Platformumuzu kullandığınızda aşağıdaki bilgileri toplarız:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Kayıt aşamasında sağladığınız e-posta adresi, kullanıcı adı ve parola.</li>
              <li>Platforma bağladığınız takdirde GitHub, X veya diğer sosyal medya hesap profilleriniz.</li>
              <li>Platform üzerindeki gönderileriniz, yorumlarınız ve etkileşim verileriniz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. Verilerin Kullanımı</h2>
            <p>
              Topladığımız bu verileri yalnızca platformun sağlıklı çalışmasını sağlamak, topluluk deneyiminizi kişiselleştirmek ve güvenliğinizi artırmak amacıyla kullanıyoruz. Verileriniz kesinlikle reklam amacıyla üçüncü şahıslara satılmaz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. Çerezler (Cookies)</h2>
            <p>
              Oturumunuzu açık tutmak, karanlık/aydınlık tema tercihlerinizi hatırlamak ve platform performansını analiz etmek için temel çerezler kullanmaktayız. Tarayıcı ayarlarınızdan çerezleri dilediğiniz zaman silebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. İletişim</h2>
            <p>
              Gizlilik politikamız ile ilgili tüm sorularınız, veri silme talepleriniz veya önerileriniz için bizimle iletişime geçebilirsiniz: 
              <a href="mailto:contact@developernetwork.net" className="text-white hover:underline ml-2">
                contact@developernetwork.net
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Reusing the Footer from the home module */}
      <Footer />
    </div>
  );
}