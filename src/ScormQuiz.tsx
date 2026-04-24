import { useCallback, useEffect, useState } from 'react';

export type Choice = { id: string; text: string };
export type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: string;
};
export type Quiz = {
  id: string;
  title: string;
  description: string;
  passThreshold: number;
  questions: Question[];
};
type QuizSummary = Pick<Quiz, 'id' | 'title' | 'description' | 'passThreshold'> & { updatedAt: string };

export default function ScormQuiz() {
  const [list, setList] = useState<QuizSummary[]>([]);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/scorm/quiz');
      if (!res.ok) throw new Error(`list failed: ${res.status}`);
      setList(await res.json());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startNew = () => setEditing(emptyQuiz());

  const startEdit = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/scorm/quiz/${id}`);
      if (!res.ok) throw new Error(`load failed: ${res.status}`);
      setEditing(await res.json());
    } catch (e) {
      setError(String(e));
    }
  };

  const save = async (quiz: Quiz) => {
    setError(null);
    const isNew = !list.find((q) => q.id === quiz.id);
    const url = isNew ? '/scorm/quiz' : `/scorm/quiz/${quiz.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const body: any = { ...quiz };
    if (isNew) delete body.id;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    setError(null);
    try {
      const res = await fetch(`/scorm/quiz/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const exportScorm = async (q: QuizSummary) => {
    setExportingId(q.id);
    setError(null);
    try {
      const res = await fetch(`/scorm/quiz/${q.id}/export`);
      if (!res.ok) throw new Error(`export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${q.title || q.id}.zip`;
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <h3 style={{ margin: 0, marginRight: 'auto' }}>Quizzes</h3>
        {editing ? (
          <button onClick={() => setEditing(null)}>← Back to quiz list</button>
        ) : (
          <button onClick={startNew}>+ New quiz</button>
        )}
      </div>

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {editing ? (
        <QuizEditor
          key={editing.id || 'new'}
          initial={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <QuizList
          list={list}
          exportingId={exportingId}
          onEdit={startEdit}
          onDelete={remove}
          onExport={exportScorm}
        />
      )}
    </div>
  );
}

function QuizList({
  list,
  exportingId,
  onEdit,
  onDelete,
  onExport,
}: {
  list: QuizSummary[];
  exportingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (q: QuizSummary) => void;
}) {
  if (list.length === 0) {
    return <p>No quizzes yet. Click <strong>+ New quiz</strong> to create one.</p>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {list.map((q) => (
        <li key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <strong>{q.title || '(untitled)'}</strong>{' '}
          <span style={{ color: '#888' }}>— pass ≥ {q.passThreshold}%</span>
          <span style={{ float: 'right', display: 'inline-flex', gap: 8 }}>
            <button onClick={() => onEdit(q.id)}>Edit</button>
            <button onClick={() => onDelete(q.id)}>Delete</button>
            <button
              onClick={() => onExport(q)}
              disabled={exportingId === q.id}
            >
              {exportingId === q.id ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Spinner /> Exporting…
                </span>
              ) : (
                'Export SCORM'
              )}
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function QuizEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Quiz;
  onSave: (q: Quiz) => void;
  onCancel: () => void;
}) {
  const [quiz, setQuiz] = useState<Quiz>(initial);

  const setField = <K extends keyof Quiz>(k: K, v: Quiz[K]) =>
    setQuiz((prev) => ({ ...prev, [k]: v }));

  const updateQuestion = (qid: string, patch: Partial<Question>) =>
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));

  const addQuestion = () =>
    setQuiz((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));

  const removeQuestion = (qid: string) =>
    setQuiz((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== qid) }));

  const addChoice = (qid: string) =>
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid ? { ...q, choices: [...q.choices, { id: rid(), text: '' }] } : q,
      ),
    }));

  const removeChoice = (qid: string, cid: string) =>
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              choices: q.choices.filter((c) => c.id !== cid),
              correctChoiceId: q.correctChoiceId === cid ? '' : q.correctChoiceId,
            }
          : q,
      ),
    }));

  const updateChoice = (qid: string, cid: string, text: string) =>
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid
          ? { ...q, choices: q.choices.map((c) => (c.id === cid ? { ...c, text } : c)) }
          : q,
      ),
    }));

  const validate = (): string | null => {
    if (!quiz.title.trim()) return 'Title is required.';
    if (quiz.questions.length === 0) return 'Add at least one question.';
    for (const q of quiz.questions) {
      if (!q.prompt.trim()) return 'Every question needs a prompt.';
      if (q.choices.length < 2) return 'Each question needs at least 2 choices.';
      if (!q.correctChoiceId || !q.choices.find((c) => c.id === q.correctChoiceId)) {
        return 'Mark a correct choice for every question.';
      }
      if (q.choices.some((c) => !c.text.trim())) return 'Every choice needs text.';
    }
    return null;
  };

  const [localError, setLocalError] = useState<string | null>(null);
  const submit = () => {
    const err = validate();
    setLocalError(err);
    if (!err) onSave(quiz);
  };

  return (
    <div>
      {localError && <p style={{ color: 'crimson' }}>{localError}</p>}

      <div style={row}>
        <label style={label}>Title</label>
        <input
          style={input}
          value={quiz.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Quiz title"
        />
      </div>

      <div style={row}>
        <label style={label}>Description</label>
        <textarea
          style={{ ...input, minHeight: 60 }}
          value={quiz.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Optional description shown above the quiz"
        />
      </div>

      <div style={row}>
        <label style={label}>Pass threshold (%)</label>
        <input
          style={{ ...input, maxWidth: 100 }}
          type="number"
          min={0}
          max={100}
          value={quiz.passThreshold}
          onChange={(e) => setField('passThreshold', Number(e.target.value) || 0)}
        />
      </div>

      <h3 style={{ marginTop: 24 }}>Questions</h3>
      {quiz.questions.map((q, idx) => (
        <div
          key={q.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            margin: '8px 0',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <strong>Q{idx + 1}</strong>
            <button style={{ marginLeft: 'auto' }} onClick={() => removeQuestion(q.id)}>
              Remove question
            </button>
          </div>
          <input
            style={input}
            value={q.prompt}
            onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
            placeholder="Question prompt"
          />
          <div style={{ marginTop: 8 }}>
            {q.choices.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctChoiceId === c.id}
                  onChange={() => updateQuestion(q.id, { correctChoiceId: c.id })}
                  title="Mark as correct answer"
                />
                <input
                  style={{ ...input, flex: 1 }}
                  value={c.text}
                  onChange={(e) => updateChoice(q.id, c.id, e.target.value)}
                  placeholder="Choice text"
                />
                <button onClick={() => removeChoice(q.id, c.id)} disabled={q.choices.length <= 2}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={() => addChoice(q.id)} style={{ marginTop: 4 }}>
              + Add choice
            </button>
          </div>
        </div>
      ))}

      <button onClick={addQuestion} style={{ marginTop: 8 }}>+ Add question</button>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <button onClick={submit} style={{ fontWeight: 600 }}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
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

function emptyQuiz(): Quiz {
  return {
    id: '',
    title: '',
    description: '',
    passThreshold: 70,
    questions: [emptyQuestion()],
  };
}

function emptyQuestion(): Question {
  const a = rid();
  const b = rid();
  return {
    id: rid(),
    prompt: '',
    choices: [
      { id: a, text: '' },
      { id: b, text: '' },
    ],
    correctChoiceId: '',
  };
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 };
const label: React.CSSProperties = { fontSize: 13, color: '#555', fontWeight: 600 };
const input: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
};
