'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/gradian-ui/shared/utils";
import { Switch as FormSwitch } from "@/gradian-ui/form-builder/form-elements/components/Switch";

interface BarcodeHandheldProps {
  title: string;
  description: string;
  placeholder: string;
  addBarcodeAria: string;
  onSubmit: (value: string, source: "manual" | "nfc") => void;
}

type NdefReaderLike = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
};

export const BarcodeHandheld: React.FC<BarcodeHandheldProps> = ({
  title,
  description,
  placeholder,
  addBarcodeAria,
  onSubmit,
}) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [nfcSupported, setNfcSupported] = useState(false);
  const [rfidEnabled, setRfidEnabled] = useState(true);
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);

  const nfcReaderRef = useRef<NdefReaderLike | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = typeof (window as any).NDEFReader !== "undefined";
    setNfcSupported(supported);
    if (!supported) {
      setRfidEnabled(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  const cleanupNfc = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch {
      // Best-effort abort; ignore failures
    }
    abortControllerRef.current = null;
    nfcReaderRef.current = null;
    setNfcActive(false);
  }, []);

  const handleSubmit = useCallback(
    (raw: string, source: "manual" | "nfc") => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setValue("");
      onSubmit(trimmed, source);
    },
    [onSubmit]
  );

  const startNfcScan = useCallback(async () => {
    if (!nfcSupported || typeof window === "undefined") return;

    try {
      setNfcError(null);
      const NDEFReaderCtor = (window as any).NDEFReader as { new (): NdefReaderLike } | undefined;
      if (!NDEFReaderCtor) {
        setNfcSupported(false);
        setRfidEnabled(false);
        return;
      }

      const reader = new NDEFReaderCtor();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      nfcReaderRef.current = reader;

      reader.onreading = (event: any) => {
        try {
          const message = event?.message;
          let textPayload = "";

          if (message?.records && Array.isArray(message.records) && message.records.length > 0) {
            for (const record of message.records) {
              if (record?.recordType === "text" && record.data) {
                try {
                  const encoding =
                    typeof (record as any).encoding === "string" ? (record as any).encoding : "utf-8";
                  const data = record.data as ArrayBuffer | DataView;
                  const view = data instanceof DataView ? data : new DataView(data);
                  const bytes: number[] = [];
                  for (let i = 0; i < view.byteLength; i += 1) {
                    bytes.push(view.getUint8(i));
                  }
                  const decoder = new TextDecoder(encoding);
                  textPayload = decoder.decode(new Uint8Array(bytes));
                  break;
                } catch {
                  // Fallback to next record
                }
              }
            }

            if (!textPayload) {
              const first = message.records[0];
              const data = first?.data as ArrayBuffer | DataView | undefined;
              if (data) {
                const view = data instanceof DataView ? data : new DataView(data);
                const bytes: number[] = [];
                for (let i = 0; i < view.byteLength; i += 1) {
                  bytes.push(view.getUint8(i));
                }
                textPayload = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
              }
            }
          }

          const candidate = (textPayload || String(event?.serialNumber ?? "")).trim();
          if (!candidate) return;

          handleSubmit(candidate, "nfc");
        } catch {
          // Swallow parse errors but keep the scanner active
        }
      };

      reader.onerror = () => {
        setNfcError("NFC read error");
      };

      await reader.scan({ signal: controller.signal });
      setNfcActive(true);
    } catch (err: any) {
      setNfcActive(false);
      if (err && typeof err === "object" && (err as any).name === "NotAllowedError") {
        setNfcError("NFC permission was denied.");
      } else {
        setNfcError("NFC is not available or failed to start.");
      }
    }
  }, [handleSubmit, nfcSupported]);

  useEffect(() => {
    if (!rfidEnabled) {
      cleanupNfc();
      return;
    }
    if (rfidEnabled && nfcSupported && !nfcActive) {
      void startNfcScan();
    }
  }, [rfidEnabled, nfcSupported, nfcActive, startNfcScan, cleanupNfc]);

  useEffect(
    () => () => {
      cleanupNfc();
    },
    [cleanupNfc]
  );

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-4 py-6")}>
      <div className="flex flex-col items-center gap-1 textcenter">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-1">
          <svg
            className="w-6 h-6 text-violet-600 dark:text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75V16.5ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[220px] text-center">
          {description}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <FormSwitch
            config={
              {
                name: "rfidNfcToggle",
                label: "RFID / NFC",
                placeholder: !nfcSupported ? "NFC not supported in this browser." : undefined,
              } as any
            }
            value={rfidEnabled && nfcSupported}
            onChange={(checked: boolean) => {
              if (!nfcSupported) return;
              setRfidEnabled(checked);
            }}
            disabled={!nfcSupported}
          />
          {nfcActive && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Listening for NFC tag…
            </span>
          )}
        </div>
        {nfcError && (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 max-w-[240px] text-center">
            {nfcError}
          </p>
        )}
      </div>
      <div className="flex w-full max-w-xs gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(value, "manual");
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-sans text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 dark:focus:ring-violet-600 dark:focus:border-violet-600 transition-colors"
          autoComplete="off"
          maxLength={2048}
        />
        <button
          type="button"
          onClick={() => handleSubmit(value, "manual")}
          disabled={!value.trim()}
          className="h-10 w-10 shrink-0 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1"
          aria-label={addBarcodeAria}
          title={addBarcodeAria}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

BarcodeHandheld.displayName = "BarcodeHandheld";

