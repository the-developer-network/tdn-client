import Navbar from '../home/components/Navbar';
import Footer from '../home/components/Footer';

export default function Terms() {
  return (
    // Main wrapper matching the dark aesthetic
    <div className="min-h-screen bg-black selection:bg-white/20 selection:text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="pt-32 md:pt-40 flex-grow max-w-3xl mx-auto px-6 pb-32 w-full">
        
        {/* Page Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">
            Kullanım Koşulları
          </h1>
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">
            Son Güncelleme: 30 Mart 2026
          </p>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. Kabul Edilme</h2>
            <p>
              The Developer Network (TDN) platformuna erişerek ve kullanarak, bu kullanım koşullarını tamamen kabul etmiş sayılırsınız. Şartların herhangi bir bölümünü kabul etmiyorsanız, platformu kullanmamalısınız.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. Kullanıcı Yükümlülükleri</h2>
            <p className="mb-4">
              Geliştirici topluluğumuzun kalitesini ve güvenliğini korumak adına tüm kullanıcılar aşağıdaki kurallara uymakla yükümlüdür:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>Diğer üyelere karşı saygılı bir dil kullanmak. Nefret söylemi ve taciz kesinlikle yasaktır.</li>
              <li>Zararlı yazılım, virüs veya yetkisiz erişim sağlayan kodlar (exploit vb.) paylaşmamak.</li>
              <li>Spam, alakasız reklam veya sahte iş ilanı yayınlamamak.</li>
              <li>Telif hakkı ihlali içeren veya size ait olmayan özel kaynak kodlarını izinsiz paylaşmamak.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. Hesap İptali ve Fesih</h2>
            <p>
              TDN yönetimi, kullanım koşullarını ihlal eden hesapları önceden haber vermeksizin askıya alma veya kalıcı olarak silme hakkını saklı tutar. Kullanıcılar da diledikleri zaman hesaplarının silinmesini talep edebilirler.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. Sorumluluk Reddi</h2>
            <p>
              Platformda paylaşılan kod parçacıkları, iş ilanları veya dış bağlantılar kullanıcıların kendi sorumluluğundadır. TDN, paylaşılan içeriklerin doğruluğunu, güvenliğini veya kesintisiz hizmeti garanti etmez.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}