import { useCallback, useEffect, useRef, useState } from 'react';
import RichTextEditor from './RichTextEditor';
import PreviewModal from './PreviewModal';

type TextBlock = { id: string; type: 'text'; title: string; body: string };
type ImageBlock = {
  id: string;
  type: 'image';
  caption: string;
  src: { kind: 'upload'; filename: string };
};
type VideoBlock = {
  id: string;
  type: 'video';
  src: { kind: 'upload'; filename: string } | { kind: 'url'; url: string };
};
type QuizChoice = { id: string; text: string };
type QuizQuestion = {
  id: string;
  prompt: string;
  choices: QuizChoice[];
  correctChoiceId: string;
};
type QuizBlock = {
  id: string;
  type: 'quiz';
  passThreshold: number;
  questions: QuizQuestion[];
};
type Hotspot = { id: string; x: number; y: number; title: string; body: string };
type HotspotBlock = {
  id: string;
  type: 'hotspot';
  src: { kind: 'upload'; filename: string };
  hotspots: Hotspot[];
  requireAll: boolean;
};
type Block = TextBlock | ImageBlock | VideoBlock | QuizBlock | HotspotBlock;

type Lesson = {
  id: string;
  title: string;
  description: string;
  blocks: Block[];
};
type LessonSummary = Pick<Lesson, 'id' | 'title' | 'description'> & { updatedAt: string };

