// Tipos mínimos para la Web Speech API (no incluida por defecto en lib.dom).
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  0: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
