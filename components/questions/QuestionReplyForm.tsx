'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Send, Sparkles } from 'lucide-react';

type State = {
  ok: boolean;
  error: string | null;
};

const initialState: State = { ok: false, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Send className="h-4 w-4" />
      {pending ? '등록 중…' : '등록하기'}
    </button>
  );
}

export default function QuestionReplyForm({
  action,
  cancelHref,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>;
  cancelHref: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [value, setValue] = useState('');

  const trimmedEnd = useMemo(() => value.replace(/\s+$/, ''), [value]);
  const isOkEnding = useMemo(() => trimmedEnd.endsWith('?'), [trimmedEnd]);
  const isEmpty = useMemo(() => trimmedEnd.trim().length === 0, [trimmedEnd]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="body" className="text-xs font-medium text-zinc-300">
          질문 내용
        </label>

        <textarea
          id="body"
          name="body"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="예: 이 장면을 이 순서로 배치한 이유가 무엇인가요?"
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
          required
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-zinc-600" />
            {isEmpty ? (
              <span className="text-zinc-500">마지막은 물음표(?)로 끝나야 해요.</span>
            ) : isOkEnding ? (
              <span className="text-zinc-300">등록 가능해요.</span>
            ) : (
              <span className="text-zinc-400">
                지금은 <span className="text-zinc-200">?</span>로 끝나지 않아요.
              </span>
            )}
          </div>

          <span className="text-zinc-600">{trimmedEnd.length}자</span>
        </div>
      </div>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>{state.error}</div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link
          href={cancelHref}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
        >
          취소
        </Link>

        <SubmitButton />
      </div>
    </form>
  );
}