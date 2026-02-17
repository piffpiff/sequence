import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import QuestionComposer from '@/components/questions/QuestionComposer';

export const dynamic = 'force-dynamic';

type ActionState = {
  ok: boolean;
  error: string | null;
};

export default async function AskPage({
  params,
}: {
  params: Promise<{ directorId: string }>;
}) {
  const { directorId } = await params;
  const supabase = await createClient();

  // 감독 존재 확인
  const { data: director, error: directorError } = await supabase
    .from('directors')
    .select('id, name')
    .eq('id', directorId)
    .maybeSingle();

  if (directorError || !director) notFound();

  // ✅ useFormState용 Server Action 시그니처로 변경
  async function submitQuestion(prevState: ActionState, formData: FormData): Promise<ActionState> {
    'use server';

    const raw = formData.get('body');
    const body = typeof raw === 'string' ? raw.trim() : '';

    if (!body) return { ok: false, error: '질문을 입력해 주세요.' };
    if (!body.endsWith('?')) return { ok: false, error: '질문은 반드시 물음표(?)로 끝나야 합니다.' };

    const supabase = await createClient();

    const { error } = await supabase.from('questions').insert({
      director_id: directorId,
      body,
    });

    if (error) {
      console.error('insert questions error:', error);

      if (error.message?.includes('questions_must_end_with_question_mark')) {
        return { ok: false, error: '질문은 반드시 물음표(?)로 끝나야 등록돼요.' };
      }

      return { ok: false, error: '질문 저장 실패. 잠시 후 다시 시도해 주세요.' };
    }

    // 성공 시 redirect (state는 도달하지 않음)
    redirect(`/directors/${directorId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-center">
          <span className="text-zinc-500">To.</span> {director.name}
        </h1>

        {/* ✅ 이제 타입 에러 없이 컴파일됨 */}
        <QuestionComposer action={submitQuestion} />
      </div>
    </main>
  );
}