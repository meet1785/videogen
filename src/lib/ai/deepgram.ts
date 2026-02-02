import { uploadFile, STORAGE_BUCKETS } from "@/lib/supabase";
import type { Caption, WordCaption } from "@/types";

const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen";

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramAlternative {
  transcript: string;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResult {
  channels: DeepgramChannel[];
}

interface DeepgramResponse {
  results: DeepgramResult;
}

export async function generateVoiceover(
  videoId: string,
  text: string
): Promise<{ audioUrl: string; captions: Caption[] }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not configured");
  }

  // Step 1: Generate audio with TTS
  const ttsResponse = await fetch(`${DEEPGRAM_TTS_URL}?model=aura-asteria-en`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!ttsResponse.ok) {
    const error = await ttsResponse.text();
    throw new Error(`Deepgram TTS error: ${error}`);
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

  // Upload audio to Supabase Storage
  const audioPath = `${videoId}/voiceover.mp3`;
  const audioUrl = await uploadFile(
    STORAGE_BUCKETS.AUDIO,
    audioPath,
    audioBuffer,
    "audio/mpeg"
  );

  // Step 2: Transcribe audio to get word-level timestamps
  const sttResponse = await fetch(
    `${DEEPGRAM_STT_URL}?model=nova-2&punctuate=true&utterances=true&smart_format=true`,
    {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "audio/mpeg",
      },
      body: audioBuffer,
    }
  );

  if (!sttResponse.ok) {
    const error = await sttResponse.text();
    throw new Error(`Deepgram STT error: ${error}`);
  }

  const transcription: DeepgramResponse = await sttResponse.json();
  
  // Extract word-level captions
  const words = transcription.results.channels[0].alternatives[0].words;
  
  // Group words into caption segments (~3-5 words each for readability)
  const captions: Caption[] = [];
  let currentCaption: Caption = {
    text: "",
    start: 0,
    end: 0,
    words: [],
  };
  
  const WORDS_PER_CAPTION = 4;

  words.forEach((word: DeepgramWord, index: number) => {
    if (currentCaption.words.length === 0) {
      currentCaption.start = word.start;
    }

    currentCaption.words.push({
      word: word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence,
    });
    currentCaption.end = word.end;

    // Create new caption every N words or at sentence boundaries
    const isEndOfSentence = word.word.match(/[.!?]$/);
    const isFull = currentCaption.words.length >= WORDS_PER_CAPTION;

    if ((isFull || isEndOfSentence) && index < words.length - 1) {
      currentCaption.text = currentCaption.words.map((w: WordCaption) => w.word).join(" ");
      captions.push(currentCaption);
      currentCaption = {
        text: "",
        start: 0,
        end: 0,
        words: [],
      };
    }
  });

  // Push remaining words as final caption
  if (currentCaption.words.length > 0) {
    currentCaption.text = currentCaption.words.map((w: WordCaption) => w.word).join(" ");
    captions.push(currentCaption);
  }

  return { audioUrl, captions };
}
