import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured, authFetch } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const SYNC_URL = '/api/pipeline/sync';
const FETCH_URL = '/api/pipeline';
const SYNC_DELAY = 2000;
const OFFLINE_KEY = 'PIPELINE_OFFLINE_QUEUE';

export function usePipelineSync(initialNodes = [], initialEdges = []) {
  const { user, session } = useAuth();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [syncStatus, setSyncStatus] = useState('IDLE'); // IDLE | SYNCING | ERROR
  const [isLoaded, setIsLoaded] = useState(false);
  const syncTimeoutRef = useRef(null);

  // 1. Initial Hydration from Supabase (if configured & authenticated) or Backend / Local Enclave
  useEffect(() => {
    let mounted = true;

    const loadPipeline = async () => {
      if (isSupabaseConfigured && user) {
        try {
          const { data, error } = await supabase
            .from('pipeline_configs')
            .select('nodes, edges')
            .eq('user_id', user.id)
            .maybeSingle();

          if (mounted) {
            if (!error && data) {
              if (Array.isArray(data.nodes) && data.nodes.length > 0) {
                setNodes(data.nodes);
              }
              if (Array.isArray(data.edges)) {
                setEdges(data.edges);
              }
            }
            setIsLoaded(true);
          }
        } catch (err) {
          console.warn('[PipelineSync] Supabase load error:', err);
          if (mounted) {
            setSyncStatus('ERROR');
            setIsLoaded(true);
          }
        }
      } else {
        try {
          const res = await authFetch(FETCH_URL);
          if (res.ok) {
            const data = await res.json();
            if (mounted) {
              if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
                setNodes(data.nodes);
                setEdges(data.edges || []);
              }
              setIsLoaded(true);
            }
          } else {
            // Check offline localStorage fallback if server returns non-200
            const cached = localStorage.getItem(OFFLINE_KEY);
            if (cached && mounted) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed.nodes) setNodes(parsed.nodes);
                if (parsed.edges) setEdges(parsed.edges);
              } catch (e) {
                console.warn('[PipelineSync] Failed parsing cached pipeline:', e);
              }
            }
            if (mounted) {
              setSyncStatus('IDLE');
              setIsLoaded(true);
            }
          }
        } catch {
          const cached = localStorage.getItem(OFFLINE_KEY);
          if (cached && mounted) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.nodes) setNodes(parsed.nodes);
              if (parsed.edges) setEdges(parsed.edges);
            } catch (e) {
              console.warn('[PipelineSync] Failed parsing cached pipeline:', e);
            }
          }
          if (mounted) {
            setSyncStatus('IDLE');
            setIsLoaded(true);
          }
        }
      }
    };

    loadPipeline();
    return () => {
      mounted = false;
    };
  }, [user, session]);

  // 2. The Core Sync Engine: Supabase upsert or REST / Offline Fallback
  const flushToServer = useCallback(async (payload) => {
    try {
      setSyncStatus('SYNCING');

      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('pipeline_configs')
          .upsert(
            {
              user_id: user.id,
              nodes: payload.nodes,
              edges: payload.edges,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;
        localStorage.removeItem(OFFLINE_KEY);
        setSyncStatus('IDLE');
      } else {
        const res = await authFetch(SYNC_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('SYNC_REJECTED');
        localStorage.removeItem(OFFLINE_KEY);
        setSyncStatus('IDLE');
      }
    } catch (err) {
      console.error('[SYNC] Failed, queuing offline.', err);
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(payload));
      setSyncStatus('ERROR');
    }
  }, [user, session]);

  // 3. Mutation Handlers with Debounce
  const updatePipeline = useCallback(
    (newNodes, newEdges) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(() => {
        flushToServer({ nodes: newNodes, edges: newEdges });
      }, SYNC_DELAY);
    },
    [flushToServer]
  );

  // 4. Offline Recovery Loop
  useEffect(() => {
    const handleOnline = () => {
      const queued = localStorage.getItem(OFFLINE_KEY);
      if (queued) {
        flushToServer(JSON.parse(queued));
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushToServer]);

  return { nodes, edges, setNodes, setEdges, updatePipeline, syncStatus, isLoaded };
}
