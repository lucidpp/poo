import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  ListMusic, Mic2, Heart, MoreHorizontal, Edit3, X, 
  Upload, Image as ImageIcon, Music, Plus, User, Disc,
  ChevronDown, Minimize2, Maximize2, Trash2, Settings,
  CheckCircle2, Share2, Users, Radio, Album
} from 'lucide-react';

/**
 * INDEXEDDB HELPER
 * Handles storage of large binary files (Audio/Images) and JSON data.
 */
const DB_NAME = 'LocalStreamerDB_V3_Peyza'; // Changed DB name for V3 update
const DB_VERSION = 2; // Increased version for new releases store

class DB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('artists')) db.createObjectStore('artists', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('releases')) db.createObjectStore('releases', { keyPath: 'id' }); // NEW
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
      request.onerror = () => reject(request.error);
    });
  }
}

const db = new DB();

/**
 * UTILITIES
 */
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};
const getReleaseTypeLabel = (type) => {
    switch(type) {
        case 'album': return 'Album';
        case 'ep': return 'EP';
        default: return 'Single';
    }
}

/**
 * COMPONENTS
 */

// Helper to load images from DB
const AsyncImage = ({ db, fileId, className, alt, fallback }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!fileId) return;
      try {
        const blob = await db.getFile(fileId);
        if (blob && active) {
          setSrc(URL.createObjectURL(blob));
        }
      } catch (e) {
        console.error("Failed to load image", e);
      }
    };
    load();
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [fileId, db]);

  if (!src) return fallback || <div className={`bg-zinc-800 ${className}`} />;
  return <img src={src} alt={alt || ""} className={className} />;
};

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-md transition-all font-medium ${active ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
  >
    <Icon size={24} />
    <span className="text-sm md:text-base">{label}</span>
  </button>
);

