import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  Broadcast,
  ConnectionStatus,
  Post,
  PostMedia,
  PostWithDetails,
  Profile,
} from '../types/database';

const PAGE_SIZE = 25;

type AuthorSummary = Pick<Profile, 'id' | 'full_name' | 'email'>;
type PostPayload = RealtimePostgresChangesPayload<Post>;

interface UseRealtimeBroadcastOptions {
  slug?: string;
  broadcastId?: string;
  includeUnpublished?: boolean;
}

export function useRealtimeBroadcast({
  slug,
  broadcastId,
  includeUnpublished = false,
}: UseRealtimeBroadcastOptions) {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const authorsCacheRef = useRef>(new Map());
  const isInitialLoadedRef = useRef<boolean>(false);
  const eventBufferRef = useRef<PostPayload[]>([]);
  const lastSyncRef = useRef<string>(new Date().toISOString());

  const resolveAuthor = useCallback(async (authorId: string): Promise<AuthorSummary | null> => {
    const cached = authorsCacheRef.current.get(authorId);
    if (cached) return cached;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', authorId)
      .single();

    if (data) {
      const profile = data as AuthorSummary;
      authorsCacheRef.current.set(authorId, profile);
      return profile;
    }
    return null;
  }, []);

  const sortPosts = useCallback(
    (list: PostWithDetails[]): PostWithDetails[] => {
      return [...list].sort((a, b) => {
        const timeA = new Date(
          includeUnpublished ? a.created_at : a.published_at || a.created_at
        ).getTime();
        const timeB = new Date(
          includeUnpublished ? b.created_at : b.published_at || b.created_at
        ).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      });
    },
    [includeUnpublished]
  );

  const hydratePosts = useCallback(
    async (rawPosts: Post[]): Promise<PostWithDetails[]> => {
      if (rawPosts.length === 0) return [];

      const postIds = rawPosts.map((p) => p.id);
      const authorIds = Array.from(new Set(rawPosts.map((p) => p.author_id)));

      const missingAuthorIds = authorIds.filter((id) => !authorsCacheRef.current.has(id));
      if (missingAuthorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', missingAuthorIds);

        (profilesData || []).forEach((p) => {
          authorsCacheRef.current.set(p.id, p as AuthorSummary);
        });
      }

      const { data: mediaData } = await supabase
        .from('post_media')
        .select('*')
        .in('post_id', postIds)
        .order('sort_order', { ascending: true });

      const mediaByPost = new Map<string, PostMedia[]>();
      (mediaData || []).forEach((m) => {
        const item = m as PostMedia;
        const arr = mediaByPost.get(item.post_id) || [];
        arr.push(item);
        mediaByPost.set(item.post_id, arr);
      });

      return rawPosts.map((post) => ({
        ...post,
        author: authorsCacheRef.current.get(post.author_id) || null,
        media: mediaByPost.get(post.id) || [],
      }));
    },
    []
  );

  const applyRealtimePostEvent = useCallback(
    async (payload: PostPayload) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as Partial<Post>)?.id;
        if (deletedId) {
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        }
        return;
      }

      const incoming = payload.new as Post;
      if (!incoming || !incoming.id) return;

      const isVisible =
        incoming.deleted_at === null &&
        (includeUnpublished || incoming.status === 'published');

      if (!isVisible) {
        setPosts((prev) => prev.filter((p) => p.id !== incoming.id));
        return;
      }

      const [author, mediaRes] = await Promise.all([
        resolveAuthor(incoming.author_id),
        supabase
          .from('post_media')
          .select('*')
          .eq('post_id', incoming.id)
          .order('sort_order', { ascending: true }),
      ]);

      const hydrated: PostWithDetails = {
        ...incoming,
        author,
        media: (mediaRes.data as PostMedia[]) || [],
      };

      setPosts((prev) => {
        const map = new Map<string, PostWithDetails>();
        prev.forEach((item) => {
          if (hydrated.is_pinned && item.id !== hydrated.id && item.is_pinned) {
            map.set(item.id, { ...item, is_pinned: false });
          } else {
            map.set(item.id, item);
          }
        });

        const existing = map.get(hydrated.id);
        if (!existing || hydrated.version >= existing.version) {
          map.set(hydrated.id, hydrated);
        }

        return sortPosts(Array.from(map.values()));
      });
    },
    [includeUnpublished, resolveAuthor, sortPosts]
  );

  const syncDelta = useCallback(
    async (targetBroadcastId: string) => {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('broadcast_id', targetBroadcastId)
        .gte('updated_at', lastSyncRef.current);

      if (!includeUnpublished) {
        query = query.eq('status', 'published').is('deleted_at', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data } = await query;
      lastSyncRef.current = new Date().toISOString();

      if (data && data.length > 0) {
        const hydrated = await hydratePosts(data as Post[]);
        setPosts((prev) => {
          const map = new Map<string, PostWithDetails>(prev.map((p) => [p.id, p]));
          hydrated.forEach((h) => {
            const existing = map.get(h.id);
            if (!existing || h.version >= existing.version) {
              map.set(h.id, h);
            }
          });
          return sortPosts(Array.from(map.values()));
        });
      }
    },
    [hydratePosts, includeUnpublished, sortPosts]
  );

  useEffect(() => {
    let active = true;
    isInitialLoadedRef.current = false;
    eventBufferRef.current = [];
    setLoading(true);
    setError(null);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      let bQuery = supabase.from('broadcasts').select('*');
      if (broadcastId) {
        bQuery = bQuery.eq('id', broadcastId);
      } else if (slug) {
        bQuery = bQuery.eq('slug', slug);
      } else {
        setError('Chybí identifikátor přenosu.');
        setLoading(false);
        return;
      }

      const { data: bData, error: bError } = await bQuery.single();
      if (!active) return;

      if (bError || !bData) {
        setError('Požadovaný přenos nebyl nalezen.');
        setLoading(false);
        return;
      }

      const currentBroadcast = bData as Broadcast;
      setBroadcast(currentBroadcast);

      channel = supabase
        .channel(`broadcast-live-${currentBroadcast.id}-${includeUnpublished ? 'ed' : 'pub'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `broadcast_id=eq.${currentBroadcast.id}`,
          },
          (payload) => {
            if (!isInitialLoadedRef.current) {
              eventBufferRef.current.push(payload as PostPayload);
            } else {
              void applyRealtimePostEvent(payload as PostPayload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'broadcasts',
            filter: `id=eq.${currentBroadcast.id}`,
          },
          (payload) => {
            if (payload.new && 'id' in payload.new) {
              setBroadcast(payload.new as Broadcast);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_media',
            filter: `broadcast_id=eq.${currentBroadcast.id}`,
          },
          async (payload) => {
            const targetPostId =
              (payload.new as Partial<PostMedia>)?.post_id ||
              (payload.old as Partial<PostMedia>)?.post_id;
            if (!targetPostId) return;

            const { data: updatedMedia } = await supabase
              .from('post_media')
              .select('*')
              .eq('post_id', targetPostId)
              .order('sort_order', { ascending: true });

            setPosts((prev) =>
              prev.map((p) =>
                p.id === targetPostId ? { ...p, media: (updatedMedia as PostMedia[]) || [] } : p
              )
            );
          }
        )
        .subscribe((status) => {
          if (!active) return;
          if (status === 'SUBSCRIBED') {
            setConnectionStatus(navigator.onLine ? 'connected' : 'offline');
            if (isInitialLoadedRef.current) {
              void syncDelta(currentBroadcast.id);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('reconnecting');
          }
        });

      let postsQuery = supabase
        .from('posts')
        .select('*')
        .eq('broadcast_id', currentBroadcast.id)
        .is('deleted_at', null);

      if (!includeUnpublished) {
        postsQuery = postsQuery
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .order('id', { ascending: false });
      } else {
        postsQuery = postsQuery
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
      }

      const { data: initialPosts, error: postsError } = await postsQuery.limit(PAGE_SIZE);
      if (!active) return;

      if (postsError) {
        setError(`Chyba při načítání příspěvků: ${postsError.message}`);
        setLoading(false);
        return;
      }

      const rawList = (initialPosts as Post[]) || [];
      setHasMore(rawList.length === PAGE_SIZE);

      if (!rawList.some((p) => p.is_pinned)) {
        const { data: pinnedData } = await supabase
          .from('posts')
          .select('*')
          .eq('broadcast_id', currentBroadcast.id)
          .eq('is_pinned', true)
          .eq('status', 'published')
          .is('deleted_at', null)
          .maybeSingle();

        if (pinnedData) {
          rawList.push(pinnedData as Post);
        }
      }

      const hydratedInitial = await hydratePosts(rawList);
      if (!active) return;

      setPosts(sortPosts(hydratedInitial));
      lastSyncRef.current = new Date().toISOString();
      isInitialLoadedRef.current = true;
      setLoading(false);

      const buffered = [...eventBufferRef.current];
      eventBufferRef.current = [];
      for (const ev of buffered) {
        await applyRealtimePostEvent(ev);
      }
    };

    void init();

    const handleOnline = () => {
      setConnectionStatus('reconnecting');
      if (broadcast?.id) {
        void syncDelta(broadcast.id).then(() => setConnectionStatus('connected'));
      }
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [slug, broadcastId, includeUnpublished, applyRealtimePostEvent, hydratePosts, sortPosts, syncDelta]);

  const loadOlderPosts = async () => {
    if (!broadcast || loadingMore || !hasMore || posts.length === 0) return;

    setLoadingMore(true);
    const oldestPost = posts[posts.length - 1];
    const cursorTime = includeUnpublished
      ? oldestPost.created_at
      : oldestPost.published_at || oldestPost.created_at;

    let query = supabase
      .from('posts')
      .select('*')
      .eq('broadcast_id', broadcast.id)
      .is('deleted_at', null)
      .lt(includeUnpublished ? 'created_at' : 'published_at', cursorTime);

    if (!includeUnpublished) {
      query = query
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .order('id', { ascending: false });
    } else {
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
    }

    const { data } = await query.limit(PAGE_SIZE);
    const olderRaw = (data as Post[]) || [];
    setHasMore(olderRaw.length === PAGE_SIZE);

    if (olderRaw.length > 0) {
      const hydratedOlder = await hydratePosts(olderRaw);
      setPosts((prev) => {
        const map = new Map<string, PostWithDetails>(prev.map((p) => [p.id, p]));
        hydratedOlder.forEach((item) => {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        });
        return sortPosts(Array.from(map.values()));
      });
    }

    setLoadingMore(false);
  };

  const refreshAll = async () => {
    if (broadcast) {
      await syncDelta(broadcast.id);
    }
  };

  return {
    broadcast,
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    connectionStatus,
    loadOlderPosts,
    refreshAll,
  };
}