export default function ScormLesson() {
  const [list, setList] = useState<LessonSummary[]>([]);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/scorm/lesson');
      if (!res.ok) throw new Error(`list failed: ${res.status}`);
      setList(await res.json());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startNew = async () => {
    setError(null);
    try {
      const res = await fetch('/scorm/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled lesson', description: '', blocks: [] }),
      });
      if (!res.ok) throw new Error(`create failed: ${res.status}`);
      const { id } = await res.json();
      const full = await fetch(`/scorm/lesson/${id}`).then((r) => r.json());
      setEditing(full);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const startEdit = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/scorm/lesson/${id}`);
      if (!res.ok) throw new Error(`load failed: ${res.status}`);
      setEditing(await res.json());
    } catch (e) {
      setError(String(e));
    }
  };

  const save = async (lesson: Lesson) => {
    setError(null);
    try {
      const res = await fetch(`/scorm/lesson/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lesson.title,
          description: lesson.description,
          blocks: lesson.blocks,
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this lesson? Uploaded files will be deleted too.')) return;
    setError(null);
    try {
      const res = await fetch(`/scorm/lesson/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const duplicate = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/scorm/lesson/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(`duplicate failed: ${res.status}`);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const exportScorm = async (l: LessonSummary) => {
    setExportingId(l.id);
    setError(null);
    try {
      const res = await fetch(`/scorm/lesson/${l.id}/export`);
      if (!res.ok) throw new Error(`export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${l.title || l.id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    } finally {
      setExportingId(null);
    }
  };

  if (editing) {
    return (
      <LessonEditor
        lesson={editing}
        onBack={() => { setEditing(null); refresh(); }}
        onSave={save}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, marginRight: 'auto' }}>Lessons</h3>
        <button onClick={startNew}>+ New lesson</button>
      </div>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {list.length === 0 ? (
        <p>No lessons yet. Click <strong>+ New lesson</strong> to create one.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.map((l) => (
            <li key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <strong>{l.title || '(untitled)'}</strong>
              {l.description && <span style={{ color: '#888' }}> — {l.description}</span>}
              <span style={{ float: 'right', display: 'inline-flex', gap: 8 }}>
                <button onClick={() => startEdit(l.id)}>Edit</button>
                <button onClick={() => duplicate(l.id)}>Duplicate</button>
                <button onClick={() => remove(l.id)}>Delete</button>
                <button onClick={() => exportScorm(l)} disabled={exportingId === l.id}>
                  {exportingId === l.id ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Spinner /> Exporting…
                    </span>
                  ) : 'Export SCORM'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LessonEditor({
  lesson,
  onBack,
  onSave,
}: {
  lesson: Lesson;
  onBack: () => void;
  onSave: (l: Lesson) => void;
}) {
  const [draft, setDraft] = useState<Lesson>(lesson);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedJson = useRef<string>(JSON.stringify(lesson));
  const saveTimer = useRef<number | null>(null);

  // Debounced autosave whenever the draft changes. Skip the first render.
  useEffect(() => {
    const json = JSON.stringify(draft);
    if (json === lastSavedJson.current) return;
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`/scorm/lesson/${draft.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            blocks: draft.blocks,
          }),
        });
        if (!res.ok) throw new Error(`autosave failed: ${res.status}`);
        lastSavedJson.current = json;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 1000);
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    };
  }, [draft]);

  const setField = <K extends keyof Lesson>(k: K, v: Lesson[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  const updateBlock = (id: string, patch: Partial<Block>) =>
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));

  const addBlock = (type: Block['type']) =>
    setDraft((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock(type)] }));

  const removeBlock = (id: string) =>
    setDraft((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));

  const duplicateBlock = (id: string) =>
    setDraft((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const copy = cloneBlockWithNewIds(prev.blocks[idx]);
      const blocks = prev.blocks.slice();
      blocks.splice(idx + 1, 0, copy);
      return { ...prev, blocks };
    });

  const move = (id: string, dir: -1 | 1) =>
    setDraft((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.blocks.length) return prev;
      const blocks = prev.blocks.slice();
      const [item] = blocks.splice(idx, 1);
      blocks.splice(next, 0, item);
      return { ...prev, blocks };
    });

  const uploadFor = async (blockId: string, file: File): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/scorm/lesson/${draft.id}/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      setError(`upload failed: ${res.status}`);
      return null;
    }
    const { filename } = await res.json();
    return filename;
  };

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Lesson title is required.';
    for (const b of draft.blocks) {
      if (b.type === 'image' && !b.src.filename) return 'Each image block needs an uploaded file.';
      if (b.type === 'video') {
        if (b.src.kind === 'upload' && !b.src.filename) return 'Each uploaded video block needs a file.';
        if (b.src.kind === 'url' && !b.src.url.trim()) return 'Each URL video block needs a URL.';
      }
      if (b.type === 'hotspot') {
        if (!b.src.filename) return 'Each hotspot block needs an uploaded image.';
        if (b.hotspots.length === 0) return 'Add at least one hotspot to the hotspot image.';
      }
      if (b.type === 'quiz') {
        if (b.questions.length === 0) return 'Each quiz block needs at least one question.';
        for (const q of b.questions) {
          if (!q.prompt.trim()) return 'Every quiz question needs a prompt.';
          if (q.choices.length < 2) return 'Every quiz question needs at least 2 choices.';
          if (!q.correctChoiceId || !q.choices.find((c) => c.id === q.correctChoiceId)) {
            return 'Mark a correct choice for every quiz question.';
          }
          if (q.choices.some((c) => !c.text.trim())) return 'Every quiz choice needs text.';
        }
      }
    }
    return null;
  };

  const submit = () => {
    const err = validate();
    setError(err);
    if (!err) onSave(draft);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, marginRight: 'auto' }}>Edit lesson</h3>
        <span style={{ fontSize: 13, color: saveStatus === 'error' ? 'crimson' : '#666' }}>
          {saveStatus === 'saving' ? 'Saving…' :
           saveStatus === 'saved' ? 'All changes saved' :
           saveStatus === 'error' ? 'Autosave failed' : ''}
        </span>
        <button onClick={() => setPreview(true)}>Preview</button>
        <button onClick={onBack}>← Back</button>
        <button onClick={submit} style={{ fontWeight: 600 }}>Save</button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {preview && (
        <PreviewModal lesson={draft} lessonId={draft.id} onClose={() => setPreview(false)} />
      )}

      <div style={row}>
        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={draft.title} onChange={(e) => setField('title', e.target.value)} />
      </div>
      <div style={row}>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: 50 }}
          value={draft.description}
          onChange={(e) => setField('description', e.target.value)}
        />
      </div>

      <h4 style={{ marginTop: 24 }}>Blocks</h4>
      {draft.blocks.map((b, idx) => (
        <div key={b.id} style={blockCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <strong>
              {idx + 1}. {labelFor(b.type)}
            </strong>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
              <button onClick={() => move(b.id, -1)} disabled={idx === 0}>↑</button>
              <button onClick={() => move(b.id, 1)} disabled={idx === draft.blocks.length - 1}>↓</button>
              <button onClick={() => duplicateBlock(b.id)}>Duplicate</button>
              <button onClick={() => removeBlock(b.id)}>Remove</button>
            </span>
          </div>
          <BlockEditor
            lessonId={draft.id}
            block={b}
            onChange={(patch) => updateBlock(b.id, patch)}
            uploadFor={uploadFor}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => addBlock('text')}>+ Text</button>
        <button onClick={() => addBlock('image')}>+ Image</button>
        <button onClick={() => addBlock('video')}>+ Video</button>
        <button onClick={() => addBlock('quiz')}>+ Quiz</button>
        <button onClick={() => addBlock('hotspot')}>+ Hotspot Image</button>
      </div>
    </div>
  );
}

function BlockEditor({
  lessonId,
  block,
  onChange,
  uploadFor,
}: {
  lessonId: string;
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  uploadFor: (blockId: string, file: File) => Promise<string | null>;
}) {
  if (block.type === 'text') {
    return (
      <div>
        <input
          style={inputStyle}
          placeholder="Heading (optional)"
          value={block.title}
          onChange={(e) => onChange({ title: e.target.value } as Partial<TextBlock>)}
        />
        <div style={{ marginTop: 6 }}>
          <RichTextEditor
            value={block.body}
            onChange={(html) => onChange({ body: html } as Partial<TextBlock>)}
            placeholder="Body text"
          />
        </div>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div>
        <UploadField
          accept="image/*"
          label={block.src.filename ? 'Replace image' : 'Upload image'}
          onFile={async (f) => {
            const filename = await uploadFor(block.id, f);
            if (filename) onChange({ src: { kind: 'upload', filename } } as Partial<ImageBlock>);
          }}
        />
        {block.src.filename && (
          <img
            src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
            alt="preview"
            style={{ maxWidth: 240, marginTop: 8, display: 'block', borderRadius: 6 }}
          />
        )}
        <input
          style={{ ...inputStyle, marginTop: 6 }}
          placeholder="Caption (optional)"
          value={block.caption}
          onChange={(e) => onChange({ caption: e.target.value } as Partial<ImageBlock>)}
        />
      </div>
    );
  }

  if (block.type === 'video') {
    const kind = block.src.kind;
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <label><input
            type="radio"
            checked={kind === 'upload'}
            onChange={() => onChange({ src: { kind: 'upload', filename: '' } } as Partial<VideoBlock>)}
          /> Upload MP4</label>
          <label><input
            type="radio"
            checked={kind === 'url'}
            onChange={() => onChange({ src: { kind: 'url', url: '' } } as Partial<VideoBlock>)}
          /> Paste URL (YouTube / Vimeo / mp4)</label>
        </div>
        {kind === 'upload' ? (
          <div>
            <UploadField
              accept="video/*"
              label={block.src.kind === 'upload' && block.src.filename ? 'Replace video' : 'Upload video'}
              onFile={async (f) => {
                const filename = await uploadFor(block.id, f);
                if (filename) onChange({ src: { kind: 'upload', filename } } as Partial<VideoBlock>);
              }}
            />
            {block.src.kind === 'upload' && block.src.filename && (
              <video
                src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
                controls
                style={{ maxWidth: 360, marginTop: 8, display: 'block', borderRadius: 6, background: '#000' }}
              />
            )}
          </div>
        ) : (
          <input
            style={inputStyle}
            placeholder="https://www.youtube.com/watch?v=… or https://example.com/video.mp4"
            value={block.src.kind === 'url' ? block.src.url : ''}
            onChange={(e) => onChange({ src: { kind: 'url', url: e.target.value } } as Partial<VideoBlock>)}
          />
        )}
      </div>
    );
  }

  if (block.type === 'quiz') {
    return <QuizBlockEditor block={block} onChange={onChange as (patch: Partial<QuizBlock>) => void} />;
  }

  if (block.type === 'hotspot') {
    return (
      <HotspotBlockEditor
        block={block}
        lessonId={lessonId}
        onChange={onChange as (patch: Partial<HotspotBlock>) => void}
        uploadFor={uploadFor}
      />
    );
  }

  return null;
}

function HotspotBlockEditor({
  block,
  lessonId,
  onChange,
  uploadFor,
}: {
  block: HotspotBlock;
  lessonId: string;
  onChange: (patch: Partial<HotspotBlock>) => void;
  uploadFor: (blockId: string, file: File) => Promise<string | null>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef<string | null>(null);

  const addHotspotAt = (xPct: number, yPct: number) => {
    const id = rid();
    onChange({
      hotspots: [...block.hotspots, { id, x: xPct, y: yPct, title: '', body: '' }],
    });
    setSelectedId(id);
  };

  const updateHotspot = (id: string, patch: Partial<Hotspot>) =>
    onChange({
      hotspots: block.hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });

  const removeHotspot = (id: string) => {
    onChange({ hotspots: block.hotspots.filter((h) => h.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const coordsFromEvent = (e: React.MouseEvent): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const onImageClick = (e: React.MouseEvent) => {
    if (draggingRef.current) return; // ignore click after drag
    const pt = coordsFromEvent(e);
    if (pt) addHotspotAt(clamp(pt.x), clamp(pt.y));
  };

  const onMarkerMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const onMove = (ev: MouseEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
        moved = true;
        draggingRef.current = id;
      }
      if (moved) {
        const img = imgRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        updateHotspot(id, {
          x: clamp(((ev.clientX - rect.left) / rect.width) * 100),
          y: clamp(((ev.clientY - rect.top) / rect.height) * 100),
        });
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // Defer clearing so the parent onClick sees the flag.
      setTimeout(() => { draggingRef.current = null; }, 0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const selected = block.hotspots.find((h) => h.id === selectedId) || null;

  return (
    <div>
      <UploadField
        accept="image/*"
        label={block.src.filename ? 'Replace image' : 'Upload image'}
        onFile={async (f) => {
          const filename = await uploadFor(block.id, f);
          if (filename) onChange({ src: { kind: 'upload', filename } });
        }}
      />

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={block.requireAll}
          onChange={(e) => onChange({ requireAll: e.target.checked })}
        />
        Learner must explore all hotspots to continue
      </label>

      {!block.src.filename ? (
        <p style={{ color: '#888', marginTop: 8 }}>Upload an image to start adding hotspots.</p>
      ) : (
        <>
          <p style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
            Click the image to add a hotspot. Drag a marker to move it. Click a marker to edit or delete.
          </p>
          <div
            style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', userSelect: 'none', marginTop: 4 }}
            onClick={onImageClick}
          >
            <img
              ref={imgRef}
              src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
              alt=""
              draggable={false}
              style={{ maxWidth: '100%', display: 'block', borderRadius: 6, cursor: 'crosshair' }}
            />
            {block.hotspots.map((h, i) => (
              <div
                key={h.id}
                onMouseDown={(e) => onMarkerMouseDown(e, h.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(h.id); }}
                style={{
                  position: 'absolute',
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 30, height: 30, borderRadius: '50%',
                  background: selectedId === h.id ? '#cf222e' : '#0969da',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'grab',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  border: '2px solid #fff',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, marginTop: 10, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <strong>Hotspot {block.hotspots.findIndex((h) => h.id === selected.id) + 1}</strong>
                <span style={{ color: '#888', fontSize: 12 }}>
                  ({selected.x.toFixed(1)}%, {selected.y.toFixed(1)}%)
                </span>
                <button style={{ marginLeft: 'auto' }} onClick={() => removeHotspot(selected.id)}>Delete</button>
                <button onClick={() => setSelectedId(null)}>Close</button>
              </div>
              <input
                style={inputStyle}
                placeholder="Title (optional)"
                value={selected.title}
                onChange={(e) => updateHotspot(selected.id, { title: e.target.value })}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 70, marginTop: 6 }}
                placeholder="Description shown when learner clicks the marker"
                value={selected.body}
                onChange={(e) => updateHotspot(selected.id, { body: e.target.value })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function clamp(n: number): number { return Math.max(0, Math.min(100, n)); }

function QuizBlockEditor({
  block,
  onChange,
}: {
  block: QuizBlock;
  onChange: (patch: Partial<QuizBlock>) => void;
}) {
  const update = (patch: Partial<QuizBlock>) => onChange(patch);

  const setQuestion = (qid: string, patch: Partial<QuizQuestion>) =>
    update({
      questions: block.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    });

  const addQuestion = () => update({ questions: [...block.questions, newQuestion()] });
  const removeQuestion = (qid: string) =>
    update({ questions: block.questions.filter((q) => q.id !== qid) });

  const setChoice = (qid: string, cid: string, text: string) =>
    setQuestion(qid, {
      choices: block.questions.find((q) => q.id === qid)!.choices.map((c) =>
        c.id === cid ? { ...c, text } : c,
      ),
    });
  const addChoice = (qid: string) =>
    setQuestion(qid, {
      choices: [...block.questions.find((q) => q.id === qid)!.choices, { id: rid(), text: '' }],
    });
  const removeChoice = (qid: string, cid: string) => {
    const q = block.questions.find((qq) => qq.id === qid)!;
    setQuestion(qid, {
      choices: q.choices.filter((c) => c.id !== cid),
      correctChoiceId: q.correctChoiceId === cid ? '' : q.correctChoiceId,
    });
  };

  return (
    <div>
      <div style={{ ...row, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <label style={labelStyle}>Pass threshold (%)</label>
        <input
          style={{ ...inputStyle, maxWidth: 100 }}
          type="number"
          min={0}
          max={100}
          value={block.passThreshold}
          onChange={(e) => update({ passThreshold: Number(e.target.value) || 0 })}
        />
      </div>
      {block.questions.map((q, idx) => (
        <div key={q.id} style={{ border: '1px solid #eee', padding: 10, borderRadius: 6, margin: '8px 0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <strong>Q{idx + 1}</strong>
            <button style={{ marginLeft: 'auto' }} onClick={() => removeQuestion(q.id)}>Remove question</button>
          </div>
          <input
            style={inputStyle}
            value={q.prompt}
            onChange={(e) => setQuestion(q.id, { prompt: e.target.value })}
            placeholder="Question prompt"
          />
          <div style={{ marginTop: 6 }}>
            {q.choices.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' }}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctChoiceId === c.id}
                  onChange={() => setQuestion(q.id, { correctChoiceId: c.id })}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={c.text}
                  onChange={(e) => setChoice(q.id, c.id, e.target.value)}
                  placeholder="Choice text"
                />
                <button onClick={() => removeChoice(q.id, c.id)} disabled={q.choices.length <= 2}>✕</button>
              </div>
            ))}
            <button onClick={() => addChoice(q.id)} style={{ marginTop: 4 }}>+ Add choice</button>
          </div>
        </div>
      ))}
      <button onClick={addQuestion}>+ Add question</button>
    </div>
  );
}

function UploadField({
  accept,
  label,
  onFile,
}: {
  accept: string;
  label: string;
  onFile: (f: File) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label style={{ display: 'inline-block' }}>
      <span style={{ ...buttonStyle, display: 'inline-block', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Uploading…' : label}
      </span>
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { await onFile(f); } finally { setBusy(false); e.target.value = ''; }
        }}
      />
    </label>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        border: '2px solid #ccc',
        borderTopColor: '#333',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'h5p-spin 0.8s linear infinite',
      }}
    />
  );
}

function cloneBlockWithNewIds(b: Block): Block {
  if (b.type === 'hotspot') {
    return {
      ...b,
      id: rid(),
      hotspots: b.hotspots.map((h) => ({ ...h, id: rid() })),
    };
  }
  if (b.type === 'quiz') {
    return {
      ...b,
      id: rid(),
      questions: b.questions.map((q) => {
        const correctIdx = q.choices.findIndex((c) => c.id === q.correctChoiceId);
        const newChoices = q.choices.map((c) => ({ ...c, id: rid() }));
        return {
          ...q,
          id: rid(),
          choices: newChoices,
          correctChoiceId: correctIdx >= 0 ? newChoices[correctIdx].id : '',
        };
      }),
    };
  }
  return { ...b, id: rid() };
}

function newBlock(type: Block['type']): Block {
  const id = rid();
  if (type === 'text') return { id, type: 'text', title: '', body: '' };
  if (type === 'image') return { id, type: 'image', caption: '', src: { kind: 'upload', filename: '' } };
  if (type === 'video') return { id, type: 'video', src: { kind: 'upload', filename: '' } };
  if (type === 'hotspot') return { id, type: 'hotspot', src: { kind: 'upload', filename: '' }, hotspots: [], requireAll: true };
  return { id, type: 'quiz', passThreshold: 70, questions: [newQuestion()] };
}

function newQuestion(): QuizQuestion {
  return {
    id: rid(),
    prompt: '',
    choices: [{ id: rid(), text: '' }, { id: rid(), text: '' }],
    correctChoiceId: '',
  };
}

function labelFor(t: Block['type']) {
  return t === 'text' ? 'Text'
    : t === 'image' ? 'Image'
    : t === 'video' ? 'Video'
    : t === 'hotspot' ? 'Hotspot Image'
    : 'Quiz';
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontSize: 13, color: '#555', fontWeight: 600 };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
};
const blockCard: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 12,
  margin: '8px 0',
  background: '#fafafa',
};
const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #333',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
