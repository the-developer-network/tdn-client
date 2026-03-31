import { useState, useRef } from "react";
import { createPost, uploadMedia } from "../api"; // uploadMedia'yı api.ts'ye eklediğini varsayıyorum

interface PostBoxProps {
  avatarUrl?: string;
  onPostCreated?: () => void;
}

export function PostBox({ avatarUrl, onPostCreated }: PostBoxProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dosya seçimi için gerekli state ve ref
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dosya seçildiğinde çalışan fonksiyon
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);

      // Önizleme URL'leri oluşturma (Local/Blob URL)
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Önizlemeden dosya silme
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
  if (!content.trim() && selectedFiles.length === 0) return;
  
  setIsSubmitting(true);
  try {
    let finalUrls: string[] = [];

    // 1. Tüm dosyaları tek bir istekte gönderiyoruz
    if (selectedFiles.length > 0) {
      const response = await uploadMedia(selectedFiles);
      console.log("Backend'den dönen medya bilgisi:", response);
      
      // Senin backend'in { data: { mediaUrls: [] } } dönüyor
      finalUrls = response.data.mediaUrls;
    }

    // 2. Alınan URL'ler ile postu oluştur
    await createPost(content, "COMMUNITY", finalUrls); 
    
    // Temizlik
    setContent("");
    setSelectedFiles([]);
    setPreviews([]);
    if (onPostCreated) onPostCreated();

  } catch (error) {
    console.error("İşlem hatası:", error);
    alert(error instanceof Error ? error.message : "Bir hata oluştu");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="p-4 border-b border-white/10 flex gap-4 bg-black/20">
      <img
        src={avatarUrl || "https://ui-avatars.com/api/?background=random"}
        alt="User"
        className="h-12 w-12 rounded-full object-cover border border-white/10"
      />
      <div className="flex-1 flex flex-col gap-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Bugün ne geliştiriyorsun?"
          className="w-full bg-transparent text-xl text-white placeholder-white/30 border-none focus:ring-0 resize-none min-h-[60px]"
        />

        {/* ÖNİZLEME ALANI */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {previews.map((url, index) => (
              <div key={index} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                <img src={url} className="w-full h-full object-contain" alt="Preview" />
                <button 
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-black transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex gap-x-2 text-blue-400">
            {/* Gizli Dosya Inputu */}
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              multiple 
              accept="image/*,video/*"
              onChange={handleFileChange}
            />

            {/* Medya Butonu */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-blue-400/10 transition-colors"
            >
              <span className="w-5 h-5 block"><ImageIcon /></span>
            </button>
            
            <ActionButton icon={<CodeIcon />} />
            <ActionButton icon={<EmojiIcon />} />
          </div>
          
          <button
            onClick={handlePublish}
            disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
            className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Yükleniyor..." : "Paylaş"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ActionButton = ({ icon }: { icon: React.ReactNode }) => (
  <button type="button" className="p-2 rounded-full hover:bg-blue-400/10 transition-colors">
    <span className="w-5 h-5 block">{icon}</span>
  </button>
);

const ImageIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CodeIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
const EmojiIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;