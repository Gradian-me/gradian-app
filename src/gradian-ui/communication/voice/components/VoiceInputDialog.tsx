"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { TextSwitcher } from "@/components/ui/text-switcher";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Sparkles, Play, Pause, RotateCcw, Circle, ArrowUp, Square, AudioLines, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import dynamic from "next/dynamic";
import { useVoiceVisualizer } from "react-voice-visualizer";
import { RecordingTimer } from "./RecordingTimer";
import { LanguageSelector } from "@/gradian-ui/form-builder/form-elements/components/LanguageSelector";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";
import { ButtonMinimal } from "@/gradian-ui/form-builder/form-elements/components/ButtonMinimal";
import { MetricCard } from "@/gradian-ui/analytics/indicators/metric-card";
import { loggingCustom } from "@/gradian-ui/shared/utils/logging-custom";
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { AudioFileUpload } from "./AudioFileUpload";
import { fileToBlob } from "../utils/audio-file-utils";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";

const VoiceVisualizer = dynamic(
  () =>
    import("react-voice-visualizer").then(
      (mod) => mod.VoiceVisualizer
    ) as Promise<React.ComponentType<any>>,
  { ssr: false }
);

interface VoiceInputDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscript?: (text: string) => void;
  onApply?: (text: string) => void;
  className?: string;
  loadingTextSwitches?: string | string[];
  /**
   * @deprecated Auto-start functionality has been removed to prevent permission issues.
   * Recording is now always manual - users must click the record button to start.
   * This prop is kept for backwards compatibility but has no effect.
   */
  autoStart?: boolean;
}

