import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  MoreHorizontal, 
  Feather, 
  Image as ImageIcon, 
  Smile, 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Repeat, 
  BarChart2, 
  Share, 
  Bookmark,
  X,
  Sun,
  Moon,
  Trash2,
  Settings
} from 'lucide-react';

// --- CSS & Animations ---
const styles = `
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
.click-bounce:active { transform: scale(0.9); }
.nav-item-active { 
  font-weight: 800; 
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- Utility Functions ---

const formatNumber = (num) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString(); 
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
};

const processImage = (file, maxWidth = 600) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// --- Mock Data ---

const NAMES = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Jamie", "Morgan", "Quinn", "Avery", "Parker"];
const LAST_NAMES = ["Smith", "Doe", "Johnson", "Brown", "Williams", "Jones", "Miller", "Davis", "Garcia"];
const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam"
];
const BOT_CONTENT = [
  "Just tried that new coffee place. ☕ absolute game changer.",
  "Why does it feel like Monday on a Tuesday? 😩",
  "Frontend development is basically just centering divs and crying.",
  "Unpopular opinion: Pineapple belongs on pizza. 🍍🍕",
  "Just watched the season finale... I am speechless. 🎬",
  "Anyone else just scroll through their phone for hours?",
  "The sunset today is literally perfect. 🌅",
  "Coding late at night hits different. 🌙💻",
  "Crypto is confusing, but I'm here for the vibes. 🚀",
  "Can we normalize taking naps in the middle of the work day?"
];
const BOT_REPLIES = {
    generic: ["Agreed!", "Totally relatable.", "I felt that in my soul.", "Same here. 💯", "That's a mood.", "Interesting point."],
    positive: ["Love this energy! 🙌", "So true, keep shining!", "Pure genius.", "You nailed it.", "Inspiring!"],
    negative: ["Oof, that sounds rough. Hope things look up.", "Hang in there! 😟", "Sending good vibes.", "Stay strong, you got this."],
    tech: ["Is that a JS framework or a deep-fried meme?", "Gotta love the async life.", "Did you check the console?", "CSS is pain, flex is life."],
    food: ["Need a bite of that now!", "Pineapple on pizza is the only way.", "What coffee did you get?"],
};

// --- Components ---

const PeyzaLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm3.5-6H11v-2h3.5c1.1 0 2 .9 2 2s-.9 2-2 2z" />
  </svg>
);

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setAnimate(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className={`${animate ? 'scale-125 text-blue-500 font-bold' : 'scale-100'} transition-all duration-200 inline-block origin-center`}>
      {formatNumber(value)}
    </span>
  );
};

const NavItem = ({ icon: Icon, label, isActive, onClick, isMobile = false }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 p-3 rounded-full transition-all duration-200 ${
      isActive ? 'font-bold text-black dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'
    } ${isMobile ? 'justify-center w-full' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
  >
    <div className="relative">
      <Icon size={26} strokeWidth={isActive ? 3 : 2} className={isActive ? "scale-110" : ""} />
      {isActive && <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
    </div>
    {!isMobile && <span className="text-xl hidden xl:block">{label}</span>}
  </button>
);

const Button = ({ children, primary, onClick, className = "", disabled, danger, small }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 ${small ? 'text-sm px-3 py-1.5' : 'text-base'} ${
      primary 
        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' 
        : danger 
          ? 'bg-transparent border border-red-500 text-red-500 hover:bg-red-50'
          : 'bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white'
    } ${className}`}
  >
    {children}
  </button>
);

