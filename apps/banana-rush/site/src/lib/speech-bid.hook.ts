import { useCallback, useRef, useState } from 'react';
import { readTranscript } from './speech-transcript.core';
import { parseSpokenNumber } from './spoken-number.core';

export interface SpeechBid {
  readonly isSupported: boolean;
  readonly isListening: boolean;
  readonly startListening: () => void;
  readonly stopListening: () => void;
}

function readRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * @Blueprint hook-push-to-talk-recognition
 * @BlueprintName Hook For Push To Talk Recognition
 * @BlueprintUsage Use for voice input in a room where several people are talking at once, when only the holder of this device should be heard.
 * @BlueprintDescription Starts a recogniser on the press and stops it on the release, so the microphone is open only while a thumb is down. That is what keeps a neighbour's answer out of this phone's result without any speaker model at all: the window is too short and too deliberate to catch anybody else. A fresh recogniser is built per press rather than kept, because the vendor object is single shot and restarting a stopped one throws. The absence of the API is reported rather than thrown, so a browser without it simply shows no microphone and the keypad below stays the way in. What was heard is handed on as text and turned into a number elsewhere, so the awkward part is a pure function with tests rather than something only a real microphone can exercise.
 */
export function useSpeechBid(locale: string, onNumberHeard: (amount: number) => void): SpeechBid {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionConstructor = readRecognitionConstructor();

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (recognitionConstructor === null) return;
    const recognition = new recognitionConstructor();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const amount = parseSpokenNumber(readTranscript(event));
      if (amount === null) return;
      onNumberHeard(amount);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [recognitionConstructor, locale, onNumberHeard]);

  return {
    isSupported: recognitionConstructor !== null,
    isListening,
    startListening,
    stopListening,
  };
}
