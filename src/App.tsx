import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Sparkles, 
  Volume2, 
  Image as ImageIcon, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  Info, 
  ExternalLink, 
  Play, 
  Check, 
  HelpCircle, 
  FileText, 
  Music, 
  ChevronRight, 
  Key, 
  AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SONGS_DATA } from "./songsData";
import { Song, ChatMessage } from "./types";

export default function App() {
  const [songs, setSongs] = useState<Song[]>(SONGS_DATA);
  const [selectedSong, setSelectedSong] = useState<Song>(SONGS_DATA[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTTS, setLoadingTTS] = useState<string | null>(null); // tracks active TTS line index or 'total'
  const [apiStatus, setApiStatus] = useState<{ hasKey: boolean; checked: boolean }>({ hasKey: false, checked: false });
  const [ttsVoice, setTtsVoice] = useState("Kore"); // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
  
  // Image Generator State
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // Chat Interface State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatModel, setChatModel] = useState<"flash" | "pro">("flash");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio elements
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Check backend config on mount
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

  // Set default prompt when song changes
  useEffect(() => {
    setImagePrompt(`Lord Murugan riding a majestic peacock with the sacred Vel spear, reflecting the scene in ${selectedSong.titleEn}`);
    setGeneratedImg(null);
    setImgError(null);
  }, [selectedSong]);

  // Scroll chat to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Filter songs by title, location, or meaning
  const filteredSongs = songs.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.titleEn.toLowerCase().includes(query) ||
      s.titleTa.includes(query) ||
      s.location.toLowerCase().includes(query) ||
      s.santham.toLowerCase().includes(query)
    );
  });

  // Handle Text-to-Speech
  const handleRecitation = async (text: string, identifier: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
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

      // Play binary base64 audio
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
      alert(`Text-to-Speech Error: ${err.message || "Please make sure GEMINI_API_KEY is configured."}`);
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

  // Handle High-Quality Divine Art Generation
  const generateDivineArt = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImg(true);
    setImgError(null);
    setGeneratedImg(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, size: imageSize }),
      });

      const data = await res.json();
      if (res.status !== 200 || data.error) {
        throw new Error(data.error || "Failed to render aesthetic image.");
      }

      setGeneratedImg(data.imageUrl);
    } catch (err: any) {
      setImgError(err.message || "An error occurred during image generation.");
    } finally {
      setGeneratingImg(false);
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
      // Map history to the shape the backend expects
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
        throw new Error(data.error || "AI Scholar was unable to clarify.");
      }

      const modelMsg: ChatMessage = {
        role: "model",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistory((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setChatError(err.message || "An error occurred with the chatbot connector.");
    } finally {
      setSendingChat(false);
    }
  };

  // Sample prompt helpers for quick exploration
  const chatSuggestions = [
    `Retrieve and explain further lines of ${selectedSong.titleEn}`,
    `What is the spiritual significance of the Santham rhythm "${selectedSong.santham.split(' ')[0]}"?`,
    "Who was Saint Arunagirinathar and how did Lord Murugan save him?",
    "Give an analysis of Thiruppugazh's usage of the six-lettered mantra (Saravanabhava)."
  ];

  return (
    <div id="thiruppugazh-app" className="min-h-screen bg-[#0c0c0e] text-[#d1d1d1] font-sans selection:bg-[#c5a059]/30">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#16161a] to-transparent pointer-events-none -z-10" />

      {/* Top Banner & Status Warning Bar */}
      {!apiStatus.hasKey && apiStatus.checked && (
        <div id="missing-key-banner" className="bg-[#16161a] border-b border-white/5 text-[#c5a059] py-2.5 px-4 text-center text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#c5a059]" />
          <span>
            <strong>Demo / Read-Only Mode:</strong> API Key is missing. Please add your <strong>GEMINI_API_KEY</strong> in the <strong>Settings &gt; Secrets</strong> panel to enable real-time Chat, Image Art Studio, and Vocal Speech synthesis!
          </span>
        </div>
      )}

      {/* Elegant Header */}
      <header id="app-header" className="border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-[#c5a059] flex items-center justify-center text-[#c5a059] font-serif text-xl italic bg-[#16161a]">
              த
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif text-white tracking-tight">திருப்புகழ் <span className="text-[#c5a059] font-sans font-light text-xs ml-2 tracking-[0.2em] uppercase">Thiruppugazh Digital</span></h1>
              </div>
              <p className="text-xs text-gray-500">Thiruppugazh Song Explanations, Transliterations, Recitals & AI Guide</p>
            </div>
          </div>

          {/* Quick Config Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-[#16161a] text-gray-300 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="font-semibold text-[#c5a059]">Voice / குரல்:</span>
              <select 
                value={ttsVoice} 
                onChange={(e) => setTtsVoice(e.target.value)} 
                className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
              >
                <option value="Kore" className="bg-[#0a0a0c] text-white">Kore (Gentle Female)</option>
                <option value="Zephyr" className="bg-[#0a0a0c] text-white">Zephyr (Cheer Male)</option>
                <option value="Puck" className="bg-[#0a0a0c] text-white">Puck (Warm Voice)</option>
                <option value="Charon" className="bg-[#0a0a0c] text-white">Charon (Deep Voice)</option>
                <option value="Fenrir" className="bg-[#0a0a0c] text-white">Fenrir (Classic Voice)</option>
              </select>
            </div>

            {loadingTTS && (
              <button 
                onClick={stopAudio}
                className="text-xs font-semibold px-3 py-1.5 text-red-400 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 rounded-lg flex items-center gap-1 transition-colors animate-pulse"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Stop Playback
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Hero Section */}
        <div id="overview-hero" className="mb-8 rounded-2xl bg-[#0a0a0c] text-gray-300 p-6 sm:p-8 relative overflow-hidden shadow-xl border border-white/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 mb-2 text-[#c5a059] text-xs font-bold tracking-widest uppercase">
              <Sparkles className="h-4 w-4" />
              <span>THE SUPREME RHYTHMIC CHANTS FOR LORD SKANDA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight mb-3 italic">
              Sacred Verses with Line-by-Line Revelations
            </h2>
            <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
              Composed by the 15th-century mystic <strong>Saint Arunagirinathar</strong>, Thiruppugazh is renowned for its intoxicating meters (Santham) and deep Vedantic wisdom. Explore the line-by-line Tamil and English translations, trigger live AI recitals, generate visual art representing the hymns, or chat with the AI Liturical guide.
            </p>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Songs Selector & Index Column (4 Cols) */}
          <section id="sidebar-song-navigator" className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Song Lookup Directory */}
            <div className="bg-[#0a0a0c] rounded-xl p-5 shadow-sm border border-white/5">
              <h3 className="font-serif text-white text-base mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#c5a059]" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059] font-bold">Selection / தெரிவு</span>
              </h3>
              
              {/* Search Bar Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Query by title, locations, rhythm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#16161a] border border-white/5 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a059]/55 transition-all"
                />
              </div>

              {/* Hymn lists */}
              <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredSongs.length > 0 ? (
                  filteredSongs.map((song) => {
                    const isSelected = song.id === selectedSong.id;
                    return (
                      <button
                        key={song.id}
                        onClick={() => setSelectedSong(song)}
                        className={`w-full text-left p-4 rounded transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-[#16161a] border-l-2 border-[#c5a059]"
                            : "hover:bg-white/5 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-serif ${isSelected ? "text-white" : "text-gray-300"}`}>
                            {song.titleTa}
                          </span>
                          <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? "text-[#c5a059]" : "text-gray-600"}`} />
                        </div>
                        
                        <span className={`text-xs ${isSelected ? "text-[#c5a059]" : "text-gray-500"} font-medium tracking-wide`}>
                          {song.titleEn}
                        </span>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-white/5 text-gray-400 border border-white/5 rounded">
                            {song.location}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]" title={song.santham}>
                            {song.santham}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 px-4 text-gray-500">
                    <p className="text-sm font-medium">No pre-populated hymns match your search.</p>
                    <p className="text-xs text-gray-600 mt-1">You can ask our AI Scholar in the chat below to fetch and explain this song!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Information helper */}
            <div className="bg-[#16161a]/60 border border-white/5 rounded-xl p-5">
              <h4 className="font-serif text-[#c5a059] text-sm flex items-center gap-1.5 mb-2">
                <Info className="h-4 w-4 text-[#c5a059]" />
                <span>Saint Arunagirinathar's Meter</span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tiruppugazh stands peerless in Indian music theology for its strict reliance on <strong>Santhams</strong> (rhythmic beats based on syllable weight). Reciting them correctly coordinates the rhythmic centers of the brain and provides high mental clarity.
              </p>
            </div>
          </section>

          {/* RIGHT: Major Content Area (8 Cols) */}
          <section className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Song Presenter view */}
            <div id="hymn-workspace" className="bg-[#0c0c0e] rounded-xl shadow-sm border border-white/5 overflow-hidden">
              
              {/* Song Header Tab */}
              <div className="bg-[#0a0a0c] p-10 border-b border-white/5 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="px-2 py-1 bg-[#c5a059]/10 text-[#c5a059] text-[10px] uppercase tracking-widest rounded border border-[#c5a059]/20">
                      {selectedSong.location} Thalaththil
                    </span>
                    
                    {/* Full audio prompt button */}
                    <button 
                      onClick={() => handleRecitation(selectedSong.totalMeaningTa + " " + selectedSong.totalMeaningEn, "total")}
                      disabled={loadingTTS !== null}
                      className="px-4 py-2 border border-[#c5a059]/30 text-[#c5a059] text-xs uppercase tracking-widest hover:bg-[#c5a059]/10 disabled:opacity-50 transition-all rounded flex items-center gap-1.5 bg-[#0a0a0c]"
                    >
                      {loadingTTS === "total" ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Playing Recitation
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" /> Recite Full Meanings
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-4xl font-serif text-white mt-4 italic">{selectedSong.titleTa}</h3>
                  <p className="text-lg font-light text-gray-400 mt-2">{selectedSong.titleEn}</p>
                  
                  <div className="mt-4 flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#c5a059] font-semibold">Meter / சந்தம்</p>
                      <p className="text-sm font-mono text-gray-350 mt-0.5">{selectedSong.santham}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hymn Intro */}
              <div className="p-6 border-b border-white/5 bg-[#16161a]/40">
                <p className="text-[10px] text-[#c5a059] font-bold uppercase tracking-[0.2em] mb-1.5">Hymn Context & Synopsis</p>
                <p className="text-sm text-gray-300 leading-relaxed mb-3 font-serif italic">{selectedSong.introductionTa}</p>
                <p className="text-xs text-gray-400 italic leading-relaxed">{selectedSong.introductionEn}</p>
              </div>

              {/* Line by Line explainer table */}
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#0a0a0c] border-b border-white/5 text-[#c5a059] font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 w-[10%] text-center">Recite</th>
                      <th className="py-3 px-4 w-[45%] border-r border-[#16161a]">Verse (Tamil) & Transliteration</th>
                      <th className="py-3 px-4 w-[45%]">Line Explanations (Tamil / English)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSong.lines.map((line, idx) => {
                      const lineId = `line-${idx}`;
                      const isLineLoading = loadingTTS === lineId;
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          
                          {/* Audio Trigger button inline */}
                          <td className="py-4 px-3 text-center align-middle">
                            <button
                              onClick={() => handleRecitation(`${line.tamil}. Meaning: ${line.meaningEn}`, lineId)}
                              disabled={loadingTTS !== null}
                              title="Listen to Tamil verse and English translation"
                              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all border ${
                                isLineLoading 
                                  ? "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059] scale-105 shadow-sm"
                                  : "text-gray-400 hover:text-[#c5a059] bg-white/5 hover:bg-white/10 border-white/10 disabled:opacity-50"
                              }`}
                            >
                              {isLineLoading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Volume2 className="h-4 w-4 shrink-0 stroke-[2]" />
                              )}
                            </button>
                          </td>

                          {/* Original lyrics & Transliteration */}
                          <td className="py-4 px-4 border-r border-white/5 align-top">
                            <p className="text-lg font-serif text-white tracking-wide leading-relaxed mb-1.5 Tamil-heavy">
                              {line.tamil}
                            </p>
                            <p className="text-xs text-[#c5a059] font-mono italic leading-relaxed opacity-80">
                              {line.transliteration}
                            </p>
                          </td>

                          {/* Simplified meanings */}
                          <td className="py-4 px-4 align-top">
                            <div className="bg-white/5 p-4 rounded border border-white/5">
                              <p className="text-sm text-gray-300 mb-2 leading-relaxed">
                                <span className="text-[#c5a059] font-bold">Tamil:</span> {line.meaningTa}
                              </p>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                <span className="text-[#c5a059] font-bold">English:</span> {line.meaningEn}
                              </p>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Synopsis Panel Totals */}
              <div className="p-6 bg-[#16161a] border-t border-white/5">
                <h4 className="font-serif text-white text-sm mb-3 flex items-center gap-1.5 uppercase tracking-widest font-semibold">
                  <FileText className="h-4 w-4 text-[#c5a059]" />
                  <span>Comprehensive Meaning</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                  <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/5 text-gray-300">
                    <p className="text-xs text-[#c5a059] font-bold uppercase tracking-wider mb-1.5 font-sans">பொழிப்புரை (Simple Tamil)</p>
                    <p className="text-xs leading-relaxed font-semibold">{selectedSong.totalMeaningTa}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/5 text-gray-400">
                    <p className="text-xs text-[#c5a059] font-bold uppercase tracking-wider mb-1.5">Complete English Purport</p>
                    <p className="text-xs leading-relaxed">{selectedSong.totalMeaningEn}</p>
                  </div>
                </div>

                {/* External Links References */}
                <div className="mt-6 pt-5 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-500 flex gap-3 items-center">
                    <span className="text-[10px] text-gray-550">External Links:</span>
                    <a 
                      href={selectedSong.kaumaramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white/5 rounded text-[10px] uppercase tracking-wider hover:bg-white/10 border border-white/5 text-[#c5a059] inline-flex items-center gap-0.5"
                    >
                      Kaumaram (திருப்புகழ் வலைத்தளம்) <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* YouTube video embeds for acoustic reference */}
                  <a 
                    href={`https://www.youtube.com/watch?v=${selectedSong.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 border border-[#c5a059]/30 text-[#c5a059] text-[10px] uppercase tracking-widest hover:bg-[#c5a059]/10 bg-[#0a0a0c] rounded flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 stroke-[3] fill-current text-white" /> View Performance on YouTube
                  </a>
                </div>

                {/* Embedded Video Player Iframe */}
                <div className="mt-5 rounded-xl overflow-hidden border border-white/5 bg-black aspect-video relative">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedSong.youtubeId}?modestbranding=1&rel=0`}
                    title={`Thiruppugazh reference audio for ${selectedSong.titleEn}`}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>

              </div>

            </div>

            {/* AI Art Studio & Generator panel */}
            <div id="art-studio" className="bg-[#0a0a0c] rounded-xl shadow-sm border border-white/5 overflow-hidden">
              
              <div className="bg-[#16161a] border-b border-white/5 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#c5a059]" />
                  <div>
                    <h3 className="font-serif text-sm tracking-widest text-[#c5a059] uppercase font-bold">Thiruppugazh Divine Art Studio</h3>
                    <p className="text-[10px] text-gray-500 font-sans">Visualize the sacred poetry using high-quality image generators</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 px-2.5 py-1 rounded font-medium">
                  Model: gemini-3-pro-image-preview
                </span>
              </div>

              <div className="p-6">
                <p className="text-xs text-gray-400 mb-4 font-sans">
                  Describe a scene which Saint Arunagirinathar paints in this hymn (e.g., Lord Murugan spear-wielding, fighting Soorapadman in the ocean, or marrying Valli) to render gorgeous, detailed watercolors of pure Vedic art.
                </p>

                <div className="flex flex-col gap-4">
                  
                  {/* Prompt box */}
                  <div>
                    <label className="block text-xs font-bold text-[#c5a059] mb-1.5 uppercase font-[#c5a059] tracking-wider">Aesthetic Image Prompt</label>
                    <textarea 
                      rows={2}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g. Elegant watercolor style illustration of Lord Muruga holding his golden radiant Vel, standing in peaceful clouds, soft amber background, spiritual, highly detailed"
                      className="w-full p-3 border border-white/10 rounded text-sm bg-[#16161a] text-white placeholder-gray-650 focus:outline-none focus:border-[#c5a059]/50 transition-all resize-none"
                    />
                  </div>

                  {/* Size toggler and Action Button */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    
                    {/* Resolution Selector: Affordance for 1K, 2K, 4K */}
                    <div className="flex items-center gap-2 bg-[#16161a] p-1 rounded border border-white/5">
                      <span className="text-xs font-semibold text-gray-500 pl-2 pr-1">Output Resolution:</span>
                      {(["1K", "2K", "4K"] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setImageSize(sz)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                            imageSize === sz
                              ? "bg-[#c5a059] text-[#0a0a0c] shadow-sm"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={generateDivineArt}
                      disabled={generatingImg || !imagePrompt.trim()}
                      className="px-5 py-2 text-xs uppercase tracking-wider font-bold border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059]/10 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                      {generatingImg ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Rendering Spiritual Webart...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 fill-current" /> Generate {imageSize} Art
                        </>
                      )}
                    </button>

                  </div>

                  {/* Visual Output Display Panel */}
                  <div className="mt-4 border border-white/5 rounded-xl bg-[#16161a]/30 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                    <AnimatePresence mode="wait">
                      {generatingImg && (
                        <motion.div 
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-[#0c0c0e]/95 flex flex-col items-center justify-center p-6 text-center z-10"
                        >
                          <div className="h-14 w-14 rounded-full border-4 border-[#c5a059] border-t-transparent animate-spin mb-4" />
                          <p className="text-sm font-semibold text-[#c5a059] uppercase tracking-widest">Generating {imageSize} Divine Artwork</p>
                          <p className="text-xs text-gray-500 mt-1.5 max-w-sm">
                            Harnessing the high-quality <code className="bg-[#16161a] px-1.5 py-0.5 rounded text-[#c5a059]">gemini-3-pro-image-preview</code> to interpret {selectedSong.titleEn} literary imagery...
                          </p>
                        </motion.div>
                      )}

                      {imgError && (
                        <motion.div 
                          key="error"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-6 text-center text-red-400"
                        >
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                          <p className="text-sm font-bold">Image Studio Error</p>
                          <p className="text-xs mt-1 text-red-300 max-w-md">{imgError}</p>
                          <p className="text-xs text-gray-500 mt-3 font-semibold">Note: Ensure your GEMINI_API_KEY is configured in Secrets.</p>
                        </motion.div>
                      )}

                      {generatedImg ? (
                        <motion.div 
                          key="image"
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-full h-full flex flex-col"
                        >
                          <img 
                            src={generatedImg} 
                            alt={imagePrompt}
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-cover max-h-[500px]"
                          />
                          <div className="bg-[#0a0a0c] text-gray-300 p-3 text-xs flex justify-between items-center border-t border-white/5">
                            <span className="truncate pr-4 italic font-medium text-[#c5a059]">"{imagePrompt}"</span>
                            <span className="shrink-0 font-bold bg-white/5 px-2 py-0.5 rounded text-xs">{imageSize} Resolution</span>
                          </div>
                        </motion.div>
                      ) : (
                        !generatingImg && !imgError && (
                          <div className="text-center p-8 text-gray-600">
                            <ImageIcon className="h-12 w-12 mx-auto stroke-[1] mb-2 text-gray-750" />
                            <p className="text-sm font-semibold">Visual Art Studio is Idle</p>
                            <p className="text-xs mt-0.5 max-w-xs mx-auto">Select a song above or input custom prompts, choose size output details, and click generate.</p>
                          </div>
                        )
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>
            </div>

            {/* AI Liturgical Scholar Chat Window (Multi-Turn Chatbot) */}
            <div id="ai-scholar-chat" className="bg-[#0a0a0c] rounded-xl shadow-sm border border-white/5 overflow-hidden flex flex-col">
              
              <div className="bg-[#16161a] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#c5a059]" />
                  <div>
                    <h3 className="font-serif text-sm tracking-widest text-[#c5a059] uppercase font-bold">Thiruppugazh Scholar AI Companion</h3>
                    <p className="text-[10px] text-gray-500 font-sans">Ask any literature questions, Santham analysis, or lookup other songs</p>
                  </div>
                </div>

                {/* Model switcher control inside header */}
                <div className="flex items-center gap-1 bg-[#0a0a0c] p-0.5 rounded border border-white/5">
                  <button
                    type="button"
                    onClick={() => setChatModel("flash")}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                      chatModel === "flash" 
                        ? "bg-[#c5a059] text-[#0a0a0c]" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Flash (Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModel("pro")}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                      chatModel === "pro" 
                        ? "bg-[#c5a059] text-[#0a0a0c]" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Pro (Literary Deep)
                  </button>
                </div>
              </div>

              {/* Chat messages thread */}
              <div className="bg-[#0c0c0e]/50 p-6 min-h-[300px] max-h-[420px] overflow-y-auto flex flex-col gap-4">
                
                {/* Initial welcome message */}
                <div className="flex gap-3 max-w-[85%]">
                  <div className="h-8 w-8 rounded-full bg-[#c5a059]/10 text-[#c5a059] shrink-0 flex items-center justify-center font-bold text-xs border border-[#c5a059]/20">
                    A
                  </div>
                  <div className="bg-[#16161a] border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <p className="text-xs leading-relaxed text-gray-300 font-sans">
                      வணக்கம்! I am your <strong>Thiruppugazh AI Scholar Guide</strong>. I specialize in Arunagirinathar's mystic poetry, Shaiva Siddhanta ontology, and the rhythmic Santham meters. 
                    </p>
                    <p className="text-xs leading-relaxed text-gray-350 mt-2 font-sans">
                      You can ask me how to recite specific lines, query about Tamil words (like what <i>முப்புரி</i> or <i>முக்கண்ணன்</i> means), or request line-by-line interpretations of <strong>any other Thiruppugazh song</strong> in Tamil and English! How can I help you today?
                    </p>
                    <span className="text-[9px] text-[#c5a059] font-medium block mt-1.5 font-mono">Scholar Companion</span>
                  </div>
                </div>

                {/* Simulated/Real chat dialogs */}
                {chatHistory.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                      <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs border ${
                        isUser 
                          ? "bg-white/10 text-white border-white/20" 
                          : "bg-[#c5a059]/10 text-[#c5a059] border-[#c5a059]/20"
                      }`}>
                        {isUser ? "U" : "S"}
                      </div>
                      <div className={`p-4 rounded-2xl relative ${
                        isUser 
                          ? "bg-[#202026] text-white border border-white/10 rounded-tr-none shadow-sm" 
                          : "bg-[#16161a] border border-white/5 text-gray-300 rounded-tl-none shadow-sm"
                      }`}>
                        {/* Preserve layout line breaks for AI scholar literature format */}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
                        
                        <div className="flex items-center justify-between gap-4 mt-2 border-t pt-1 border-white/5">
                          <span className={`text-[9px] ${isUser ? "text-gray-400" : "text-[#c5a059]"} font-medium`}>
                            {isUser ? "You" : `Scholar Guide [${chatModel === "pro" ? "Pro Model" : "Flash"}]`}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {sendingChat && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="h-8 w-8 rounded-full bg-[#c5a059]/10 text-[#c5a059] shrink-0 flex items-center justify-center font-bold text-xs border border-[#c5a059]/20">
                      S
                    </div>
                    <div className="bg-[#16161a] border border-white/5 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-500 italic">Scholar is analyzing the sacred verse meter...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded bg-red-950/20 border border-red-900/35 text-xs text-red-405">
                    <strong>Error:</strong> {chatError}. Ensure a valid API Key is configured in settings.
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Suggestions shortcuts */}
              <div className="px-6 py-3 border-t border-b border-white/5 bg-[#0a0a0c] flex flex-wrap gap-2">
                <span className="text-[10px] font-bold text-[#c5a059] uppercase self-center shrink-0 tracking-wider">Sample Inquiries:</span>
                {chatSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendChatMessage(sug)}
                    disabled={sendingChat}
                    className="text-[10px] font-sans px-2.5 py-1 bg-[#16161a] hover:bg-[#c5a059]/10 text-[#c5a059] border border-white/5 hover:border-[#c5a059]/30 rounded transition-all max-w-xs truncate"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <div className="p-4 bg-[#0a0a0c] border-[#16161a] flex items-center gap-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendChatMessage();
                  }}
                  disabled={sendingChat}
                  placeholder={`Consult AI Scholar about "${selectedSong.titleEn}"...`}
                  className="flex-1 py-1.5 px-4 border border-white/10 rounded-lg text-xs bg-[#16161a] text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a059]/50 transition-all h-9"
                />
                <button
                  type="button"
                  onClick={() => sendChatMessage()}
                  disabled={sendingChat || !chatInput.trim()}
                  className="px-4 py-2 bg-[#c5a059] hover:bg-[#b08b49] text-[#0a0a0c] disabled:opacity-50 text-xs font-bold rounded transition-all flex items-center gap-1"
                >
                  Send <ChevronRight className="h-3 w-3 stroke-[3]" />
                </button>
              </div>

            </div>

          </section>

        </div>

      </main>

      {/* App footer with simple Credits */}
      <footer id="app-footer" className="mt-16 bg-[#0a0a0c] text-gray-550 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-bold text-[#c5a059] text-sm block font-serif">திருவருட்பெருவெளி • திருப்புகழ் உரைத்தலம்</span>
            <p className="text-xs text-gray-500 mt-1">Explores line-by-line metrics, Ganesha invocations, and Murugan exploits with state of the art AI recitals.</p>
          </div>
          <div className="text-xs text-gray-600">
            <span>© 2026 Thiruppugazh Multi-turn Explainer applet. Integrated via @google/genai SDK.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
