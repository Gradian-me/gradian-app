"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { Mic, MicOff, Sparkles, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";
import { RecordingTimer } from "./RecordingTimer";
import { LanguageSelector } from "@/gradian-ui/form-builder/form-elements/components/LanguageSelector";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";
import { ButtonMinimal } from "@/gradian-ui/form-builder/form-elements/components/ButtonMinimal";

interface VoiceInputDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscript?: (text: string) => void;
  onApply?: (text: string) => void;
  className?: string;
  loadingTextSwitches?: string | string[];
}

export const VoiceInputDialog: React.FC<VoiceInputDialogProps> = ({
  isOpen,
  onOpenChange,
  onTranscript,
  onApply,
  className,
  loadingTextSwitches,
}) => {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<string>('fa');
  
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
      try {
        setPreloadedAudioBlob(recordedBlob);
        loadedBlobRef.current = recordedBlob;
      } catch (error) {
        console.warn('Failed to set preloaded audio blob:', error);
      }
    } else if (!recordedBlob) {
      // Clear the ref when blob is cleared
      loadedBlobRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedBlob]); // Only depend on recordedBlob, setPreloadedAudioBlob is stable

  // Cleanup when dialog closes and reset when it opens
  useEffect(() => {
    if (!isOpen) {
      // Ensure microphone is stopped when dialog closes
      if (isRecording) {
        stopRecording();
      }
      clearRecording();
      // Clear transcription and errors when dialog closes
      setTranscription(null);
      setTranscriptionError(null);
      // Reset the loaded blob ref
      loadedBlobRef.current = null;
    } else {
      // Clear transcription when dialog opens to ensure fresh state
      setTranscription(null);
      setTranscriptionError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on unmount

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleClear = () => {
    setTranscription(null);
    setTranscriptionError(null);
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
        if (onTranscript) {
          onTranscript(data.transcription);
        }
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
    if (transcription && onApply) {
      onApply(transcription);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    // Stop recording first to ensure microphone is released
    if (isRecording) {
      stopRecording();
    }
    // Clear recording to stop any tracks
    clearRecording();
    setTranscription(null);
    setTranscriptionError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "w-[80vw] max-w-2xl sm:max-w-3xl p-6 overflow-hidden max-h-[90vh] flex flex-col",
          className
        )}
        hideCloseButton={false}
      >
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Voice Input</DialogTitle>
          <DialogDescription>
            Speak to see the orb respond to your voice. Click the button to start recording.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 px-6 pb-6 overflow-y-auto flex-1 min-h-0">
          {/* Orb Container - Show when not recording and no recording exists, or during recording */}
          {!recordedBlob && (
            <div className="w-full h-96 relative rounded-xl overflow-hidden">
              <VoicePoweredOrb
                enableVoiceControl={isRecording}
                className="rounded-xl overflow-hidden"
              />
              {loadingTextSwitches && (isRecording || isTranscribing) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <TextSwitcher
                    texts={loadingTextSwitches}
                    className="text-white dark:text-white font-medium text-sm md:text-base px-4 py-2 rounded-lg bg-black/20 dark:bg-white/10 backdrop-blur-sm"
                    switchInterval={3000}
                    transitionDuration={0.5}
                    shimmerDuration={1}
                  />
                </div>
              )}
            </div>
          )}

          {/* Voice Visualizer - Show when recording exists */}
          {recordedBlob && !isRecording && (
            <div className="w-full">
              <VoiceVisualizer
                controls={recorderControls}
                height={200}
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
          <div className="flex items-center justify-between w-full gap-3">
            {!recordedBlob ? (
              // Recording Controls - Centered
              <div className="w-full flex justify-center">
                <Button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  variant={isRecording ? "default" : "default"}
                  size="lg"
                  className="px-8 py-3 min-w-[200px]"
                  disabled={!!error}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-3" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-3" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Playback Controls
              <>
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
                        <Sparkles className="w-5 h-5 mr-3 animate-pulse" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-3" />
                        Transcribe
                      </>
                    )}
                  </Button>
                </div>
              </>
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

          {/* Instructions */}
          <p className="text-muted-foreground text-center max-w-md text-sm">
            {isRecording
              ? "Speak clearly into your microphone."
              : recordedBlob
              ? "You can start over or transcribe the recording."
              : "Click the button above to start recording. \
              Make sure your microphone access is granted."}
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

