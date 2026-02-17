import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import DirectorSearchForm from '@/components/directors/DirectorSearchForm';
import { Clock, CornerDownRight, MessageCircle, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

function timeAgoKorean(iso: string | null) {
  if (!iso) return '';

  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diffMs = Math.max(0, now - then);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return '방금 전';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type DirectorJoin = {
  id: string;
  name: string;
  profile_image_url: string | null;
};

type QuestionRow = {
  id: string;
  body: string;
  created_at: string | null;
  directors: DirectorJoin | DirectorJoin[] | null;
};

type FeedItem = {
  id: string;
  body: string;
  created_at: string | null;
  director: {
    id: string;
    name: string;
    profile_image_url: string | null;
  } | null;
  reply_count: number;
};

function unwrapDirector(d: QuestionRow['directors']): DirectorJoin | null {
  if (!d) return null;
  return Array.isArray(d) ? (d[0] ?? null) : d;
}

/**
 * 규칙: 메인 피드는 "루트 질문만" 노출
 * - question_chains.child_question_id로 등장하는 질문(이어묻기 질문)은 제외
 */
async function fetchRootQuestionsForFeed(
  supabase: ReturnType<typeof createClient>,
  targetCount: number
): Promise<{ items: Omit<FeedItem, 'reply_count'>[]; error: string | null }> {
  const BATCH = 25;
  const MAX_PAGES = 12;

  const roots: Omit<FeedItem, 'reply_count'>[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES && roots.length < targetCount; page++) {
    const from = page * BATCH;
    const to = from + BATCH - 1;

    const { data: batch, error } = await supabase
      .from('questions')
      .select(
        `
          id,
          body,
          created_at,
          directors (
            id,
            name,
            profile_image_url
          )
        `
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { items: [], error: error.message };

    const rows = (batch ?? []) as unknown as QuestionRow[];
    if (rows.length === 0) break;

    const candidates = rows
      .filter((q) => q?.id && !seen.has(q.id))
      .map((q) => {
        seen.add(q.id);
        const director = unwrapDirector(q.directors);

        return {
          id: q.id,
          body: q.body,
          created_at: q.created_at,
          director: director
            ? {
                id: director.id,
                name: director.name,
                profile_image_url: director.profile_image_url ?? null,
              }
            : null,
        };
      });

    const candidateIds = candidates.map((c) => c.id);
    if (candidateIds.length === 0) continue;

    const { data: childEdges, error: childErr } = await supabase
      .from('question_chains')
      .select('child_question_id')
      .in('child_question_id', candidateIds);

    if (childErr) return { items: [], error: childErr.message };

    const childIdSet = new Set<string>((childEdges ?? []).map((e: any) => e.child_question_id));

    for (const c of candidates) {
      if (!childIdSet.has(c.id)) {
        roots.push(c);
        if (roots.length >= targetCount) break;
      }
    }

    if (rows.length < BATCH) break;
  }

  return { items: roots.slice(0, targetCount), error: null };
}

export default async function HomePage() {
  noStore();
  const supabase = await createClient();

  // 1) 루트 질문 10개 확보
  const { items: baseFeed, error: baseErr } = await fetchRootQuestionsForFeed(supabase, 10);

  // 2) 이어묻기 수 계산
  const replyCountByParent = new Map<string, number>();
  if (!baseErr && baseFeed.length > 0) {
    const ids = baseFeed.map((q) => q.id);

    const { data: edges, error: edgesErr } = await supabase
      .from('question_chains')
      .select('parent_question_id')
      .in('parent_question_id', ids);

    if (!edgesErr) {
      for (const e of edges ?? []) {
        const pid = (e as any).parent_question_id as string;
        replyCountByParent.set(pid, (replyCountByParent.get(pid) ?? 0) + 1);
      }
    }
  }

  const feed: FeedItem[] = baseFeed.map((q) => ({
    ...q,
    reply_count: replyCountByParent.get(q.id) ?? 0,
  }));

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* 상단: 로고 + 검색 (기존 유지) */}
      <header className="border-b-2 border-zinc-700 bg-black">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center border-2 border-zinc-700 bg-zinc-950 text-xl font-bold">
              S
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-50">
                Sequence
              </h1>
              <p className="mt-1 text-base text-zinc-300">
                감독에게 “질문”만 남길 수 있는 곳
              </p>
            </div>
          </div>

          <div className="mt-6">
            <DirectorSearchForm />
          </div>
        </div>
      </header>

      {/* 최신 질문 피드 */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-end justify-between gap-4 border-b-2 border-zinc-700 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
              <MessageCircle className="h-6 w-6" />
              최신 질문 피드
            </h2>
            <p className="mt-1 text-base text-zinc-300">
              루트 질문만 최신순으로 10개 보여줘요.
            </p>
          </div>

          <div className="text-base text-zinc-300">
            {feed.length ? `${feed.length}개` : '0개'}
          </div>
        </div>

        {baseErr ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">피드를 불러오지 못했어요.</p>
            <p className="mt-2 text-base">{baseErr}</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">아직 질문이 없습니다.</p>
            <p className="mt-2 text-base text-zinc-300">
              감독을 검색하고 첫 질문을 남겨보세요.
            </p>
          </div>
        ) : (
          <ul className="mt-4 border-2 border-zinc-700 bg-zinc-950 divide-y-2 divide-zinc-700">
            {feed.map((item) => {
              const directorName = item.director?.name ?? 'Unknown';
              const directorImg = item.director?.profile_image_url ?? null;
              const initial = directorName?.[0] ?? '?';

              return (
                <li key={item.id}>
                  <Link
                    href={`/questions/${item.id}`}
                    className="block p-4 hover:bg-zinc-900"
                  >
                    <div className="flex gap-4">
                      {/* 감독 이미지 */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-zinc-700 bg-zinc-900">
                        {directorImg ? (
                          <img
                            src={directorImg}
                            alt={`${directorName} 프로필`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg font-bold">
                            {initial}
                          </div>
                        )}
                      </div>

                      {/* 본문 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-zinc-300">
                          <span className="inline-flex items-center gap-2 font-semibold text-zinc-100">
                            <User className="h-5 w-5" />
                            <span className="truncate">{directorName}</span>
                          </span>

                          <span className="inline-flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {timeAgoKorean(item.created_at)}
                          </span>

                          <span className="inline-flex items-center gap-2 border border-zinc-700 bg-black px-3 py-1 font-semibold">
                            <CornerDownRight className="h-5 w-5" />
                            이어묻기 {item.reply_count}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-xl font-semibold leading-snug text-zinc-50">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}