import { useState, useRef, useCallback, useEffect } from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import { GoogleGenAI, Modality } from '@google/genai';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import {
  VAD_ASSET_BASE,
  ONNX_ASSET_BASE,
  OUTPUT_SAMPLE_RATE,
  GEMINI_MODEL,
  safeCall,
  decodeBase64ToInt16,
  encodeInt16ToBase64,
  toInt16Array,
  resumeAudioContext,
  encodePCM16,
  downsampleBuffer,
} from '../utils/audioUtils';

const SHUTDOWN_DELAY_MS = 2000;
const PLAYER_STOP_DELAY_MS = 500;
const AUDIO_BUFFER_SIZE = 4096;
const PCM_SAMPLE_RATE = 16000;
const INT16_DIVISOR = 1.0 / 32768.0;
const END_INTERVIEW_FUNCTION = 'end_interview';
const MAX_AUDIO_QUEUE_LENGTH = 100;
const AUDIO_QUEUE_TTL_MS = 5000;

/**
 * Generic promise cache helper to avoid duplicate async operations
 */
const createPromiseCache = () => {
  const cache = { value: null, promise: null };
  return {
    get: () => cache.value,
    getPromise: () => cache.promise,
    set: (value) => { cache.value = value; },
    setPromise: (promise) => { cache.promise = promise; },
    clear: () => { cache.value = null; cache.promise = null; },
    clearPromise: () => { cache.promise = null; }
  };
};

/**
 * Audio queue manager with TTL and size limits
 */
class AudioQueueManager {
  constructor(maxLength, ttl) {
    this.queue = [];
    this.startTime = null;
    this.maxLength = maxLength;
    this.ttl = ttl;
  }

  add(chunk) {
    const now = Date.now();
    if (!this.startTime) this.startTime = now;

    if (now - this.startTime > this.ttl) {
      this.clear();
      this.startTime = now;
    }

    this.queue.push({ data: new Float32Array(chunk), timestamp: now });

    if (this.queue.length > this.maxLength) {
      this.queue.shift();
    }
  }

  getValidChunks() {
    const now = Date.now();
    return this.queue.filter(chunk => 
      chunk.timestamp && (now - chunk.timestamp) < this.ttl
    );
  }

