"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NdefReaderLike = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

function parseNdefMessage(event: unknown): string {
  const ev = event as { message?: { records?: Array<{ recordType?: string; data?: ArrayBuffer | DataView; encoding?: string }> }; serialNumber?: string };
  const message = ev?.message;
  let textPayload = "";

  if (message?.records && Array.isArray(message.records) && message.records.length > 0) {
    for (const record of message.records) {
      if (record?.recordType === "text" && record.data) {
        try {
          const encoding = typeof record.encoding === "string" ? record.encoding : "utf-8";
          const data = record.data;
          const view = data instanceof DataView ? data : new DataView(data as ArrayBuffer);
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
    if (!textPayload && message.records[0]) {
      const first = message.records[0];
      const data = first?.data;
      if (data) {
        const view = data instanceof DataView ? data : new DataView(data as ArrayBuffer);
        const bytes: number[] = [];
        for (let i = 0; i < view.byteLength; i += 1) {
          bytes.push(view.getUint8(i));
        }
        textPayload = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
  }
  return (textPayload || String(ev?.serialNumber ?? "")).trim();
}

export interface UseNfcReaderOptions {
  onRead: (value: string) => void;
  enabled: boolean;
}

export interface UseNfcReaderResult {
  nfcSupported: boolean;
  nfcActive: boolean;
  nfcError: string | null;
}

export function useNfcReader({ onRead, enabled }: UseNfcReaderOptions): UseNfcReaderResult {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const nfcReaderRef = useRef<NdefReaderLike | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = typeof (window as Window & { NDEFReader?: unknown }).NDEFReader !== "undefined";
    setNfcSupported(supported);
  }, []);

  const cleanup = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch {
      // Best-effort abort
    }
    abortControllerRef.current = null;
    nfcReaderRef.current = null;
    setNfcActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || !nfcSupported || typeof window === "undefined") {
      cleanup();
      return;
    }

    const NDEFReaderCtor = (window as Window & { NDEFReader?: new () => NdefReaderLike }).NDEFReader;
    if (!NDEFReaderCtor) {
      setNfcSupported(false);
      return;
    }

    let cancelled = false;
    const reader = new NDEFReaderCtor();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    nfcReaderRef.current = reader;

    reader.onreading = (event: unknown) => {
      if (cancelled) return;
      try {
        const candidate = parseNdefMessage(event);
        if (candidate) onReadRef.current(candidate);
      } catch {
        // Swallow parse errors
      }
    };

    reader.onerror = () => {
      if (!cancelled) setNfcError("NFC read error");
    };

    reader.scan({ signal: controller.signal }).then(
      () => {
        if (!cancelled) setNfcActive(true);
      },
      (err: unknown) => {
        if (cancelled) return;
        setNfcActive(false);
        const name = err && typeof err === "object" && "name" in err ? (err as { name: string }).name : "";
        if (name === "NotAllowedError") {
          setNfcError("NFC permission was denied.");
        } else {
          setNfcError("NFC is not available or failed to start.");
        }
      }
    );

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, nfcSupported, cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { nfcSupported, nfcActive, nfcError };
}
