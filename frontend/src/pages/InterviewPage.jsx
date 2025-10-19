import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { stopAllCameras } from '../utils/cameraUtils';

function InterviewPage({ sessionData, setSessionData }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentQuestionType, setCurrentQuestionType] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(5);
  
  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pauseTimer, setPauseTimer] = useState(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(null);
  const [showManualProceed, setShowManualProceed] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const isProcessingResponse = useRef(false);
  
  // Camera states
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [examMode, setExamMode] = useState(false);
  
  // Coding editor states for technical questions
  const [editorLanguage, setEditorLanguage] = useState('javascript');
  const [editorCode, setEditorCode] = useState('');
  const [runOutput, setRunOutput] = useState('');
  
  // DSA interview states
  const [dsaMode, setDsaMode] = useState(false);
  const [dsaQuestion, setDsaQuestion] = useState(null);
  const [pseudocode, setPseudocode] = useState('');
  const [pseudocodeSubmitted, setPseudocodeSubmitted] = useState(false);
  const [dsaConversation, setDsaConversation] = useState([]);
  const [dsaReply, setDsaReply] = useState('');
  const [dsaLoading, setDsaLoading] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [dsaListening, setDsaListening] = useState(false);
  const dsaRecognitionRef = useRef(null);
  
  // Refs
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const currentAudioRef = useRef(null);
  const activeStreamRef = useRef(null);
  const rootContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionData || !sessionData.question) {
      navigate('/');
      return;
    }
    
    // Initialize with first question from sessionData
    setCurrentQuestionText(sessionData.question);
    setCurrentQuestionType(sessionData.question_type || 'behavioral');
    setTotalQuestions(sessionData.total_questions || 5);
    setCurrentQuestion(sessionData.current_question_number - 1 || 0);
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event) => {
        // Get the latest final transcript
        let latestTranscript = '';
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) {
            latestTranscript = event.results[i][0].transcript;
            break;
          }
        }
        
        if (latestTranscript && latestTranscript.trim().length > 0) {
          setCurrentAnswer(latestTranscript);
          
          // Clear existing timer and set new 3-second timer
          if (pauseTimer) {
            clearTimeout(pauseTimer);
            setPauseTimer(null);
          }
          
          const newTimer = setTimeout(() => {
            console.log('🔄 3-second pause detected, stopping speech recognition...');
            // Stop speech recognition immediately
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.log('Recognition stop error:', e);
              }
            }
            // Use the transcript as final answer
            handleAutoProceedWithTranscript(latestTranscript);
          }, 6000);
          setPauseTimer(newTimer);
        }
      };
      
      // Add onend event to handle when speech recognition stops
      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended');
        
        // If we're still supposed to be listening, restart recognition
        if (isListening) {
          console.log('🔄 Restarting speech recognition...');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition restart failed:', e);
                // If restart fails, show manual proceed button
                setShowManualProceed(true);
              }
            }
          }, 200); // Increased delay to prevent race conditions
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setCameraError('Microphone access denied. Please allow microphone access.');
        }
      };
    }
    
    // Initialize DSA speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      dsaRecognitionRef.current = new SpeechRecognition();
      dsaRecognitionRef.current.continuous = true;
      dsaRecognitionRef.current.interimResults = true;
      dsaRecognitionRef.current.lang = 'en-US';
      
      dsaRecognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        if (finalTranscript) {
          setDsaReply(prev => (prev + ' ' + finalTranscript).trim());
        }
      };
      
      dsaRecognitionRef.current.onerror = (event) => {
        console.error('DSA speech recognition error:', event.error);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (dsaRecognitionRef.current) {
        try { dsaRecognitionRef.current.stop(); } catch (e) {}
      }
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }
      stopAllCameras();
    };
  }, [sessionData, navigate]);

  const enterFullscreen = async () => {
    const el = rootContainerRef.current || document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      setExamMode(true);
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  };

  const requestCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      
      activeStreamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraReady(false);
      let errorMessage = 'Unable to access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      setCameraError(errorMessage);
    }
  };

  const handleStartExam = async () => {
    setExamMode(true);
    await requestCamera();
    await enterFullscreen();
    askQuestion(currentQuestionText);
  };

  const askQuestion = async (questionText) => {
    // Prevent multiple audio starts
    if (isAudioPlaying || isProcessingResponse.current) {
      console.log('⚠️ Audio already playing or processing response, skipping duplicate request');
      return;
    }
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      console.log('🛑 Stopping previous audio');
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {
        console.log('Audio stop error (ignoring):', e);
      }
      currentAudioRef.current = null;
    }
    
    // Use the passed questionText parameter, or fall back to state
    const textToSpeak = questionText || currentQuestionText;
    console.log('🔊 Speaking question:', textToSpeak.substring(0, 100) + '...');
    
    setIsSpeaking(true);
    setIsAudioPlaying(true);
    try {
      const audioBlob = await apiService.textToSpeech(textToSpeak);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setIsAudioPlaying(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        // Add small delay to prevent race conditions
        setTimeout(() => {
          startListening();
        }, 100);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
        setIsAudioPlaying(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        // Add small delay to prevent race conditions
        setTimeout(() => {
          startListening();
        }, 100);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Audio error:', error);
      setIsSpeaking(false);
      setIsAudioPlaying(false);
      currentAudioRef.current = null;
      // Add small delay to prevent race conditions
      setTimeout(() => {
        startListening();
      }, 100);
    }
  };

  const startListening = () => {
    // Stop any existing recognition first
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Stopping existing recognition:', e);
      }
    }
    
    // Clear any existing pause timer
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      setPauseTimer(null);
    }
    
    setIsListening(true);
    setLastSpeechTime(Date.now());
    setShowManualProceed(false);
    
    // Small delay to ensure previous recognition is stopped
    setTimeout(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Recognition start error:', e);
          // If start fails, show manual button
          setShowManualProceed(true);
        }
      }
    }, 100);
    
    // Show manual proceed button after 8 seconds
    setTimeout(() => {
      if (isListening) {
        setShowManualProceed(true);
      }
    }, 8000);
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    // Clear pause timer when manually stopping
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      setPauseTimer(null);
    }
  };

  const handleAutoProceed = async () => {
    if (isProceeding) {
      console.log('⚠️ Already proceeding, ignoring duplicate call');
      return;
    }
    
    // Only proceed if we have an answer
    if (!currentAnswer || currentAnswer.trim().length === 0) {
      console.log('⚠️ No answer to submit, not auto-proceeding');
      return;
    }
    
    setIsProceeding(true);
    console.log('🚀 Proceeding to next question...', { answer: currentAnswer });
    stopListening();
    
    setTimeout(async () => {
      await handleNext();
      setIsProceeding(false);
    }, 500);
  };

  const handleAutoProceedWithTranscript = async (transcript) => {
    if (isProceeding) {
      console.log('⚠️ Already proceeding, ignoring duplicate call');
      return;
    }
    
    // Only proceed if we have an answer
    if (!transcript || transcript.trim().length === 0) {
      console.log('⚠️ No answer to submit, not auto-proceeding');
      return;
    }
    
    setIsProceeding(true);
    console.log('🚀 Proceeding to next question with transcript...', { answer: transcript });
    stopListening();
    
    // Set the current answer to the transcript before proceeding
    setCurrentAnswer(transcript);
    
    // Use transcript directly to avoid state timing issues
    setTimeout(async () => {
      await handleNextWithAnswer(transcript);
      setIsProceeding(false);
    }, 500);
  };

  const startDsaListening = () => {
    setDsaListening(true);
    if (dsaRecognitionRef.current) {
      try {
        dsaRecognitionRef.current.start();
      } catch (e) {
        console.error('DSA recognition start error:', e);
      }
    }
  };

  const stopDsaListening = () => {
    setDsaListening(false);
    if (dsaRecognitionRef.current) {
      try {
        dsaRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const handleNext = async () => {
    if (isProcessingResponse.current) {
      console.log('Already processing response, skipping duplicate request');
      return;
    }
    
    stopListening();
    
    // Stop any currently playing audio immediately
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    setLoading(true);
    isProcessingResponse.current = true;
    
    try {
      const result = await apiService.submitAnswerAndGetNext(
        sessionData.sessionId,
        currentAnswer || 'No answer provided'
      );
      
      setLoading(false);
      
      if (result.is_last_question) {
        // After 5th question, transition to DSA mode
        await transitionToDSAMode();
      } else {
        const newQuestion = result.next_question.question;
        const newType = result.next_question.type;
        
        console.log('📝 New question received:', newQuestion.substring(0, 100) + '...');
        
        // Update all state
        setCurrentQuestionText(newQuestion);
        setCurrentQuestionType(newType);
        setCurrentQuestion(prev => prev + 1);
        setCurrentAnswer('');
        setEditorCode('');
        setRunOutput('');
        
        // Pass the new question text directly to avoid closure issues
        setTimeout(() => {
          console.log('🎯 About to ask new question');
          askQuestion(newQuestion);
        }, 2000); // Increased delay to prevent race conditions
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLoading(false);
      alert('Failed to submit answer. Please try again.');
    } finally {
      isProcessingResponse.current = false;
    }
  };

  const handleNextWithAnswer = async (answer) => {
    if (isProcessingResponse.current) {
      console.log('Already processing response, skipping duplicate request');
      return;
    }
    
    stopListening();
    
    // Stop any currently playing audio immediately
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    setLoading(true);
    isProcessingResponse.current = true;
    
    try {
      console.log('📤 Submitting answer to backend:', answer);
      const result = await apiService.submitAnswerAndGetNext(
        sessionData.sessionId,
        answer || 'No answer provided'
      );
      
      setLoading(false);
      
      if (result.is_last_question) {
        // After 5th question, transition to DSA mode
        await transitionToDSAMode();
      } else {
        const newQuestion = result.next_question.question;
        const newType = result.next_question.type;
        
        console.log('📝 New question received:', newQuestion.substring(0, 100) + '...');
        
        // Update all state
        setCurrentQuestionText(newQuestion);
        setCurrentQuestionType(newType);
        setCurrentQuestion(prev => prev + 1);
        setCurrentAnswer('');
        setEditorCode('');
        setRunOutput('');
        
        // Pass the new question text directly to avoid closure issues
        setTimeout(() => {
          console.log('🎯 About to ask new question');
          askQuestion(newQuestion);
        }, 2000); // Increased delay to prevent race conditions
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLoading(false);
      alert('Failed to submit answer. Please try again.');
    } finally {
      isProcessingResponse.current = false;
    }
  };

  const transitionToDSAMode = async () => {
    setLoading(true);
    try {
      // Step 1: Generate behavioral report for first 5 questions
      console.log('Generating behavioral report...');
      await apiService.generateBehavioralReport(sessionData.sessionId);
      
      // Step 2: Get DSA question
      console.log('Getting DSA question...');
      const dsaQuestionResponse = await apiService.getDSAQuestion(
        sessionData.sessionId,
        sessionData.role || 'general',
        'medium'
      );
      
      // Set DSA mode
      setDsaQuestion(dsaQuestionResponse.question);
      setDsaMode(true);
      setLoading(false);
      
      console.log('DSA question received:', dsaQuestionResponse.question);
    } catch (error) {
      console.error('Error transitioning to DSA mode:', error);
      setLoading(false);
      alert('Failed to load DSA question. Please try again.');
    }
  };

  const handleSubmitPseudocode = async () => {
    if (!pseudocode.trim()) {
      alert('Please enter your pseudocode solution.');
      return;
    }
    
    setDsaLoading(true);
    try {
      const response = await apiService.submitPseudocode(sessionData.sessionId, pseudocode);
      
      // Add interviewer question to conversation
      setDsaConversation([{
        role: 'interviewer',
        text: response.interviewer_question
      }]);
      
      setPseudocodeSubmitted(true);
      setShowConversation(true);
      setDsaLoading(false);
      
      // Speak the interviewer question and start listening after
      await speakText(response.interviewer_question);
      
      // Check if conversation is already closing
      if (response.is_closing) {
        setTimeout(() => finishDSAInterview(response.ended_by), 2000);
      } else {
        // Start listening for user's audio response
        setTimeout(() => startDsaListening(), 500);
      }
    } catch (error) {
      console.error('Error submitting pseudocode:', error);
      setDsaLoading(false);
      alert('Failed to submit pseudocode. Please try again.');
    }
  };

  const handleDSAReply = async () => {
    if (!dsaReply.trim()) {
      return;
    }
    
    // Stop listening
    stopDsaListening();
    
    // Add user reply to conversation
    setDsaConversation(prev => [...prev, {
      role: 'candidate',
      text: dsaReply
    }]);
    
    const currentReply = dsaReply;
    setDsaReply('');
    setDsaLoading(true);
    
    try {
      const response = await apiService.continuePseudocodeConversation(
        sessionData.sessionId,
        currentReply
      );
      
      // Add interviewer response to conversation
      setDsaConversation(prev => [...prev, {
        role: 'interviewer',
        text: response.interviewer_question
      }]);
      
      setDsaLoading(false);
      
      // Check if user is confident (wants to resubmit pseudocode)
      if (response.ended_by === 'candidate_confident') {
        // User said "I can do it" - return to pseudocode editor
        await speakText(response.interviewer_question);
        setTimeout(() => {
          setShowConversation(false);
          setPseudocodeSubmitted(false); // Allow resubmitting pseudocode
          setPseudocode(''); // Clear previous pseudocode
          alert('Great! Now you can revise and resubmit your pseudocode.');
        }, 2000);
        return;
      }
      
      // Check if user completed the analysis
      if (response.ended_by === 'candidate_completed') {
        // User said "I am done" - finish interview
        await speakText(response.interviewer_question);
        setTimeout(() => finishDSAInterview(response.ended_by), 2000);
        return;
      }
      
      // Speak the interviewer question
      await speakText(response.interviewer_question);
      
      // Check if conversation ended (gave up or completed)
      if (response.is_closing || response.ended_by === 'candidate_giveup' || response.ended_by === 'candidate_completed') {
        setTimeout(() => finishDSAInterview(response.ended_by), 2000);
      } else {
        // Continue listening for next response
        setTimeout(() => startDsaListening(), 500);
      }
    } catch (error) {
      console.error('Error in DSA conversation:', error);
      setDsaLoading(false);
      alert('Failed to continue conversation. Please try again.');
    }
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    try {
      const audioBlob = await apiService.textToSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
    }
  };

  const finishDSAInterview = async (endedBy) => {
    stopListening();
    stopAllCameras();
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    setLoading(true);
    
    try {
      // Get combined report (behavioral + DSA)
      const reportResponse = await apiService.getCombinedReport(sessionData.sessionId);
      setSessionData({
        ...sessionData,
        report: reportResponse.report,
      });
      navigate('/report');
    } catch (error) {
      console.error('Error getting combined report:', error);
      alert('Failed to get final report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finishInterview = async () => {
    stopListening();
    stopAllCameras();
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    setLoading(true);
    
    try {
      const feedbackResponse = await apiService.getFinalFeedback(sessionData.sessionId);
      setSessionData({
        ...sessionData,
        report: feedbackResponse.feedback,
      });
      navigate('/report');
    } catch (error) {
      console.error('Error getting feedback:', error);
      alert('Failed to get feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Coding editor functions
  const handleRunCode = () => {
    setRunOutput('');
    try {
      if (editorLanguage !== 'javascript') {
        setRunOutput('Run supported only for JavaScript in the browser.');
        return;
      }
      const logs = [];
      const originalLog = console.log;
      try {
        console.log = (...args) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        };
        const fn = new Function(editorCode);
        const result = fn();
        if (typeof result !== 'undefined') logs.push(String(result));
      } finally {
        console.log = originalLog;
      }
      setRunOutput(logs.join('\n'));
    } catch (err) {
      setRunOutput(`Error: ${err.message}`);
    }
  };

  if (!sessionData || !sessionData.question) {
    return null;
  }

  // Show coding editor only after the first 5 behavioral questions
  // Questions 0-4 (first 5): Behavioral with video interface
  // Questions 5+ (6th onwards): Technical with coding editor
  const isTechnical = currentQuestionType === 'technical' && currentQuestion >= 5;
  const progress = dsaMode ? 100 : ((currentQuestion + 1) / totalQuestions) * 100;

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
    fontFamily: 'Playfair Display, serif',
    color: '#e0d5c5',
    lineHeight: '1.6',
    height: '100vh',
    overflow: 'hidden',
    transform: 'perspective(1000px)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
    color: '#1c1c1c',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)',
    transform: 'perspective(1000px) translateZ(0)',
    transition: 'all 0.3s ease'
  };

  const secondaryButtonStyle = {
    background: 'transparent',
    color: '#374151',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #d1d5db',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  return (
    <div ref={rootContainerRef} style={containerStyle}>
      {!examMode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '32px',
            width: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{
              color: '#1f2937',
              fontSize: '1.8rem',
              marginBottom: '24px',
              fontWeight: '700'
            }}>Start Proctored Interview</h2>
            <button 
              onClick={handleStartExam} 
              style={{
                ...buttonStyle,
                padding: '14px 28px',
                fontSize: '1.1rem',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
              }}
            >
              Start Interview
            </button>
            {cameraError && (
              <p style={{
                color: '#ef4444',
                marginTop: '12px',
                fontSize: '14px'
              }}>{cameraError}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <section style={{
        padding: '20px 24px',
        backgroundColor: 'white',
        borderBottom: '2px solid #e5e7eb',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{
                padding: '6px 16px',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: dsaMode ? '#8b5cf6' : (currentQuestionType === 'behavioral' ? '#10b981' : '#d4af37'),
                color: 'white'
              }}>
                {dsaMode ? 'DSA Problem' : (currentQuestionType === 'behavioral' ? 'Behavioral' : 'Technical')}
              </span>
              {!dsaMode && <span style={{color: '#6b7280', fontSize: '15px'}}>Question {currentQuestion + 1} of {totalQuestions}</span>}
              {dsaMode && <span style={{color: '#6b7280', fontSize: '15px'}}>Algorithm Design Phase</span>}
            </div>
            <div style={{width: '300px', backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden'}}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>
          <h2 style={{
            color: '#1f2937',
            fontSize: '1.6rem',
            lineHeight: '1.5',
            margin: '12px 0 0 0',
            fontWeight: '600'
          }}>
            {dsaMode && dsaQuestion ? dsaQuestion.question_title : currentQuestionText}
          </h2>
        </div>
      </section>

      {/* Main Content */}
      <section style={{
        padding: '16px',
        backgroundColor: '#f8fafc',
        height: 'calc(100vh - 200px)',
        overflowY: 'auto'
      }}>
        {dsaMode ? (
          // DSA Interview Mode
          <div style={{
            display: 'grid',
            gridTemplateColumns: (pseudocodeSubmitted && showConversation) ? '2fr 1fr' : '1fr',
            gap: '12px',
            height: '100%'
          }}>
            {/* Left: Problem Statement and Code Editor */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', height: '100%'}}>
              <div style={{
                padding: '16px',
                overflowY: 'auto',
                flex: '0 0 auto',
                maxHeight: '30%',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}>
                <h3 style={{color: '#d4af37', marginBottom: '10px', fontWeight: '600'}}>Problem Statement</h3>
                <div style={{color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '14px'}}>
                  {dsaQuestion?.problem_statement}
                </div>
                {dsaQuestion?.example_input_output && (
                  <div style={{marginTop: '12px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                    <div style={{color: '#d4af37', fontWeight: 'bold', marginBottom: '6px'}}>Example:</div>
                    <div style={{color: '#374151', fontSize: '13px'}}>
                      <strong>Input:</strong> {dsaQuestion.example_input_output.input}
                    </div>
                    <div style={{color: '#374151', fontSize: '13px', marginTop: '4px'}}>
                      <strong>Output:</strong> {dsaQuestion.example_input_output.output}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phase 1: Pseudocode Editor */}
              {!pseudocodeSubmitted && (
                <div style={{
                  flex: '1 1 auto',
                  display: 'grid',
                  gridTemplateRows: '1fr auto',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
                }}>
                  <textarea 
                    value={pseudocode} 
                    onChange={(e) => setPseudocode(e.target.value)} 
                    style={{
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: '#f8fafc', 
                      color: '#374151', 
                      border: 'none',
                      padding: '12px', 
                      fontFamily: 'monospace',
                      resize: 'none',
                      fontSize: '14px',
                      outline: 'none'
                    }} 
                    placeholder="Write your pseudocode algorithm here...

Example format:
1. Initialize variables...
2. For each element in array...
3. If condition...
4. Return result..."
                  />
                  <div style={{
                    padding: '12px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <button 
                      onClick={handleSubmitPseudocode}
                      disabled={dsaLoading || !pseudocode.trim()}
                      style={{
                        ...buttonStyle,
                        padding: '10px 24px',
                        opacity: (dsaLoading || !pseudocode.trim()) ? 0.6 : 1,
                        cursor: (dsaLoading || !pseudocode.trim()) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {dsaLoading ? 'Submitting...' : 'Submit Pseudocode'}
                    </button>
                  </div>
                </div>
              )}

            </div>
            
            {/* Right: Conversation Panel (only during conversation) */}
            {pseudocodeSubmitted && showConversation && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{padding: '12px', borderBottom: '1px solid #e5e7eb'}}>
                  <h3 style={{color: '#d4af37', margin: 0, fontWeight: '600'}}>Interview Discussion</h3>
                  <p style={{color: '#6b7280', fontSize: '12px', margin: '4px 0 0 0'}}>Audio enabled conversation</p>
                </div>
                
                <div style={{flex: '1 1 auto', overflowY: 'auto', padding: '12px'}}>
                  {dsaConversation.map((msg, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        marginBottom: '12px', 
                        padding: '10px', 
                        backgroundColor: msg.role === 'interviewer' ? '#f0f9ff' : '#fef3c7', 
                        borderRadius: '8px',
                        borderLeft: `3px solid ${msg.role === 'interviewer' ? '#d4af37' : '#f59e0b'}`
                      }}
                    >
                      <div style={{color: msg.role === 'interviewer' ? '#d4af37' : '#f59e0b', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px'}}>
                        {msg.role === 'interviewer' ? '🎙️ Interviewer' : '💬 You'}
                      </div>
                      <div style={{color: '#374151', fontSize: '14px', lineHeight: 1.5}}>{msg.text}</div>
                    </div>
                  ))}
                  {isSpeaking && (
                    <div style={{textAlign: 'center', padding: '20px', color: '#d4af37'}}>
                      🔊 Interviewer is speaking...
                    </div>
                  )}
                </div>
                
                <div style={{padding: '12px', borderTop: '1px solid #e5e7eb'}}>
                  {/* Audio Controls */}
                  <div style={{marginBottom: '12px', display: 'flex', gap: '8px'}}>
                    {!dsaListening ? (
                      <button 
                        onClick={startDsaListening}
                        disabled={dsaLoading || isSpeaking}
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          padding: '10px',
                          opacity: (dsaLoading || isSpeaking) ? 0.6 : 1,
                          cursor: (dsaLoading || isSpeaking) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        🎤 Start Speaking
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          stopDsaListening();
                          setTimeout(() => handleDSAReply(), 500);
                        }}
                        disabled={!dsaReply.trim()}
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          padding: '10px',
                          opacity: !dsaReply.trim() ? 0.6 : 1,
                          cursor: !dsaReply.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ⏸ Stop & Send
                      </button>
                    )}
                  </div>

                  {/* Text display/input area */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px',
                    minHeight: '80px',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    marginBottom: '8px',
                    lineHeight: 1.5
                  }}>
                    {dsaReply || (dsaListening ? '🎤 Listening...' : 'Click "Start Speaking" to use voice or type below')}
                  </div>
                  
                  {/* Text input as backup */}
                  <textarea 
                    value={dsaReply} 
                    onChange={(e) => setDsaReply(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleDSAReply();
                      }
                    }}
                    disabled={dsaLoading || isSpeaking || dsaListening}
                    placeholder="Or type your reply here... (Enter to send)"
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      backgroundColor: '#f8fafc',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '8px',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      resize: 'none',
                      marginBottom: '8px',
                      outline: 'none'
                    }}
                  />
                  
                  <button 
                    onClick={handleDSAReply}
                    disabled={dsaLoading || isSpeaking || !dsaReply.trim() || dsaListening}
                    style={{
                      ...buttonStyle,
                      width: '100%',
                      padding: '10px',
                      opacity: (dsaLoading || isSpeaking || !dsaReply.trim() || dsaListening) ? 0.6 : 1,
                      cursor: (dsaLoading || isSpeaking || !dsaReply.trim() || dsaListening) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {dsaLoading ? 'Sending...' : 'Send Reply'}
                  </button>
                  <div style={{marginTop: '8px', fontSize: '11px', color: '#9ca3af', textAlign: 'center'}}>
                    💡 Say "give up" to end, "I can solve it now" to revise, or "I am done" to finish
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isTechnical ? (
          // Coding Editor for Technical Questions
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: '100%'}}>
            <div style={{
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#d4af37', marginBottom: '10px', fontWeight: '600'}}>Problem</h3>
              <div style={{color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap'}}>{currentQuestionText}</div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <select 
                  value={editorLanguage} 
                  onChange={(e) => setEditorLanguage(e.target.value)} 
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#374151'
                  }}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
                <button 
                  onClick={handleRunCode}
                  style={{
                    ...buttonStyle,
                    padding: '6px 12px',
                    fontSize: '14px'
                  }}
                >
                  Run Code
                </button>
              </div>
              <textarea 
                value={editorCode} 
                onChange={(e) => setEditorCode(e.target.value)} 
                style={{
                  width: '100%', 
                  height: '100%', 
                  backgroundColor: '#f8fafc', 
                  color: '#374151', 
                  border: 'none',
                  padding: '12px', 
                  fontFamily: 'monospace',
                  resize: 'none',
                  outline: 'none'
                }} 
                placeholder="// Write your code here..."
              />
              <div style={{
                borderTop: '1px solid #e5e7eb',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                <div style={{color: '#d4af37', marginBottom: '6px', fontWeight: '600'}}>Output</div>
                <pre style={{margin: 0, color: '#374151', whiteSpace: 'pre-wrap'}}>{runOutput || 'Run your code to see output...'}</pre>
              </div>
            </div>
          </div>
        ) : (
          // Video Interview UI for Behavioral Questions
          <div style={{display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px', height: '100%'}}>
            <div style={{
              position: 'relative',
              backgroundColor: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              ></video>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                padding: '6px 12px',
                backgroundColor: cameraReady ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {cameraReady ? '● Camera Active' : '● Camera Inactive'}
              </div>
              {!cameraReady && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(0,0,0,0.85)'
                }}>
                  <p style={{color: 'white', fontSize: '16px', fontWeight: 'bold'}}>{cameraError || 'Camera not started'}</p>
                  <button 
                    onClick={requestCamera}
                    style={{
                      ...buttonStyle,
                      padding: '10px 20px'
                    }}
                  >
                    Enable Camera
                  </button>
                </div>
              )}
            </div>
            <aside style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '12px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#d4af37', marginBottom: '10px', textAlign: 'center', fontWeight: '600'}}>Your Answer</h3>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '200px',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}>
                {currentAnswer || (isListening ? 'Listening... (Auto-proceed in 2s)' : 'Click "Start Answer" to begin')}
              </div>
              <div style={{marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {!isListening ? (
                  <button 
                    onClick={startListening} 
                    disabled={isSpeaking}
                    style={{
                      ...buttonStyle,
                      opacity: isSpeaking ? 0.6 : 1,
                      cursor: isSpeaking ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🎤 Start Answer (Auto-proceed)
                  </button>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    color: '#1e40af',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    🎤 Recording... (Will stop after 3s pause)
                    <div style={{marginTop: '8px'}}>
                      <button 
                        onClick={handleAutoProceed}
                        style={{
                          ...buttonStyle,
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#10b981',
                          color: 'white'
                        }}
                      >
                        ✅ Stop & Proceed to Next Question
                      </button>
                    </div>
                  </div>
                )}
                <textarea 
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Or type your answer here..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    backgroundColor: '#f8fafc',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '8px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Exit Interview Button - Only for emergency exit */}
      {!dsaMode && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🚪 Exit Interview
          </button>
        </div>
      )}
    </div>
  );
}

export default InterviewPage;