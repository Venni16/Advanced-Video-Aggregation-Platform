import { useQuery } from '@tanstack/react-query';
import { getVideos, getVideoById, searchVideos } from '../api/videos';
import { getGenres } from '../api/genres';
import { getLiveStreams } from '../api/live';

export const useVideos = (params = {}) =>
    useQuery({
        queryKey: ['videos', params],
        queryFn: () => getVideos(params),
        keepPreviousData: true,
        staleTime: 30_000,
    });

export const useVideo = (videoId) =>
    useQuery({
        queryKey: ['video', videoId],
        queryFn: () => getVideoById(videoId),
        enabled: !!videoId,
        staleTime: 60_000,
    });

export const useSearch = (params) =>
    useQuery({
        queryKey: ['search', params],
        queryFn: () => searchVideos(params),
        enabled: !!params?.q,
        keepPreviousData: true,
        staleTime: 30_000,
    });

export const useGenres = () =>
    useQuery({
        queryKey: ['genres'],
        queryFn: getGenres,
        staleTime: 120_000,
    });

export const useLiveStreams = () =>
    useQuery({
        queryKey: ['live'],
        queryFn: getLiveStreams,
        refetchInterval: 30_000,
        staleTime: 20_000,
    });
