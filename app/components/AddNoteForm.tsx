"use client";

import { useState, useTransition } from "react";
import { addNote, signNote } from "@/lib/actions";

export default function AddNoteForm({ encounterId }: { encounterId: string }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      const result = await addNote({ encounterId, body: body.trim() });
      if (result.ok) {
        setBody("");
        setMessage("Note added");
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage(result.error.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={3}
        placeholder="Add a clinical note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={isPending}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="bg-blue-600 text-white text-sm font-medium py-1.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Add Note"}
        </button>
        {message && (
          <span className="text-sm text-green-600">{message}</span>
        )}
      </div>
    </form>
  );
}

export function SignNoteButton({
  noteId,
  signed,
}: {
  noteId: string;
  signed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (signed) {
    return (
      <span className="text-xs text-green-600 font-medium">✓ Signed</span>
    );
  }

  return (
    <button
      onClick={() => startTransition(async () => { await signNote({ id: noteId }); })}
      disabled={isPending}
      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
    >
      {isPending ? "Signing…" : "Sign"}
    </button>
  );
}
