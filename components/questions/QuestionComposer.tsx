'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { SendHorizontal, AlertCircle } from 'lucide-react';

type ActionState = {
  ok: boolean;
  error: string | null;
};

const initialState: ActionState = { ok: false, error: null };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="absolute right-3 bottom-3 p-2 rounded-full bg-white text-black hover:bg-zinc-200
                 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      aria-label="질문 전송"
    >
      {pending ? (
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      ) : (
        <SendHorizontal className="w-5 h-5" />
      )}
    </button>
  );
}

export default function QuestionComposer({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [text, setText] = useState('');

  const [state, formAction] = useFormState(action, initialState);

  const trimmed = useMemo(() => text.trim(), [text]);
  const isValid = trimmed.length >= 2 && trimmed.endsWith('?');

  return (
    <form action={formAction} className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-2xl opacity-50 blur group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-black rounded-2xl p-1">
        <textarea
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이 감독에게 무엇을 묻고 싶나요? (마지막은 반드시 ?로)"
          className="w-full h-48 bg-zinc-900/80 text-white p-6 rounded-xl resize-none outline-none
                     placeholder:text-zinc-600 focus:bg-zinc-900 transition-colors text-lg leading-relaxed"
          maxLength={100}
        />

        <div className="absolute left-6 bottom-5 text-xs text-zinc-600 font-mono">
          {text.length} / 100
        </div>

        <SubmitButton disabled={!isValid} />
      </div>

      {/* ✅ 1순위: 서버에서 내려준 에러 */}
      {state.error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}

      {/* ✅ 2순위: 클라이언트 즉시 검증(서버 에러 없을 때만) */}
      {!state.error && !isValid && trimmed.length > 0 ? (
        <p className="mt-4 text-center text-sm text-red-500 animate-pulse">
          질문은 반드시 물음표(?)로 끝나야 합니다.
        </p>
      ) : null}
    </form>
  );
}