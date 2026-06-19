export interface SongLine {
  tamil: string;
  transliteration: string;
  meaningTa: string;
  meaningEn: string;
}

export interface Song {
  id: string;
  category?: "thiruppugazh" | "anuboothi" | "alangaram" | "viruththam";
  deity?: "shiva" | "murugan";
  titleTa: string;
  titleEn: string;
  location: string;
  santham: string;
  introductionEn: string;
  introductionTa: string;
  lines: SongLine[];
  totalMeaningTa: string;
  totalMeaningEn: string;
  youtubeId: string;
  kaumaramUrl: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface FamousSong {
  number: number;
  title: string;
  authorOrArtist: string;
  genre: string;
  genreLabel: string;
  details?: string;
  localSongId?: string;
}

export interface ShivaHymn {
  titleEn: string;
  titleTa: string;
  author: string;
  volume: string;
  significance: string;
  verseCount?: string;
  localSongId?: string;
}

export interface TirumuraiVolume {
  volumeNumber: string;
  author: string;
  work: string;
  count: string;
  details?: string;
}
