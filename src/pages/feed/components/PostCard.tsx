// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PostCard({ user, content, type, createdAt, mediaUrls = [], likeCount = 0, commentCount = 0, isLiked = false }: any) {
  
  const getBadgeStyle = (type: string) => {
    switch(type) {
      case 'TECH_NEWS': return 'border-blue-500/40 text-blue-400 bg-blue-400/5';
      case 'SYSTEM_UPDATE': return 'border-green-500/40 text-green-400 bg-green-400/5';
      case 'JOB_POSTING': return 'border-orange-500/40 text-orange-400 bg-orange-400/5';
      default: return 'border-white/10 text-white/40 bg-white/5';
    }
  }

  const isVideo = (url: string) => url.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <article className="p-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer group">
      <div className="flex gap-4">
        <img 
          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`} 
          className="h-12 w-12 rounded-full border border-white/5 object-cover" 
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold hover:underline">{user.fullName || user.username}</span>
            <span className="text-white/40 text-sm">@{user.username}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-sm">{createdAt}</span>
            <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getBadgeStyle(type)}`}>
              {type}
            </span>
          </div>
          <p className="mt-2 text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{content}</p>
          
          {mediaUrls && mediaUrls.length > 0 && (
      <div className={`mt-3 rounded-2xl overflow-hidden border border-white/10 bg-[#080808] 
        ${mediaUrls.length > 1 ? 'grid grid-cols-2 gap-0.5' : 'block'}`}
      >
        {mediaUrls.map((url: string, index: number) => {
          const isVid = isVideo(url);
          
          return (
            <div 
              key={index} 
              className={`relative w-full overflow-hidden
                ${mediaUrls.length === 1 ? 'aspect-video' : 'aspect-square'} 
                ${mediaUrls.length === 3 && index === 0 ? 'row-span-2 h-full' : ''}`}
            >
              {isVid ? (
                <video 
                  src={url} 
                  controls 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <img 
                  src={url} 
                  alt={`Post content ${index}`} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                  loading="lazy"
                />
              )}
            </div>
          );
        })}
      </div>
)}

          <div className="flex justify-between mt-4 text-white/30 max-w-sm">
            <button className="flex items-center gap-2 hover:text-blue-400 transition-colors group/btn">
              <div className="p-2 rounded-full group-hover/btn:bg-blue-400/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <span className="text-xs">{commentCount}</span>
            </button>

            <button className={`flex items-center gap-2 transition-colors group/btn ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
              <div className="p-2 rounded-full group-hover/btn:bg-pink-500/10">
                <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <span className="text-xs">{likeCount}</span>
            </button>

            <button className="flex items-center gap-2 hover:text-green-500 transition-colors group/btn">
              <div className="p-2 rounded-full group-hover/btn:bg-green-500/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}