import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getTMDBProfileImageUrl } from '@/lib/external/tmdb';
import Link from 'next/link';
import { ChevronLeft, MessageCircleQuestion } from 'lucide-react';

type Props = {
  params: Promise<{ directorId: string }>; // Next.js 15: params는 Promise!
};

export default async function DirectorDetailPage({ params }: Props) {
  // 1. params에서 ID 꺼내기 (await 필수)
  const { directorId } = await params;

  // 2. Supabase 연결 (await 필수)
  const supabase = await createClient();

  // 3. 감독 정보 가져오기
  const { data: director, error } = await supabase
    .from('directors')
    .select('*')
    .eq('id', directorId)
    .single();

  // 에러 나거나 데이터 없으면 404
  if (error || !director) {
    console.error('Director fetch error:', error);
    notFound();
  }

  // 4. 질문 목록 가져오기 (최신순)
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('director_id', directorId)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-24">
      {/* 상단 네비게이션 */}
      <header className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <span className="text-sm font-medium text-zinc-500">SEQUENCE.</span>
      </header>

      {/* 감독 프로필 섹션 */}
      <section className="mb-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative mb-6 w-32 h-32 rounded-full overflow-hidden border-2 border-zinc-800 shadow-2xl">
          {director.profile_image_url ? (
            <img
              src={director.profile_image_url}
              alt={director.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600">
              No Image
            </div>
          )}
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {director.name}
        </h1>
        <p className="text-zinc-500 text-sm max-w-md mx-auto line-clamp-2">
          {/* TMDB에서 biography 가져오면 여기 넣을 수 있음 (지금은 DB에 없으니 생략) */}
          이 감독에게 남겨진 질문 {questions?.length || 0}개
        </p>
      </section>

      {/* 질문 리스트 섹션 */}
      <section className="max-w-2xl mx-auto space-y-4">
        {questions && questions.length > 0 ? (
          questions.map((q) => (
            <div
              key={q.id}
              className="group relative p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-all cursor-pointer"
            >
              <h3 className="text-lg font-medium text-zinc-200 leading-relaxed break-keep">
                "{q.body}"
              </h3>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>{new Date(q.created_at).toLocaleDateString()}</span>
                <span className="group-hover:text-white transition-colors">
                  이어 묻기 &rarr;
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
            <MessageCircleQuestion className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">아직 아무도 질문하지 않았어요.</p>
            <p className="text-zinc-600 text-sm mt-1">첫 번째 질문의 주인공이 되어보세요.</p>
          </div>
        )}
      </section>

      {/* 하단 플로팅 버튼 (질문하기) */}
      <Link
        href={`/directors/${directorId}/ask`}
        className="fixed bottom-8 right-8 bg-white text-black p-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <MessageCircleQuestion className="w-6 h-6" />
      </Link>
    </main>
  );
}