const Tweet = memo(({ tweet, onClick, onLike, onRetweet, onBookmark, onDelete, isReply = false, replyTo = null, userHandle = null }) => {
  const handleAction = (e, action) => {
    e.stopPropagation();
    action();
  };
  
  const handleTweetClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('img')) {
        return; // Avoid triggering detail view when clicking an interactive element
    }
    onClick();
  };

  const isUserPost = tweet.author.handle === userHandle;

  return (
    <div 
      onClick={handleTweetClick}
      className={`border-b border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors ${isReply ? 'animate-slide-up' : ''}`}
    >
      <div className="flex gap-3">
        <img 
          src={tweet.author.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-200"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm md:text-base flex-wrap overflow-hidden">
              <span className="font-bold truncate text-gray-900 dark:text-white hover:underline">{tweet.author.name}</span>
              {tweet.author.verified && (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500 fill-current flex-shrink-0">
                  <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.034-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path></g>
                </svg>
              )}
              <span className="text-gray-500 truncate">{tweet.author.handle}</span>
              <span className="text-gray-500 flex-shrink-0">·</span>
              <span className="text-gray-500 hover:underline flex-shrink-0">{timeAgo(tweet.timestamp)}</span>
            </div>
            {isUserPost && onDelete && (
                <button onClick={(e) => handleAction(e, onDelete)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} />
                </button>
            )}
          </div>

          {replyTo && (
              <p className="text-gray-500 text-sm mt-1">
                  Replying to <span className="text-blue-500 hover:underline">{replyTo}</span>
              </p>
          )}
          
          <div className="mt-1 text-[15px] md:text-[16px] text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-normal">
            {tweet.content}
          </div>

          {tweet.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <img src={tweet.image} alt="Attachment" className="w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}

          <div className="flex justify-between mt-3 text-gray-500 max-w-md w-full">
            <button onClick={(e) => handleAction(e, onClick)} className="flex items-center gap-1 group hover:text-blue-500 transition-colors click-bounce">
              <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <MessageCircle size={18} />
              </div>
              <span className="text-xs sm:text-sm"><AnimatedNumber value={tweet.stats.replies} /></span>
            </button>
            <button onClick={(e) => handleAction(e, onRetweet)} className={`flex items-center gap-1 group transition-colors click-bounce ${tweet.retweeted ? 'text-green-500' : 'hover:text-green-500'}`}>
              <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat size={18} />
              </div>
              <span className="text-xs sm:text-sm"><AnimatedNumber value={tweet.stats.retweets} /></span>
            </button>
            <button onClick={(e) => handleAction(e, onLike)} className={`flex items-center gap-1 group transition-colors click-bounce ${tweet.liked ? 'text-pink-600' : 'hover:text-pink-600'}`}>
              <div className="p-2 rounded-full group-hover:bg-pink-600/10 transition-colors">
                <Heart size={18} fill={tweet.liked ? "currentColor" : "none"} className={tweet.liked ? "animate-pop" : ""} />
              </div>
              <span className="text-xs sm:text-sm"><AnimatedNumber value={tweet.stats.likes} /></span>
            </button>
            <button className="flex items-center gap-1 group hover:text-blue-500 transition-colors click-bounce">
              <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <BarChart2 size={18} />
              </div>
              <span className="text-xs sm:text-sm"><AnimatedNumber value={tweet.stats.views} /></span>
            </button>
             <div className="flex gap-1">
                <button onClick={(e) => handleAction(e, onBookmark)} className={`group hover:text-blue-500 transition-colors click-bounce ${tweet.bookmarked ? 'text-blue-500' : ''}`}>
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                        <Bookmark size={18} fill={tweet.bookmarked ? "currentColor" : "none"} className={tweet.bookmarked ? "animate-pop" : ""}/>
                    </div>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Main Application ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null); // The post being viewed in detail
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileTab, setProfileTab] = useState('posts'); // 'posts', 'replies', 'likes'
  const scrollRef = useRef(null);
  
  // State for replying
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null); // The ID of the post being replied to

  // Default User
  const defaultUser = {
    name: "New Creator",
    handle: "@creator",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    banner: null,
    bio: "Simulating success since 2025.",
    followers: 1200,
    following: 42,
    joined: "December 2023",
    verified: false,
    location: "New York, NY"
  };

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('peyza_v2_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem('peyza_v2_posts');
    if (saved) return JSON.parse(saved);
    return Array.from({length: 6}, () => generateBotPost(true));
  });

  const [notifications, setNotifications] = useState(() => {
    return Array.from({length: 8}, (_, i) => ({
      id: i,
      type: ['like', 'follow', 'retweet'][Math.floor(Math.random() * 3)],
      user: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)]
      },
      content: "interacted with you",
      time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      read: false
    }));
  });

  // Refs
  const composeTextRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const replyTextRef = useRef(null);

  // --- Helpers ---
  function generateBotUser() {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return {
        name: `${name} ${last}`,
        handle: `@${name.toLowerCase()}${last.toLowerCase()}${Math.floor(Math.random() * 99)}`,
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        verified: Math.random() > 0.95
    };
  }

  function generateBotPost(isInitial = false) {
    const botUser = generateBotUser();
    const isViral = Math.random() > 0.95; 
    
    return {
      id: Date.now() + Math.random(),
      author: botUser,
      content: BOT_CONTENT[Math.floor(Math.random() * BOT_CONTENT.length)],
      timestamp: isInitial 
        ? new Date(Date.now() - Math.random() * 86400000 * 2).toISOString() 
        : new Date().toISOString(),
      image: Math.random() > 0.85 ? `https://picsum.photos/seed/${Math.random()}/500/300` : null,
      stats: {
        replies: isInitial ? Math.floor(Math.random() * 20) : 0,
        retweets: isInitial ? Math.floor(Math.random() * 50) : 0,
        likes: isInitial ? Math.floor(Math.random() * 200) : 0,
        views: isInitial ? Math.floor(Math.random() * 5000) : 0,
        bookmarks: isInitial ? Math.floor(Math.random() * 10) : 0,
      },
      viralityScore: isViral ? 3.0 : Math.random() * 0.5 + 0.1, 
      liked: false,
      retweeted: false,
      bookmarked: false,
      isBot: true,
      replies: []
    };
  }

  function generateBotReply(targetPost) {
    let replyText = BOT_REPLIES.generic[Math.floor(Math.random() * BOT_REPLIES.generic.length)];
    
    // Simple content analysis for context-aware reply
    const content = targetPost.content.toLowerCase();
    if (content.includes('coffee') || content.includes('pizza') || content.includes('food')) {
        replyText = BOT_REPLIES.food[Math.floor(Math.random() * BOT_REPLIES.food.length)];
    } else if (content.includes('coding') || content.includes('js') || content.includes('framework')) {
        replyText = BOT_REPLIES.tech[Math.floor(Math.random() * BOT_REPLIES.tech.length)];
    } else if (content.includes('rough') || content.includes('crying') || content.includes('monday')) {
        replyText = BOT_REPLIES.negative[Math.floor(Math.random() * BOT_REPLIES.negative.length)];
    }

    const botUser = generateBotUser();

    return {
        id: Date.now() + Math.random(),
        parentPostId: targetPost.id,
        author: botUser,
        content: replyText,
        timestamp: new Date().toISOString(),
        stats: { replies: 0, retweets: 0, likes: 0, views: 0, bookmarks: 0 },
        liked: false, retweeted: false, bookmarked: false,
        isBot: true,
        isReply: true,
        replyToHandle: targetPost.author.handle,
    };
  }

  // --- Effects ---

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('peyza_v2_user', JSON.stringify(user));
    localStorage.setItem('peyza_v2_posts', JSON.stringify(posts));
  }, [user, posts]);

  // --- ADVANCED SIMULATION ENGINE ---
  useEffect(() => {
    const interval = setInterval(() => {
      setPosts(currentPosts => {
        let newPosts = [...currentPosts];
        
        // Randomly add bot posts (Rare: 1 in 10 ticks)
        if (Math.random() < 0.1) {
            newPosts = [generateBotPost(), ...newPosts];
        }

        return newPosts.map(post => {
            const postAgeMins = (Date.now() - new Date(post.timestamp).getTime()) / 60000;
            if (postAgeMins > 2880) return post; // 48 hours dead

            // --- BOT REPLY LOGIC (ONLY TARGETS USER POSTS) ---
            if (!post.isBot) { // Targets only user-created posts
                if (Math.random() < 0.05 && postAgeMins < 60 && post.replies.filter(r => r.isBot).length < 3) {
                    const botReply = generateBotReply(post);
                    
                    // Increment the main post's reply count
                    post.stats.replies += 1;
                    
                    // Add a notification for the reply
                    if (user.handle !== botReply.author.handle) {
                        setNotifications(prev => [{
                            id: Date.now() + Math.random(),
                            type: 'reply',
                            user: botReply.author,
                            content: `replied to your post: "${botReply.content.substring(0, 30)}..."`,
                            time: new Date().toISOString(),
                            read: false
                        }, ...prev]);
                    }

                    return {
                        ...post,
                        replies: [botReply, ...post.replies],
                    };
                }
            }

            // --- VIEW GROWTH LOGIC ---
            // 1M followers = 1200 views / min. Tick is 4 sec.
            const followerFactor = (user.followers / 1000000) * (1200 / 15); // Scale view rate down for 4s interval
            
            // Apply randomness and virality
            const vScore = post.viralityScore || 0.1;
            const ageFactor = Math.max(0, 1 - (postAgeMins / 1440)); // Decay over 24h

            let viewInc = Math.floor((followerFactor * ageFactor) + (Math.random() * 2));
            
            if (vScore > 2.0) viewInc += Math.floor(Math.random() * 50);
            if (user.followers < 100 && Math.random() > 0.5) viewInc += 1;
            if (viewInc <= 0) return post;

            // Engagement ratios (based on views)
            const likeChance = 0.04 * vScore; // 4% like rate
            const rtChance = 0.008 * vScore; // 0.8% RT rate
            
            return {
                ...post,
                stats: {
                    ...post.stats,
                    views: post.stats.views + viewInc,
                    likes: Math.random() < likeChance ? post.stats.likes + 1 : post.stats.likes,
                    retweets: Math.random() < rtChance ? post.stats.retweets + 1 : post.stats.retweets,
                    replies: post.stats.replies + (Math.random() < (likeChance/30) ? 1 : 0),
                    bookmarks: Math.random() < (likeChance/4) ? post.stats.bookmarks + 1 : post.stats.bookmarks
                }
            };
        });
      });
    }, 4000); 

    return () => clearInterval(interval);
  }, [user.followers, user.handle]);

  // --- Handlers ---
  const handleCompose = async () => {
    const text = composeTextRef.current.value;
    const file = fileInputRef.current?.files[0];
    if (!text && !file) return;

    let imageData = null;
    if (file) imageData = await processImage(file);

    const newPost = {
      id: Date.now(),
      author: { ...user, verified: user.verified },
      content: text,
      timestamp: new Date().toISOString(),
      image: imageData,
      stats: { replies: 0, retweets: 0, likes: 0, views: 0, bookmarks: 0 },
      viralityScore: Math.random() * 2 + 0.5,
      liked: false, retweeted: false, bookmarked: false, isBot: false,
      replies: []
    };

    setPosts([newPost, ...posts]);
    setIsComposeOpen(false);
    composeTextRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    if(scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const handleReply = async () => {
    const text = replyTextRef.current.value;
    if (!text || !replyTarget) return;

    const targetPost = posts.find(p => p.id === replyTarget.id);
    if (!targetPost) return;

    const newReply = {
      id: Date.now() + Math.random(),
      parentPostId: replyTarget.id,
      author: { ...user, verified: user.verified },
      content: text,
      timestamp: new Date().toISOString(),
      stats: { replies: 0, retweets: 0, likes: 0, views: 0, bookmarks: 0 },
      liked: false, retweeted: false, bookmarked: false, isBot: false,
      isReply: true,
      replyToHandle: targetPost.author.handle,
    };
    
    setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === replyTarget.id) {
            return {
                ...p,
                stats: { ...p.stats, replies: p.stats.replies + 1 },
                replies: [newReply, ...p.replies]
            };
        }
        return p;
    }));

    setIsReplyOpen(false);
    setReplyTarget(null);
  };


  const handleStatToggle = (postId, statKey, activeKey) => {
    setPosts(posts.map(p => {
      // Check the main post
      if (p.id === postId) {
        const isActive = p[activeKey];
        const change = isActive ? -1 : 1;
        const viewChange = (!isActive && statKey === 'likes') ? 1 : 0;
        return {
          ...p,
          [activeKey]: !isActive,
          stats: {
            ...p.stats,
            [statKey]: Math.max(0, p.stats[statKey] + change),
            views: p.stats.views + viewChange
          }
        };
      }
      
      // Check replies
      if (p.replies && p.replies.length > 0) {
        const updatedReplies = p.replies.map(r => {
            if (r.id === postId) {
                const isActive = r[activeKey];
                const change = isActive ? -1 : 1;
                return {
                    ...r,
                    [activeKey]: !isActive,
                    stats: {
                        ...r.stats,
                        [statKey]: Math.max(0, r.stats[statKey] + change),
                    }
                };
            }
            return r;
        });
        return { ...p, replies: updatedReplies };
      }

      return p;
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = Object.fromEntries(formData);
    
    if (profileFileInputRef.current?.files[0]) {
      updates.avatar = await processImage(profileFileInputRef.current.files[0], 200);
    }
    if (bannerFileInputRef.current?.files[0]) {
      updates.banner = await processImage(bannerFileInputRef.current.files[0], 800);
    }
    setUser(prev => ({ ...prev, ...updates }));
    setEditProfileOpen(false);
  };

  const handleOpenReply = (post) => {
    setReplyTarget(post);
    setIsReplyOpen(true);
  }

  // Filtered posts for Profile Tabs
  const userPosts = useMemo(() => posts.filter(p => p.author.handle === user.handle && !p.isReply), [posts, user.handle]);
  const userReplies = useMemo(() => {
    return posts.flatMap(p => 
        p.replies 
            ? p.replies.filter(r => r.author.handle === user.handle) 
            : []
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [posts, user.handle]);

  const userLikes = useMemo(() => {
    const likedPosts = posts.filter(p => p.liked);
    const likedReplies = posts.flatMap(p => 
        p.replies 
            ? p.replies.filter(r => r.liked) 
            : []
    );
    return [...likedPosts, ...likedReplies].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [posts]);

  // --- Sub-Views ---

  const renderNotifications = () => (
    <div className="animate-slide-up">
        {notifications.map((n) => (
            <div key={n.id} className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex gap-4">
                <div className="text-3xl flex-shrink-0 pt-1">
                    {n.type === 'like' ? '❤️' : n.type === 'retweet' ? '🔁' : n.type === 'reply' ? '💬' : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                    <img src={n.user.avatar} className="w-8 h-8 rounded-full mb-2" />
                    <p className="text-black dark:text-white"><span className="font-bold">{n.user.name}</span> {n.content}</p>
                    <p className="text-gray-500 text-sm">{timeAgo(n.time)}</p>
                </div>
            </div>
        ))}
    </div>
  );

  const renderMessages = () => (
      <div className="animate-slide-up">
          <div className="p-4">
              <h2 className="font-bold text-2xl mb-4">Messages</h2>
              <div className="bg-gray-100 dark:bg-gray-900 rounded-full p-2 flex items-center gap-2 px-4 mb-4">
                  <Search size={18} className="text-gray-500"/>
                  <input placeholder="Search Direct Messages" className="bg-transparent outline-none w-full"/>
              </div>
              {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="flex gap-4 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Msg${i}`} className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                          <div className="flex justify-between">
                             <span className="font-bold">Friend {i+1}</span>
                             <span className="text-gray-500 text-sm">2h</span>
                          </div>
                          <p className="text-gray-500 truncate">Hey! Just saw your new post. It's doing great numbers! 🔥</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderSearch = () => {
    const filtered = posts.filter(p => 
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-slide-up">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur z-20">
                <div className="bg-gray-100 dark:bg-gray-900 rounded-full py-2 px-4 flex items-center gap-3 text-gray-500 focus-within:ring-2 ring-blue-500 transition-all">
                    <Search size={20} />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Peyza" 
                        className="bg-transparent outline-none text-black dark:text-white w-full h-full" 
                        autoFocus
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16}/></button>}
                </div>
            </div>
            
            {searchQuery ? (
                <div>
                    {filtered.length > 0 ? filtered.map(post => (
                        <Tweet 
                            key={post.id} 
                            tweet={post} 
                            onClick={() => setSelectedTweet(post)}
                            onLike={() => handleStatToggle(post.id, 'likes', 'liked')}
                            onRetweet={() => handleStatToggle(post.id, 'retweets', 'retweeted')}
                            onBookmark={() => handleStatToggle(post.id, 'bookmarks', 'bookmarked')}
                            userHandle={user.handle}
                        />
                    )) : (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-xl font-bold mb-2">No results for "{searchQuery}"</p>
                            <p>Try searching for something else.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-4">
                    <h3 className="font-extrabold text-xl mb-4">Trends for you</h3>
                    {[
                        { cat: "Technology · Trending", topic: "#PeyzaV2", posts: "1.2M" },
                        { cat: "Politics · Trending", topic: "Simulation Theory", posts: "85K" },
                        { cat: "Gaming", topic: "GTA VI", posts: "500K" },
                    ].map((trend, i) => (
                        <div key={i} className="py-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer -mx-4 px-4 transition-colors">
                                <div className="flex justify-between text-xs text-gray-500">
                                <span>{trend.cat}</span>
                                <MoreHorizontal size={14} />
                                </div>
                                <p className="font-bold text-md mt-1">{trend.topic}</p>
                                <p className="text-xs text-gray-500 mt-1">{trend.posts} posts</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  const renderProfileContent = () => {
    let content = [];
    let emptyMessage = "";

    switch (profileTab) {
        case 'posts':
            content = userPosts;
            emptyMessage = "You haven't posted anything yet.";
            break;
        case 'replies':
            content = userReplies;
            emptyMessage = "You haven't replied to any posts yet.";
            break;
        case 'likes':
            content = userLikes;
            emptyMessage = "You haven't liked any posts yet.";
            break;
    }

    if (content.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-xl font-bold mb-2">{emptyMessage}</p>
                <p>{profileTab === 'posts' ? "Start sharing your thoughts with the world!" : "Engage with posts to populate this tab."}</p>
            </div>
        );
    }

    return content.map(item => (
        <Tweet 
            key={item.id} 
            tweet={item} 
            onClick={() => setSelectedTweet(item)}
            onLike={() => handleStatToggle(item.id, 'likes', 'liked')}
            onRetweet={() => handleStatToggle(item.id, 'retweets', 'retweeted')}
            onBookmark={() => handleStatToggle(item.id, 'bookmarks', 'bookmarked')}
            onDelete={() => {
                if(window.confirm("Delete post?")) setPosts(posts.filter(p=>p.id!==item.id));
            }}
            isReply={item.isReply}
            replyTo={item.replyToHandle}
            userHandle={user.handle}
        />
    ));
  }

  const renderProfile = () => (
    <div className="pb-20 md:pb-0 animate-slide-up">
      <div className="h-32 md:h-48 bg-gray-700 relative">
        {user.banner && <img src={user.banner} className="w-full h-full object-cover" alt="banner" />}
      </div>
      <div className="px-4 flex justify-between items-start relative">
        <div className="-mt-16 md:-mt-20">
          <img 
            src={user.avatar} 
            className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white dark:border-black object-cover bg-white"
            alt="profile"
          />
        </div>
        <div className="mt-3">
          <Button onClick={() => setEditProfileOpen(true)}>Edit profile</Button>
        </div>
      </div>
      <div className="px-4 mt-4">
        <h1 className="font-extrabold text-xl text-black dark:text-white flex items-center gap-1">
          {user.name} 
          {user.verified && <svg className="w-5 h-5 text-blue-500 fill-current" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>}
        </h1>
        <p className="text-gray-500">{user.handle}</p>
        <p className="mt-3 text-black dark:text-gray-100 whitespace-pre-line leading-relaxed">{user.bio}</p>
        <div className="flex gap-4 mt-3 text-gray-500 text-sm">
          <span className="flex items-center gap-1"><MapPin size={16}/> {user.location}</span>
          <span className="flex items-center gap-1"><Calendar size={16}/> Joined {user.joined}</span>
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <p><span className="font-bold text-black dark:text-white">{formatNumber(user.following)}</span> <span className="text-gray-500">Following</span></p>
          <p><span className="font-bold text-black dark:text-white">{formatNumber(user.followers)}</span> <span className="text-gray-500">Followers</span></p>
        </div>
      </div>
      <div className="flex mt-4 border-b border-gray-200 dark:border-gray-800 sticky top-[53px] sm:top-0 bg-white/85 dark:bg-black/85 backdrop-blur z-20">
        {['posts', 'replies', 'likes'].map(tab => (
            <div 
                key={tab}
                onClick={() => setProfileTab(tab)}
                className={`flex-1 text-center p-4 font-bold cursor-pointer transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${profileTab === tab ? 'text-black dark:text-white' : 'text-gray-500'}`}
            >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {profileTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full bg-blue-500"></div>}
            </div>
        ))}
      </div>
      {renderProfileContent()}
    </div>
  );

  // --- Main Render ---

  // Find the selected post and its replies for detail view
  const currentSelectedTweet = posts.find(p => p.id === selectedTweet?.id);
  const repliesToSelectedTweet = currentSelectedTweet?.replies || [];
  
  // Set replies as liked/bookmarked etc. based on their own states.
  const allPosts = useMemo(() => {
    return posts.map(p => {
        // Find if this post is liked in the global 'liked' list
        const isLiked = p.liked; 
        const isRetweeted = p.retweeted;
        const isBookmarked = p.bookmarked;

        return {
            ...p,
            liked: isLiked,
            retweeted: isRetweeted,
            bookmarked: isBookmarked,
        };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [posts]);


  return (
    <div className={`min-h-screen bg-white text-black dark:bg-black dark:text-gray-100 transition-colors duration-300 ${darkMode ? 'dark' : ''} selection:bg-blue-500 selection:text-white font-sans`}>
      <style>{styles}</style>
      <div className="container mx-auto max-w-[1300px] flex">
        
        {/* --- LEFT SIDEBAR (Desktop) --- */}
        <header className="hidden sm:flex flex-col justify-between w-[80px] xl:w-[275px] h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 px-2 py-4">
          <div className="flex flex-col gap-2 items-center xl:items-start w-full">
            <div className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full w-fit mb-2 cursor-pointer transition-colors text-black dark:text-white" onClick={() => {setActiveTab('home'); setSelectedTweet(null);}}>
              <PeyzaLogo className="w-8 h-8" />
            </div>

            <NavItem icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => {setActiveTab('home'); setSelectedTweet(null);}} />
            <NavItem icon={Search} label="Explore" isActive={activeTab === 'search'} onClick={() => {setActiveTab('search'); setSelectedTweet(null);}} />
            <NavItem icon={Bell} label="Notifications" isActive={activeTab === 'notifications'} onClick={() => {setActiveTab('notifications'); setSelectedTweet(null);}} />
            <NavItem icon={Mail} label="Messages" isActive={activeTab === 'messages'} onClick={() => {setActiveTab('messages'); setSelectedTweet(null);}} />
            <NavItem icon={Bookmark} label="Bookmarks" isActive={activeTab === 'bookmarks'} onClick={() => {setActiveTab('bookmarks'); setSelectedTweet(null);}} />
            <NavItem icon={User} label="Profile" isActive={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setSelectedTweet(null); setProfileTab('posts');}} />

            <button 
              onClick={() => setIsComposeOpen(true)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 xl:px-8 xl:py-3.5 font-bold text-lg shadow-lg transition-transform active:scale-95 w-full xl:w-auto flex justify-center"
            >
              <span className="hidden xl:block">Post</span>
              <Feather className="xl:hidden" />
            </button>
          </div>

          <div className="mb-4 w-full">
             <div onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer justify-center xl:justify-start w-full transition-colors">
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                <span className="hidden xl:block font-medium">{darkMode ? "Light" : "Dark"}</span>
             </div>
             <div className="flex items-center gap-3 mt-4 p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors w-full" onClick={() => {setActiveTab('profile'); setSelectedTweet(null); setProfileTab('posts');}}>
                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-200" alt="mini-profile" />
                <div className="hidden xl:block text-sm overflow-hidden">
                    <p className="font-bold truncate">{user.name}</p>
                    <p className="text-gray-500 truncate">{user.handle}</p>
                </div>
                <MoreHorizontal className="hidden xl:block ml-auto text-gray-500" size={16} />
             </div>
          </div>
        </header>

        {/* --- MAIN FEED / CONTENT AREA --- */}
        <main ref={scrollRef} className="flex-1 w-full max-w-[600px] border-r border-gray-200 dark:border-gray-800 relative min-h-screen pb-20 sm:pb-0">
          
          {/* Mobile Top Bar */}
          <div className="sm:hidden sticky top-0 z-30 bg-white/85 dark:bg-black/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-3 flex justify-between items-center transition-colors">
             <img src={user.avatar} onClick={() => {setActiveTab('profile'); setProfileTab('posts');}} className="w-8 h-8 rounded-full object-cover" />
             <PeyzaLogo className="w-6 h-6 text-black dark:text-white" />
             <div onClick={() => setDarkMode(!darkMode)}>
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </div>
          </div>

          {/* Desktop Sticky Header */}
          <div className="hidden sm:block sticky top-0 z-30 bg-white/85 dark:bg-black/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors cursor-pointer" onClick={() => {if(scrollRef.current) scrollRef.current.scrollTo({top:0, behavior:'smooth'})}}>
             <div className="h-[53px] flex items-center px-4">
                {currentSelectedTweet ? (
                    <div className="flex items-center gap-4">
                        <button onClick={(e) => {e.stopPropagation(); setSelectedTweet(null);}} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                        <h2 className="font-bold text-xl">Post</h2>
                    </div>
                ) : (
                    <h2 className="font-bold text-xl capitalize">{activeTab}</h2>
                )}
             </div>
          </div>

          {/* CONTENT SWITCHER */}
          {currentSelectedTweet ? (
              // --- DETAIL VIEW ---
              <div className="animate-slide-up">
                  <div className="px-4 pt-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex gap-3 mb-4">
                        <img src={currentSelectedTweet.author.avatar} className="w-12 h-12 rounded-full" />
                        <div className="flex flex-col justify-center">
                            <p className="font-bold text-lg leading-tight flex items-center gap-1">{currentSelectedTweet.author.name} {currentSelectedTweet.author.verified && <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>}
                            </p>
                            <p className="text-gray-500">{currentSelectedTweet.author.handle}</p>
                        </div>
                    </div>
                    <p className="text-xl md:text-2xl mb-4 whitespace-pre-wrap leading-normal">{currentSelectedTweet.content}</p>
                    {currentSelectedTweet.image && <img src={currentSelectedTweet.image} className="w-full rounded-2xl mb-4 border border-gray-200 dark:border-gray-800"/>}
                    <p className="text-gray-500 text-sm py-4 border-t border-b border-gray-200 dark:border-gray-800">
                        {new Date(currentSelectedTweet.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {new Date(currentSelectedTweet.timestamp).toLocaleDateString()} · <span className="text-black dark:text-white font-bold"><AnimatedNumber value={currentSelectedTweet.stats.views}/></span> Views
                    </p>
                    <div className="flex gap-6 py-4 border-b border-gray-200 dark:border-gray-800 text-sm">
                        <p><span className="font-bold text-black dark:text-white"><AnimatedNumber value={currentSelectedTweet.stats.retweets}/></span> <span className="text-gray-500">Retweets</span></p>
                        <p><span className="font-bold text-black dark:text-white"><AnimatedNumber value={currentSelectedTweet.stats.likes}/></span> <span className="text-gray-500">Likes</span></p>
                        <p><span className="font-bold text-black dark:text-white"><AnimatedNumber value={currentSelectedTweet.stats.bookmarks}/></span> <span className="text-gray-500">Bookmarks</span></p>
                    </div>
                    <div className="flex justify-around py-3 border-b border-gray-200 dark:border-gray-800">
                        <MessageCircle size={22} onClick={() => handleOpenReply(currentSelectedTweet)} className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors click-bounce"/>
                        <Repeat size={22} onClick={() => handleStatToggle(currentSelectedTweet.id, 'retweets', 'retweeted')} className={`cursor-pointer transition-colors click-bounce ${currentSelectedTweet.retweeted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}/>
                        <Heart size={22} onClick={() => handleStatToggle(currentSelectedTweet.id, 'likes', 'liked')} className={`cursor-pointer transition-colors click-bounce ${currentSelectedTweet.liked ? 'text-pink-600 animate-pop' : 'text-gray-500 hover:text-pink-600'}`} fill={currentSelectedTweet.liked ? "currentColor" : "none"}/>
                        <Bookmark size={22} onClick={() => handleStatToggle(currentSelectedTweet.id, 'bookmarks', 'bookmarked')} className={`cursor-pointer transition-colors click-bounce ${currentSelectedTweet.bookmarked ? 'text-blue-500 animate-pop' : 'text-gray-500 hover:text-blue-500'}`} fill={currentSelectedTweet.bookmarked ? "currentColor" : "none"}/>
                        <Share size={22} className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors click-bounce"/>
                    </div>
                  </div>

                  {/* Reply Input */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex gap-3">
                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <input
                                placeholder="Post your reply"
                                onClick={() => handleOpenReply(currentSelectedTweet)}
                                className="w-full bg-transparent text-lg resize-none outline-none placeholder-gray-500 text-black dark:text-white py-2"
                                readOnly
                            />
                        </div>
                    </div>
                  </div>

                  {/* Replies List */}
                  {repliesToSelectedTweet.map(reply => (
                      <Tweet 
                        key={reply.id} 
                        tweet={reply} 
                        onClick={() => {}} // Keep current detail view active
                        onLike={() => handleStatToggle(reply.id, 'likes', 'liked')}
                        onRetweet={() => handleStatToggle(reply.id, 'retweets', 'retweeted')}
                        onBookmark={() => handleStatToggle(reply.id, 'bookmarks', 'bookmarked')}
                        isReply={true}
                        replyTo={currentSelectedTweet.author.handle}
                        userHandle={user.handle}
                      />
                  ))}
              </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <div className="animate-slide-up">
                    {/* Compose Box (Desktop/Home) */}
                    <div className="hidden sm:block p-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex gap-4">
                            <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1">
                                <textarea 
                                    ref={composeTextRef}
                                    className="w-full bg-transparent text-xl resize-none outline-none placeholder-gray-500 text-black dark:text-white"
                                    placeholder="What is happening?!"
                                    rows="2"
                                ></textarea>
                                <div className="flex justify-between items-center mt-2 border-t border-gray-200 dark:border-gray-800 pt-3">
                                    <div className="flex gap-0.5 text-blue-500">
                                        <label className="cursor-pointer p-2 hover:bg-blue-500/10 rounded-full transition-colors"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" /><ImageIcon size={20} /></label>
                                        <div className="p-2 hover:bg-blue-500/10 rounded-full cursor-pointer transition-colors"><Feather size={20} /></div>
                                        <div className="p-2 hover:bg-blue-500/10 rounded-full cursor-pointer transition-colors"><Smile size={20} /></div>
                                    </div>
                                    <Button primary onClick={handleCompose} small>Post</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Feed */}
                    {allPosts.map(post => (
                        <Tweet 
                            key={post.id} 
                            tweet={post} 
                            onClick={() => setSelectedTweet(post)}
                            onLike={() => handleStatToggle(post.id, 'likes', 'liked')}
                            onRetweet={() => handleStatToggle(post.id, 'retweets', 'retweeted')}
                            onBookmark={() => handleStatToggle(post.id, 'bookmarks', 'bookmarked')}
                            userHandle={user.handle}
                            onDelete={post.author.handle === user.handle ? () => {
                                if(window.confirm("Delete post?")) setPosts(posts.filter(p=>p.id!==post.id));
                            } : null}
                        />
                    ))}
                </div>
              )}
              {activeTab === 'search' && renderSearch()}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'bookmarks' && (
                  <div className="animate-slide-up">
                      {allPosts.filter(p => p.bookmarked).length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                              <p className="text-xl font-bold mb-2">Save posts for later</p>
                              <p>Bookmark posts to easily find them again in the future.</p>
                          </div>
                      ) : (
                          allPosts.filter(p => p.bookmarked).map(post => (
                            <Tweet 
                                key={post.id} 
                                tweet={post} 
                                onClick={() => setSelectedTweet(post)}
                                onLike={() => handleStatToggle(post.id, 'likes', 'liked')}
                                onRetweet={() => handleStatToggle(post.id, 'retweets', 'retweeted')}
                                onBookmark={() => handleStatToggle(post.id, 'bookmarks', 'bookmarked')}
                                userHandle={user.handle}
                            />
                          ))
                      )}
                  </div>
              )}
            </>
          )}

           {/* Mobile FAB */}
           {!isComposeOpen && !currentSelectedTweet && !isReplyOpen && activeTab === 'home' && (
              <button 
                onClick={() => setIsComposeOpen(true)}
                className="fixed bottom-20 right-4 sm:hidden bg-blue-500 text-white p-4 rounded-full shadow-xl z-40 active:scale-90 transition-transform"
              >
                  <Feather size={24} />
              </button>
           )}

        </main>

        {/* --- RIGHT SIDEBAR (Desktop) --- */}
        <aside className="hidden lg:block w-[350px] pl-8 py-4 h-screen sticky top-0 overflow-y-auto no-scrollbar">
            {activeTab !== 'search' && activeTab !== 'messages' && (
                <div className="bg-gray-100 dark:bg-gray-900 rounded-full py-2 px-4 flex items-center gap-3 text-gray-500 mb-6 focus-within:ring-2 ring-blue-500 transition-all">
                    <Search size={20} />
                    <input 
                        placeholder="Search Peyza" 
                        value={searchQuery}
                        onChange={(e) => {setSearchQuery(e.target.value); setActiveTab('search')}}
                        className="bg-transparent outline-none text-black dark:text-white w-full" 
                    />
                </div>
            )}

            <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-transparent dark:border-gray-800">
                <h3 className="font-extrabold text-xl mb-4 text-black dark:text-white">Trends for you</h3>
                {[
                    { cat: "Technology · Trending", topic: "#PeyzaV2", posts: "542K" },
                    { cat: "Politics · Trending", topic: "Simulators", posts: "45K" },
                    { cat: "Entertainment", topic: "The Matrix", posts: "12K" },
                    { cat: "Sports · Trending", topic: "World Cup", posts: "2.1M" }
                ].map((trend, i) => (
                    <div key={i} className="py-3 hover:bg-gray-200 dark:hover:bg-white/5 cursor-pointer -mx-4 px-4 transition-colors">
                         <div className="flex justify-between text-xs text-gray-500">
                            <span>{trend.cat}</span>
                            <MoreHorizontal size={14} />
                         </div>
                         <p className="font-bold text-md mt-0.5 text-black dark:text-white">{trend.topic}</p>
                         <p className="text-xs text-gray-500 mt-0.5">{trend.posts} posts</p>
                    </div>
                ))}
            </div>

            <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 border border-transparent dark:border-gray-800">
                <h3 className="font-extrabold text-xl mb-4 text-black dark:text-white">Who to follow</h3>
                 {[1, 2, 3].map(i => (
                     <div key={i} className="flex items-center gap-3 mb-4">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Follow${i}`} className="w-10 h-10 rounded-full bg-white"/>
                         <div className="flex-1 overflow-hidden">
                             <p className="font-bold text-sm hover:underline cursor-pointer text-black dark:text-white">Future Friend {i}</p>
                             <p className="text-gray-500 text-sm">@friend{i}</p>
                         </div>
                         <button className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-80 transition-opacity">Follow</button>
                     </div>
                 ))}
            </div>
        </aside>

        {/* --- MOBILE NAV --- */}
        <nav className="sm:hidden fixed bottom-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 flex justify-around py-3 z-50 transition-colors">
           <NavItem isMobile icon={Home} isActive={activeTab === 'home'} onClick={() => {setActiveTab('home'); setSelectedTweet(null);}} />
           <NavItem isMobile icon={Search} isActive={activeTab === 'search'} onClick={() => {setActiveTab('search'); setSelectedTweet(null);}}/>
           <NavItem isMobile icon={Bell} isActive={activeTab === 'notifications'} onClick={() => {setActiveTab('notifications'); setSelectedTweet(null);}}/>
           <NavItem isMobile icon={Mail} isActive={activeTab === 'messages'} onClick={() => {setActiveTab('messages'); setSelectedTweet(null);}}/>
        </nav>

        {/* --- COMPOSE MODAL --- */}
        {isComposeOpen && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex justify-center items-start sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
                <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-black w-full sm:w-[600px] h-full sm:h-auto sm:rounded-2xl p-4 flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setIsComposeOpen(false)} className="hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"><X size={20} /></button>
                        <Button primary onClick={handleCompose}>Post</Button>
                    </div>
                    <div className="flex gap-3 flex-1">
                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 flex flex-col">
                             <textarea 
                                ref={composeTextRef}
                                className="w-full bg-transparent text-xl resize-none outline-none placeholder-gray-500 flex-1 text-black dark:text-white"
                                placeholder="What is happening?!"
                                autoFocus
                             ></textarea>
                             <div className="border-t border-gray-200 dark:border-gray-800 py-3 mt-4 flex justify-between items-center text-blue-500">
                                <label className="cursor-pointer p-2 hover:bg-blue-500/10 rounded-full transition-colors">
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                                    <ImageIcon size={20} />
                                </label>
                                <div className="p-2 hover:bg-blue-500/10 rounded-full transition-colors"><Feather size={20} /></div>
                                <div className="p-2 hover:bg-blue-500/10 rounded-full transition-colors"><Smile size={20} /></div>
                                <div className="p-2 hover:bg-blue-500/10 rounded-full transition-colors"><MapPin size={20} /></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- REPLY MODAL --- */}
        {isReplyOpen && replyTarget && (
             <div className="fixed inset-0 z-[60] bg-black/50 flex justify-center items-start sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
                <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-black w-full sm:w-[600px] h-full sm:h-auto sm:rounded-2xl p-4 flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
                        <button onClick={() => setIsReplyOpen(false)} className="hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"><X size={20} /></button>
                        <Button primary onClick={handleReply}>Reply</Button>
                    </div>

                    {/* Original Post Preview */}
                    <div className="flex gap-3 mb-4">
                        <div className="flex flex-col items-center">
                            <img src={replyTarget.author.avatar} className="w-10 h-10 rounded-full object-cover" />
                            <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 my-1"></div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{replyTarget.author.name} <span className="text-gray-500">{replyTarget.author.handle}</span></p>
                            <p className="text-sm mt-1 mb-2 text-black dark:text-white">{replyTarget.content.length > 150 ? replyTarget.content.substring(0, 150) + '...' : replyTarget.content}</p>
                            <p className="text-blue-500 text-sm">Replying to <span className="text-blue-500">{replyTarget.author.handle}</span></p>
                        </div>
                    </div>

                    {/* Reply Input */}
                    <div className="flex gap-3 flex-1">
                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 flex flex-col">
                             <textarea 
                                ref={replyTextRef}
                                className="w-full bg-transparent text-xl resize-none outline-none placeholder-gray-500 flex-1 text-black dark:text-white"
                                placeholder="Post your reply"
                                autoFocus
                                rows="3"
                             ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- EDIT PROFILE MODAL --- */}
        {editProfileOpen && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex justify-center items-center p-4 animate-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-black w-full max-w-[600px] rounded-2xl p-4 max-h-[90vh] overflow-y-auto relative shadow-2xl">
                    <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-black z-10 pb-2">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setEditProfileOpen(false)} className="hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-full"><X size={20}/></button>
                            <h2 className="font-bold text-xl text-black dark:text-white">Edit Profile</h2>
                        </div>
                        <Button primary onClick={(e) => document.getElementById('editProfileForm').requestSubmit()}>Save</Button>
                    </div>
                    
                    <form id="editProfileForm" onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="relative mb-12">
                            <div className="h-32 bg-gray-700 relative group cursor-pointer overflow-hidden rounded-md">
                                {user.banner && <img src={user.banner} className="w-full h-full object-cover opacity-60" />}
                                <label className="absolute inset-0 flex items-center justify-center text-white cursor-pointer bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon />
                                    <input ref={bannerFileInputRef} type="file" className="hidden" accept="image/*" />
                                </label>
                            </div>
                            <div className="absolute -bottom-10 left-4">
                                <div className="w-24 h-24 rounded-full bg-gray-500 border-4 border-white dark:border-black relative group overflow-hidden cursor-pointer">
                                    <img src={user.avatar} className="w-full h-full object-cover opacity-60" />
                                    <label className="absolute inset-0 flex items-center justify-center text-white cursor-pointer bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ImageIcon size={20} />
                                        <input ref={profileFileInputRef} type="file" className="hidden" accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border border-gray-300 dark:border-gray-700 rounded p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                            <label className="text-xs text-gray-500 block">Name</label>
                            <input name="name" defaultValue={user.name} className="w-full bg-transparent outline-none text-black dark:text-white" required />
                        </div>
                        <div className="border border-gray-300 dark:border-gray-700 rounded p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                            <label className="text-xs text-gray-500 block">Bio</label>
                            <textarea name="bio" defaultValue={user.bio} className="w-full bg-transparent outline-none resize-none text-black dark:text-white" rows="3" />
                        </div>
                        <div className="border border-gray-300 dark:border-gray-700 rounded p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                            <label className="text-xs text-gray-500 block">Location</label>
                            <input name="location" defaultValue={user.location} className="w-full bg-transparent outline-none text-black dark:text-white" />
                        </div>
                        <div className="border border-gray-300 dark:border-gray-700 rounded p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                            <label className="text-xs text-gray-500 block">Follower Count (Simulation)</label>
                            <input name="followers" type="number" defaultValue={user.followers} className="w-full bg-transparent outline-none text-black dark:text-white" />
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

