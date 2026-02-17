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

  const diffSec = Math.floor(Math.max(0, now - then) / 1000);
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
  director: { id: string; name: string; profile_image_url: string | null } | null;
  reply_count: number;
};

function unwrapDirector(d: QuestionRow['directors']): DirectorJoin | null {
  if (!d) return null;
  return Array.isArray(d) ? (d[0] ?? null) : d;
}

async function fetchRootQuestionsForFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
            ? { id: director.id, name: director.name, profile_image_url: director.profile_image_url ?? null }
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

  const { items: baseFeed, error: baseErr } = await fetchRootQuestionsForFeed(supabase, 10);

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
      {/* HERO */}
      <section className="px-4 pt-20 pb-10 sm:pt-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
              SEQUENCE<span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 text-lg font-medium text-zinc-300 sm:text-xl">
              대답은 닫힘이고, 질문은 열림이다.
              <br />
              영화 감독을 향한 질문 플랫폼
            </p>
          </div>

          {/* ✅ 폭 넓게 */}
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-3xl">
              <DirectorSearchForm />
            </div>
          </div>
        </div>
      </section>

      {/* 최신 질문 피드 */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <MessageCircle className="h-4 w-4 text-zinc-500" />
              최신 질문 피드
            </h2>
            <p className="mt-1 text-xs text-zinc-500">루트 질문만 최신순으로 10개 보여줘요.</p>
          </div>
          <div className="text-xs text-zinc-500">{feed.length ? `${feed.length}개` : '0개'}</div>
        </div>

        {baseErr ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-300">피드를 불러오지 못했어요.</p>
            <p className="mt-2 text-xs text-zinc-500">{baseErr}</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-300">아직 질문이 없습니다.</p>
            <p className="mt-2 text-xs text-zinc-500">감독을 검색하고 첫 질문을 남겨보세요.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((item) => {
              const directorName = item.director?.name ?? 'Unknown';
              const directorImg = item.director?.profile_image_url ?? null;
              const initial = directorName?.[0] ?? '?';

              return (
                <li key={item.id}>
                  <Link
                    href={`/questions/${item.id}`}
                    className="group block h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:bg-zinc-900/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                          {directorImg ? (
                            <img
                              src={directorImg}
                              alt={`${directorName} 프로필`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-semibold text-zinc-300">
                              {initial}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <User className="h-3.5 w-3.5 text-zinc-600" />
                            <span className="truncate">{directorName}</span>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-zinc-500">
                        <Clock className="h-3.5 w-3.5 text-zinc-600" />
                        {timeAgoKorean(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-100 group-hover:text-white">
                      {item.body}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-black px-2 py-1 text-[11px] text-zinc-400">
                        <CornerDownRight className="h-3.5 w-3.5 text-zinc-600" />
                        이어묻기 {item.reply_count}
                      </span>

                      <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400">
                        열기 →
                      </span>
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