// hooks/useFavourites.ts
"use client";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { useCallback,useEffect,useState } from "react";

export function useFavourites() {
  const { user } = useAuth();
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setLoaded(true);
      return;
    }
    api.get("/students/favourites/ids")
      .then(res => setFavouriteIds(new Set(res.data.favouriteIds)))
      .catch(() => setFavouriteIds(new Set()))
      .finally(() => setLoaded(true));
  }, [user]);

  const toggleFavourite = useCallback(async (tutorId: string) => {
    if (!user || user.role !== "student") return false;
    try {
      const res = await api.post(`/students/favourites/${tutorId}`);
      setFavouriteIds(prev => {
        const next = new Set(prev);
        if (res.data.isFavourited) next.add(tutorId);
        else next.delete(tutorId);
        return next;
      });
      return res.data.isFavourited;
    } catch {
      return null;
    }
  }, [user]);

  const isFavourited = useCallback((tutorId: string) => favouriteIds.has(tutorId), [favouriteIds]);

  return { isFavourited, toggleFavourite, loaded, isStudent: user?.role === "student" };
}