export const VoiceInputDialog: React.FC<VoiceInputDialogProps> = ({
  isOpen,
  onOpenChange,
  onTranscript,
  onApply,
  className,
  loadingTextSwitches,
  autoStart = false,
}) => {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<string>('fa');
  const [tokenUsage, setTokenUsage] = useState<{ usage?: any; estimated_cost?: any } | null>(null);
  const [shouldAutoTranscribe, setShouldAutoTranscribe] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileBlob, setUploadedFileBlob] = useState<Blob | null>(null);
  
  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  } = useAudioRecorder();

  // Initialize voice visualizer
  const recorderControls = useVoiceVisualizer();
  const {
    setPreloadedAudioBlob,
    error: visualizerError,
    togglePauseResume,
    clearCanvas,
    isPausedRecordedAudio,
  } = recorderControls;

  // Track if we've loaded the current blob to prevent infinite loops
  const loadedBlobRef = useRef<Blob | null>(null);

  // Determine which blob to use (uploaded file or recorded)
  const activeBlob = uploadedFileBlob || recordedBlob;

  // Load recorded or uploaded blob into voice visualizer when available
  useEffect(() => {
    // Only load if we have a new blob (different reference)
    if (activeBlob && activeBlob !== loadedBlobRef.current) {
      try {
        setPreloadedAudioBlob(activeBlob);
        loadedBlobRef.current = activeBlob;
        loggingCustom(LogType.CLIENT_LOG, 'log', `Audio blob loaded into visualizer: ${activeBlob.size} bytes, type: ${activeBlob.type || 'unknown'}`);
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to set preloaded audio blob: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (!activeBlob) {
      // Clear the ref when blob is cleared
      loadedBlobRef.current = null;
    }
  }, [activeBlob, setPreloadedAudioBlob]); // Include setPreloadedAudioBlob in dependencies

  const handleStartRecording = useCallback(async () => {
    // Clear any previous errors when attempting to start recording
    setTranscriptionError(null);
    // The error from useAudioRecorder will be set if permission is denied
    await startRecording();
  }, [startRecording]);

  // Get browser-specific instructions
  const getBrowserInstructions = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') || userAgent.includes('edg')) {
      return '• Click the lock icon (🔒) in the address bar\n• Click "Site settings"\n• Find "Microphone" and click "Reset"\n• Refresh this page and try again';
    } else if (userAgent.includes('firefox')) {
      return '• Click the lock icon (🔒) in the address bar\n• Click "Clear Permissions"\n• Refresh this page and try again';
    } else if (userAgent.includes('safari')) {
      return '• Go to Safari menu → Settings\n• Click "Websites" tab\n• Click "Microphone" in left sidebar\n• Find this site and select "Ask" or "Allow"\n• Refresh this page and try again';
    } else {
      return '• Open your browser settings\n• Find "Site permissions" or "Privacy"\n• Look for microphone permissions\n• Reset permissions for this site\n• Refresh this page and try again';
    }
  }, []);

  // Request microphone permission explicitly
  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    setTranscriptionError(null);
    // Clear any existing recording state to ensure fresh start
    clearRecording();
    
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setTranscriptionError('Microphone access is not supported in this browser.');
        setIsRequestingPermission(false);
        return;
      }

      // Directly request permission - don't check status first as it may be cached
      // getUserMedia will properly trigger the permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Permission granted! Stop the test stream and start actual recording
      stream.getTracks().forEach(track => track.stop());
      
      // Small delay to ensure stream is fully cleaned up
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now start the actual recording
      await handleStartRecording();
    } catch (err) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Permission request failed: ${err instanceof Error ? err.message : String(err)}`);
      
      let errorMessage = '';
      let showHelp = false;
      
      if (err instanceof DOMException || err instanceof Error) {
        const errorName = err.name || (err as DOMException).name;
        
        switch (errorName) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            // After getUserMedia fails, check if permission is permanently denied
            try {
              const permStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              if (permStatus.state === 'denied') {
                // Permanently denied - show instructions
                const instructions = getBrowserInstructions();
                errorMessage = 'Microphone permission is permanently denied.\n\nTo fix this, reset the permission in your browser:\n\n' + instructions;
                // Don't set showHelp = true here since we've already included instructions
                showHelp = false;
              } else if (permStatus.state === 'prompt') {
                // Still in prompt state - user might have dismissed it
                errorMessage = 'Permission was denied. Please click "Allow" when the browser shows the microphone permission prompt.';
              } else {
                // Permission granted but still getting error - might be a different issue
                errorMessage = 'Permission issue detected. Please try again or check your browser settings.';
                showHelp = true;
              }
            } catch {
              // Permissions API not available - generic message
              errorMessage = 'Permission was denied. Please allow microphone access in your browser settings.';
              showHelp = true;
            }
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Microphone is already in use by another application. Please close other applications using the microphone and try again.';
            break;
          default:
            errorMessage = 'Failed to access microphone. Please check your browser settings.';
            showHelp = true;
        }
      } else {
        errorMessage = 'An unexpected error occurred while requesting microphone permission.';
      }
      
      if (showHelp) {
        const instructions = getBrowserInstructions();
        errorMessage += '\n\n' + instructions;
      }
      
      setTranscriptionError(errorMessage);
    } finally {
      setIsRequestingPermission(false);
    }
  }, [handleStartRecording, getBrowserInstructions, clearRecording]);

  // Note: Auto-start functionality removed to prevent permission issues
  // Users must manually click the record button to start recording
  // This ensures permission is requested only after explicit user interaction

  // Cleanup when dialog closes and reset when it opens
  useEffect(() => {
    if (!isOpen) {
      // Stop recording first if it's still active
      if (isRecording) {
        stopRecording();
      }
      
      // Immediately stop all microphone tracks to release the microphone
      // This must happen to prevent the browser from showing the microphone icon
      clearRecording();
      
      // Note: VoicePoweredOrb has enableVoiceControl={false}, so it won't request microphone access
      // This prevents conflicts with the useAudioRecorder hook
      
      // Clear transcription and errors when dialog closes
      setTranscription(null);
      setTranscriptionError(null);
      setTokenUsage(null);
      setShouldAutoTranscribe(false);
      setUploadedFile(null);
      setUploadedFileBlob(null);
      // Reset the loaded blob ref
      loadedBlobRef.current = null;
    } else {
      // Clear transcription when dialog opens to ensure fresh state
      setTranscription(null);
      setTranscriptionError(null);
      setTokenUsage(null);
      setShouldAutoTranscribe(false);
    }
  }, [isOpen, isRecording, stopRecording, clearRecording]); // Include all dependencies

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isRecording) {
        stopRecording();
      }
      clearRecording();
    };
  }, []); // Only run on unmount

  const handleStopRecording = () => {
    // Stop the recording but keep the blob so user can record again
    stopRecording();
    
    // Don't clear the recording blob - keep it so the visualizer stays visible
    // This allows the user to record again from the same page without navigating away
    
    // Clear transcription state (but keep the recording)
    setTranscription(null);
    setTranscriptionError(null);
    setTokenUsage(null);
    
    // Note: stopRecording() will handle stopping the MediaRecorder
    // The blob will be created in the onstop callback, and we keep it
    // so the user can see their recording and choose to record again or transcribe
  };

  const handleStopAndTranscribe = () => {
    // Set flag to auto-transcribe when blob is ready
    setShouldAutoTranscribe(true);
    // Stop recording
    stopRecording();
  };

  const handleClear = () => {
    setTranscription(null);
    setTranscriptionError(null);
    setTokenUsage(null);
    clearRecording();
    setUploadedFile(null);
    setUploadedFileBlob(null);
    if (clearCanvas) {
      clearCanvas();
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setTranscriptionError(null);
      // Clear any existing recording
      clearRecording();
      setTranscription(null);
      setTokenUsage(null);
      
      // Convert file to blob for processing
      const blob = await fileToBlob(file);
      setUploadedFile(file);
      setUploadedFileBlob(blob);
      
      loggingCustom(LogType.CLIENT_LOG, 'log', `Audio file selected: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setTranscriptionError(errorMessage);
      loggingCustom(LogType.CLIENT_LOG, 'error', `File processing error: ${errorMessage}`);
    }
  };

  const handleFileError = (error: string) => {
    setTranscriptionError(error);
  };

  const handlePlayPause = () => {
    togglePauseResume?.();
  };

  const handleTranscribe = useCallback(async () => {
    const blobToTranscribe = uploadedFileBlob || recordedBlob;
    if (!blobToTranscribe) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const formData = new FormData();
      // Use uploaded file if available, otherwise use recorded blob
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        formData.append('file', blobToTranscribe, 'recording.webm');
      }
      formData.append('language', outputLanguage);

      // Use the new unified route with voice-transcription agent
      const response = await fetch('/api/ai-builder/voice-transcription', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (data.success && data.data) {
        // Handle the new response format
        // The unified route returns: { success: true, data: { transcription, usage, estimated_cost, metadata, timing } }
        const transcriptionText = data.data.transcription;
        if (transcriptionText) {
          setTranscription(transcriptionText);
        // Store usage and cost information if available
          if (data.data.usage || data.data.estimated_cost) {
          setTokenUsage({
              usage: data.data.usage,
              estimated_cost: data.data.estimated_cost,
          });
        } else {
          setTokenUsage(null);
          }
        } else {
          throw new Error('No transcription received');
        }
        // Don't call onTranscript here - only apply when user clicks Apply button
      } else {
        throw new Error(data.error || 'No transcription received');
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Transcription error: ${error instanceof Error ? error.message : String(error)}`);
      setTranscriptionError(
        error instanceof Error ? error.message : 'Failed to transcribe audio'
      );
    } finally {
      setIsTranscribing(false);
    }
  }, [uploadedFileBlob, recordedBlob, uploadedFile, outputLanguage]);

  // Auto-transcribe when blob is ready after stop-and-transcribe
  useEffect(() => {
    const blobToTranscribe = uploadedFileBlob || recordedBlob;
    if (shouldAutoTranscribe && blobToTranscribe && !isRecording) {
      setShouldAutoTranscribe(false);
      // Small delay to ensure blob is fully processed
      setTimeout(() => {
        handleTranscribe();
      }, 200);
    }
  }, [shouldAutoTranscribe, recordedBlob, uploadedFileBlob, isRecording, handleTranscribe]);

  const handleApply = () => {
    if (transcription) {
      // Call onApply if provided (for applying to text field)
      if (onApply) {
        onApply(transcription);
      }
      // Also call onTranscript if provided (for backward compatibility)
      if (onTranscript) {
        onTranscript(transcription);
      }
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    // Stop recording first if it's still active
    if (isRecording) {
      stopRecording();
    }
    
    // Immediately stop all tracks to release the microphone
    // This must happen to prevent the browser from showing the microphone icon
    clearRecording();
    
    // Clear state immediately
    setTranscription(null);
    setTranscriptionError(null);
    setTokenUsage(null);
    
    // Close dialog - this will trigger the useEffect cleanup which ensures VoicePoweredOrb stops
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "w-[80vw] max-w-2xl sm:max-w-3xl p-2 overflow-hidden max-h-[90vh] flex flex-col",
          className
        )}
        hideCloseButton={false}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2"><AudioLines className="h-5 w-5 text-violet-500" /> Voice Input</DialogTitle>
          <DialogDescription>
            Speak to see the orb respond to your voice. Click the button to start recording.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 px-6 pb-6 overflow-y-auto flex-1 min-h-0">
          {/* File Upload - Show when no recording or uploaded file exists */}
          {!activeBlob && !isRecording && (
            <div className="w-full">
              <AudioFileUpload
                onFileSelect={handleFileSelect}
                onError={handleFileError}
                disabled={isTranscribing || isRecording}
                className="mb-4"
              />
            </div>
          )}

          {/* Orb Container - Show when not recording and no recording exists, or during recording */}
          {!activeBlob && isOpen && (
            <div className="w-full h-96 relative rounded-xl overflow-hidden">
              <VoicePoweredOrb
                enableVoiceControl={false}
                className="rounded-xl overflow-hidden"
              />
              {loadingTextSwitches && (isRecording || isTranscribing) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
                  <div className="max-w-[85%]">
                    <TextSwitcher
                      texts={loadingTextSwitches}
                      className="text-white dark:text-white font-medium text-sm md:text-base px-4 py-2 rounded-lg bg-black/20 dark:bg-white/10 backdrop-blur-sm"
                      switchInterval={3000}
                      transitionDuration={0.5}
                      shimmerDuration={1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Visualizer - Show when recording or uploaded file exists */}
          {activeBlob && !isRecording && (
            <div className="w-full">
              <VoiceVisualizer
                controls={recorderControls}
                height={180}
                width="100%"
                backgroundColor="transparent"
                mainBarColor="#8b5cf6"
                secondaryBarColor="#a78bfa"
                speed={3}
                barWidth={9}
                gap={1}
                rounded={5}
                isControlPanelShown={false}
                isDownloadAudioButtonShown={false}
                onlyRecording={false}
                isDefaultUIShown={false}
                isProgressIndicatorShown={true}
                isProgressIndicatorTimeShown={true}
                isProgressIndicatorOnHoverShown={true}
                isProgressIndicatorTimeOnHoverShown={true}
                isAudioProcessingTextShown={false}
                mainContainerClassName="w-full"
                canvasContainerClassName="w-full rounded-xl overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
              />
            </div>
          )}

          {/* Error Messages */}
          {(error || visualizerError) && (
            <div className="w-full p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex flex-col gap-3">
                <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                  {error 
                    ? (typeof error === 'string' ? error : (typeof error === 'object' && 'message' in error ? (error as Error).message : String(error)))
                    : (visualizerError && typeof visualizerError === 'object' && 'message' in visualizerError
                        ? (visualizerError as Error).message
                        : String(visualizerError || ''))}
                </div>
                {/* Show permission request button if it's a permission error */}
                {(() => {
                  if (!error) return false;
                  const errorMessage = typeof error === 'string' 
                    ? error 
                    : (typeof error === 'object' && 'message' in error 
                        ? String((error as Error).message) 
                        : String(error || ''));
                  return errorMessage.toLowerCase().includes('permission') || 
                         errorMessage.toLowerCase().includes('denied');
                })() && (
                  <Button
                    onClick={handleRequestPermission}
                    disabled={isRequestingPermission || isRecording}
                    variant="outline"
                    size="sm"
                    className="self-start border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    {isRequestingPermission ? (
                      <>
                        <Mic className="w-4 h-4 mr-2 animate-pulse" />
                        Requesting Permission...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Request Microphone Permission
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          {transcriptionError && (
            <div className="w-full p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex flex-col gap-3">
                <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                  {transcriptionError}
                </div>
                {transcriptionError.toLowerCase().includes('permanently denied') && (
                  <Button
                    onClick={handleRequestPermission}
                    disabled={isRequestingPermission}
                    variant="outline"
                    size="sm"
                    className="self-start border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    {isRequestingPermission ? (
                      <>
                        <Mic className="w-4 h-4 mr-2 animate-pulse" />
                        Requesting Permission...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Try Requesting Permission Again
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center w-full gap-3">
            {!activeBlob ? (
              // Recording Controls - Centered
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  // Start Recording - Red Circle Button
                  <button
                    onClick={handleStartRecording}
                    disabled={isRequestingPermission}
                    className={cn(
                      "h-16 w-16 rounded-full bg-red-500 hover:bg-red-600",
                      "dark:bg-red-600 dark:hover:bg-red-700",
                      "flex items-center justify-center",
                      "transition-colors shadow-lg",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    )}
                    title="Start Recording"
                  >
                    <Circle className="h-8 w-8 text-white fill-white" />
                  </button>
                ) : (
                  // Stop Recording and Send Buttons
                  <>
                    {/* Stop Recording - Square Button */}
                    <button
                      onClick={handleStopRecording}
                      className={cn(
                        "h-16 w-16 rounded-full bg-gray-200 hover:bg-gray-300",
                        "dark:bg-gray-700 dark:hover:bg-gray-600",
                        "flex items-center justify-center",
                        "transition-colors shadow-lg",
                        "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      )}
                      title="Stop Recording"
                    >
                      <Square className="h-8 w-8 text-gray-600 dark:text-gray-300 fill-gray-600 dark:fill-gray-300" />
                    </button>
                    {/* Send/Transcribe - Arrow Up Button */}
                    <button
                      onClick={handleStopAndTranscribe}
                      className={cn(
                        "h-16 w-16 rounded-full bg-violet-500 hover:bg-violet-600",
                        "dark:bg-violet-600 dark:hover:bg-violet-700",
                        "flex items-center justify-center",
                        "transition-colors shadow-lg",
                        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                      )}
                      title="Stop and Transcribe"
                    >
                      <ArrowUp className="h-8 w-8 text-white" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Playback Controls - Show when recording or uploaded file exists
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-3 px-4 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <ButtonMinimal
                    icon={isPausedRecordedAudio ? Play : Pause}
                    title={isPausedRecordedAudio ? "Play" : "Pause"}
                    color="violet"
                    size="md"
                    onClick={handlePlayPause}
                  />
                  <ButtonMinimal
                    icon={RotateCcw}
                    title="Reset"
                    color="gray"
                    size="md"
                    onClick={handleClear}
                  />
                  {/* Record Again Button - Allows recording over the current recording */}
                  <ButtonMinimal
                    icon={Circle}
                    title="Record Again"
                    color="red"
                    size="md"
                    onClick={() => {
                      // Clear current recording and start fresh
                      handleClear();
                      // Small delay to ensure cleanup, then start recording
                      setTimeout(() => {
                        handleStartRecording();
                      }, 100);
                    }}
                  />
                  {/* Upload File Button - Allows uploading a file */}
                  <ButtonMinimal
                    icon={Upload}
                    title="Upload File"
                    color="blue"
                    size="md"
                    onClick={() => {
                      // Clear current recording/file and show upload
                      handleClear();
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-40 h-10">
                    <LanguageSelector
                      config={{
                        id: 'output-language',
                        label: '',
                        placeholder: 'Language',
                      }}
                      value={outputLanguage}
                      onChange={setOutputLanguage}
                      disabled={isTranscribing || !!transcription}
                    />
                  </div>
                  <Button
                    onClick={handleTranscribe}
                    variant="default"
                    size="default"
                    className="h-10 px-8 min-w-[200px]"
                    disabled={isTranscribing || !!transcription || !activeBlob}
                  >
                    {isTranscribing ? (
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <TextShimmerWave
                          duration={1.5}
                          spread={1.2}
                          className="text-sm font-medium"
                        >
                          Transcribing...
                        </TextShimmerWave>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 me-3" />
                        Transcribe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Recording Timer */}
          {isRecording && (
            <RecordingTimer
              isRecording={isRecording}
              size="md"
              showIcon={true}
              className="text-muted-foreground"
            />
          )}

          {/* Transcription Display */}
          {transcription && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Transcription
                </label>
                <CopyContent content={transcription} />
              </div>
              <textarea
                value={transcription}
                readOnly
                dir="auto"
                className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-violet-300 dark:focus:ring-violet-500 focus:border-violet-400 dark:focus:border-violet-500"
              />
            </div>
          )}

          {/* MetricCard for Token Usage and Cost */}
          {tokenUsage && transcription && (
            <div className="w-full mt-4">
              <MetricCard
                metrics={[
                  {
                    id: 'tokens',
                    label: 'Tokens',
                    value: tokenUsage.usage?.total_tokens || 0,
                    format: 'number' as const,
                    icon: 'Hash',
                    iconColor: 'cyan' as const,
                  },
                  {
                    id: 'cost',
                    label: 'Cost',
                    value: tokenUsage.estimated_cost?.unit || 0,
                    format: 'number' as const,
                    precision: 7,
                    unit: '$',
                    icon: 'DollarSign',
                    iconColor: 'pink' as const,
                  },
                ]}
                gradient="indigo"
                layout="grid"
                columns={2}
              />
            </div>
          )}

          {/* Instructions */}
          <p className="text-muted-foreground text-center max-w-md text-sm">
            {isRecording
              ? "Speak clearly into your microphone."
              : activeBlob
              ? "You can start over, upload a different file, or transcribe the audio."
              : (
                  <>
                    Upload an audio file (MP4, WAV, etc.) or click the button above to start recording.
                    <br />
                    Make sure your microphone access is granted if recording.
                  </>
                )}
          </p>
        </div>

        {/* Footer with Apply button */}
        {onApply && (
          <DialogFooter className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 mt-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isTranscribing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!transcription || isTranscribing}
            >
              Apply
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