// --- MAIN APP ---
export default function App() {
  // Data State
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [releases, setReleases] = useState([]); // NEW STATE
  const [isReady, setIsReady] = useState(false);

  // UI State
  const [view, setView] = useState({ type: 'home', id: null }); // type: home, library, artist, playlist, release
  const [editMode, setEditMode] = useState(false);
  const [showPlayerFull, setShowPlayerFull] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(null); // {artistId} or null

  // Player State
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  
  const audioRef = useRef(null);
  const audioSrcRef = useRef(null);

  // Initialize DB
  useEffect(() => {
    const loadData = async () => {
      try {
        await db.init();
        const [loadedArtists, loadedSongs, loadedPlaylists, loadedReleases] = await Promise.all([
          db.getAll('artists'),
          db.getAll('songs'),
          db.getAll('playlists'),
          db.getAll('releases') // Load releases
        ]);
        setArtists(loadedArtists);
        setSongs(loadedSongs);
        setPlaylists(loadedPlaylists);
        setReleases(loadedReleases);
        setIsReady(true);
      } catch (e) {
        console.error("DB Init failed", e);
      }
    };
    loadData();
  }, []);

  // Audio Effect
  useEffect(() => {
    if (currentSong && isReady) {
      const playAudio = async () => {
        if (audioSrcRef.current) URL.revokeObjectURL(audioSrcRef.current);
        const blob = await db.getFile(currentSong.fileId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          audioSrcRef.current = url;
          if (audioRef.current) {
            audioRef.current.src = url;
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                console.warn("Autoplay blocked", e);
                setIsPlaying(false);
            }
          }
        }
      };
      playAudio();
    }
  }, [currentSong, isReady]);

  // Audio Event Handlers
  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };
  
  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onEnded = () => {
    handleNext();
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
      if (shuffle) {
         const nextIndex = Math.floor(Math.random() * queue.length);
         setCurrentSong(queue[nextIndex]);
      } else if (currentIndex < queue.length - 1) {
        setCurrentSong(queue[currentIndex + 1]);
      } else {
        setIsPlaying(false);
        audioRef.current.currentTime = 0;
      }
    }
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
      if (currentIndex > 0) {
        setCurrentSong(queue[currentIndex - 1]);
      }
    }
  };

  const playSong = (song, contextQueue) => {
    setQueue(contextQueue || [song]);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  // --- ACTIONS ---

  const handleUpdateArtist = async (updatedArtist) => {
    await db.put('artists', updatedArtist);
    setArtists(prev => prev.map(a => a.id === updatedArtist.id ? updatedArtist : a));
  };

  const handleUpdateSong = async (updatedSong) => {
    await db.put('songs', updatedSong);
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
  };
  
  const handleUpdateRelease = async (updatedRelease) => {
    await db.put('releases', updatedRelease);
    setReleases(prev => prev.map(r => r.id === updatedRelease.id ? updatedRelease : r));
  };

  const handleCreateArtist = async () => {
    const newArtist = {
      id: generateId(),
      name: "New Artist",
      bio: "Artist biography goes here...",
      listeners: 1000,
      followers: 500,
      bannerId: null,
      pfpId: null,
      isVerified: false
    };
    await db.put('artists', newArtist);
    setArtists([...artists, newArtist]);
    setView({ type: 'artist', id: newArtist.id });
  };

  const handleCreateRelease = async (artistId, name, type = 'single', coverId = null) => {
    const newRelease = {
        id: generateId(),
        artistId: artistId,
        name: name,
        coverId: coverId,
        releaseType: type, // single, ep, album
        songIds: [],
        releaseDate: new Date().toISOString().split('T')[0]
    };
    await db.put('releases', newRelease);
    setReleases([...releases, newRelease]);
    return newRelease;
  }

  const handleUploadFile = async (e, artistId, releaseId) => {
    const file = e.target.files[0];
    if (!file || !artistId) return;

    const fileId = generateId();
    await db.put('files', { id: fileId, blob: file, type: file.type });

    const newSong = {
        id: generateId(),
        artistId: artistId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        plays: 1000,
        fileId: fileId,
        collabIds: [],
        releaseId: releaseId,
    };
    await db.put('songs', newSong);
    setSongs([...songs, newSong]);

    // Update the release to include the new song
    const release = releases.find(r => r.id === releaseId);
    if (release) {
        const updatedRelease = { ...release, songIds: [...release.songIds, newSong.id] };
        await handleUpdateRelease(updatedRelease);
    }
  };

  const handleUpdateImage = async (e, parentId, entityType) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileId = generateId();
    await db.put('files', { id: fileId, blob: file, type: file.type });

    if (entityType === 'artist_pfp') {
      const artist = artists.find(a => a.id === parentId);
      handleUpdateArtist({ ...artist, pfpId: fileId });
    } else if (entityType === 'artist_banner') {
      const artist = artists.find(a => a.id === parentId);
      handleUpdateArtist({ ...artist, bannerId: fileId });
    } else if (entityType === 'playlist_cover') {
        const playlist = playlists.find(p => p.id === parentId);
        const updated = { ...playlist, coverId: fileId };
        await db.put('playlists', updated);
        setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else if (entityType === 'release_cover') {
        const release = releases.find(r => r.id === parentId);
        const updated = { ...release, coverId: fileId };
        await db.put('releases', updated);
    }
  };

  const handleCreatePlaylist = async (ownerId = 'user') => {
      const newPlaylist = {
          id: generateId(),
          name: ownerId === 'user' ? "My Playlist" : "Artist Playlist",
          description: "A cool collection of songs",
          coverId: null,
          songIds: [],
          ownerId: ownerId
      };
      await db.put('playlists', newPlaylist);
      setPlaylists([...playlists, newPlaylist]);
      if (ownerId === 'user') setView({ type: 'playlist', id: newPlaylist.id });
  }

  // --- RENDER ---

  if (!isReady) return (
    <div className="h-screen w-full bg-black text-white flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Loading Local Library...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans select-none">
      <audio 
        ref={audioRef} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      {/* TOP BAR */}
      <div className="h-16 flex items-center justify-between px-4 bg-black/95 z-20 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView({type: 'home', id: null})}>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Music size={18} className="text-black" />
            </div>
            <span className="font-bold text-xl hidden sm:block tracking-tighter">Peyza</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full border ${editMode ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}>
            <span>{editMode ? "Editor Mode" : "Listener Mode"}</span>
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`p-1.5 rounded-full transition-colors ${editMode ? 'bg-green-500 text-black' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}
            >
              <Edit3 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR (Desktop) */}
        <div className="hidden md:flex flex-col w-64 bg-black border-r border-white/5 p-4 gap-2 shrink-0">
          <NavBtn icon={User} label="Artists" active={view.type === 'home'} onClick={() => setView({ type: 'home', id: null })} />
          <NavBtn icon={ListMusic} label="Your Library" active={view.type === 'library'} onClick={() => setView({ type: 'library', id: null })} />
          
          <div className="h-[1px] bg-white/10 my-4" />
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2 px-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Playlists</p>
                {editMode && <button onClick={() => handleCreatePlaylist('user')}><Plus size={16} className="text-zinc-500 hover:text-white"/></button>}
            </div>
            {playlists.filter(p => p.ownerId === 'user').map(pl => (
                <button 
                    key={pl.id} 
                    onClick={() => setView({ type: 'playlist', id: pl.id })}
                    className={`flex items-center gap-3 w-full p-2 rounded-md transition-all text-left truncate ${view.id === pl.id && view.type === 'playlist' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                >
                    <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center shrink-0 overflow-hidden">
                        {pl.coverId ? <AsyncImage db={db} fileId={pl.coverId} className="w-full h-full object-cover"/> : <ListMusic size={14}/>}
                    </div>
                    <span className="truncate text-sm font-medium">{pl.name}</span>
                </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-zinc-900 relative pb-32 custom-scrollbar">
          {view.type === 'home' && (
            <div className="p-6 md:p-8 bg-gradient-to-b from-zinc-800 to-black min-h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">All Artists</h2>
                {editMode && (
                  <button onClick={handleCreateArtist} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform text-sm">
                    <Plus size={18} /> Add Artist
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {artists.map(artist => (
                  <div 
                    key={artist.id} 
                    onClick={() => setView({ type: 'artist', id: artist.id })}
                    className="bg-zinc-900/60 p-4 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer group border border-white/5 hover:border-white/10"
                  >
                    <div className="aspect-square mb-4 rounded-full overflow-hidden bg-zinc-800 shadow-xl relative group-hover:scale-105 transition-transform duration-300">
                      {artist.pfpId ? (
                        <AsyncImage db={db} fileId={artist.pfpId} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                          <User size={48} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold truncate group-hover:underline decoration-white">{artist.name}</h3>
                    <p className="text-sm text-zinc-400">Artist</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view.type === 'library' && (
              <div className="p-6 md:p-8 bg-gradient-to-b from-zinc-800 to-black min-h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Your Library</h2>
                    {editMode && (
                        <button onClick={() => handleCreatePlaylist('user')} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform text-sm">
                            <Plus size={18} /> New Playlist
                        </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {playlists.filter(p => p.ownerId === 'user').map(pl => (
                          <div 
                            key={pl.id}
                            onClick={() => setView({ type: 'playlist', id: pl.id })}
                            className="bg-zinc-900/60 p-4 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer group border border-white/5"
                          >
                               <div className="aspect-square mb-4 rounded-md overflow-hidden bg-zinc-800 shadow-lg relative group-hover:scale-105 transition-transform">
                                    {pl.coverId ? (
                                        <AsyncImage db={db} fileId={pl.coverId} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <ListMusic size={48} />
                                        </div>
                                    )}
                               </div>
                               <h3 className="font-bold truncate">{pl.name}</h3>
                               <p className="text-sm text-zinc-400">By You</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {view.type === 'artist' && (
            <ArtistProfile 
              artistId={view.id} 
              db={db}
              artists={artists} 
              songs={songs} 
              releases={releases}
              playlists={playlists}
              editMode={editMode}
              onUpdateArtist={handleUpdateArtist}
              onUpdateSong={handleUpdateSong}
              onUpdateRelease={handleUpdateRelease}
              onUploadFile={handleUploadFile}
              onUpdateImage={handleUpdateImage}
              onPlaySong={playSong}
              onCreatePlaylist={() => handleCreatePlaylist(view.id)}
              onCreateRelease={handleCreateRelease}
              currentSong={currentSong}
              isPlaying={isPlaying}
              togglePlay={togglePlay}
              onBack={() => setView({type: 'home', id: null})}
              setView={setView}
              setShowFileUploadModal={setShowFileUploadModal}
            />
          )}

          {view.type === 'playlist' && (
              <PlaylistView 
                playlistId={view.id}
                db={db}
                playlists={playlists}
                songs={songs}
                artists={artists}
                editMode={editMode}
                onUpdatePlaylist={async (p) => {
                    await db.put('playlists', p);
                    setPlaylists(prev => prev.map(old => old.id === p.id ? p : old));
                }}
                onUpdateImage={handleUpdateImage}
                onPlaySong={playSong}
                currentSong={currentSong}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                onDelete={async () => {
                    if (window.confirm("Delete this playlist?")) {
                        await db.delete('playlists', view.id);
                        setPlaylists(prev => prev.filter(p => p.id !== view.id));
                        setView({type: 'library', id: null});
                    }
                }}
              />
          )}
          
          {view.type === 'release' && (
              <ReleaseView
                  releaseId={view.id}
                  db={db}
                  releases={releases}
                  songs={songs}
                  artists={artists}
                  editMode={editMode}
                  onUpdateRelease={handleUpdateRelease}
                  onUpdateImage={handleUpdateImage}
                  onUpdateSong={handleUpdateSong}
                  onPlaySong={playSong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  togglePlay={togglePlay}
                  onDelete={async () => {
                      if (window.confirm("Delete this release and its songs?")) {
                           const releaseToDelete = releases.find(r => r.id === view.id);
                           if (releaseToDelete) {
                               // Delete songs associated with the release
                               await Promise.all(releaseToDelete.songIds.map(songId => db.delete('songs', songId)));
                           }
                           // Delete the release
                           await db.delete('releases', view.id);
                           setReleases(prev => prev.filter(r => r.id !== view.id));
                           setSongs(prev => prev.filter(s => s.releaseId !== view.id));
                           setView({type: 'artist', id: releaseToDelete.artistId});
                      }
                  }}
              />
          )}
        </div>
      </div>

      {/* MOBILE NAV BOTTOM */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex items-center justify-around h-16 z-50 pb-safe">
        <button className={`flex flex-col items-center gap-1 ${view.type === 'home' ? 'text-white' : 'text-zinc-500'}`} onClick={() => setView({type: 'home', id: null})}>
            <User size={20} />
            <span className="text-[10px]">Artists</span>
        </button>
        <button className={`flex flex-col items-center gap-1 ${view.type === 'library' ? 'text-white' : 'text-zinc-500'}`} onClick={() => setView({type: 'library', id: null})}>
            <ListMusic size={20} />
            <span className="text-[10px]">Library</span>
        </button>
      </div>

      {/* PLAYER BAR */}
      {currentSong && (
        <>
            <div className={`fixed bottom-[64px] md:bottom-0 left-0 right-0 md:left-0 bg-black md:bg-black border-t border-zinc-800 p-2 md:px-4 md:py-3 z-40 h-16 md:h-24 flex items-center justify-between transition-transform duration-300 ${showPlayerFull ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} onClick={(e) => {
                if (window.innerWidth < 768 && !e.target.closest('button')) setShowPlayerFull(true);
            }}>
            <div className="flex items-center gap-3 w-1/3 min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-800 rounded overflow-hidden shrink-0 relative group">
                    {(() => {
                        const artist = artists.find(a => a.id === currentSong.artistId);
                        return artist?.pfpId ? <AsyncImage db={db} fileId={artist.pfpId} className="w-full h-full object-cover" /> : <Music className="w-full h-full p-2 text-zinc-600" />;
                    })()}
                </div>
                <div className="overflow-hidden min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-sm md:text-base truncate">{currentSong.title}</h4>
                    <p className="text-xs md:text-sm text-zinc-400 truncate">
                        {artists.find(a => a.id === currentSong.artistId)?.name}
                    </p>
                </div>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex flex-col items-center gap-2 w-1/3">
                <div className="flex items-center gap-6">
                    <button className={`text-zinc-400 hover:text-white ${shuffle ? 'text-green-500' : ''}`} onClick={() => setShuffle(!shuffle)}><Shuffle size={18}/></button>
                    <button className="text-zinc-400 hover:text-white" onClick={handlePrev}><SkipBack size={20} fill="currentColor"/></button>
                    <button className="bg-white rounded-full p-2 text-black hover:scale-105 transition-transform" onClick={togglePlay}>
                        {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor" className="ml-0.5"/>}
                    </button>
                    <button className="text-zinc-400 hover:text-white" onClick={handleNext}><SkipForward size={20} fill="currentColor"/></button>
                    <button className="text-zinc-400 hover:text-white"><Repeat size={18}/></button>
                </div>
                <div className="w-full max-w-md flex items-center gap-2 text-xs text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <input 
                        type="range" 
                        min={0} 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={(e) => {
                            const time = Number(e.target.value);
                            audioRef.current.currentTime = time;
                            setCurrentTime(time);
                        }}
                        className="flex-1 h-1 bg-zinc-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Mobile Play Button */}
            <div className="md:hidden pr-2">
                 <button className="text-white p-2" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
            </div>

            <div className="hidden md:flex items-center justify-end gap-3 w-1/3">
                 {/* Volume placeholder */}
                 <Mic2 size={18} className="text-zinc-400 hover:text-white"/>
                 <Maximize2 size={18} className="text-zinc-400 hover:text-white cursor-pointer" onClick={() => setShowPlayerFull(true)}/>
            </div>
            </div>
            
            {/* FULL SCREEN OVERLAY */}
            <div className={`fixed inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black z-50 flex flex-col transition-all duration-300 transform ${showPlayerFull ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex items-center justify-between p-6 shrink-0">
                    <button onClick={() => setShowPlayerFull(false)} className="text-white"><ChevronDown size={32}/></button>
                    <span className="text-xs font-bold tracking-widest uppercase opacity-70">Playing on Peyza</span>
                    <button className="text-white"><MoreHorizontal size={24}/></button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0">
                     <div className="w-full max-w-md aspect-square bg-zinc-800 shadow-2xl rounded-md overflow-hidden relative mb-8">
                        {(() => {
                            const release = releases.find(r => r.id === currentSong.releaseId);
                            return release?.coverId ? <AsyncImage db={db} fileId={release.coverId} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music size={64} className="text-zinc-600"/></div>;
                        })()}
                     </div>

                     <div className="w-full max-w-md mb-2">
                        <div className="flex items-center justify-between">
                            <div className="overflow-hidden">
                                <h2 className="text-2xl font-bold truncate text-white">{currentSong.title}</h2>
                                <p className="text-lg text-zinc-400 truncate">{artists.find(a => a.id === currentSong.artistId)?.name}</p>
                            </div>
                            <Heart size={28} className="text-zinc-400 shrink-0"/>
                        </div>
                     </div>

                     <div className="w-full max-w-md mt-6">
                        <input 
                            type="range" 
                            min={0} 
                            max={duration || 100} 
                            value={currentTime} 
                            onChange={(e) => {
                                const time = Number(e.target.value);
                                audioRef.current.currentTime = time;
                                setCurrentTime(time);
                            }}
                            className="w-full h-1 bg-green-500 rounded-full appearance-none mb-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                        <div className="flex justify-between text-xs text-zinc-400 font-medium font-mono">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                     </div>

                     <div className="w-full max-w-md flex items-center justify-between mt-8">
                        <button onClick={() => setShuffle(!shuffle)} className={`${shuffle ? 'text-green-500' : 'text-zinc-400'}`}><Shuffle size={24}/></button>
                        <button onClick={handlePrev} className="text-white hover:scale-110 transition-transform"><SkipBack size={32} fill="currentColor"/></button>
                        <button onClick={togglePlay} className="bg-white text-black rounded-full p-4 hover:scale-105 transition-transform">
                            {isPlaying ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor" className="ml-1"/>}
                        </button>
                        <button onClick={handleNext} className="text-white hover:scale-110 transition-transform"><SkipForward size={32} fill="currentColor"/></button>
                        <button className="text-zinc-400"><Repeat size={24}/></button>
                     </div>
                </div>
            </div>
        </>
      )}

      {/* FILE UPLOAD MODAL */}
      {showFileUploadModal && (
         <FileUploadModal 
            artistId={showFileUploadModal.artistId}
            releases={releases}
            onClose={() => setShowFileUploadModal(null)}
            onCreateRelease={handleCreateRelease}
            onUploadFile={handleUploadFile}
            db={db}
         />
      )}
    </div>
  );
}

// --- FILE UPLOAD MODAL ---
function FileUploadModal({ artistId, releases, onClose, onCreateRelease, onUploadFile, db }) {
    const artistReleases = releases.filter(r => r.artistId === artistId);
    const [selectedReleaseId, setSelectedReleaseId] = useState(artistReleases[0]?.id || null);
    const [newReleaseName, setNewReleaseName] = useState('');
    const [newReleaseType, setNewReleaseType] = useState('single');
    const [newReleaseFile, setNewReleaseFile] = useState(null);
    const [isCreatingNew, setIsCreatingNew] = useState(artistReleases.length === 0);
    const fileInputRef = useRef(null);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let targetReleaseId = selectedReleaseId;
        
        if (isCreatingNew) {
            if (!newReleaseName) {
                alert("Please name the new release.");
                return;
            }
            
            // 1. Upload Cover Image if provided
            let coverId = null;
            if (newReleaseFile) {
                const coverFileId = generateId();
                await db.put('files', { id: coverFileId, blob: newReleaseFile, type: newReleaseFile.type });
                coverId = coverFileId;
            }

            // 2. Create the new release
            const newRelease = await onCreateRelease(artistId, newReleaseName, newReleaseType, coverId);
            targetReleaseId = newRelease.id;
        }

        if (targetReleaseId) {
            // 3. Upload the song and associate it
            onUploadFile({ target: { files: [file] } }, artistId, targetReleaseId);
            onClose();
        } else {
            alert("Please select or create a release first.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-md rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-xl flex items-center gap-2"><Music size={20}/> Upload New Track</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="p-6">
                    <div className="mb-4 flex gap-4">
                        <button 
                            onClick={() => setIsCreatingNew(false)}
                            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${!isCreatingNew ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                            disabled={artistReleases.length === 0}
                        >
                            Add to Existing
                        </button>
                         <button 
                            onClick={() => setIsCreatingNew(true)}
                            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${isCreatingNew ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                            Create New Release
                        </button>
                    </div>

                    {!isCreatingNew && artistReleases.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-zinc-300">Select Release</label>
                            <select 
                                value={selectedReleaseId || ''} 
                                onChange={(e) => setSelectedReleaseId(e.target.value)}
                                className="w-full p-2.5 rounded bg-zinc-800 border border-zinc-700 focus:ring-green-500 focus:border-green-500"
                            >
                                {artistReleases.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({getReleaseTypeLabel(r.releaseType)})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {isCreatingNew && (
                        <div className="mb-4 p-4 border border-zinc-700 rounded-lg bg-zinc-800">
                             <h4 className="font-bold mb-3 text-lg text-white">New Release Details</h4>
                             <div className="grid grid-cols-2 gap-3 mb-3">
                                <select 
                                    value={newReleaseType} 
                                    onChange={(e) => setNewReleaseType(e.target.value)}
                                    className="col-span-1 p-2.5 rounded bg-zinc-900 border border-zinc-700"
                                >
                                    <option value="single">Single</option>
                                    <option value="ep">EP</option>
                                    <option value="album">Album</option>
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Release Name (e.g., 'Future Waves')" 
                                    value={newReleaseName}
                                    onChange={(e) => setNewReleaseName(e.target.value)}
                                    className="col-span-1 p-2.5 rounded bg-zinc-900 border border-zinc-700"
                                />
                             </div>
                             <label className="block text-sm font-medium mb-2 text-zinc-300">Release Cover (Optional)</label>
                             <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => setNewReleaseFile(e.target.files[0])}
                                className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
                             />
                             {newReleaseFile && <p className="text-xs text-zinc-500 mt-1 truncate">Selected: {newReleaseFile.name}</p>}
                        </div>
                    )}

                    <label className="block text-sm font-medium mb-2 text-zinc-300">Audio File (MP3 or WAV)</label>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="audio/mp3, audio/wav, audio/mpeg" 
                        onChange={handleUpload}
                        className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-500"
                    />
                </div>
                <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                     <p className="text-xs text-zinc-500">Note: Files are saved locally in your browser's IndexedDB. They will persist between sessions.</p>
                </div>
            </div>
        </div>
      );
}

// --- ARTIST PROFILE ---
function ArtistProfile({ artistId, db, artists, songs, releases, playlists, editMode, onUpdateArtist, onUpdateSong, onUpdateRelease, onUploadFile, onUpdateImage, onPlaySong, onCreatePlaylist, onCreateRelease, currentSong, isPlaying, togglePlay, setView, setShowFileUploadModal }) {
  const artist = artists.find(a => a.id === artistId);
  
  // All songs where the artist is the main artist OR a collaborator
  const allArtistSongs = songs.filter(s => s.artistId === artistId || s.collabIds.includes(artistId));

  // Releases owned by this artist
  const ownedReleases = releases.filter(r => r.artistId === artistId).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  
  // Popular songs logic
  const popularSongs = [...allArtistSongs].sort((a,b) => b.plays - a.plays).slice(0, 5);

  const artistPlaylists = playlists.filter(p => p.ownerId === artistId);
  const [editingSongId, setEditingSongId] = useState(null);

  if (!artist) return null;

  const handleCreateNewSingle = async () => {
    const newRelease = await onCreateRelease(artistId, "New Single", 'single');
    setShowFileUploadModal({ artistId: artistId });
    // This will pre-select the new release if we implement that logic in the modal, 
    // but for now, we just open the modal.
  }

  return (
    <div className="min-h-full pb-10">
      {/* HEADER / BANNER */}
      <div className="relative h-60 md:h-80 w-full group">
         {artist.bannerId ? (
            <AsyncImage db={db} fileId={artist.bannerId} className="w-full h-full object-cover" />
         ) : (
            <div className="w-full h-full bg-gradient-to-b from-zinc-700 to-zinc-900" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-90" />
         
         {editMode && (
             <label className="absolute top-4 right-4 bg-black/50 p-2 rounded-full cursor-pointer hover:bg-black/70 text-white z-10">
                 <ImageIcon size={20} />
                 <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpdateImage(e, artist.id, 'artist_banner')} />
             </label>
         )}

         <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex items-end gap-6">
             <div className="w-32 h-32 md:w-48 md:h-48 rounded-full shadow-2xl overflow-hidden bg-zinc-800 relative group/pfp shrink-0">
                {artist.pfpId ? (
                    <AsyncImage db={db} fileId={artist.pfpId} className="w-full h-full object-cover" />
                ) : (
                    <User className="w-full h-full p-8 text-zinc-500" />
                )}
                {editMode && (
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/pfp:opacity-100 cursor-pointer transition-opacity">
                        <Upload size={32} className="text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpdateImage(e, artist.id, 'artist_pfp')} />
                    </label>
                )}
             </div>
             
             <div className="flex-1 mb-2">
                 <div className="flex items-center gap-2 mb-2">
                    {artist.isVerified && <CheckCircle2 size={24} className="text-blue-400 fill-blue-400/20" />}
                    <span className="text-sm font-bold uppercase tracking-widest hidden md:block">Verified Artist</span>
                 </div>
                 {editMode ? (
                     <input 
                        className="text-4xl md:text-7xl font-black bg-transparent border-b border-white/20 outline-none w-full"
                        value={artist.name}
                        onChange={(e) => onUpdateArtist({...artist, name: e.target.value})}
                     />
                 ) : (
                     <h1 className="text-4xl md:text-7xl font-black tracking-tight">{artist.name}</h1>
                 )}
                 
                 <div className="mt-4 flex flex-col md:flex-row gap-2 md:gap-6 text-sm md:text-base text-zinc-300 font-medium">
                     <span className="flex items-center gap-2">
                        {editMode ? (
                            <input type="number" value={artist.listeners} onChange={(e) => onUpdateArtist({...artist, listeners: parseInt(e.target.value)})} className="bg-transparent border-b w-24 outline-none" />
                        ) : formatNumber(artist.listeners)} 
                        monthly listeners
                     </span>
                     <span className="hidden md:inline">•</span>
                     <span className="flex items-center gap-2">
                        {editMode ? (
                            <input type="number" value={artist.followers} onChange={(e) => onUpdateArtist({...artist, followers: parseInt(e.target.value)})} className="bg-transparent border-b w-24 outline-none" />
                        ) : formatNumber(artist.followers)} 
                        Followers
                     </span>
                 </div>
             </div>
         </div>
      </div>

      <div className="p-6 md:p-8 bg-gradient-to-b from-zinc-900 to-black">
        {/* ACTION BAR */}
        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={() => popularSongs.length > 0 && onPlaySong(popularSongs[0], popularSongs)}
                className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform text-black shadow-lg"
            >
                {isPlaying && currentSong?.artistId === artist.id ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor" className="ml-1"/>}
            </button>
            <button className="px-6 py-2 rounded-full border border-zinc-500 hover:border-white font-bold text-sm tracking-wide transition-colors">
                Follow
            </button>
            {editMode && (
                 <button 
                     onClick={() => setShowFileUploadModal({ artistId: artist.id })}
                     className="ml-auto px-4 py-2 bg-green-700 hover:bg-green-600 rounded-full flex items-center gap-2 text-sm font-bold"
                 >
                    <Plus size={16} /> New Release/Track
                 </button>
            )}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT COLUMN */}
            <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Popular Tracks</h2>
                <div className="flex flex-col">
                    {popularSongs.map((song, i) => (
                        <div key={song.id} className="group flex items-center p-2 rounded hover:bg-white/10 transition-colors gap-4 text-sm md:text-base">
                            <span className="w-4 text-center text-zinc-400 font-mono">{i + 1}</span>
                            <div className="w-10 h-10 bg-zinc-800 shrink-0 flex items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => onPlaySong(song, popularSongs)}>
                                <div className="hidden group-hover:block absolute inset-0 bg-black/50 flex items-center justify-center"><Play size={16} fill="white"/></div>
                                <AsyncImage db={db} fileId={releases.find(r => r.id === song.releaseId)?.coverId} className="w-full h-full object-cover"/>
                                {currentSong?.id === song.id && isPlaying && <div className="group-hover:hidden absolute w-3 h-3 bg-green-500 rounded-full animate-pulse"/>}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className={`font-medium truncate ${currentSong?.id === song.id ? 'text-green-500' : 'text-white'}`}>{song.title}</span>
                                <span className="text-xs text-zinc-400 truncate">
                                    {song.artistId === artistId ? 'Main' : 'Feature'} • 
                                    {song.collabIds.length > 0 ? ` ft. ${song.collabIds.map(cid => artists.find(a => a.id === cid)?.name).filter(name => name).join(", ")}` : ' Solo'}
                                </span>
                            </div>
                            <div className="text-zinc-400 text-sm font-mono flex items-center gap-2">
                                {editMode ? (
                                    <input 
                                        type="number" 
                                        className="w-20 bg-transparent border-b border-zinc-600 text-right outline-none"
                                        value={song.plays} 
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onUpdateSong({...song, plays: parseInt(e.target.value)})}
                                    />
                                ) : formatNumber(song.plays)}
                                {editMode && (
                                    <button onClick={(e) => {e.stopPropagation(); setEditingSongId(song.id)}} className="p-1 hover:text-white"><Users size={14}/></button>
                                )}
                            </div>
                        </div>
                    ))}
                    {allArtistSongs.length === 0 && <div className="text-zinc-500 italic p-4">No songs or releases yet.</div>}
                </div>
                
                {/* DISCOGRAPHY / RELEASES */}
                 <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">Discography</h2>
                    {ownedReleases.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {ownedReleases.map(r => (
                                <div key={r.id} onClick={() => setView({type: 'release', id: r.id})} className="p-3 bg-zinc-900/50 rounded-md hover:bg-zinc-800 cursor-pointer transition-colors">
                                    <div className="aspect-square bg-zinc-800 mb-2 rounded overflow-hidden">
                                        {r.coverId ? <AsyncImage db={db} fileId={r.coverId} className="w-full h-full object-cover"/> : <Album className="w-full h-full p-6 text-zinc-700"/>}
                                    </div>
                                    <p className="font-bold truncate text-sm">{r.name}</p>
                                    <p className="text-xs text-zinc-400">{getReleaseTypeLabel(r.releaseType)} • {r.releaseDate.substring(0, 4)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-zinc-500 text-sm">No official releases yet.</p>
                    )}
                 </div>

                {/* ARTIST PLAYLISTS */}
                 <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Artist Playlists</h2>
                        {editMode && <button onClick={onCreatePlaylist} className="text-xs bg-zinc-800 px-3 py-1 rounded-full hover:bg-zinc-700">Create</button>}
                    </div>
                    {artistPlaylists.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {artistPlaylists.map(pl => (
                                <div key={pl.id} onClick={() => setView({type: 'playlist', id: pl.id})} className="p-3 bg-zinc-900/50 rounded-md hover:bg-zinc-800 cursor-pointer">
                                    <div className="aspect-square bg-zinc-800 mb-2 rounded overflow-hidden">
                                        {pl.coverId ? <AsyncImage db={db} fileId={pl.coverId} className="w-full h-full object-cover"/> : <Disc className="w-full h-full p-6 text-zinc-700"/>}
                                    </div>
                                    <p className="font-bold truncate text-sm">{pl.name}</p>
                                    <p className="text-xs text-zinc-400">Playlist</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-sm">No playlists yet.</p>
                    )}
                 </div>
            </div>

            {/* RIGHT COLUMN - BIO */}
            <div className="w-full md:w-80 shrink-0">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <div className="bg-zinc-900 rounded-lg p-4 md:p-6 relative group overflow-hidden">
                    {artist.pfpId && (
                         <div className="absolute inset-0 opacity-20">
                             <AsyncImage db={db} fileId={artist.pfpId} className="w-full h-full object-cover filter blur-sm"/>
                         </div>
                    )}
                    <div className="relative z-10">
                        {editMode ? (
                            <textarea 
                                className="w-full h-64 bg-transparent resize-none outline-none text-zinc-200 leading-relaxed"
                                value={artist.bio}
                                onChange={(e) => onUpdateArtist({...artist, bio: e.target.value})}
                            />
                        ) : (
                            <p className="text-zinc-200 leading-relaxed line-clamp-6 group-hover:line-clamp-none transition-all">{artist.bio}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* COLLAB MODAL */}
      {editingSongId && (
          <CollabModal 
              editingSongId={editingSongId}
              songs={songs}
              artists={artists}
              artistId={artistId}
              onClose={() => setEditingSongId(null)}
              onUpdateSong={onUpdateSong}
          />
      )}
    </div>
  );
}

// --- COLLAB MODAL ---
function CollabModal({ editingSongId, songs, artists, artistId, onClose, onUpdateSong }) {
    const song = songs.find(s => s.id === editingSongId);
    if (!song) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-md rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold">Edit Collaborators for "{song.title}"</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                    {artists.filter(a => a.id !== artistId).map(a => {
                        const isCollab = song.collabIds?.includes(a.id);
                        return (
                          <div key={a.id} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded mb-1">
                              <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
                                      {a.pfpId && <AsyncImage db={db} fileId={a.pfpId} className="w-full h-full object-cover"/>}
                                  </div>
                                  <span>{a.name}</span>
                              </div>
                              <button 
                                  onClick={() => {
                                      const newCollabs = isCollab 
                                          ? song.collabIds.filter(id => id !== a.id)
                                          : [...(song.collabIds || []), a.id];
                                      onUpdateSong({...song, collabIds: newCollabs});
                                  }}
                                  className={`px-3 py-1 rounded text-xs font-bold ${isCollab ? 'bg-green-500 text-black' : 'bg-zinc-700 text-white'}`}
                              >
                                  {isCollab ? 'Remove Collab' : 'Add Collab'}
                              </button>
                          </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

// --- RELEASE VIEW ---
function ReleaseView({ releaseId, db, releases, songs, artists, editMode, onUpdateRelease, onUpdateImage, onUpdateSong, onPlaySong, currentSong, isPlaying, togglePlay, onDelete }) {
    const release = releases.find(r => r.id === releaseId);
    if (!release) return null;

    const artist = artists.find(a => a.id === release.artistId);
    const releaseSongs = release.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    const totalStreams = releaseSongs.reduce((sum, song) => sum + song.plays, 0);

    return (
        <div className="min-h-full pb-10">
            <div className="flex flex-col md:flex-row gap-6 md:items-end p-6 md:p-8 bg-gradient-to-b from-zinc-800 to-zinc-900">
                <div className="w-48 h-48 md:w-60 md:h-60 shadow-2xl bg-zinc-800 shrink-0 group relative">
                    {release.coverId ? (
                        <AsyncImage db={db} fileId={release.coverId} className="w-full h-full object-cover shadow-lg" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            <Album size={64} />
                        </div>
                    )}
                    {editMode && (
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Upload size={32} className="text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpdateImage(e, release.id, 'release_cover')} />
                        </label>
                    )}
                </div>
                <div className="flex-1">
                    <p className="uppercase text-xs font-bold tracking-widest mb-2">{getReleaseTypeLabel(release.releaseType)}</p>
                    {editMode ? (
                        <input 
                            className="text-4xl md:text-7xl font-black bg-transparent border-b border-white/20 outline-none w-full mb-4"
                            value={release.name}
                            onChange={(e) => onUpdateRelease({...release, name: e.target.value})}
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">{release.name}</h1>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm font-bold mt-4">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-700">
                            {artist?.pfpId && <AsyncImage db={db} fileId={artist.pfpId} className="w-full h-full object-cover"/>}
                        </div>
                        <span className="hover:underline">{artist?.name}</span>
                        <span className="text-zinc-400 font-normal">• {release.releaseDate.substring(0, 4)}</span>
                        <span className="text-zinc-400 font-normal">• {formatNumber(totalStreams)} total streams</span>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/50 min-h-screen p-6 md:p-8">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => releaseSongs.length > 0 && onPlaySong(releaseSongs[0], releaseSongs)}
                            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform text-black shadow-lg"
                        >
                            {isPlaying && currentSong && releaseSongs.some(s => s.id === currentSong.id) ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor" className="ml-1"/>}
                        </button>
                        {editMode && (
                             <button onClick={onDelete} className="p-3 rounded-full text-zinc-400 hover:text-red-500 border border-transparent hover:border-red-500/50 transition-all">
                                 <Trash2 size={20} />
                             </button>
                        )}
                    </div>
                 </div>

                 <div className="flex flex-col">
                     <div className="flex text-zinc-400 border-b border-white/10 pb-2 mb-2 px-2 text-sm uppercase tracking-wider">
                         <span className="w-8">#</span>
                         <span className="flex-1">Title</span>
                         <span className="hidden md:block w-40 text-right">Streams</span>
                         <span className="w-8"></span>
                     </div>
                     {releaseSongs.map((song, i) => {
                         const isCurrent = currentSong?.id === song.id;
                         return (
                            <div key={i} className="group flex items-center p-2 rounded hover:bg-white/10 transition-colors gap-4 text-sm md:text-base">
                                <span className="w-8 text-zinc-400 font-mono text-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>{song.title}</p>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {song.artistId === release.artistId ? 'Main' : 'Feature'} • 
                                        {song.collabIds.length > 0 ? ` ft. ${song.collabIds.map(cid => artists.find(a => a.id === cid)?.name).filter(name => name).join(", ")}` : ' Solo'}
                                    </p>
                                </div>
                                
                                <div className="text-zinc-400 text-sm font-mono flex items-center gap-2">
                                    {editMode ? (
                                        <input 
                                            type="number" 
                                            className="w-20 bg-transparent border-b border-zinc-600 text-right outline-none"
                                            value={song.plays} 
                                            onChange={(e) => onUpdateSong({...song, plays: parseInt(e.target.value)})}
                                        />
                                    ) : (
                                        <span className="hidden md:block w-40 text-right text-zinc-500 font-mono text-xs">{formatNumber(song.plays)}</span>
                                    )}
                                </div>
                                <button className={`w-8 text-zinc-400 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={() => onPlaySong(song, releaseSongs)}>
                                    {isCurrent && isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                                </button>
                            </div>
                         );
                     })}
                 </div>
            </div>
        </div>
    );
}

// --- PLAYLIST VIEW ---
function PlaylistView({ playlistId, db, playlists, songs, artists, editMode, onUpdatePlaylist, onUpdateImage, onPlaySong, currentSong, isPlaying, togglePlay, onDelete }) {
    const playlist = playlists.find(p => p.id === playlistId);
    const [showSongPicker, setShowSongPicker] = useState(false);

    if (!playlist) return null;

    const playlistSongs = playlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    const ownerArtist = artists.find(a => a.id === playlist.ownerId);

    return (
        <div className="min-h-full pb-10">
            <div className="flex flex-col md:flex-row gap-6 md:items-end p-6 md:p-8 bg-gradient-to-b from-zinc-800 to-zinc-900">
                <div className="w-48 h-48 md:w-60 md:h-60 shadow-2xl bg-zinc-800 shrink-0 group relative">
                    {playlist.coverId ? (
                        <AsyncImage db={db} fileId={playlist.coverId} className="w-full h-full object-cover shadow-lg" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            <ListMusic size={64} />
                        </div>
                    )}
                    {editMode && (
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Upload size={32} className="text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpdateImage(e, playlist.id, 'playlist_cover')} />
                        </label>
                    )}
                </div>
                <div className="flex-1">
                    <p className="uppercase text-xs font-bold tracking-widest mb-2">Playlist</p>
                    {editMode ? (
                        <input 
                            className="text-4xl md:text-7xl font-black bg-transparent border-b border-white/20 outline-none w-full mb-4"
                            value={playlist.name}
                            onChange={(e) => onUpdatePlaylist({...playlist, name: e.target.value})}
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">{playlist.name}</h1>
                    )}
                    
                    {editMode ? (
                        <input 
                            className="text-zinc-400 bg-transparent border-b border-white/20 outline-none w-full mb-2"
                            value={playlist.description}
                            onChange={(e) => onUpdatePlaylist({...playlist, description: e.target.value})}
                        />
                    ) : (
                        <p className="text-zinc-400 text-sm font-medium mb-2">{playlist.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm font-bold mt-4">
                        {ownerArtist && (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-700">
                                     {ownerArtist.pfpId && <AsyncImage db={db} fileId={ownerArtist.pfpId} className="w-full h-full object-cover"/>}
                                </div>
                                <span className="hover:underline">{ownerArtist.name}</span>
                            </div>
                        )}
                        {!ownerArtist && <span>User</span>}
                        <span className="text-zinc-400 font-normal">• {playlistSongs.length} songs</span>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/50 min-h-screen p-6 md:p-8">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => playlistSongs.length > 0 && onPlaySong(playlistSongs[0], playlistSongs)}
                            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform text-black shadow-lg"
                        >
                            {isPlaying && currentSong && playlistSongs.some(s => s.id === currentSong.id) ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor" className="ml-1"/>}
                        </button>
                        {editMode && (
                             <button onClick={onDelete} className="p-3 rounded-full text-zinc-400 hover:text-red-500 border border-transparent hover:border-red-500/50 transition-all">
                                 <Trash2 size={20} />
                             </button>
                        )}
                    </div>
                    {editMode && (
                        <button 
                            onClick={() => setShowSongPicker(true)} 
                            className="bg-transparent border border-zinc-600 hover:border-white text-white px-4 py-2 rounded-full font-bold text-sm"
                        >
                            Add Songs
                        </button>
                    )}
                 </div>

                 <div className="flex flex-col">
                     <div className="flex text-zinc-400 border-b border-white/10 pb-2 mb-2 px-2 text-sm uppercase tracking-wider">
                         <span className="w-8">#</span>
                         <span className="flex-1">Title</span>
                         <span className="hidden md:block w-40 text-right">Plays</span>
                     </div>
                     {playlistSongs.map((song, i) => {
                          const isCurrent = currentSong?.id === song.id;
                          return (
                            <div key={i} className="group flex items-center p-2 rounded hover:bg-white/10 transition-colors gap-4 text-sm md:text-base">
                                <span className="w-8 text-zinc-400 font-mono text-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>{song.title}</p>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {artists.find(a => a.id === song.artistId)?.name}
                                        {song.collabIds && song.collabIds.length > 0 && ` ft. ${song.collabIds.map(cid => artists.find(a => a.id === cid)?.name).join(", ")}`}
                                    </p>
                                </div>
                                <span className="hidden md:block w-40 text-right text-zinc-500 font-mono text-xs">{formatNumber(song.plays)}</span>
                                {editMode && (
                                    <button 
                                        onClick={() => onUpdatePlaylist({...playlist, songIds: playlist.songIds.filter(sid => sid !== song.id)})}
                                        className="text-zinc-500 hover:text-white"
                                    >
                                        <X size={16}/>
                                    </button>
                                )}
                                <button className={`w-8 text-zinc-400 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={() => onPlaySong(song, playlistSongs)}>
                                    {isCurrent && isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                                </button>
                            </div>
                         );
                     })}
                     {playlistSongs.length === 0 && (
                         <div className="text-center py-20 text-zinc-500">
                             <p>This playlist is empty.</p>
                             {editMode && <p className="text-sm mt-2">Click "Add Songs" to build your vibe.</p>}
                         </div>
                     )}
                 </div>
            </div>

            {/* SONG PICKER MODAL */}
            {showSongPicker && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 w-full max-w-lg rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <h3 className="font-bold">Add to Playlist</h3>
                            <button onClick={() => setShowSongPicker(false)}><X size={20}/></button>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                            {songs.map(song => {
                                const isAdded = playlist.songIds.includes(song.id);
                                const artistName = artists.find(a => a.id === song.artistId)?.name;
                                return (
                                    <div key={song.id} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded mb-1">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-medium truncate">{song.title}</p>
                                            <p className="text-xs text-zinc-500 truncate">{artistName}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (isAdded) return;
                                                onUpdatePlaylist({...playlist, songIds: [...playlist.songIds, song.id]});
                                            }}
                                            disabled={isAdded}
                                            className={`px-3 py-1 rounded text-xs font-bold ${isAdded ? 'bg-zinc-700 text-zinc-500' : 'bg-white text-black hover:scale-105'}`}
                                        >
                                            {isAdded ? 'Added' : 'Add'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
