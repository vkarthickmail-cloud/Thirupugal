export interface SongLine {
  tamil: string;
  transliteration: string;
  meaningTa: string;
  meaningEn: string;
}

export interface Song {
  id: string;
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
