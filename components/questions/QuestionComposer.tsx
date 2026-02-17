'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { SendHorizontal } from 'lucide-react';

// 전송 버튼 컴포넌트 (로딩 상태 처리용)
function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="absolute right-3 bottom-3 p-2 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
    >
      {pending ? (
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      ) : (
        <SendHorizontal className="w-5 h-5" />
      )}
    </button>
  );
}

export default function QuestionComposer({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [text, setText] = useState('');
  // 물음표로 끝나는지 검사
  const isValid = text.trim().length >= 5 && text.trim().endsWith('?');

  return (
    <form action={action} className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-2xl opacity-50 blur group-hover:opacity-100 transition duration-500"></div>
      <div className="relative bg-black rounded-2xl p-1">
        <textarea
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이 감독에게 무엇을 묻고 싶나요? (마지막은 반드시 ?로)"
          className="w-full h-48 bg-zinc-900/80 text-white p-6 rounded-xl resize-none outline-none placeholder:text-zinc-600 focus:bg-zinc-900 transition-colors text-lg font-light leading-relaxed"
          maxLength={100}
        />
        
        {/* 글자수 카운터 */}
        <div className="absolute left-6 bottom-5 text-xs text-zinc-600 font-mono">
          {text.length} / 100
        </div>

        {/* 전송 버튼 */}
        <SubmitButton disabled={!isValid} />
      </div>

      {!isValid && text.length > 0 && (
        <p className="mt-4 text-center text-sm text-red-500 animate-pulse">
          질문은 반드시 물음표(?)로 끝나야 합니다.
        </p>
      )}
    </form>
  );
}
