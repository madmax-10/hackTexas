import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import apiService from '../services/api';
import { stopAllCameras } from '../utils';
import { useGeminiVoice } from '../hooks/useGeminiVoice';
import './InterviewPage.css';

// ==================== Utility Functions ====================

const createErrorHandler = (setError) => (error, defaultMessage) => {
  console.error(defaultMessage, error);
  let message = defaultMessage;
  if (error.name === 'NotAllowedError') {
    message += ' Permission denied.';
  } else if (error.name === 'NotFoundError') {
    message += ' Not found.';
  } else {
    message += ` ${error.message || 'Unknown error occurred.'}`;
  }
  setError(message);
};

// ==================== Main Component ====================

function InterviewPage() {
  const { sessionData, setSessionData } = useSession();
  const navigate = useNavigate();

  // ==================== State Management ====================
  
  // Camera state
  const [cameraState, setCameraState] = useState({
    ready: false,
    error: '',
    examMode: false,
  });

  // Refs
  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const rootContainerRef = useRef(null);

  // ==================== Gemini Voice Hook ====================

  const {
    voiceStatus,
    connectionState,
    isInterviewComplete,
    startVoiceConversation,
    stopVoiceConversation,
    reportData,
  } = useGeminiVoice();

  // ==================== Interview Completion ====================

  // ==================== Initialization ====================

  useEffect(() => {
    if (!sessionData?.reportId || !sessionData?.resumeText) {
      navigate('/');
      return;
    }

    return () => {
      stopAllCameras();
    };
  }, [sessionData?.reportId, sessionData?.resumeText, navigate]);

  useEffect(() => {
    if (isInterviewComplete && reportData) {
      stopAllCameras();
      navigate('/report', { state: { report_data: reportData } });
    }
  }, [isInterviewComplete, reportData, navigate]);

  // ==================== Camera Functions ====================

  const requestCamera = useCallback(async () => {
    setCameraState(prev => ({ ...prev, error: '' }));
    const errorHandler = createErrorHandler((msg) => 
      setCameraState(prev => ({ ...prev, error: msg, ready: false }))
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState(prev => ({ ...prev, ready: true }));
      }
    } catch (error) {
      errorHandler(error, 'Unable to access camera.');
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = rootContainerRef.current || document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      setCameraState(prev => ({ ...prev, examMode: true }));
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  }, []);

  const handleStartExam = useCallback(async () => {
    setCameraState(prev => ({ ...prev, examMode: true }));
    await requestCamera();
    await enterFullscreen();
    await startVoiceConversation();
  }, [requestCamera, enterFullscreen, startVoiceConversation]);


  return (
    <div ref={rootContainerRef} className="interview-container">
      {!cameraState.examMode && (
        <div className="interview-modal">
          <div className="interview-modal-content">
            <h2 className="interview-modal-title">Start Proctored Interview</h2>
            <button onClick={handleStartExam} className="interview-modal-button">
              Start Interview
            </button>
            {cameraState.error && (
              <p className="interview-modal-error">{cameraState.error}</p>
            )}
          </div>
        </div>
      )}

      <section className="interview-header">
        <div className="interview-header-content">
          <div className="interview-header-top">
            <div className="interview-header-left">
              <span className="interview-badge interview-badge-behavioral">
                Interview
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="interview-main">
        <div className="interview-video-grid">
          <div className="interview-video-container">
            <video ref={videoRef} autoPlay playsInline muted className="interview-video"></video>
            <div className={`interview-camera-status ${
              cameraState.ready ? 'interview-camera-status-active' : 'interview-camera-status-inactive'
            }`}>
              {cameraState.ready ? '● Camera Active' : '● Camera Inactive'}
            </div>
            {!cameraState.ready && (
              <div className="interview-camera-overlay">
                <p className="interview-camera-error">{cameraState.error || 'Camera not started'}</p>
                <button onClick={requestCamera} className="interview-start-button">
                  Enable Camera
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Voice Status Indicator */}
        <div className="interview-voice-status">
          <div className={`interview-voice-indicator ${
            voiceStatus === 'listening' || voiceStatus === 'speaking' ? 'interview-voice-active' : ''
          }`}>
            <span className="interview-voice-status-text">
              {voiceStatus === 'listening' || voiceStatus === 'speaking' ? '🎤 Listening' : '🔇 Idle'}
            </span>
          </div>
          <div className="interview-connection-status">
            {connectionState === 'open' ? '🟢 Connected' : 
             connectionState === 'connecting' ? '🟡 Connecting' : '🔴 Disconnected'}
          </div>
        </div>
      </section>

      <div className="interview-actions">
        <button onClick={() => {stopVoiceConversation(false);}} className="interview-finish-button">
          ✅ Finish Interview
        </button>
      </div>
    </div>
  );
}

export default InterviewPage;