import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import QuestionComposer from '@/components/questions/QuestionComposer';

export const dynamic = 'force-dynamic';

export default async function AskPage({
  params,
}: {
  params: Promise<{ directorId: string }>;
}) {
  const { directorId } = await params;
  const supabase = await createClient();

  // ✅ 감독 존재 확인: error까지 체크 + maybeSingle로 안전하게
  const { data: director, error: directorError } = await supabase
    .from('directors')
    .select('id, name')
    .eq('id', directorId)
    .maybeSingle();

  if (directorError || !director) {
    notFound();
  }

  // ✅ 질문 저장 액션 (Server Action)
  async function submitQuestion(formData: FormData) {
    'use server';

    const raw = formData.get('body');
    const body = typeof raw === 'string' ? raw.trim() : '';

    if (!body || !body.endsWith('?')) {
      // QuestionComposer에서 잡아주면 좋지만, 서버에서도 확실히 방어
      throw new Error('질문은 반드시 물음표(?)로 끝나야 합니다.');
    }

    const supabase = await createClient(); // ✅ Next 15: await createClient()

    // ✅ 최소 스키마 insert (director_id, body만)
    const { error } = await supabase.from('questions').insert({
      director_id: directorId,
      body,
    });

    if (error) {
      // 운영에서는 로깅 툴로 보내는 게 좋음
      console.error('insert questions error:', error);
      throw new Error('질문 저장 실패');
    }

    // 감독 페이지에서 목록 새로고침(캐시)
    redirect(`/directors/${directorId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-center">
          <span className="text-zinc-500">To.</span> {director.name}
        </h1>

        <QuestionComposer action={submitQuestion} />
      </div>
    </main>
  );
}