  clear() {
    this.queue = [];
    this.startTime = null;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

/**
 * Process audio data through the encoding pipeline
 */
const processAudioForSession = (inputData, inputSampleRate, ctx) => {
  const downsampled = downsampleBuffer(inputData, inputSampleRate, PCM_SAMPLE_RATE);
  return encodeInt16ToBase64(encodePCM16(downsampled));
};

/**
 * Custom hook for managing Gemini Live voice conversation
 * Handles all voice I/O, AI networking, and audio hardware
 * Added: MediaStream mixing for combined recording (Human + AI)
 * Added: MediaRecorder lifecycle management
 * Added: axios report submission on stop
 * Added: Automatic termination via Tool Calling (end_interview)
 * 
 * @returns {object} Voice interface state and controls
 */
export const useGeminiVoice = () => {
  const { sessionData } = useSession();
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [connectionState, setConnectionState] = useState('closed');
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [reportData, setReportData] = useState(null);

  const sessionRefs = useRef({
    session: null,
    promise: null,
    ready: { promise: null, resolver: null }
  });
  const tokenCache = useRef(createPromiseCache());
  const recordingRefs = useRef({
    mediaRecorder: null,
    chunks: [],
    mixedDest: null
  });
  const audioRefs = useRef({
    context: null,
    streamPlayer: null,
    recorder: null,
    stopFn: null,
    queueManager: null
  });
  
  const vadRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const shutdownScheduledRef = useRef(false);
  const preWarmedStreamRef = useRef(null);
  const vadCallbacksRef = useRef({ onSpeechStart: null, onSpeechEnd: null });

  const skipReportRef = useRef(false);
  
  const handleEndInterview = useCallback(() => {
    if (!shutdownScheduledRef.current && audioRefs.current.stopFn) {
      shutdownScheduledRef.current = true;
      setIsInterviewComplete(true);
      setTimeout(() => {
        audioRefs.current.stopFn?.();
        shutdownScheduledRef.current = false;
      }, SHUTDOWN_DELAY_MS);
    }
  }, []);
  
  const clearSessionRefs = useCallback(() => {
    sessionRefs.current = {
      session: null,
      promise: null,
      ready: { promise: null, resolver: null }
    };
  }, []);

  const resolveReadyPromise = useCallback(() => {
    if (sessionRefs.current.ready.resolver) {
      sessionRefs.current.ready.resolver();
      sessionRefs.current.ready.resolver = null;
    }
  }, []);

  const createVADConfig = useCallback((stream) => ({
    stream,
    onSpeechStart: () => vadCallbacksRef.current.onSpeechStart?.(),
    onSpeechEnd: () => vadCallbacksRef.current.onSpeechEnd?.(),
    workletURL: `${VAD_ASSET_BASE}vad.worklet.bundle.min.js`,
    baseAssetPath: VAD_ASSET_BASE,
    onnxWASMBasePath: ONNX_ASSET_BASE
  }), []);

  const stopStreamTracks = useCallback((stream) => {
    stream?.getTracks().forEach(t => t.stop());
  }, []);

  const sendAudioToSession = useCallback((session, audioData, sampleRate = PCM_SAMPLE_RATE) => {
    try {
      session.sendRealtimeInput({
        audio: {
          data: audioData,
          mimeType: `audio/pcm;rate=${sampleRate}`
        }
      });
    } catch (error) {
      console.error("Error sending audio chunk", error);
    }
  }, []);

  const getSystemInstruction = useCallback(() => {
    const resumeText = sessionData?.resumeText || '';
    const jobDescription = sessionData?.job?.description || 'general position';
    
    return `### ROLE & OBJECTIVE
You are an expert Senior Technical Recruiter. Your goal is to conduct a professional, 15-minute screening interview.

### INPUT CONTEXT
- **Job Description:** ${jobDescription}
- **Candidate Resume:** ${resumeText}

### CRITICAL INSTRUCTION: ENDING THE INTERVIEW
When you have asked 4-5 questions and are satisfied with the candidate's responses, or if the candidate says they have no more questions:
1.  Give a polite closing (e.g., "Thank you for your time, we will be in touch.").
2.  **IMMEDIATELY call the "${END_INTERVIEW_FUNCTION}" function.** Do not wait for the user to respond to your goodbye.

### VOICE INTERACTION GUIDELINES
1. **Brevity is King:** Keep responses to 1-3 sentences.
2. **One Question at a Time:** Never stack questions.
3. **Active Listening:** Drill down on vague answers.

### INTERVIEW STRUCTURE
1. **Introduction:** Greet and ask for a 2-minute elevator pitch.
2. **Experience:** Ask about 1-2 projects from the resume.
3. **Behavioral:** Ask one "Tell me about a time..." question.
4. **Closing:** Ask if they have questions, answer briefly, then CLOSE the interview using the tool.`;
  }, [sessionData?.resumeText, sessionData?.job?.description]);

  const sendReport = useCallback(async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview_recording.webm');
    formData.append('report_id', sessionData?.reportId || 'unknown');

    try {
      setVoiceStatus('reporting');
      const report = await axios.post(`${API_BASE_URL}/generate-behavioral-report/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReportData(report.data.evaluations);
      // console.log(report.data.evaluations);
    } catch (err) {
      console.error('Failed to send report:', err);
    } finally {
      setVoiceStatus('idle');
      shutdownScheduledRef.current = false;
    }
  }, [sessionData]);

  const createStreamPlayer = useCallback((ctx, mixedDest) => {
    const state = {
      nextStartTime: 0,
      scheduledNodes: []
    };

    return {
      addChunk: (pcmData) => {
        const int16Data = toInt16Array(pcmData);
        if (!int16Data?.length) return;

        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] * INT16_DIVISOR;
        }

        const audioBuffer = ctx.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
        audioBuffer.copyToChannel(float32Data, 0);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.connect(mixedDest);

        const now = ctx.currentTime;
        if (state.nextStartTime < now) {
          state.nextStartTime = now + 0.02;
        }

        source.start(state.nextStartTime);
        state.nextStartTime += audioBuffer.duration;
        state.scheduledNodes.push(source);
        
        source.onended = () => {
          state.scheduledNodes = state.scheduledNodes.filter(n => n !== source);
        };
      },
      stop: () => {
        state.scheduledNodes.forEach(node => safeCall(() => node.stop()));
        state.scheduledNodes = [];
        state.nextStartTime = 0;
      }
    };
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (!audioRefs.current.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      
      const ctx = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioRefs.current.context = ctx;
      recordingRefs.current.mixedDest = ctx.createMediaStreamDestination();
      audioRefs.current.streamPlayer = createStreamPlayer(ctx, recordingRefs.current.mixedDest);
    }

    await resumeAudioContext(audioRefs.current.context);
    return audioRefs.current.context;
  }, [createStreamPlayer]);

  const fetchToken = useCallback(async () => {
    const cache = tokenCache.current;
    if (cache.get()) return cache.get();
    if (cache.getPromise()) return cache.getPromise();

    const fetchPromise = axios.get(`${API_BASE_URL}/get-ephemeral-token/`)
      .then((response) => {
        const token = response.data.token;
        if (!token) throw new Error('Token not found in API response');
        cache.set(token);
        cache.clearPromise();
        return token;
      })
      .catch((err) => {
        cache.clearPromise();
        throw err;
      });

    cache.setPromise(fetchPromise);
    return fetchPromise;
  }, []);

  const getSession = useCallback(async () => {
    if (sessionRefs.current.session) return sessionRefs.current.session;
    if (sessionRefs.current.promise) return sessionRefs.current.promise;

    const apiToken = await fetchToken();
    if (!apiToken) throw new Error('Token is required');

    setConnectionState('connecting');

    if (!sessionRefs.current.ready.promise) {
      let resolver;
      sessionRefs.current.ready.promise = new Promise((resolve) => {
        resolver = resolve;
      });
      sessionRefs.current.ready.resolver = resolver;
    }

    const sessionPromise = (async () => {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiToken,
          httpOptions: { apiVersion: 'v1alpha' },
        });

        const tools = [{
          functionDeclarations: [{
            name: END_INTERVIEW_FUNCTION,
            description: "Call this function to end the interview session when the conversation is complete.",
          }],
        }];

        const session = await ai.live.connect({
          model: GEMINI_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: String(getSystemInstruction()),
            tools,
          },
          callbacks: {
            onopen: async () => {
              setConnectionState('open');
              await ensureAudioContext();
            },
            onmessage: async (message) => {
              if (message.setupComplete) {
                resolveReadyPromise();
                return;
              }

              if (message.toolCall) {
                const functionCalls = message.toolCall.functionCalls || [];
                
                const functionResponses = functionCalls.map(fc => ({
                  id: fc.id,
                  name: fc.name,
                  response: { result: "ok" } 
                }));

                sessionRefs.current.session.sendToolResponse({ functionResponses });

                if (functionCalls.some(fc => fc.name === END_INTERVIEW_FUNCTION)) {
                  handleEndInterview();
                }
                return;
              }

              const modelTurn = message.serverContent?.modelTurn;
              if (modelTurn?.parts?.length) {
                const streamPlayer = audioRefs.current.streamPlayer;
                if (!streamPlayer) return;

                for (const part of modelTurn.parts) {
                  if (part.inlineData?.data) {
                    safeCall(() => {
                      streamPlayer.addChunk(decodeBase64ToInt16(part.inlineData.data));
                    });
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                audioRefs.current.streamPlayer?.stop();
              }
            },
            onerror: (error) => {
              console.error('Gemini Live session error:', error);
            },
            onclose: () => {
              setConnectionState('closed');
              clearSessionRefs();
            }
          }
        });

        sessionRefs.current.session = session;
        sessionRefs.current.promise = null;
        return session;
      } catch (err) {
        setConnectionState('closed');
        setVoiceStatus('error');
        sessionRefs.current.promise = null;
        throw err;
      }
    })();

    sessionRefs.current.promise = sessionPromise;
    return sessionPromise;
  }, [fetchToken, ensureAudioContext, getSystemInstruction, handleEndInterview, resolveReadyPromise, clearSessionRefs]);

  const createVADCallbacks = useCallback(() => ({
    onSpeechStart: () => {
      isSpeakingRef.current = true;
      setVoiceStatus('speaking');
      if (!sessionRefs.current.session && !sessionRefs.current.promise) {
        getSession();
      }
    },
    onSpeechEnd: () => {
      isSpeakingRef.current = false;
      setVoiceStatus('listening');
    }
  }), [getSession]);

  const startVoiceConversation = useCallback(async () => {
    if (voiceStatus === 'listening' || voiceStatus === 'speaking') return;
    setVoiceStatus('priming');
    setIsInterviewComplete(false);
    shutdownScheduledRef.current = false;

    try {
      const preWarmedStream = preWarmedStreamRef.current;
      let stream;
      if (preWarmedStream) {
        stream = preWarmedStream;
        preWarmedStreamRef.current = null;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const [token, ctx, session] = await Promise.all([
        fetchToken(),
        ensureAudioContext(),
        getSession()
      ]);
      
      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(recordingRefs.current.mixedDest);

      recordingRefs.current.chunks = [];
      const mediaRecorder = new MediaRecorder(recordingRefs.current.mixedDest.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingRefs.current.chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        if (!skipReportRef.current) {
          sendReport(new Blob(recordingRefs.current.chunks, { type: 'audio/webm' }));
        }
        else {
          recordingRefs.current.chunks = [];
        }
        skipReportRef.current = false;
      };
      mediaRecorder.start();
      recordingRefs.current.mediaRecorder = mediaRecorder;

      const canReuseVAD = vadRef.current && preWarmedStream && preWarmedStream === stream;

      vadCallbacksRef.current = createVADCallbacks();

      if (canReuseVAD) {
        await vadRef.current.start();
      } else {
        if (vadRef.current) {
          safeCall(() => vadRef.current.destroy());
          vadRef.current = null;
        }

        vadRef.current = await MicVAD.new(createVADConfig(stream));
        await vadRef.current.start();
      }

      const queueManager = new AudioQueueManager(MAX_AUDIO_QUEUE_LENGTH, AUDIO_QUEUE_TTL_MS);
      audioRefs.current.queueManager = queueManager;
      let queueFlushed = false;

      const flushQueueToGemini = () => {
        if (queueFlushed || !sessionRefs.current.session || queueManager.isEmpty()) {
          queueFlushed = true;
          return;
        }

        const validChunks = queueManager.getValidChunks();
        for (const chunk of validChunks) {
          const base64Audio = processAudioForSession(chunk.data, ctx.sampleRate, ctx);
          sendAudioToSession(sessionRefs.current.session, base64Audio);
        }
        
        queueManager.clear();
        queueFlushed = true;
      };

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
  
        if (!sessionRefs.current.session) {
          queueManager.add(inputData);
          return;
        }
        
        if (!queueFlushed && !queueManager.isEmpty()) {
          flushQueueToGemini();
        }
        
        const base64Audio = processAudioForSession(inputData, ctx.sampleRate, ctx);
        sendAudioToSession(sessionRefs.current.session, base64Audio);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      audioRefs.current.recorder = { source, processor, stream };

      setVoiceStatus('listening');
    } catch (err) {
      console.error("Failed to start voice:", err);
      setVoiceStatus('error');
    }
  }, [getSession, voiceStatus, fetchToken, ensureAudioContext, sendReport, createVADCallbacks, createVADConfig, sendAudioToSession]);

  const stopVoiceConversation = useCallback((skipReport = false) => {

    skipReportRef.current = skipReport;
    if (recordingRefs.current.mediaRecorder?.state !== 'inactive') {
      recordingRefs.current.mediaRecorder.stop();
    }

    audioRefs.current.queueManager?.clear();

    setIsInterviewComplete(true);
    setVoiceStatus('idle');
    isSpeakingRef.current = false;
    safeCall(() => vadRef.current?.pause());

    if (audioRefs.current.recorder) {
      const { source, processor, stream } = audioRefs.current.recorder;
      safeCall(() => {
        source.disconnect();
        processor.disconnect();
        stopStreamTracks(stream);
      });
      audioRefs.current.recorder = null;
    }
    
    setTimeout(() => audioRefs.current.streamPlayer?.stop(), PLAYER_STOP_DELAY_MS);
    safeCall(() => sessionRefs.current.session?.close());
    clearSessionRefs();
  }, [clearSessionRefs, stopStreamTracks]);

  useEffect(() => {
    audioRefs.current.stopFn = stopVoiceConversation;
  }, [stopVoiceConversation]);

  const preWarmVAD = useCallback(async () => {
    if (vadRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      preWarmedStreamRef.current = stream;

      vadCallbacksRef.current = {
        onSpeechStart: () => {},
        onSpeechEnd: () => {}
      };

      vadRef.current = await MicVAD.new(createVADConfig(stream));
    } catch (err) {
      stopStreamTracks(preWarmedStreamRef.current);
      preWarmedStreamRef.current = null;
    }
  }, [createVADConfig, stopStreamTracks]);

  useEffect(() => {
    if (!sessionData?.resumeText || !sessionData?.job?.description) return;

    fetchToken().catch((err) => {
      console.error('Error fetching token speculatively:', err);
    });

    getSession().catch(() => {});

    preWarmVAD().catch(() => {});

    return () => {
      stopVoiceConversation(true);
      safeCall(() => {
        vadRef.current?.destroy();
        audioRefs.current.context?.close();
      });
      stopStreamTracks(preWarmedStreamRef.current);
      preWarmedStreamRef.current = null;
      audioRefs.current.context = null;
      audioRefs.current.streamPlayer = null;
    };
  }, [sessionData?.resumeText, sessionData?.job?.description, fetchToken, getSession, stopVoiceConversation, preWarmVAD, stopStreamTracks]);

  return {
    voiceStatus,
    connectionState,
    isInterviewComplete,
    reportData,
    startVoiceConversation,
    stopVoiceConversation,
  };
};

