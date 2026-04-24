import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'rte-content',
      },
    },
  });

  // Keep editor content in sync when value changes externally (e.g. loading a different lesson).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: 4,
        background: active ? '#333' : '#fff',
        color: active ? '#fff' : '#333',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  const addLink = () => {
    const url = prompt('URL (leave empty to remove link)');
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid #eee', background: '#fafafa', flexWrap: 'wrap' }}>
        {btn('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {btn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {btn('S', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
        {btn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        {btn('• List', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {btn('1. List', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        {btn('❝', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
        {btn('Link', editor.isActive('link'), addLink)}
        {btn('Clear', false, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// Inject default typography for the Tiptap editor. Scoped to .rte-content so
// it doesn't leak into the rest of the app.
const RTE_CSS = `
.rte-content {
  outline: none;
  min-height: 120px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.55;
  color: #222;
}
.rte-content p { margin: 0 0 0.6em; }
.rte-content p:last-child { margin-bottom: 0; }
.rte-content h2 { font-size: 20px; margin: 0.6em 0 0.4em; }
.rte-content h3 { font-size: 17px; margin: 0.6em 0 0.3em; }
.rte-content ul, .rte-content ol { padding-left: 1.4em; margin: 0.2em 0 0.6em; }
.rte-content li { margin: 0.15em 0; }
.rte-content blockquote {
  border-left: 3px solid #ddd;
  margin: 0.4em 0;
  padding: 0.2em 0.8em;
  color: #555;
}
.rte-content a { color: #0969da; text-decoration: underline; }
.rte-content strong { font-weight: 700; }
.rte-content em { font-style: italic; }
.rte-content code {
  background: #f4f4f4;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em;
}
.rte-content pre {
  background: #f4f4f4;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.92em;
}
/* Placeholder shown when the editor is empty. */
.rte-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #999;
  pointer-events: none;
  height: 0;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('rte-styles')) {
  const el = document.createElement('style');
  el.id = 'rte-styles';
  el.textContent = RTE_CSS;
  document.head.appendChild(el);
}
