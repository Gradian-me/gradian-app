import { useState, useRef, useCallback } from 'react';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordedBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Note: We don't check permission status upfront because:
      // 1. Permission status might be "prompt" which we need to trigger
      // 2. getUserMedia will handle permission requests properly
      // 3. We'll catch the error and provide better feedback

      // Ensure mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Failed to start recording. MediaDevices API is not supported in this browser.');
        setIsRecording(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Only create blob if we have chunks
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          setRecordedBlob(blob);
          
          // Create object URL for playback
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
        
        // Ensure isRecording is false after stopping
        setIsRecording(false);

        // Tracks are already stopped in stopRecording, but ensure cleanup here too
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording with timeslice to ensure data is collected periodically
      // Using 1000ms (1 second) timeslice for reliable data collection
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to start recording. ';
      
      if (err instanceof DOMException || err instanceof Error) {
        const errorName = err.name || (err as DOMException).name;
        
        switch (errorName) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage += 'Microphone permission denied. ';
            errorMessage += 'If you just granted permission, please refresh the page and try again. ';
            errorMessage += 'Otherwise, please check your browser settings to allow microphone access for this site.';
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage += 'No microphone found. Please connect a microphone and try again.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage += 'Microphone is already in use by another application. Please close other applications using the microphone.';
            break;
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            errorMessage += 'Microphone constraints not supported. Please try a different microphone.';
            break;
          case 'NotSupportedError':
            errorMessage += 'Recording is not supported in this browser. Please use a modern browser.';
            break;
          case 'SecurityError':
            errorMessage += 'Microphone access blocked. Please use HTTPS or localhost.';
            break;
          default:
            errorMessage += 'Please check microphone permissions and try again.';
        }
      } else {
        errorMessage += 'Please check microphone permissions and try again.';
      }
      
      setError(errorMessage);
      setIsRecording(false);
      // Clean up any partial stream on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    // Stop all tracks in the stream immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && isRecording) {
      try {
        // Request any remaining data before stopping
        if (mediaRecorderRef.current.state === 'recording') {
          // Request final data chunk
          mediaRecorderRef.current.requestData();
          // Stop the MediaRecorder - onstop callback will set isRecording to false and create blob
          mediaRecorderRef.current.stop();
        } else {
          // If already stopped or pausing, just set isRecording to false
          setIsRecording(false);
        }
        // Don't stop tracks immediately - let MediaRecorder finish properly
        // Tracks will be stopped in the onstop callback
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
        setIsRecording(false);
        // If stopping fails, stop tracks anyway
        stopAllTracks();
      }
    } else if (!isRecording) {
      // If not recording, ensure state is correct
      setIsRecording(false);
    }
  }, [isRecording, stopAllTracks]);

  const clearRecording = useCallback(() => {
    // Stop any active recording and tracks immediately
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.warn('Error stopping MediaRecorder:', error);
      }
    }
    setIsRecording(false);
    
    // Stop all tracks immediately to release microphone
    stopAllTracks();
    
    // Revoke object URL to free memory
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setRecordedBlob(null);
    setAudioUrl(null);
    setError(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [audioUrl, stopAllTracks]);

  return {
    isRecording,
    recordedBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  };
};

