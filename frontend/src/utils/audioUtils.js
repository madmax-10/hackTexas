// Audio utility functions for Gemini Live voice interface

// Gemini Live Configuration
export const VAD_ASSET_BASE = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/';
export const ONNX_ASSET_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
export const PCM_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live outputs at 24kHz
export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Helper function for safe function calls
export const safeCall = (fn) => {
  try {
    return fn();
  } catch (err) {
    // Silently handle errors
  }
};

// Decode base64 string to Int16Array
export const decodeBase64ToInt16 = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
};

// Encode Int16Array to base64 string
export const encodeInt16ToBase64 = (pcmBuffer) => {
  const int16Data = new Int16Array(pcmBuffer);
  const uint8Data = new Uint8Array(int16Data.buffer);
  
  const CHUNK_SIZE = 8192;
  if (uint8Data.length <= CHUNK_SIZE) {
    return btoa(String.fromCharCode.apply(null, uint8Data));
  }
  
  const chunks = [];
  for (let i = 0; i < uint8Data.length; i += CHUNK_SIZE) {
    const chunk = uint8Data.subarray(i, Math.min(i + CHUNK_SIZE, uint8Data.length));
    chunks.push(String.fromCharCode.apply(null, chunk));
  }
  return btoa(chunks.join(''));
};

// Convert data to Int16Array
export const toInt16Array = (data) => {
  if (data instanceof Int16Array) return data;
  if (data instanceof ArrayBuffer) return new Int16Array(data);
  return null;
};

// Resume audio context if suspended
export const resumeAudioContext = async (ctx) => {
  if (ctx?.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      // Silently handle resume errors
    }
  }
};

// Encode PCM16 samples
export const encodePCM16 = (samples) => {
  if (!samples?.length) return null;
  const len = samples.length;
  const int16Array = new Int16Array(len);
  const MAX_POS = 0x7fff;
  const MAX_NEG = 0x8000;
  for (let i = 0; i < len; i++) {
    const s = samples[i];
    const clamped = s > 1 ? 1 : (s < -1 ? -1 : s);
    int16Array[i] = clamped < 0 ? (clamped * MAX_NEG) | 0 : (clamped * MAX_POS) | 0;
  }
  return int16Array.buffer;
};

// Add to audioUtils.js
export const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate = 16000) => {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    // Simple averaging (linear interpolation is better but slower)
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
};

