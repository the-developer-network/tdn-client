import { useEffect, useState, useCallback } from "react";
import { getPosts, getProfile } from "./api";
import { LeftBarSide } from "./components/LeftBarSide";
import { PostBox } from "./components/PostBox";
import { PostCard } from "./components/PostCard";
import AuthModal from "../auth/AuthModal";
import type { ProfileData, Post } from "./api-types";

const CATEGORY_MAP: Record<string, string | undefined> = {
  'HEPSI': undefined,
  'TOPLULUK': 'COMMUNITY',
  'HABERLER': 'TECH_NEWS',
  'GUNCELLEMELER': 'SYSTEM_UPDATE',
  'IS_ILANLARI': 'JOB_POSTING'
};

type FeedCategory = keyof typeof CATEGORY_MAP;

export default function Feed() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FeedCategory>('HEPSI');
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Profil ve Auth Durumunu Kontrol Etme (Tekrar çağrılabilir yapıldı)
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const profile = await getProfile();
        setProfileData(profile);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Profil yüklenemedi:", error);
        setIsLoggedIn(false);
        localStorage.removeItem("access_token");
      }
    } else {
      setIsLoggedIn(false);
      setProfileData(null);
    }
  }, []);

  // 2. Postları Yükleme Fonksiyonu
  const loadPosts = useCallback(async (category: FeedCategory) => {
    setIsLoading(true);
    try {
      const typeParam = CATEGORY_MAP[category];
      const data = await getPosts(1, 20, typeParam);
      setPosts(data);
    } catch (error) {
      console.error("Postlar yüklenirken hata oluştu:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. İlk Yükleme (Sayfa açıldığında)
  useEffect(() => {
    checkAuth();
    loadPosts('HEPSI'); // 'ALL' hatası düzeltildi
  }, [checkAuth, loadPosts]);

  // 4. Kategori Değiştiğinde Akışı Yenile
  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory, loadPosts]);

  // 5. Giriş Başarılı Olduğunda Çalışacak Callback
  const handleAuthSuccess = () => {
    checkAuth(); // Bilgileri anlık getir
    setIsAuthOpen(false); // Modalı kapat
    loadPosts(activeCategory); // Akışı tazele
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-black min-h-screen text-white flex justify-center">
      <div className="w-full max-w-[1300px] flex">
        
        <LeftBarSide 
          isLoggedIn={isLoggedIn}
          fullName={profileData?.fullName}
          username={profileData?.username}
          avatarUrl={profileData?.avatarUrl}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        <main className="ml-[275px] flex-1 border-x border-white/10 min-h-screen max-w-[600px]">
          <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-md border-b border-white/10">
            <div className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 relative group">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Profil veya içerik ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#16181c] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>

            <div className="flex overflow-x-auto no-scrollbar border-b border-white/5">
              {(Object.keys(CATEGORY_MAP) as FeedCategory[]).map((cat) => (
                <TabItem 
                  key={cat}
                  label={cat === 'IS_ILANLARI' ? 'İş İlanları' : cat.charAt(0) + cat.slice(1).toLowerCase()} 
                  active={activeCategory === cat} 
                  onClick={() => setActiveCategory(cat)} 
                />
              ))}
            </div>
          </header>

          {/* PostBox'a onPostCreated prop'u eklendi */}
          {isLoggedIn && (
            <PostBox 
              avatarUrl={profileData?.avatarUrl} 
              onPostCreated={() => loadPosts(activeCategory)} 
            />
          )}

          <div className="flex flex-col pb-20">
            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id}
                  user={{ 
                    fullName: post.author.username,
                    username: post.author.username,
                    avatarUrl: post.author.avatarUrl 
                  }}
                  content={post.content}
                  type={post.type}
                  createdAt={formatTime(post.createdAt)}
                  likeCount={post.likeCount}
                  commentCount={post.commentCount}
                  isLiked={post.isLiked}
                  mediaUrls={post.mediaUrls}
                />
              ))
            ) : (
              <div className="p-10 text-center text-white/40 italic">
                Bu kategoride henüz bir paylaşım yok.
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block w-[350px] p-4 sticky top-0 h-fit">
          <div className="bg-[#16181c] rounded-2xl p-4 border border-white/5">
              <h2 className="font-bold text-lg mb-4 font-serif text-white/90">Öne Çıkanlar</h2>
              <p className="text-white/30 text-sm">Geliştirici ekosisteminden en son haberler yakında burada.</p>
          </div>
        </aside>
      </div>

      {/* AuthModal'a onSuccess prop'u eklendi */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

function TabItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 min-w-fit px-6 py-4 text-sm font-medium transition-colors relative hover:bg-white/5 ${active ? 'text-white' : 'text-white/40'}`}
    >
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full mx-6" />}
    </button>
  );
}