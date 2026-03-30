import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List } from "lucide-react";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: Props) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[32px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:m-0 [&_li]:m-0",
      },
    },
  });

  // Sync external value changes (e.g., when loading data)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 border rounded-md bg-muted/30 px-1 py-0.5 w-fit">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${
            editor.isActive("bold") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${
            editor.isActive("italic") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${
            editor.isActive("bulletList") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          title="Lista con viñetas"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
