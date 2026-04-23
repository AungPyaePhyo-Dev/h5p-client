import { useCallback, useEffect, useRef, useState } from 'react';
import { H5PEditorUI, H5PPlayerUI } from '@lumieducation/h5p-react';

type ContentRecord = { id: string; title: string; mainLibrary: string };
type View = { kind: 'list' } | { kind: 'edit'; contentId: string } | { kind: 'play'; contentId: string };

export default function App() {
  const [content, setContent] = useState<ContentRecord[]>([]);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<H5PEditorUI>(null);

  const refreshContent = useCallback(() => {
    fetch('/h5p/content')
      .then((r) => r.json())
      .then(setContent)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  // <H5PEditorUI> callbacks — talk directly to the Nest backend.
  const loadEditorContent = useCallback(async (contentId: string) => {
    const res = await fetch(`/h5p/editor-model/${contentId}`);
    if (!res.ok) throw new Error(`editor-model failed: ${res.status}`);
    return res.json();
  }, []);

  const saveEditorContent = useCallback(
    async (contentId: string | undefined, body: { library: string; params: any }) => {
      const url = contentId ? `/h5p/content/${contentId}` : '/h5p/content';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      return res.json();
    },
    [],
  );

  const loadPlayerContent = useCallback(async (contentId: string) => {
    const res = await fetch(`/h5p/player-model/${contentId}`);
    if (!res.ok) throw new Error(`player-model failed: ${res.status}`);
    return res.json();
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 1100 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ marginRight: 'auto' }}>H5P Mini</h1>
        {view.kind !== 'list' && (
          <button onClick={() => { setView({ kind: 'list' }); refreshContent(); }}>
            ← Back to list
          </button>
        )}
        {view.kind === 'list' && (
          <button onClick={() => setView({ kind: 'edit', contentId: 'new' })}>
            + Create new content
          </button>
        )}
      </header>

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {view.kind === 'list' && (
        <section>
          <h2>Saved content ({content.length})</h2>
          {content.length === 0 ? (
            <p>No content yet. Click <strong>+ Create new content</strong> to get started.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {content.map((c) => (
                <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <strong>{c.title}</strong> <span style={{ color: '#888' }}>— {c.mainLibrary}</span>
                  <span style={{ float: 'right', display: 'inline-flex', gap: 8 }}>
                    <button onClick={() => setView({ kind: 'play', contentId: c.id })}>Play</button>
                    <button onClick={() => setView({ kind: 'edit', contentId: c.id })}>Edit</button>
                    <a href={`/h5p/download/${c.id}`}>Download .h5p</a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view.kind === 'edit' && (
        <section>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={async () => {
                try {
                  await editorRef.current?.save();
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Save
            </button>
          </div>
          <H5PEditorUI
            ref={editorRef}
            contentId={view.contentId}
            loadContentCallback={loadEditorContent}
            saveContentCallback={saveEditorContent}
            onSaved={(newId) => {
              setError(null);
              setView({ kind: 'play', contentId: newId });
              refreshContent();
            }}
            onSaveError={(msg) => setError(msg)}
          />
        </section>
      )}

      {view.kind === 'play' && (
        <section>
          <H5PPlayerUI
            contentId={view.contentId}
            loadContentCallback={loadPlayerContent}
          />
        </section>
      )}
    </div>
  );
}
