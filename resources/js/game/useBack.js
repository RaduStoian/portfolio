import { useRouter } from 'vue-router';

/** Browser-style Back with a town-square fallback for direct scene visits. */
export function useBack() {
    const router = useRouter();

    return () => {
        if (window.history.state?.back) router.back();
        else router.push('/play');
    };
}
