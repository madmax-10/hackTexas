import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useSession } from '../contexts/SessionContext';
import apiService from '../services/api';
import './ResumeUpload.css';

const ResumeUpload = () => {
  const { setSessionData } = useSession();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const job = location.state?.job;

  if (!job) {
    navigate('/');
    return null;
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError('File size must be less than 5MB');
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError('Please select a PDF file');
      } else {
        setError('Invalid file. Please try again.');
      }
    }
  });

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await apiService.uploadResume(file, job.id);
      
      // Validate response has required fields
      if (!response.report_id || !response.resume_text) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      // Store session data
      setSessionData({
        reportId: response.report_id,
        resumeText: response.resume_text,
        job: job
      });
      
      // Navigate to interview page
      navigate('/interview');
    } catch (err) {
      // Extract error message from response or use default
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload resume. Please try again.';
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      {/* Navigation */}
      <nav className="upload-nav">
        <div className="upload-nav-container">
          <div 
            className="upload-nav-brand"
            onClick={() => navigate('/')}
          >
            Mock Me? <span className="upload-nav-brand-subtitle">Yes Please</span>
          </div>
          
          <div className="upload-nav-links">
            <button
              onClick={() => navigate('/')}
              className="upload-nav-link"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/?section=about')}
              className="upload-nav-link"
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="upload-main">
        {/* Hero Section */}
        <section className="upload-hero">
          <div className="upload-hero-overlay"></div>
          
          <div className="upload-hero-content">
            <h1 className="upload-hero-title">
              Resume Analysis
            </h1>
            <p className="upload-hero-description">
              Upload your resume to get personalized interview questions tailored to your experience and career goals.
            </p>
            <div className="upload-hero-badge">
              <div className="upload-hero-badge-dot"></div>
              <span className="upload-hero-badge-text">Selected: {job.title}</span>
            </div>
          </div>
        </section>

        {/* Guidelines Section */}
        <section className="upload-guidelines">
          <div className="upload-guidelines-card">
            <h2 className="upload-guidelines-title">
              Document Submission Guidelines
            </h2>
            <div className="upload-guidelines-grid">
              <div className="upload-guideline-item">
                <div className="upload-guideline-icon">
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="upload-guideline-title">
                    Clear & Readable
                  </h3>
                  <p className="upload-guideline-text">
                    Ensure your document is well-lit, clearly readable, and in a supported format for the best results.
                  </p>
                </div>
              </div>
              
              <div className="upload-guideline-item">
                <div className="upload-guideline-icon">
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="upload-guideline-title">
                    AI Analysis
                  </h3>
                  <p className="upload-guideline-text">
                    Our AI will analyze your professional background, skills, and experience to generate personalized questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section className="upload-section">
          <div className="upload-card">
            <h2 className="upload-card-title">
              Upload Your Resume
            </h2>
            
            {/* Upload Area - Dropzone */}
            <div {...getRootProps()} className={`upload-area ${isDragActive ? 'upload-area-drag-active' : ''} ${uploading ? 'upload-area-disabled' : ''}`}>
              <input {...getInputProps()} disabled={uploading} />
              <div className="upload-area-icon">
                <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h3 className="upload-area-title">
                {isDragActive ? 'Drop the document here...' : 'Select Document'}
              </h3>
              <p className="upload-area-text">
                {isDragActive ? 'Release to upload' : 'Click to browse or drag and drop your resume'}
              </p>
              <p className="upload-area-hint">
                Supported formats: PDF only (Max 5MB)
              </p>
            </div>

            {/* File Selected */}
            {file && (
              <div className="upload-file-selected">
                <div className="upload-file-icon">
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="upload-file-info">
                  <p className="upload-file-name">
                    Document Selected: {file.name}
                  </p>
                  <p className="upload-file-size">
                    File size: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="upload-error">
                <div className="upload-error-icon">
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
                <p className="upload-error-text">
                  {error}
                </p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`upload-button ${!file || uploading ? 'upload-button-disabled' : 'upload-button-enabled'}`}
            >
              {uploading ? (
                <>
                  <div className="upload-spinner"></div>
                  Processing Document...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Analyze Resume & Generate Questions
                </>
              )}
            </button>

            {/* Back Button */}
            <div className="upload-back-button">
              <button 
                onClick={() => navigate('/?section=programs')}
                className="upload-back-link"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Return to Jobs
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="upload-footer">
        <p className="upload-footer-text">
          © 2025 Mock Me? <span className="upload-footer-text-small">Yes Please</span>. Professional Interview Preparation Platform
        </p>
      </footer>
    </div>
  );
};

export default ResumeUpload;
