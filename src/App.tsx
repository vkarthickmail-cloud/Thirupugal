import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Sparkles, 
  Volume2, 
  RefreshCw, 
  Search, 
  Info, 
  ExternalLink, 
  Play, 
  ChevronRight, 
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  VolumeX,
  FileText,
  Compass,
  Flame,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SONGS_DATA } from "./songsData";
import { SHIVA_SONGS_DATA } from "./shivaSongsData";
import { CANONICAL_CATALOG, TEMPLE_CATEGORIES } from "./catalogData";
import { Song, ChatMessage, FamousSong, ShivaHymn, TirumuraiVolume } from "./types";
import { FAMOUS_SONGS } from "./famousSongsData";
import { TIRUMURAI_VOLUMES, SHIVA_FAMOUS_HYMNS } from "./shivaData";
const muruganArunagiriImg = "/src/assets/images/murugan_arunagiri_1781891765875.jpg";
const shivaMuruganImg = "/src/assets/images/shiva_murugan_kailash_palani_1781894784108.jpg";

export default function App() {
  const [songs, setSongs] = useState<Song[]>(() => [...SONGS_DATA, ...SHIVA_SONGS_DATA]);
  const [selectedSong, setSelectedSong] = useState<Song>(() => SHIVA_SONGS_DATA[0]);
  const [activeHeroImage, setActiveHeroImage] = useState<"murugan" | "shiva">("shiva");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTTS, setLoadingTTS] = useState<string | null>(null); // tracks active TTS line index or 'total'
  const [apiStatus, setApiStatus] = useState<{ hasKey: boolean; checked: boolean }>({ hasKey: false, checked: false });
  const [ttsVoice, setTtsVoice] = useState("Kore"); // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
  
  // Sidebar navigation and catalog states
  const [selectedDeity, setSelectedDeity] = useState<"shiva" | "murugan">("shiva");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"library" | "famous" | "shiva" | "catalog">("shiva");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [selectedTempleFilter, setSelectedTempleFilter] = useState("All Temples");
  const [directNumberInput, setDirectNumberInput] = useState("");

  // Famous 100 states
  const [famousSearchQuery, setFamousSearchQuery] = useState("");
  const [shivaSearchQuery, setShivaSearchQuery] = useState("");
  const [selectedFamousGenre, setSelectedFamousGenre] = useState<string>("All");

  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customLoadError, setCustomLoadError] = useState<string | null>(null);
  const [customLoadSuccess, setCustomLoadSuccess] = useState(false);

  // Ask Scholar states (nested, compact AI assistant)
  const [isScholarExpanded, setIsScholarExpanded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatModel, setChatModel] = useState<"flash" | "pro">("flash");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio references for TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Check API configuration on mount
  useEffect(() => {
    fetch("/api/config-status")
      .then((res) => res.json())
      .then((data) => {
        setApiStatus({ hasKey: data.hasKey, checked: true });
      })
      .catch((err) => {
        console.error("Error checking API status:", err);
        setApiStatus({ hasKey: false, checked: true });
      });
  }, []);

  // Scroll chat window appropriately
  useEffect(() => {
    if (isScholarExpanded) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isScholarExpanded]);

  // Load custom song dynamically from the archives using Gemini
  const loadCustomSong = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoadingCustom(true);
    setCustomLoadError(null);
    setCustomLoadSuccess(false);

    try {
      const res = await fetch("/api/load-custom-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });

      const data = await res.json();
      if (res.status !== 200 || data.error) {
        throw new Error(data.error || "Could not retrieve this hymn from the central archives.");
      }

      // Check if song already exists in local list, update or append
      const existsIdx = songs.findIndex((s) => s.id === data.id);
      let updatedSongs = [...songs];
      if (existsIdx > -1) {
        updatedSongs[existsIdx] = data;
      } else {
        updatedSongs = [...updatedSongs, data];
      }
      setSongs(updatedSongs);
      setSelectedSong(data);
      setCustomLoadSuccess(true);
      
      // Clear success notification after 4 seconds
      setTimeout(() => setCustomLoadSuccess(false), 4000);
    } catch (err: any) {
      setCustomLoadError(err.message || "An error occurred retrieving the requested hymn. Ensure GEMINI_API_KEY is configured.");
    } finally {
      setLoadingCustom(false);
    }
  };

  // Filter songs by search input and chosen category
  const filteredSongs = songs.filter((s) => {
    const isSongShiva = s.deity === "shiva";
    const matchesDeity = selectedDeity === "shiva" ? isSongShiva : !isSongShiva;
    if (!matchesDeity) return false;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = (
      s.titleEn.toLowerCase().includes(query) ||
      s.titleTa.includes(query) ||
      s.location.toLowerCase().includes(query) ||
      s.santham.toLowerCase().includes(query)
    );
    if (selectedCategory === "All") return matchesSearch;
    return matchesSearch && s.category === selectedCategory;
  });

  // Filter the catalog items for the Infinite 1000+ Archive Index
  const filteredCatalog = CANONICAL_CATALOG.filter((item) => {
    const q = catalogSearchQuery.toLowerCase().trim();
    const matchesTemple = 
      selectedTempleFilter === "All Temples" ||
      item.temple === selectedTempleFilter;
    if (!q) return matchesTemple;
    
    const matchesQuery = 
      item.titleEn.toLowerCase().includes(q) ||
      item.titleTa.includes(q) ||
      item.temple.toLowerCase().includes(q) ||
      item.number.toString() === q;
      
    return matchesQuery && matchesTemple;
  });

  // Filter the Famous 100 compositions
  const filteredFamousSongs = FAMOUS_SONGS.filter((s) => {
    const q = famousSearchQuery.toLowerCase().trim();
    const matchesGenre = selectedFamousGenre === "All" || s.genre === selectedFamousGenre;
    if (!q) return matchesGenre;
    
    const matchesQuery = 
      s.title.toLowerCase().includes(q) ||
      s.authorOrArtist.toLowerCase().includes(q) ||
      s.genreLabel.toLowerCase().includes(q);
      
    return matchesQuery && matchesGenre;
  });

  // Filter the Famous Shiva Hymns
  const filteredShivaFamousSongs = SHIVA_FAMOUS_HYMNS.filter((item) => {
    const q = shivaSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.titleEn.toLowerCase().includes(q) ||
      item.titleTa.includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.significance.toLowerCase().includes(q) ||
      item.volume.toLowerCase().includes(q)
    );
  });

  // Handle Text-to-Speech
  const handleRecitation = async (text: string, identifier: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      if (loadingTTS === identifier) {
        setLoadingTTS(null);
        return;
      }

      setLoadingTTS(identifier);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: ttsVoice }),
      });

      const data = await res.json();
      if (res.status !== 200 || data.error) {
        throw new Error(data.error || "Failed to generate vocal output");
      }

      const audioUrl = `data:audio/wav;base64,${data.audio}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setLoadingTTS(null);
      };
      audio.onerror = () => {
        setLoadingTTS(null);
      };
      
      await audio.play();
    } catch (err: any) {
      alert(`Recitation Error: ${err.message || "Please make sure GEMINI_API_KEY is configured."}`);
      setLoadingTTS(null);
    }
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setLoadingTTS(null);
    }
  };

  // Handle scholar chat interaction
  const sendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    if (!presetText) {
      setChatInput("");
    }

    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setSendingChat(true);
    setChatError(null);

    try {
      const simplifiedHistory = chatHistory.map((msg) => ({
        role: msg.role,
        text: msg.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: simplifiedHistory,
          modelType: chatModel === "pro" ? "pro" : "flash",
        }),
      });

      const data = await res.json();
      if (res.status !== 200 || data.error) {
        throw new Error(data.error || "Scholar Guide was unable to render a response.");
      }

      const modelMsg: ChatMessage = {
        role: "model",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistory((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setChatError(err.message || "Error with the chatbot messenger.");
    } finally {
      setSendingChat(false);
    }
  };

  const chatSuggestions = [
    `Tell me the inner Vedantic meaning of ${selectedSong.titleEn}`,
    `Interpret the rhythm match for "${selectedSong.santham.split(' ')[0]}"`,
    `Tell me about Saint Arunagirinathar's meeting with Lord Murugan`
  ];
  
  const isShivaSong = selectedSong.deity === "shiva" || 
    selectedSong.kaumaramUrl?.includes("shaivam.org") || 
    selectedSong.santham?.toLowerCase().includes("பண்") ||
    (selectedSong.location?.toLowerCase().includes("temple") && 
     !selectedSong.location?.toLowerCase().includes("palani") && 
     !selectedSong.location?.toLowerCase().includes("swamimalai") && 
     !selectedSong.location?.toLowerCase().includes("pazhamudircholai") &&
     !selectedSong.location?.toLowerCase().includes("thiruchendur") &&
     !selectedSong.location?.toLowerCase().includes("tiruttani"));

  const deityTheme = isShivaSong ? {
    badgeBg: "bg-orange-500/10 border-orange-500/25 text-[#ff8040]",
    glowBg: "bg-orange-600/5",
    textGold: "text-[#ff8040]",
    borderGold: "border-orange-500/35",
    iconColor: "text-orange-500",
    deityLabel: "Lord Shiva Hymn",
    symbol: "🕉️ Shiva Thiru",
    btnBorder: "border-orange-500/35 text-[#ff8040] hover:bg-orange-500/10",
    accentLabel: "Pan / பண்",
    indicatorDot: "bg-orange-500",
  } : {
    badgeBg: "bg-[#c5a059]/10 border-[#c5a059]/15 text-[#c5a059]",
    glowBg: "bg-[#c5a059]/5",
    textGold: "text-[#c5a059]",
    borderGold: "border-[#c5a059]/35",
    iconColor: "text-[#c5a059]",
    deityLabel: "Lord Murugan Hymn",
    symbol: "🦚 Skanda Sudha",
    btnBorder: "border-[#c5a059]/35 text-[#c5a059] hover:bg-[#c5a059]/10",
    accentLabel: "Meter / சந்தம்",
    indicatorDot: "bg-[#c5a059]",
  };

  return (
    <div id="thiruppugazh-app" className="min-h-screen bg-[#0c0c0e] text-[#d1d1d1] font-sans selection:bg-[#c5a059]/30 pb-20">
      
      {/* Background radial gradient */}
      <div className="absolute top-0 left-0 w-full h-[650px] bg-gradient-to-b from-[#16161a] via-[#0f0f11] to-transparent pointer-events-none -z-10" />

      {/* Top Warning Banner if Key Missing */}
      {!apiStatus.hasKey && apiStatus.checked && (
        <div id="missing-key-banner" className="bg-[#121215] border-b border-white/5 text-[#c5a059] py-2 px-4 text-center text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-[#c5a059] shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Configure <strong>GEMINI_API_KEY</strong> in the Secrets Settings menu to activate live AI recitals and dynamic indices retrieval!
          </span>
        </div>
      )}

      {/* Modern Compact Header */}
      <header id="app-header" className="border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#c5a059] flex items-center justify-center text-[#c5a059] font-serif text-xs font-bold bg-[#16161a] shadow-inner">
              சிவ
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-serif text-white tracking-tight flex items-center gap-1.5">
                சிவ-கந்த சுதா
                <span className="text-[#c5a059] font-sans font-medium text-[9px] sm:text-[10px] tracking-wider uppercase border border-[#c5a059]/30 px-1.5 py-0.5 rounded bg-[#c5a059]/5 shrink-0">
                  Siva-Skanda Light
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-sans tracking-wide">Thy Father's 12 Holy Tirumurais & Son's Santham Thiruppugazh</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Recitation Configuration */}
            <div className="flex items-center gap-1.5 text-xs bg-[#16161a] text-gray-400 px-3 py-1.5 rounded-lg border border-white/5 shadow-sm">
              <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider">Voice:</span>
              <select 
                value={ttsVoice} 
                onChange={(e) => setTtsVoice(e.target.value)} 
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="Kore" className="bg-[#0c0c0e] text-white">Kore (Female)</option>
                <option value="Zephyr" className="bg-[#0c0c0e] text-white">Zephyr (Male)</option>
                <option value="Puck" className="bg-[#0c0c0e] text-white">Puck (Warm)</option>
                <option value="charon" className="bg-[#0c0c0e] text-white">Charon (Deeps)</option>
              </select>
            </div>

            {loadingTTS && (
              <button 
                onClick={stopAudio}
                className="text-xs font-semibold px-2.5 py-1.5 text-red-400 bg-red-950/25 border border-red-900/30 hover:bg-red-950/45 rounded-lg flex items-center gap-1 transition-colors animate-pulse"
              >
                <VolumeX className="h-3 w-3" /> Mute
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* HERO PORTRAIT & PRESENTATION CROWN */}
        <div id="divine-portrait-showcase" className="mb-8 rounded-2xl bg-[#0a0a0c] border border-white/5 overflow-hidden shadow-xl relative grid grid-cols-1 md:grid-cols-12 items-center gap-0">
          
          <div className="md:col-span-4 h-full min-h-[190px] relative overflow-hidden self-stretch group/hero bg-black">
            <img 
              src={activeHeroImage === "shiva" ? shivaMuruganImg : muruganArunagiriImg} 
              alt={activeHeroImage === "shiva" ? "Siva-Skanda divine form illustration" : "Lord Murugan and Saint Arunagirinathar illustration"} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transform hover:scale-105 duration-700 ease-out transition-all"
            />
            {/* Soft divine visual vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-r md:bg-gradient-to-l from-transparent via-black/30 to-black/60 pointer-events-none" />
            
            {/* Bottom Info badge */}
            <div className="absolute bottom-3 left-3 bg-[#0a0a0c]/85 border border-[#c5a059]/40 rounded px-2.5 py-1 text-center backdrop-blur-sm">
              <span className="text-[10px] text-[#c5a059] uppercase tracking-widest block font-bold font-serif">
                {activeHeroImage === "shiva" ? "சிவ-கந்த கோலம்" : "ஆதி சித்திரக்கோலம்"}
              </span>
              <p className="text-[8px] text-gray-400 text-center">
                {activeHeroImage === "shiva" ? "Siva & Skanda Divine Light" : "Skanda & Arunagiri"}
              </p>
            </div>

            {/* Quick manual switch button top-right in image overlay */}
            <div className="absolute top-3 right-3 flex gap-1 z-10">
              <button
                type="button"
                onClick={() => setActiveHeroImage(activeHeroImage === "shiva" ? "murugan" : "shiva")}
                className="text-[8.5px] font-bold px-2 py-1 select-none backdrop-blur-md bg-black/65 hover:bg-[#16161a] border border-[#c5a059]/30 rounded text-[#c5a059] hover:text-white transition-all flex items-center gap-1 active:scale-95 shadow-md"
              >
                <RefreshCw className="h-2.5 w-2.5 text-[#c5a059]" /> Switch Art
              </button>
            </div>
          </div>
          
          <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[#c5a059] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">
              <Sparkles className="h-3 w-3" />
              <span>Siva-Skanda Sacred Anthology / சைவத் திருமுறைத் திரட்டு</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight leading-tight mb-2">
              The Divine Path of Pure Non-Dual Devotion
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-2xl">
              Tamil Shaivism links his father <strong className="text-amber-400 font-medium">Lord Shiva's Panniru Tirumurai</strong> (18,300+ verses compiled in 12 holy books by legendaries Appar, Sambandar, Sundarar, and Manikkavasagar) with <strong className="text-amber-400 font-medium">Lord Murugan's Thiruppugazh</strong> Santhams. Select any classic verse to explore live bilingual lyric translations, instant audio recitation pronouncements, and comprehensive spiritual guidelines.
            </p>

            {/* Quick Masterpiece Navigation Deck */}
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2.5 items-center">
              <span className="text-[9px] uppercase tracking-widest text-[#c5a059] font-black mr-1">Direct Masterpieces:</span>
              
              {/* Load Thodudaiya Seviyan */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDeity("shiva");
                  setActiveSidebarTab("shiva");
                  loadCustomSong("Thodudaiya Seviyan by Thirugnana Sambandar");
                }}
                className={`py-1.5 px-3 rounded-lg border text-[10px] font-sans flex items-center gap-2 transition-all text-left group cursor-pointer focus:outline-none ${
                  selectedSong.id === "thodudaiya-seviyan"
                    ? "bg-orange-950/30 border-orange-500/50 text-[#ff8040] shadow-sm font-bold scale-[1.02]"
                    : "bg-white/5 border-white/5 text-gray-300 hover:border-orange-500/25 hover:text-[#ff8040]"
                }`}
              >
                <span className="text-xs transition-transform group-hover:scale-[1.15]">🔱</span>
                <div className="flex flex-col">
                  <span className="leading-none text-[9.5px]">Siva: Thodudaiya Seviyan</span>
                  <span className="text-[7.5px] text-gray-500 group-hover:text-amber-500/70 mt-0.5">Tevaram Opening Hymn</span>
                </div>
              </button>

              {/* Load Muthai Tharu */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDeity("murugan");
                  setActiveSidebarTab("library");
                  loadCustomSong("Muthai Tharu Pathi Thirunagai by Arunagirinathar");
                }}
                className={`py-1.5 px-3 rounded-lg border text-[10px] font-sans flex items-center gap-2 transition-all text-left group cursor-pointer focus:outline-none ${
                  selectedSong.id === "muthai-tharu-pathi-thirunagai" || selectedSong.id === "muthai-tharu"
                    ? "bg-amber-950/30 border-[#c5a059]/50 text-[#c5a059] shadow-sm font-bold scale-[1.02]"
                    : "bg-white/5 border-white/5 text-gray-300 hover:border-[#c5a059]/25 hover:text-[#c5a059]"
                }`}
              >
                <span className="text-xs transition-transform group-hover:scale-[1.15]">🦚</span>
                <div className="flex flex-col">
                  <span className="leading-none text-[9.5px]">Skanda: Muthai Tharu</span>
                  <span className="text-[7.5px] text-gray-500 group-hover:text-amber-500/70 mt-0.5">Thiruppugazh Opening Hymn</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* COMPACT HUB WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: HYMN DIRECTORY (4-cols) */}
          <section id="hymn-sidebar-navigator" className="lg:col-span-4 flex flex-col gap-5">
            
            <div className="bg-[#0a0a0c] rounded-xl p-4 border border-white/5 shadow-sm">
              
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#c5a059]" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059] font-bold">DIRECTORY INDEX</span>
                </div>
                <span className="text-[9px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded font-mono font-bold">1,307 Songs</span>
              </div>

              {/* Dual deity Selector cards */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  id="deity-selector-shiva"
                  onClick={() => {
                    setSelectedDeity("shiva");
                    setActiveSidebarTab("shiva");
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    selectedDeity === "shiva"
                      ? "bg-gradient-to-b from-[#1d140f] to-[#0a0a0c] border-[#ff7a3a]/45 text-[#ff8b52] shadow-md shadow-orange-950/20"
                      : "bg-[#0c0c0f] border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg border transition-all ${
                    selectedDeity === "shiva"
                      ? "bg-orange-950/40 border-orange-500/25 text-[#ff8b52]"
                      : "bg-white/5 border-white/5 text-gray-500"
                  }`}>
                    <Flame className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-serif font-black tracking-wide leading-tight">ஆதிசிவன் திருமுறை</span>
                    <span className="text-[8px] font-sans opacity-75 uppercase tracking-widest mt-0.5 font-bold">Lord Shiva</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="deity-selector-murugan"
                  onClick={() => {
                    setSelectedDeity("murugan");
                    setActiveSidebarTab("library");
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    selectedDeity === "murugan"
                      ? "bg-gradient-to-b from-[#1a1712] to-[#0a0a0c] border-[#c5a059]/45 text-[#c5a059] shadow-md shadow-amber-950/20"
                      : "bg-[#0c0c0f] border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg border transition-all ${
                    selectedDeity === "murugan"
                      ? "bg-[#c5a059]/10 border-[#c5a059]/25 text-[#c5a059]"
                      : "bg-white/5 border-white/5 text-gray-500"
                  }`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-serif font-black tracking-wide leading-tight">முருகன் திருப்புகழ்</span>
                    <span className="text-[8px] font-sans opacity-75 uppercase tracking-widest mt-0.5 font-bold">Lord Murugan</span>
                  </div>
                </button>
              </div>

              {/* Simple Sub-Tab Control for Lord Murugan */}
              {selectedDeity === "murugan" && (
                <div className="grid grid-cols-3 border-b border-white/5 mb-3 p-0.5 bg-[#16161a] rounded gap-0.5">
                  <button
                    type="button"
                    id="tab-sidebar-library-button"
                    onClick={() => setActiveSidebarTab("library")}
                    className={`py-1.5 text-[8px] font-bold uppercase tracking-tight text-center rounded transition-all ${
                      activeSidebarTab === "library"
                        ? "bg-[#c5a059] text-[#0a0a0c]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Curated ({filteredSongs.length})
                  </button>
                  <button
                    type="button"
                    id="tab-sidebar-famous-button"
                    onClick={() => setActiveSidebarTab("famous")}
                    className={`py-1.5 text-[8px] font-bold uppercase tracking-tight text-center rounded transition-all ${
                      activeSidebarTab === "famous"
                        ? "bg-[#c5a059] text-[#0a0a0c]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Famous 100
                  </button>
                  <button
                    type="button"
                    id="tab-sidebar-catalog-button"
                    onClick={() => setActiveSidebarTab("catalog")}
                    className={`py-1.5 text-[8px] font-bold uppercase tracking-tight text-center rounded transition-all ${
                      activeSidebarTab === "catalog"
                        ? "bg-[#c5a059] text-[#0a0a0c]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Dial Finder
                  </button>
                </div>
              )}

              {activeSidebarTab === "library" && (
                <div className="flex flex-col gap-2">
                  {/* Search filter input */}
                  <div className="relative mb-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search title, shrine, rhythm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#16161a] border border-white/5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a059] transition-all"
                    />
                  </div>

                  {/* Category filter pills - Thiruppugazh & Others */}
                  <div className="mb-2 pt-1.5 border-t border-white/5">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-[#c5a059]/80 block mb-1">Select Hymn Genre</span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("All")}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                          selectedCategory === "All"
                            ? "bg-[#c5a059] text-[#0a0a0c] font-semibold"
                            : "bg-[#16161a] text-gray-400 hover:text-white border border-white/5"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("thiruppugazh")}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                          selectedCategory === "thiruppugazh"
                            ? "bg-[#c5a059] text-[#0a0a0c] font-semibold"
                            : "bg-[#16161a] text-gray-400 hover:text-white border border-white/5"
                        }`}
                      >
                        Thiruppugazh
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("anuboothi")}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                          selectedCategory === "anuboothi"
                            ? "bg-indigo-500 text-[#0a0a0c] font-semibold"
                            : "bg-[#16161a] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10"
                        }`}
                      >
                        Anubhuti
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("alangaram")}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                          selectedCategory === "alangaram"
                            ? "bg-emerald-600 text-white font-semibold"
                            : "bg-[#16161a] text-emerald-400 hover:text-emerald-300 border border-emerald-500/10"
                        }`}
                      >
                        Alangaram
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("viruththam")}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all ${
                          selectedCategory === "viruththam"
                            ? "bg-rose-600 text-white font-semibold"
                            : "bg-[#16161a] text-rose-450 hover:text-rose-300 border border-rose-500/10"
                        }`}
                      >
                        Viruththam
                      </button>
                    </div>
                  </div>

                  {/* Curated list */}
                  <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {filteredSongs.length > 0 ? (
                      filteredSongs.map((song) => {
                        const isSelected = song.id === selectedSong.id;
                        return (
                          <button
                            key={song.id}
                            id={`song-curated-btn-${song.id}`}
                            onClick={() => {
                              setSelectedSong(song);
                              stopAudio(); // automatically mute previous recitation when changing song
                            }}
                            className={`w-full text-left p-3 rounded transition-all flex flex-col gap-1 relative overflow-hidden ${
                              isSelected
                                ? "bg-[#16161a] border-l-2 border-[#c5a059]"
                                : "hover:bg-white/5 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-xs font-serif ${isSelected ? "text-white font-bold" : "text-gray-300"}`}>
                                {song.titleTa}
                              </span>
                              
                              {song.category && (
                                <span className={`text-[7px] px-1 py-0.5 rounded border leading-none font-sans font-bold uppercase shrink-0 ${
                                  song.category === "thiruppugazh"
                                    ? "bg-[#c5a059]/10 text-[#c5a059] border-[#c5a059]/20"
                                    : song.category === "anuboothi"
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    : song.category === "alangaram"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>
                                  {song.category === "thiruppugazh" 
                                    ? "Thirup" 
                                    : song.category === "anuboothi" 
                                    ? "Anubh" 
                                    : song.category === "alangaram" 
                                    ? "Alang" 
                                    : "Viruth"}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">{song.titleEn}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[8px] bg-white/5 px-1 py-0.2 rounded border border-white/5 text-gray-400 font-serif">
                                {song.location}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-500 text-xs">No local matches. Try searching the 1000+ catalog!</div>
                    )}
                  </div>
                </div>
              )}

              {activeSidebarTab === "famous" && (
                <div className="flex flex-col gap-2">
                  {/* Search Input */}
                  <div className="relative mb-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search 100 famous hymns..."
                      value={famousSearchQuery}
                      onChange={(e) => setFamousSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#16161a] border border-white/5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a059] transition-all"
                    />
                  </div>

                  {/* Multi-Genre Filter scrollable array */}
                  <div className="mb-2 pt-1 border-t border-white/5">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-[#c5a059]/80 block mb-1">Select Genre Category</span>
                    <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto bg-[#101014] p-1.5 rounded border border-white/5">
                      {[
                        { id: "All", label: "All Songs" },
                        { id: "cinema_hits", label: "Cinema Hits (1-20)" },
                        { id: "tms_era", label: "T.M.S. Classics (21-40)" },
                        { id: "sirkazhi_kbs", label: "Sirkazhi & KBS (41-60)" },
                        { id: "pithukuli_sisters", label: "Sisters & Murugadas (61-80)" },
                        { id: "kavadi_carnatic", label: "Kavadi & Carnatic (81-100)" }
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedFamousGenre(g.id)}
                          className={`px-2 py-0.5 rounded-full text-[8px] font-medium transition-all ${
                            selectedFamousGenre === g.id
                              ? "bg-[#c5a059] text-[#0a0a0c] font-semibold"
                              : "bg-[#16161a] text-gray-400 hover:text-white border border-white/5"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Highly polished interactive 100 Famous Compositions list */}
                  <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {filteredFamousSongs.length > 0 ? (
                      filteredFamousSongs.map((item) => {
                        // Find matching loaded song
                        const localMatch = songs.find((s) => s.id === item.localSongId || s.titleEn.toLowerCase().includes(item.title.toLowerCase()));
                        const isCurrentlySelected = localMatch && localMatch.id === selectedSong.id;

                        return (
                          <button
                            key={item.number}
                            id={`song-famous-btn-${item.number}`}
                            onClick={() => {
                              stopAudio(); // Mute playing TTS
                              if (localMatch) {
                                setSelectedSong(localMatch);
                              } else {
                                loadCustomSong(`${item.title} by ${item.authorOrArtist}`);
                              }
                            }}
                            disabled={loadingCustom}
                            className={`w-full text-left p-2.5 rounded border transition-all flex flex-col gap-0.5 relative overflow-hidden group ${
                              isCurrentlySelected
                                ? "bg-[#16161a] border-[#c5a059] shadow-sm shadow-[#c5a059]/10"
                                : localMatch
                                ? "bg-[#121215]/60 hover:bg-white/5 border-[#c5a059]/20 hover:border-[#c5a059]/50"
                                : "bg-[#121215]/40 border-white/5 hover:border-[#c5a059]/40 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 w-full">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[8px] font-mono font-bold text-[#c5a059] bg-[#c5a059]/10 rounded px-1 shrink-0">#{item.number}</span>
                                <span className="text-xs font-serif text-white group-hover:text-[#c5a059] transition-colors truncate">
                                  {item.title}
                                </span>
                              </div>
                              <span className={`text-[6.5px] px-1 py-0.5 rounded leading-none uppercase font-bold shrink-0 ${
                                item.genre === "cinema_hits"
                                  ? "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                                  : item.genre === "tms_era"
                                  ? "bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20"
                                  : item.genre === "sirkazhi_kbs"
                                  ? "bg-blue-950/40 text-blue-400 border border-blue-900/30"
                                  : item.genre === "pithukuli_sisters"
                                  ? "bg-pink-950/40 text-pink-400 border border-pink-900/30"
                                  : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                              }`}>
                                {item.genre === "cinema_hits" ? "Cinema"
                                  : item.genre === "tms_era" ? "T.M.S."
                                  : item.genre === "sirkazhi_kbs" ? "Sirkazhi/KBS"
                                  : item.genre === "pithukuli_sisters" ? "Sisters/Pithukuli"
                                  : "Kavadi/Carnatic"}
                              </span>
                            </div>
                            
                            <span className="text-[10px] text-gray-500">{item.authorOrArtist}</span>
                            {item.details && (
                              <p className="text-[9px] text-gray-500 leading-snug font-sans group-hover:text-gray-400 transition-colors mt-0.5 italic max-w-full">
                                {item.details}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                              {localMatch ? (
                                <span className="text-[8px] text-[#c5a560] font-sans flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 bg-[#c5a059] rounded-full animate-pulse" />
                                  Available locally. Click to read/recite!
                                </span>
                              ) : (
                                <span className="text-[8px] text-gray-500 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-500/70 shrink-0" /> Click to load full song lyrics with AI
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-600 text-xs">No matching famous songs. Try searching different keywords!</div>
                    )}
                  </div>
                </div>
              )}

              {activeSidebarTab === "shiva" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  
                  {/* Divine Info Banner */}
                  <div className="bg-gradient-to-br from-[#121217] to-[#1a1310] border border-orange-950/45 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#c5a059]/5 blur-2xl rounded-full" />
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-950/30 border border-orange-900/40 rounded-lg text-orange-400 shrink-0 mt-0.5">
                        <Flame className="h-4 w-4 animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-[#c5a059] font-serif font-bold">THE ULTIMATE SHIVA ANTHOLOGY</span>
                        <h4 className="text-xs font-bold text-white mt-0.5 font-serif">Panniru Tirumurai / பன்னிரு திருமுறை</h4>
                        <p className="text-[9.5px] text-gray-400 leading-relaxed mt-1.5 font-sans">
                          Just as Lord Murugan has the sacred <span className="text-[#c5a059] font-semibold">Thiruppugazh</span>, the ultimate collection of Tamil verses dedicated to his father <strong className="text-white">Lord Shiva</strong> is the **Panniru Tirumurai** (The 12 Holy Books).
                        </p>
                        <p className="text-[9px] text-gray-400 leading-relaxed mt-1 font-sans">
                          Compiled in the 11th century by sage <strong className="text-gray-300">Nambi Andar Nambi</strong>, this comprehensive anthology spans over <span className="text-[#c5a059] font-medium">18,300 verses</span> sung by the legendary Nayanmars across hundreds of ancient temple shrines in South India.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Title 1: 12 Tirumurais hierarchy */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <BookOpen className="h-3 w-3 text-[#c5a059]" />
                      <span className="text-[9px] uppercase tracking-widest text-[#c5a059] font-bold font-serif">Structural Breakdown / 12 Holy Volumes</span>
                    </div>
                    
                    {/* Compact Scrollable Table Grid */}
                    <div className="bg-[#0b0b0e] border border-white/5 rounded-lg overflow-hidden text-[9px] shadow-inner font-sans">
                      <div className="grid grid-cols-12 bg-white/5 p-2 font-bold text-gray-400 uppercase tracking-wider text-[8px] border-b border-white/5">
                        <span className="col-span-2">Vol</span>
                        <span className="col-span-4">Author(s)</span>
                        <span className="col-span-3">Work Name</span>
                        <span className="col-span-3 text-right">Verses</span>
                      </div>
                      <div className="max-h-[175px] overflow-y-auto divide-y divide-white/5">
                        {TIRUMURAI_VOLUMES.map((v) => (
                          <div 
                            key={v.volumeNumber} 
                            className="grid grid-cols-12 p-2 hover:bg-white/5 items-center transition-colors group cursor-help"
                            title={v.details}
                          >
                            <span className="col-span-2 text-[#c5a059] font-mono font-bold">#{v.volumeNumber}</span>
                            <span className="col-span-4 text-white font-medium">{v.author}</span>
                            <span className="col-span-3 text-gray-300 italic group-hover:text-amber-300 transition-colors">{v.work}</span>
                            <span className="col-span-3 text-right text-gray-400 font-mono font-bold">{v.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[8px] text-gray-500 italic mt-1 px-1 text-center">Hover rows inside the structural list to reveal spiritual descriptions.</p>
                  </div>

                  {/* Section Title 2: The Most Famous Shiva Verses (The Essentials) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1 px-1">
                      <div className="flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-[9px] uppercase tracking-widest text-[#c5a059] font-bold font-serif">Iconic Shiva Tracks (Click to load)</span>
                      </div>
                      <span className="text-[8px] bg-white/5 border border-white/10 text-[#c5a059] px-2 py-0.5 rounded font-bold uppercase">7 Pillars</span>
                    </div>

                    {/* Shiva Search Box */}
                    <div className="relative mb-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search iconic Shiva verses..."
                        value={shivaSearchQuery}
                        onChange={(e) => setShivaSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#16161a] border border-white/5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                      />
                    </div>

                    {/* Interactive Hymn Catalog List */}
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {filteredShivaFamousSongs.length > 0 ? (
                        filteredShivaFamousSongs.map((item, idx) => {
                          const localMatch = songs.find((s) => s.titleEn.toLowerCase().includes(item.titleEn.toLowerCase()));
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => {
                                stopAudio();
                                if (localMatch) {
                                  setSelectedSong(localMatch);
                                } else {
                                  loadCustomSong(`${item.titleEn} (${item.titleTa}) by ${item.author}`);
                                }
                              }}
                              className="bg-[#101014] hover:bg-[#171311] border border-white/5 hover:border-orange-500/30 transition-all p-3 rounded-lg text-left group flex flex-col justify-between gap-2 cursor-pointer focus:outline-none"
                            >
                              <div className="w-full">
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors font-serif flex items-center gap-1">
                                      <span className="text-gray-500 font-mono font-normal text-[10px]">{idx + 1}.</span> {item.titleEn}
                                    </span>
                                    <span className="text-[10px] text-gray-300 font-normal font-sans tracking-wide mt-0.5">
                                      {item.titleTa}
                                    </span>
                                  </div>
                                  <span className="text-[7.5px] px-1.5 py-0.5 rounded leading-none uppercase font-bold bg-orange-950/40 text-orange-400 border border-orange-900/40 shrink-0">
                                    {item.volume.split(" ")[0]}
                                  </span>
                                </div>

                                <p className="text-[9px] text-gray-500 leading-snug font-sans mt-2 group-hover:text-gray-400 transition-colors italic">
                                  "{item.significance}"
                                </p>
                              </div>

                              <div className="flex items-center justify-between w-full mt-1 pt-1.5 border-t border-white/5 text-[8px]">
                                <span className="text-gray-400 font-medium">By {item.author}</span>
                                {localMatch ? (
                                  <span className="text-[#ff8040] font-sans flex items-center gap-1 font-bold">
                                    <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                                    Ready in Player
                                  </span>
                                ) : (
                                  <span className="text-gray-500 group-hover:text-orange-400 transition-colors flex items-center gap-1 font-bold">
                                    <Sparkles className="h-2.5 w-2.5 text-amber-500/70 shrink-0" /> Load Lyrics with AI
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-gray-450 text-xs italic">
                          No matching Shiva hymns found.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {activeSidebarTab === "catalog" && (
                <div className="flex flex-col gap-2">
                  {/* Canonical dial code finder */}
                  <div className="bg-[#121215] border border-white/5 rounded p-2.5 mb-2 flex flex-col gap-1.5">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-[#c5a059]">Dial Song Number directly</span>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={1307}
                        placeholder="Song #1 to #1307 (e.g., 42)"
                        value={directNumberInput}
                        onChange={(e) => setDirectNumberInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && directNumberInput.trim()) {
                            loadCustomSong(`Thiruppugazh Song #${directNumberInput.trim()}`);
                            setDirectNumberInput("");
                          }
                        }}
                        className="flex-1 min-w-0 px-2 py-1 bg-[#1a1a20] border border-white/5 rounded text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        id="dialer-index-button"
                        disabled={loadingCustom || !directNumberInput.trim()}
                        onClick={() => {
                          loadCustomSong(`Thiruppugazh Song #${directNumberInput.trim()}`);
                          setDirectNumberInput("");
                        }}
                        className="px-2.5 py-1 bg-[#c5a059] hover:bg-[#b08b49] disabled:opacity-40 text-[#0a0a0c] text-xs font-bold rounded transition-all shrink-0"
                      >
                        {loadingCustom ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Dial"}
                      </button>
                    </div>
                  </div>

                  {/* Shrine quick dropdown filter */}
                  <div className="mb-2">
                    <span className="text-[8px] uppercase font-bold text-[#c5a059] block mb-0.5">Filter Shrine</span>
                    <select
                      value={selectedTempleFilter}
                      onChange={(e) => setSelectedTempleFilter(e.target.value)}
                      className="w-full px-1.5 py-1 bg-[#16161a] border border-white/5 rounded text-gray-300 text-xs focus:outline-none"
                    >
                      {TEMPLE_CATEGORIES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Catalog list inputs */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Filter 1,307 canonical index..."
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 bg-[#16161a] border border-white/5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a059]"
                    />
                  </div>

                  {/* Filterable Catalog list */}
                  <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1">
                    {filteredCatalog.length > 0 ? (
                      filteredCatalog.map((item) => (
                        <button
                          key={item.number}
                          id={`song-catalog-select-btn-${item.number}`}
                          onClick={() => loadCustomSong(`Thiruppugazh Song #${item.number}: ${item.titleEn}`)}
                          disabled={loadingCustom}
                          className="w-full text-left p-2 rounded bg-[#121215]/50 border border-white/5 hover:border-[#c5a059]/40 hover:bg-white/5 transition-all text-xs flex flex-col gap-0.5 group disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-[#c5a059]">Song #{item.number}</span>
                            <span className="text-[8px] text-gray-400 bg-white/5 px-1 py-0.2 rounded">
                              {item.temple}
                            </span>
                          </div>
                          <span className="font-serif text-white group-hover:text-[#c5a059] transition-all truncate text-[11px]">
                            {item.titleTa}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-600 text-[10px]">No matches in curated catalog. Type any name in Dialer!</div>
                    )}
                  </div>
                </div>
              )}


              {/* DYNAMIC RETRIEVAL STATUS */}
              {(customLoadError || customLoadSuccess || loadingCustom) && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  {loadingCustom && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <RefreshCw className="h-3 w-3 animate-spin text-[#c5a059]" />
                      <span>Fetching complete meter data from archives...</span>
                    </div>
                  )}
                  {customLoadError && (
                    <p className="text-[10px] text-red-400 leading-tight">{customLoadError}</p>
                  )}
                  {customLoadSuccess && (
                    <p className="text-[10px] text-emerald-400 leading-tight font-semibold">Successfully catalogued & loaded!</p>
                  )}
                </div>
              )}

            </div>

            {/* DYNAMIC ARCHIVE RETRIEVAL CORNER */}
            <div className="bg-[#16161a]/60 border border-white/5 rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-[#c5a059] block mb-1">Dynamic Word Explorer</span>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                Need any other Thiruppugazh song? Enter any phrase, and Gemini will build its complete metric structure dynamically!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Apakara Nindhai"
                  className="flex-1 min-w-0 px-2.5 py-1 bg-[#101012] border border-white/5 rounded text-xs text-white focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      loadCustomSong((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            </div>

          </section>

          {/* RIGHT COLUMN: DETAILED SONG DETAILS (8-cols) */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            <div id="hymn-screen-card" className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
              
              {/* Presenter Header */}
              <div className="p-6 md:p-8 border-b border-white/5 bg-[#121215]/40 relative">
                <div className={`absolute top-0 right-0 w-32 h-32 ${deityTheme.glowBg} rounded-full blur-2xl pointer-events-none`} />
                
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 ${deityTheme.badgeBg} text-[9px] uppercase tracking-widest rounded border font-mono font-bold flex items-center gap-1`}>
                        {deityTheme.symbol}
                      </span>
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-white text-[9px] uppercase tracking-widest rounded">
                        Shrine: {selectedSong.location}
                      </span>
                    </div>
                    
                    {/* Entire meaning narration audio */}
                    <button 
                      onClick={() => handleRecitation(selectedSong.totalMeaningTa + " " + selectedSong.totalMeaningEn, "total-explanation")}
                      disabled={loadingTTS !== null && loadingTTS !== "total-explanation"}
                      className={`px-3 py-1.5 border ${deityTheme.btnBorder} text-[10px] uppercase tracking-widest disabled:opacity-40 transition-all rounded-lg flex items-center gap-1.5 bg-[#0a0a0c] font-bold`}
                    >
                      {loadingTTS === "total-explanation" ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" /> Playing Recitation...
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" /> Recite Meanings
                        </>
                      )}
                    </button>
                  </div>
 
                  <h3 className="text-3xl font-serif text-white tracking-wide mt-2 italic">{selectedSong.titleTa}</h3>
                  <p className="text-sm font-light text-gray-400">{selectedSong.titleEn}</p>
                  
                  <div className="mt-3.5 flex gap-4 border-t border-white/5 pt-3">
                    <div>
                      <p className={`text-[9px] uppercase tracking-wider ${deityTheme.textGold} font-black`}>{deityTheme.accentLabel}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{selectedSong.santham}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded leading-none">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${deityTheme.indicatorDot}`} />
                      {deityTheme.deityLabel}
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Prologue Introduction Context */}
              <div className="px-6 py-4 bg-[#16161a]/30 border-b border-white/5 flex flex-col gap-2">
                <div>
                  <span className={`text-[8px] uppercase tracking-widest font-black ${deityTheme.textGold}`}>Introduction / அறிமுகம்</span>
                  <p className="text-xs text-gray-300 font-serif leading-relaxed italic mt-0.5">{selectedSong.introductionTa}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-450 leading-relaxed font-sans">{selectedSong.introductionEn}</p>
                </div>
              </div>
 
              {/* TABLE/LIST VERSE LINES & DUAL TRANSLATION */}
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#0d0d10] border-b border-white/5 text-[#c5a059] font-bold text-[9px] uppercase tracking-wider">
                      <th className={`py-2.5 px-4 w-[8%] text-center ${deityTheme.textGold}`}>Recite</th>
                      <th className="py-2.5 px-4 w-[42%] border-r border-white/5">Hymn original & Phonetics</th>
                      <th className="py-2.5 px-4 w-[50%]">Line translation / விளக்கம்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSong.lines.map((line, idx) => {
                      const lineId = `line-row-${idx}`;
                      const isLineLoading = loadingTTS === lineId;
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          
                          {/* Audio play button */}
                          <td className="py-4 px-3 text-center align-top">
                            <button
                              onClick={() => handleRecitation(`${line.tamil}. Line breakdown: ${line.meaningEn}`, lineId)}
                              disabled={loadingTTS !== null && loadingTTS !== lineId}
                              title="Listen to Tamil verse and English translation"
                              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all border ${
                                isLineLoading 
                                  ? "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059] scale-105"
                                  : "text-gray-400 hover:text-[#c5a059] bg-[#16161a] border-white/5 disabled:opacity-30"
                              }`}
                            >
                              {isLineLoading ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5 shrink-0" />
                              )}
                            </button>
                          </td>

                          {/* Tamil Lyrics & Pronunciation */}
                          <td className="py-4 px-4 border-r border-white/5 align-top">
                            <p className="text-md font-serif font-bold text-white tracking-wide leading-relaxed mb-1 font-serif">
                              {line.tamil}
                            </p>
                            <p className="text-[10px] text-[#c5a059] font-mono italic">
                              {line.transliteration}
                            </p>
                          </td>

                          {/* Explanations */}
                          <td className="py-4 px-4 align-top flex flex-col gap-1.5">
                            <div className="bg-[#121215] p-2.5 rounded border border-white/5 flex flex-col gap-1">
                              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                                <span className="text-[#c5a059]/90 font-bold block text-[9px] uppercase tracking-wider">விளக்கம்:</span>
                                {line.meaningTa}
                              </p>
                              <div className="border-t border-white/5 my-1" />
                              <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                                <span className="text-[#c5a059]/90 font-bold block text-[9px] uppercase tracking-wider">Meaning:</span>
                                {line.meaningEn}
                              </p>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* VERSE TOTAL ENTIRE EXPLORATION SUMMARY */}
              <div className="p-6 bg-[#16161a]/90 border-t border-white/5">
                <h4 className="font-serif text-[#c5a059] text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Summary meaning / பொழிப்புரை
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-[#0a0a0c] border border-white/5 rounded-lg text-gray-350">
                    <span className="text-[8px] uppercase tracking-wider text-[#c5a059] font-bold block mb-1">உரை விளக்கம்</span>
                    <p className="text-xs leading-relaxed font-serif">{selectedSong.totalMeaningTa}</p>
                  </div>
                  <div className="p-3.5 bg-[#0a0a0c] border border-white/5 rounded-lg text-gray-400">
                    <span className="text-[8px] uppercase tracking-wider text-[#c5a059] font-bold block mb-1">English Purport</span>
                    <p className="text-xs leading-relaxed font-sans">{selectedSong.totalMeaningEn}</p>
                  </div>
                </div>

                {/* HISTORICAL REFERENCES & EMBEDDED YOUTUBE */}
                <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-5">
                  
                  {/* Reference anchors */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono uppercase">Verify Sources:</span>
                      <a 
                        href={selectedSong.kaumaramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`px-2.5 py-1 bg-[#0a0a0c] border border-white/5 rounded text-[10px] ${selectedSong.deity === "shiva" ? "text-orange-400 hover:border-orange-500/30 font-serif" : "text-[#c5a059] hover:bg-white/5"} uppercase transition-all flex items-center gap-1 font-semibold`}
                      >
                        {selectedSong.deity === "shiva" ? "Shaivam.org" : "Kaumaram.com"} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <a 
                      href={`https://www.youtube.com/watch?v=${selectedSong.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
                    >
                      <Play className="h-3 w-3 fill-current text-red-500" /> Watch performance on YouTube
                    </a>
                  </div>

                  {/* Clean acoustic embed frame */}
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative shadow-sm">
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedSong.youtubeId}?modestbranding=1&rel=0`}
                      title={`YouTube audio explanation for ${selectedSong.titleEn}`}
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  </div>

                </div>

              </div>

            </div>

          </section>

        </div>

      </main>

      {/* COMPACT FLOATING ACCORDION: ASK SCHOLAR ASSISTANT (Stays minimal) */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[350px]">
        <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header trigger */}
          <button
            type="button"
            id="scholar-assistant-expand-btn"
            onClick={() => setIsScholarExpanded(!isScholarExpanded)}
            className="w-full px-4 py-3 bg-[#16161a] border-b border-white/5 hover:bg-white/5 text-[#c5a059] flex items-center justify-between text-xs font-serif italic transition-all"
          >
            <div className="flex items-center gap-2 font-serif font-bold text-white not-italic">
              <MessageSquare className="h-4 w-4 text-[#c5a059]" />
              <span>Ask Scholar Guide / வினாவிடை</span>
            </div>
            <span className="text-[10px] bg-[#c5a059]/10 text-[#c5a059] px-2 py-0.5 rounded uppercase font-sans tracking-widest font-bold">
              {isScholarExpanded ? "Hide" : "Ask"}
            </span>
          </button>

          {/* Expanded Chat pane */}
          <AnimatePresence>
            {isScholarExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden flex flex-col bg-[#0c0c0e]"
              >
                {/* Scrollable messages container */}
                <div className="p-3 max-h-[220px] overflow-y-auto flex flex-col gap-2.5 text-[11px] leading-relaxed">
                  
                  <div className="bg-[#16161a] p-2.5 rounded-lg border border-white/5 text-gray-400">
                    <p className="font-serif italic text-white mb-1">வணக்கம்! I am your AI Thiruppugazh Scholar.</p>
                    Ask any literature question, look up word significances, or explore Santham rhythm parameters directly.
                  </div>

                  {chatHistory.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg ${
                        m.role === "user" 
                          ? "bg-[#202026] text-white self-end text-right border border-white/5" 
                          : "bg-[#16161a] text-gray-300 border border-white/5"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <span className="text-[8px] text-gray-500 block mt-1">
                        {m.role === "user" ? "You" : "Scholar Guide"}
                      </span>
                    </div>
                  ))}

                  {sendingChat && (
                    <div className="text-gray-500 italic p-1 animate-pulse">Scholar is parsing Vedic metrics...</div>
                  )}

                  {chatError && (
                    <div className="text-red-400 text-[10px]">{chatError}</div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Suggestion Shortcuts cards */}
                <div className="px-3 py-2 border-t border-white/5 bg-[#0a0a0c] flex flex-wrap gap-1.5">
                  {chatSuggestions.map((sug, id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => sendChatMessage(sug)}
                      disabled={sendingChat}
                      className="text-[9px] px-2 py-0.5 bg-[#16161a] hover:bg-[#c5a059]/10 border border-white/5 rounded text-[#c5a059] text-left truncate max-w-full"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* Input box */}
                <div className="p-2 border-t border-white/5 bg-[#0a0a0c] flex gap-1.5">
                  <input
                    type="text"
                    placeholder={`Query about ${selectedSong.titleEn}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChatMessage();
                    }}
                    disabled={sendingChat}
                    className="flex-1 px-2.5 py-1 bg-[#16161a] border border-white/10 rounded text-[11px] text-white focus:outline-none"
                  />
                  <button
                    onClick={() => sendChatMessage()}
                    disabled={sendingChat || !chatInput.trim()}
                    className="px-3 bg-[#c5a059] text-black text-xs font-bold rounded hover:bg-[#b08b49]"
                  >
                    Ask
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Elegant Standard footer */}
      <footer id="app-footer" className="mt-12 bg-[#0a0a0c] text-gray-500 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-serif italic font-bold text-[#c5a059] block text-sm">திருப்புகழ் உரைத் தலம் • திருவருளாலயம்</span>
            <p className="text-gray-500 mt-0.5">Exploring the rhythmically divine legacy of Saint Arunagirinathar.</p>
          </div>
          <div className="text-right text-[10px] text-gray-600">
            <span>© 2026 Thiruppugazh Anthology Applet. Verified @google/genai SDK implementation.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
