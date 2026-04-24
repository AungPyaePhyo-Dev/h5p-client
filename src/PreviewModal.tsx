import { useMemo, useState } from 'react';

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

export type PreviewLesson = {
  id: string;
  title: string;
  description: string;
  blocks: Block[];
};

type Props = {
  lesson: PreviewLesson;
  lessonId: string;
  onClose: () => void;
};

type QuizResult = { score: number; passed: boolean };

export default function PreviewModal({ lesson, lessonId, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  // blockId -> Set of viewed hotspot ids (as a plain object for React state).
  const [hotspotViewed, setHotspotViewed] = useState<Record<string, Record<string, true>>>({});
  const blocks = lesson.blocks;
  const block = blocks[idx];

  const finishSummary = useMemo(() => {
    const quizBlocks = blocks.filter((b): b is QuizBlock => b.type === 'quiz');
    const attempted = quizBlocks.filter((b) => quizResults[b.id]);
    if (attempted.length < quizBlocks.length) return null;
    const hotspotBlocks = blocks.filter(
      (b): b is HotspotBlock => b.type === 'hotspot' && b.requireAll,
    );
    const allHotspotsDone = hotspotBlocks.every((b) => {
      const vm = hotspotViewed[b.id] || {};
      return b.hotspots.every((h) => vm[h.id]);
    });
    if (!allHotspotsDone) return null;
    if (quizBlocks.length === 0) return { score: 100, status: 'completed' as const };
    const avg = Math.round(
      quizBlocks.reduce((acc, b) => acc + quizResults[b.id].score, 0) / quizBlocks.length,
    );
    const allPassed = quizBlocks.every((b) => quizResults[b.id].passed);
    return { score: avg, status: (allPassed ? 'passed' : 'failed') as 'passed' | 'failed' };
  }, [blocks, quizResults, hotspotViewed]);

  const [showSummary, setShowSummary] = useState(false);

  const onNext = () => {
    if (block && block.type === 'hotspot' && block.requireAll) {
      const vm = hotspotViewed[block.id] || {};
      const allSeen = block.hotspots.every((h) => vm[h.id]);
      if (!allSeen) { alert('Explore all hotspots before continuing.'); return; }
    }
    if (idx === blocks.length - 1) {
      if (!finishSummary) { alert('Complete all required blocks before finishing.'); return; }
      setShowSummary(true);
    } else {
      setIdx(idx + 1);
    }
  };

  const markHotspotViewed = (blockId: string, hotspotId: string) =>
    setHotspotViewed((prev) => ({ ...prev, [blockId]: { ...(prev[blockId] || {}), [hotspotId]: true } }));

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <strong style={{ marginRight: 'auto' }}>Preview: {lesson.title}</strong>
          <span style={{ color: '#888', fontSize: 13 }}>
            Preview does not talk to an LMS — no SCORM tracking happens here.
          </span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={body}>
          {blocks.length === 0 ? (
            <p style={{ color: '#888' }}>This lesson has no blocks yet.</p>
          ) : showSummary && finishSummary ? (
            <SummaryView summary={finishSummary} quizBlocks={blocks.filter((b): b is QuizBlock => b.type === 'quiz')} />
          ) : block ? (
            <BlockView
              block={block}
              lessonId={lessonId}
              quizResult={block.type === 'quiz' ? quizResults[block.id] : undefined}
              onQuizSubmit={(result) => setQuizResults((prev) => ({ ...prev, [block.id]: result }))}
              hotspotViewed={block.type === 'hotspot' ? (hotspotViewed[block.id] || {}) : {}}
              onHotspotView={(hid) => block && markHotspotViewed(block.id, hid)}
            />
          ) : null}
        </div>

        {blocks.length > 0 && !showSummary && (
          <div style={footer}>
            <button
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
              style={{ ...btn, background: '#fff', color: '#333' }}
            >
              ← Previous
            </button>
            <span style={{ flex: 1 }} />
            <span style={{ color: '#666', fontSize: 14, marginRight: 12 }}>{idx + 1} / {blocks.length}</span>
            <button onClick={onNext} style={btn}>
              {idx === blocks.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockView({
  block,
  lessonId,
  quizResult,
  onQuizSubmit,
  hotspotViewed,
  onHotspotView,
}: {
  block: Block;
  lessonId: string;
  quizResult?: QuizResult;
  onQuizSubmit: (r: QuizResult) => void;
  hotspotViewed: Record<string, true>;
  onHotspotView: (hotspotId: string) => void;
}) {
  if (block.type === 'text') {
    return (
      <div>
        {block.title && <h2>{block.title}</h2>}
        <div className="rte-content" dangerouslySetInnerHTML={{ __html: block.body || '' }} />
      </div>
    );
  }
  if (block.type === 'image') {
    return (
      <div>
        <img
          src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
          alt={block.caption || ''}
          style={{ maxWidth: '100%', borderRadius: 6 }}
        />
        {block.caption && <div style={{ color: '#555', fontSize: 14, marginTop: 6 }}>{block.caption}</div>}
      </div>
    );
  }
  if (block.type === 'video') {
    if (block.src.kind === 'upload') {
      return (
        <video
          src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
          controls
          style={{ maxWidth: '100%', borderRadius: 6, background: '#000' }}
        />
      );
    }
    const embed = toEmbed(block.src.url);
    return embed ? (
      <iframe
        src={embed}
        allowFullScreen
        style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 6 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    ) : (
      <video src={block.src.url} controls style={{ maxWidth: '100%', borderRadius: 6, background: '#000' }} />
    );
  }
  if (block.type === 'quiz') {
    return <QuizView block={block} result={quizResult} onSubmit={onQuizSubmit} />;
  }
  if (block.type === 'hotspot') {
    return (
      <HotspotView
        block={block}
        lessonId={lessonId}
        viewed={hotspotViewed}
        onView={onHotspotView}
      />
    );
  }
  return null;
}

function HotspotView({
  block,
  lessonId,
  viewed,
  onView,
}: {
  block: HotspotBlock;
  lessonId: string;
  viewed: Record<string, true>;
  onView: (hotspotId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const total = block.hotspots.length;
  const seen = block.hotspots.filter((h) => viewed[h.id]).length;
  return (
    <div>
      <div
        style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
        onClick={() => setOpenId(null)}
      >
        <img
          src={`/scorm/lesson/${lessonId}/assets/${encodeURIComponent(block.src.filename)}`}
          alt=""
          style={{ maxWidth: '100%', display: 'block', borderRadius: 6 }}
        />
        {block.hotspots.map((h, i) => (
          <div key={h.id}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onView(h.id);
                setOpenId(openId === h.id ? null : h.id);
              }}
              style={{
                position: 'absolute',
                left: `${h.x}%`,
                top: `${h.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 30, height: 30, borderRadius: '50%',
                background: viewed[h.id] ? '#2ea44f' : '#0969da',
                color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                border: '2px solid #fff',
                userSelect: 'none',
              }}
            >
              {i + 1}
            </div>
            {openId === h.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  transform: 'translate(-50%, calc(-100% - 20px))',
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  padding: '12px 14px',
                  minWidth: 220,
                  maxWidth: 320,
                  zIndex: 5,
                }}
              >
                {h.title && <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{h.title}</h4>}
                <p style={{ margin: 0, fontSize: 14, color: '#333', whiteSpace: 'pre-wrap' }}>{h.body}</p>
                <button
                  onClick={() => setOpenId(null)}
                  style={{ position: 'absolute', top: 4, right: 6, border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#888' }}
                >×</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
        {seen} / {total} explored
        {block.requireAll && seen < total && ' — explore all to continue'}
      </div>
    </div>
  );
}

function QuizView({
  block,
  result,
  onSubmit,
}: {
  block: QuizBlock;
  result?: QuizResult;
  onSubmit: (r: QuizResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let correct = 0;
    for (const q of block.questions) {
      if (answers[q.id] && answers[q.id] === q.correctChoiceId) correct++;
    }
    const score = Math.round((correct / (block.questions.length || 1)) * 100);
    const passed = score >= (block.passThreshold || 0);
    onSubmit({ score, passed });
  };
  return (
    <form onSubmit={submit}>
      {block.questions.map((q, qi) => (
        <div key={q.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, margin: '10px 0' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{qi + 1}. {q.prompt}</p>
          {q.choices.map((c) => (
            <label key={c.id} style={{ display: 'block', padding: '6px 0', cursor: 'pointer' }}>
              <input
                type="radio"
                name={q.id}
                value={c.id}
                checked={answers[q.id] === c.id}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
              /> {c.text}
            </label>
          ))}
        </div>
      ))}
      <button type="submit" style={btn}>{result ? 'Resubmit' : 'Submit answers'}</button>
      {result && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginTop: 12,
            fontSize: 16,
            background: result.passed ? '#e7f7ec' : '#fbeaea',
            border: `1px solid ${result.passed ? '#2ea44f' : '#cf222e'}`,
          }}
        >
          {result.passed ? 'Passed' : 'Failed'} — {result.score}% (pass at {block.passThreshold}%)
        </div>
      )}
    </form>
  );
}

function SummaryView({
  summary,
  quizBlocks,
}: {
  summary: { score: number; status: 'passed' | 'failed' | 'completed' };
  quizBlocks: QuizBlock[];
}) {
  const pass = summary.status !== 'failed';
  return (
    <div>
      <h2>Lesson complete</h2>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: pass ? '#e7f7ec' : '#fbeaea',
          border: `1px solid ${pass ? '#2ea44f' : '#cf222e'}`,
          fontSize: 16,
        }}
      >
        {summary.status === 'failed'
          ? `You did not pass. Score: ${summary.score}%.`
          : quizBlocks.length > 0
            ? `Nice work! Score: ${summary.score}%.`
            : 'Nice work!'}
      </div>
    </div>
  );
}

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 10, width: '100%', maxWidth: 900,
  maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
  borderBottom: '1px solid #eee', background: '#fafafa',
};
const body: React.CSSProperties = { padding: 20, overflow: 'auto', flex: 1, minHeight: 240 };
const footer: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
  borderTop: '1px solid #eee', background: '#fafafa',
};
const btn: React.CSSProperties = {
  padding: '8px 16px', border: '1px solid #333', borderRadius: 6,
  background: '#333', color: '#fff', cursor: 'pointer', fontSize: 14,
};
const closeBtn: React.CSSProperties = {
  padding: '4px 10px', border: '1px solid #ccc', borderRadius: 6,
  background: '#fff', color: '#333', cursor: 'pointer', fontSize: 14,
};
