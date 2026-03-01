'use client';

const CHUNK_LOAD_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
];

function isChunkLoadError(error: Error): boolean {
  const message = error?.message ?? '';
  const name = error?.name ?? '';
  const combined = `${name} ${message}`;
  return CHUNK_LOAD_ERROR_PATTERNS.some((p) => combined.includes(p));
}

function handleReload() {
  window.location.reload();
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = isChunkLoadError(error);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {isChunkError ? 'Update or network issue' : 'Something went wrong!'}
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            {isChunkError
              ? 'The app may have been updated. Reload the page to get the latest version. Your session will be preserved if it is still valid.'
              : error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={isChunkError ? handleReload : reset}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {isChunkError ? 'Reload page' : 'Try again'}
          </button>
        </div>
      </body>
    </html>
  );
}

