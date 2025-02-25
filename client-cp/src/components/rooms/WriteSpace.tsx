import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import {EditorContent, useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {Bold, Code as CodeIcon, Italic, List, Quote} from "lucide-react";
import type React from "react";
import {useEffect, useRef} from "react";
import useNotesPeer from "../../hooks/useNotesPeer";

interface WriteSpaceProps {
	roomId: string;
	token: string | null;
}

const WriteSpace = ({ roomId, token }: WriteSpaceProps) => {
	const url = import.meta.env.VITE_WS_URL || "ws://localhost:8001";
	const { content, handleContentChange } = useNotesPeer(url, roomId, token);
	const isLocalUpdate = useRef(false);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({
				placeholder: "Write your notes here...",
			}),
			CodeBlock,
			Code,
		],
		content: content,
		editorProps: {
			attributes: {
				class:
					"prose prose-invert max-w-none prose-sm font-[IBM Plex Sans] focus:outline-none custom-scrollbar",
			},
		},
		onTransaction: ({ editor }) => {
			if (isLocalUpdate.current) return;
			isLocalUpdate.current = true;
			handleContentChange(editor.getText(), editor.getHTML());
			isLocalUpdate.current = false;
		},
	});

	useEffect(() => {
		if (editor && content && !isLocalUpdate.current) {
			isLocalUpdate.current = true;
			editor.commands.setContent(content, false);
			isLocalUpdate.current = false;
		}
	}, [editor, content]);

	const MenuButton = ({
		onClick,
		isActive = false,
		children,
	}: {
		onClick: () => void;
		isActive?: boolean;
		children: React.ReactNode;
	}) => (
		<button
			type="button"
			onClick={onClick}
			className={`p-1.5 rounded hover:bg-[#353535] transition-colors
        ${isActive ? "bg-[#353535]" : "bg-transparent"}
        focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-1 focus:ring-offset-[#161616]`}
		>
			{children}
		</button>
	);

	return (
		<div className="h-full flex flex-col bg-[#161616]">
			<div className="p-4 border-b border-[#393939] flex items-center justify-between">
				<h2 className="text-sm font-medium text-[#f4f4f4]">Notes</h2>

				{/* Editor Menu */}
				<div className="flex items-center space-x-1">
					<MenuButton
						onClick={() => editor?.chain().focus().toggleBold().run()}
						isActive={editor?.isActive("bold")}
					>
						<Bold size={16} />
					</MenuButton>

					<MenuButton
						onClick={() => editor?.chain().focus().toggleItalic().run()}
						isActive={editor?.isActive("italic")}
					>
						<Italic size={16} />
					</MenuButton>

					<MenuButton
						onClick={() => editor?.chain().focus().toggleBulletList().run()}
						isActive={editor?.isActive("bulletList")}
					>
						<List size={16} />
					</MenuButton>

					<MenuButton
						onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
						isActive={editor?.isActive("codeBlock")}
					>
						<CodeIcon size={16} />
					</MenuButton>

					<MenuButton
						onClick={() => editor?.chain().focus().toggleBlockquote().run()}
						isActive={editor?.isActive("blockquote")}
					>
						<Quote size={16} />
					</MenuButton>
				</div>
			</div>

			<div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
				<EditorContent editor={editor} className="h-full text-[#f4f4f4]" />
			</div>
		</div>
	);
};

export default WriteSpace;
