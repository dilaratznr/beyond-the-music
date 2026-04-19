'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

function ToolButton({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[12px] font-medium rounded-md transition-colors ${
        active
          ? 'bg-zinc-100 text-zinc-950'
          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    // Tiptap v2.5+ requires this opt-out when running in any SSR-capable
    // environment (Next.js App Router, even client components). Without it
    // the editor tries to render its initial state on the server and React
    // throws a hydration mismatch when the client mounts.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-zinc max-w-none min-h-[300px] focus:outline-none p-4 text-zinc-100',
      },
    },
  });

  if (!editor) return null;

  async function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        editor?.chain().focus().setImage({ src: data.url }).run();
      }
    };
    input.click();
  }

  function addYoutube() {
    const url = window.prompt('YouTube URL:');
    if (url) {
      editor?.commands.setYoutubeVideo({ src: url });
    }
  }

  function setLink() {
    const url = window.prompt('URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-950">
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-zinc-900/80 border-b border-zinc-800">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          B
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          I
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          U
        </ToolButton>
        <span className="w-px bg-zinc-800 mx-1 self-stretch" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          H2
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          H3
        </ToolButton>
        <span className="w-px bg-zinc-800 mx-1 self-stretch" />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          List
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          1.
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          &ldquo;
        </ToolButton>
        <span className="w-px bg-zinc-800 mx-1 self-stretch" />
        <ToolButton onClick={setLink}>Link</ToolButton>
        <ToolButton onClick={addImage}>Image</ToolButton>
        <ToolButton onClick={addYoutube}>YouTube</ToolButton>
        <span className="w-px bg-zinc-800 mx-1 self-stretch" />
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()}>Left</ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()}>Center</ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
