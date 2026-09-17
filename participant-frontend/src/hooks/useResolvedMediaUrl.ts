import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mediaService, resolveMediaUrl } from '../services/media.service';

export function useResolvedMediaUrl(url?: string, s3Key?: string): string | null {
    const syncUrl = useMemo(() => {
        if (!url) return null;
        const u = url.trim();
        if (u.startsWith('http') || u.startsWith('blob:')) return u;
        return resolveMediaUrl(u);
    }, [url]);

    const { data: asyncUrl } = useQuery({
        queryKey: ['media-url', s3Key],
        queryFn: () => mediaService.getMediaUrl(s3Key!),
        enabled: !syncUrl && !!s3Key,
        staleTime: 5 * 60 * 1000,
    });

    return syncUrl || asyncUrl || null;
}
