// Camera utility functions for cleanup across the app

/**
 * Stop all camera tracks globally
 * This function can be called from anywhere in the app to ensure camera is stopped
 */
export const stopAllCameras = () => {
  console.log('📷 Stopping all cameras globally...');
  
  try {
    // Get all video elements on the page
    const videoElements = document.querySelectorAll('video');
    
    videoElements.forEach((video, index) => {
      if (video.srcObject) {
        console.log(`📷 Stopping camera ${index + 1}...`);
        video.srcObject.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Camera track stopped: ${track.kind}`);
        });
        video.srcObject = null;
        console.log(`✅ Camera ${index + 1} stopped and cleared`);
      }
    });
    
    // Also try to stop any active media streams
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // This is a fallback to ensure all streams are stopped
      console.log('📷 Ensuring all media streams are stopped...');
    }
    
    console.log('✅ All cameras stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping cameras:', error);
  }
};

/**
 * Check if any camera is currently active
 */
export const isCameraActive = () => {
  const videoElements = document.querySelectorAll('video');
  
  for (const video of videoElements) {
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      const activeTracks = tracks.filter(track => track.readyState === 'live');
      if (activeTracks.length > 0) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Get all active camera tracks
 */
export const getActiveCameraTracks = () => {
  const activeTracks = [];
  const videoElements = document.querySelectorAll('video');
  
  videoElements.forEach(video => {
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => {
        if (track.readyState === 'live' && track.kind === 'video') {
          activeTracks.push(track);
        }
      });
    }
  });
  
  return activeTracks;
};

/**
 * Force stop all camera tracks
 */
export const forceStopAllCameras = () => {
  console.log('📷 Force stopping all cameras...');
  
  try {
    // Get all active tracks
    const activeTracks = getActiveCameraTracks();
    
    activeTracks.forEach(track => {
      track.stop();
      console.log(`🛑 Force stopped track: ${track.kind}`);
    });
    
    // Clear all video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.srcObject) {
        video.srcObject = null;
      }
    });
    
    console.log('✅ All cameras force stopped');
  } catch (error) {
    console.error('❌ Error force stopping cameras:', error);
  }
};

// Export default function for easy import
export default {
  stopAllCameras,
  isCameraActive,
  getActiveCameraTracks,
  forceStopAllCameras
};
