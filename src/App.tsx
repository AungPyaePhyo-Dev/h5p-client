import { useEffect, useState } from 'react';

type Library = { machineName: string; majorVersion: number; minorVersion: number };
type ContentRecord = { id: string; title: string; mainLibrary: string };

export default function App() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [content, setContent] = useState<ContentRecord[]>([]);
  const [playData, setPlayData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/h5p/libraries')
      .then((r) => r.json())
      .then(setLibraries)
      .catch((e) => setError(String(e)));
    fetch('/h5p/content')
      .then((r) => r.json())
      .then(setContent)
      .catch(() => {});
  }, []);

  const play = async (id: string) => {
    const res = await fetch(`/h5p/play/${id}`);
    setPlayData(await res.json());
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 900 }}>
      <h1>H5P Mini</h1>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      <section>
        <h2>Installed libraries ({libraries.length})</h2>
        {libraries.length === 0 ? (
          <p>
            No libraries installed. Drop an H5P library folder into{' '}
            <code>backend/h5p-data/libraries</code> or install via the H5P hub integration.
          </p>
        ) : (
          <ul>
            {libraries.map((l) => (
              <li key={`${l.machineName}-${l.majorVersion}.${l.minorVersion}`}>
                {l.machineName} {l.majorVersion}.{l.minorVersion}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Saved content ({content.length})</h2>
        <ul>
          {content.map((c) => (
            <li key={c.id}>
              <strong>{c.title}</strong> — {c.mainLibrary}{' '}
              <button onClick={() => play(c.id)}>Play</button>
            </li>
          ))}
        </ul>
      </section>

      {playData !== null && (
        <section>
          <h2>Play payload</h2>
          <pre style={{ background: '#f4f4f4', padding: 12, overflow: 'auto' }}>
            {JSON.stringify(playData, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
