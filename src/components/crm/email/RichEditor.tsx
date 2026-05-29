import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Code, Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Variable, PenLine, Undo2, Redo2,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const VARIABLES = [
  { key: "nome", label: "Nome completo" },
  { key: "primeiro_nome", label: "Primeiro nome" },
  { key: "email", label: "Email" },
  { key: "empresa", label: "Empresa" },
  { key: "cargo", label: "Cargo" },
];

const COLORS = ["#0f172a", "#475569", "#64748b", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed"];

interface Props {
  value: string;
  onChange: (html: string) => void;
  signatures?: { id: string; nome: string; corpo_html: string }[];
  placeholder?: string;
  minHeight?: number;
}

export function RichEditor({ value, onChange, signatures = [], placeholder, minHeight = 220 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder ?? "Comece a escrever…" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert max-w-none focus:outline-none px-4 py-3",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  const lastValueRef = useRef(value);
  useEffect(() => {
    if (editor && value !== lastValueRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
      lastValueRef.current = value;
    }
  }, [value, editor]);

  if (!editor) return <div className="h-48 glass-card rounded-lg animate-pulse" />;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
      <Toolbar editor={editor} signatures={signatures} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, signatures }: { editor: Editor; signatures: { id: string; nome: string; corpo_html: string }[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertLink = useCallback(() => {
    const url = window.prompt("URL do link:");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }, [editor]);

  const insertVariable = (key: string) => {
    editor.chain().focus().insertContent(`{{${key}}}`).run();
  };

  const insertSignature = (html: string) => {
    editor.chain().focus().insertContent("<p></p>" + html).run();
  };

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("email-inline-images").upload(path, file, { contentType: file.type });
    if (error) { toast({ title: "Falha no upload", description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("email-inline-images").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  };

  const Btn = ({ on, active, children, title }: any) => (
    <button type="button" title={title} onClick={on}
      className={`p-1.5 rounded hover:bg-white/10 transition-colors ${active ? "bg-white/10 text-primary" : "text-muted-foreground"}`}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-white/10 bg-white/[0.03]">
      <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><Bold className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><Italic className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado"><UnderlineIcon className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Riscado"><Strikethrough className="w-3.5 h-3.5" /></Btn>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="w-3.5 h-3.5" /></Btn>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista"><List className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação"><Quote className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Código"><Code className="w-3.5 h-3.5" /></Btn>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <Btn on={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Esquerda"><AlignLeft className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centro"><AlignCenter className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Direita"><AlignRight className="w-3.5 h-3.5" /></Btn>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <Btn on={insertLink} active={editor.isActive("link")} title="Link"><Link2 className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => fileInputRef.current?.click()} title="Imagem"><ImageIcon className="w-3.5 h-3.5" /></Btn>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-muted-foreground" title="Cor">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border-white/10 p-2 grid grid-cols-5 gap-1 w-auto">
          {COLORS.map((c) => (
            <button key={c} onClick={() => editor.chain().focus().setColor(c).run()}
              className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform" style={{ background: c }} />
          ))}
          <button onClick={() => editor.chain().focus().unsetColor().run()} className="col-span-5 text-[10px] text-muted-foreground hover:text-foreground mt-1">
            Limpar cor
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-white/10 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-xs text-muted-foreground" title="Variável">
            <Variable className="w-3.5 h-3.5" /> <span className="hidden md:inline">Variável</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border-white/10">
          {VARIABLES.map((v) => (
            <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key)} className="text-xs">
              <code className="text-primary mr-2">{`{{${v.key}}}`}</code> {v.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {signatures.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-xs text-muted-foreground" title="Assinatura">
              <PenLine className="w-3.5 h-3.5" /> <span className="hidden md:inline">Assinatura</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background border-white/10">
            {signatures.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => insertSignature(s.corpo_html)} className="text-xs">{s.nome}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex-1" />
      <Btn on={() => editor.chain().focus().undo().run()} title="Desfazer"><Undo2 className="w-3.5 h-3.5" /></Btn>
      <Btn on={() => editor.chain().focus().redo().run()} title="Refazer"><Redo2 className="w-3.5 h-3.5" /></Btn>
    </div>
  );
}
