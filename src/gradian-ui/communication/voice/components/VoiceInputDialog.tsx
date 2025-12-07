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
import { Mic, MicOff, Sparkles, Play, Pause, RotateCcw, Circle, ArrowUp, Square, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import dynamic from "next/dynamic";
import { useVoiceVisualizer } from "react-voice-visualizer";
import { RecordingTimer } from "./RecordingTimer";
import { LanguageSelector } from "@/gradian-ui/form-builder/form-elements/components/LanguageSelector";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";
import { ButtonMinimal } from "@/gradian-ui/form-builder/form-elements/components/ButtonMinimal";
import { MetricCard } from "@/gradian-ui/analytics/indicators/metric-card";

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
  const [isBlobLoaded, setIsBlobLoaded] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{ usage?: any; estimated_cost?: any } | null>(null);
  const [shouldAutoTranscribe, setShouldAutoTranscribe] = useState(false);
  
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

  // Load recorded blob into voice visualizer when available
  useEffect(() => {
    // Only load if we have a new blob (different reference)
    if (recordedBlob && recordedBlob !== loadedBlobRef.current) {
      setIsBlobLoaded(false);
      try {
        // Convert blob to File if needed, or use blob directly
        // The visualizer might need a File object with a name
        const audioFile = recordedBlob instanceof File 
          ? recordedBlob 
          : new File([recordedBlob], 'recording.webm', { type: recordedBlob.type || 'audio/webm' });
        
        // Set the blob/file in the visualizer
        setPreloadedAudioBlob(audioFile);
        loadedBlobRef.current = recordedBlob;
        
        // Give the visualizer a moment to process the audio
        setTimeout(() => {
          setIsBlobLoaded(true);
        }, 100);
        
        console.log('Audio blob loaded into visualizer:', recordedBlob.size, 'bytes', 'type:', recordedBlob.type);
      } catch (error) {
        console.warn('Failed to set preloaded audio blob:', error);
        setIsBlobLoaded(false);
      }
    } else if (!recordedBlob) {
      // Clear the ref when blob is cleared
      loadedBlobRef.current = null;
      setIsBlobLoaded(false);
    }
  }, [recordedBlob]); // Only depend on recordedBlob, setPreloadedAudioBlob is stable

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  // Auto-start recording when dialog opens with autoStart prop
  useEffect(() => {
    if (isOpen && autoStart && !isRecording && !recordedBlob) {
      // Small delay to ensure dialog is fully mounted
      const timer = setTimeout(() => {
        handleStartRecording();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoStart, isRecording, recordedBlob, handleStartRecording]); // Include all dependencies

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
      
      // Note: VoicePoweredOrb will automatically stop its microphone when enableVoiceControl becomes false
      // The enableVoiceControl prop is set to (isRecording && isOpen), so when isOpen becomes false,
      // VoicePoweredOrb's useEffect will trigger and call stopMicrophone()
      
      // Clear transcription and errors when dialog closes
      setTranscription(null);
      setTranscriptionError(null);
      setTokenUsage(null);
      setShouldAutoTranscribe(false);
      // Reset the loaded blob ref
      loadedBlobRef.current = null;
    } else {
      // Clear transcription when dialog opens to ensure fresh state
      setTranscription(null);
      setTranscriptionError(null);
      setTokenUsage(null);
      setShouldAutoTranscribe(false);
    }
  }, [isOpen]); // Only depend on isOpen to avoid infinite loops

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

  // Auto-transcribe when blob is ready after stop-and-transcribe
  useEffect(() => {
    if (shouldAutoTranscribe && recordedBlob && !isRecording) {
      setShouldAutoTranscribe(false);
      // Small delay to ensure blob is fully processed
      setTimeout(() => {
        handleTranscribe();
      }, 200);
    }
  }, [shouldAutoTranscribe, recordedBlob, isRecording]);

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

  // Auto-transcribe when blob is ready after stop-and-transcribe
  useEffect(() => {
    if (shouldAutoTranscribe && recordedBlob && !isRecording) {
      setShouldAutoTranscribe(false);
      // Small delay to ensure blob is fully processed
      setTimeout(() => {
        handleTranscribe();
      }, 200);
    }
  }, [shouldAutoTranscribe, recordedBlob, isRecording]);

  const handleClear = () => {
    setTranscription(null);
    setTranscriptionError(null);
    setTokenUsage(null);
    clearRecording();
    if (clearCanvas) {
      clearCanvas();
    }
  };

  const handlePlayPause = () => {
    togglePauseResume?.();
  };

  const handleTranscribe = async () => {
    if (!recordedBlob) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'recording.webm');
      formData.append('language', outputLanguage);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (data.success && data.transcription) {
        setTranscription(data.transcription);
        // Store usage and cost information if available
        if (data.usage || data.estimated_cost) {
          setTokenUsage({
            usage: data.usage,
            estimated_cost: data.estimated_cost,
          });
        } else {
          setTokenUsage(null);
        }
        // Don't call onTranscript here - only apply when user clicks Apply button
      } else {
        throw new Error(data.error || 'No transcription received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionError(
        error instanceof Error ? error.message : 'Failed to transcribe audio'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

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
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2"><AudioLines className="h-5 w-5 text-violet-500" /> Voice Input</DialogTitle>
          <DialogDescription>
            Speak to see the orb respond to your voice. Click the button to start recording.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 px-6 pb-6 overflow-y-auto flex-1 min-h-0">
          {/* Orb Container - Show when not recording and no recording exists, or during recording */}
          {!recordedBlob && isOpen && (
            <div className="w-full h-96 relative rounded-xl overflow-hidden">
              <VoicePoweredOrb
                enableVoiceControl={isRecording && isOpen}
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

          {/* Voice Visualizer - Show when recording exists */}
          {recordedBlob && !isRecording && loadedBlobRef.current && isBlobLoaded && (
            <div className="w-full" key={loadedBlobRef.current.size}>
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
            <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error && typeof error === 'object' && 'message' in error 
                  ? (error as Error).message 
                  : String(error || '') || 
                  (visualizerError && typeof visualizerError === 'object' && 'message' in visualizerError
                    ? (visualizerError as Error).message
                    : String(visualizerError || ''))}
              </p>
            </div>
          )}
          {transcriptionError && (
            <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{transcriptionError}</p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center w-full gap-3">
            {!recordedBlob ? (
              // Recording Controls - Centered
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  // Start Recording - Red Circle Button
                  <button
                    onClick={handleStartRecording}
                    disabled={!!error}
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
              // Playback Controls - Show when recording exists
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
                    disabled={isTranscribing || !!transcription}
                  >
                    {isTranscribing ? (
                      <>
                        <Sparkles className="w-5 h-5 me-3 animate-pulse" />
                        Transcribing...
                      </>
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
              : recordedBlob
              ? "You can start over or transcribe the recording."
              : (
                  <>
                    Click the button above to start recording.
                    <br />
                    Make sure your microphone access is granted.
                  </>
                )}
          </p>
        </div>

        {/* Footer with Apply button */}
        {onApply && (
          <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 mt-auto">
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

