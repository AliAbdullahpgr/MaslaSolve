import { useState, useEffect } from "react";

export function useIssues(filters?: { status?: string; category?: string; area?: string; priority?: string }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.status) params.append("status", filters.status);
        if (filters?.category) params.append("category", filters.category);
        if (filters?.area) params.append("area", filters.area);
        if (filters?.priority) params.append("priority", filters.priority);

        const res = await fetch(`/api/issues?${params}`);
        if (!res.ok) throw new Error("Failed to fetch issues");
        const data = await res.json();
        setIssues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [filters?.status, filters?.category, filters?.area, filters?.priority]);

  return { issues, loading, error, refresh: () => window.location.reload() };
}

export function useIssue(id: string) {
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchIssue = async () => {
      try {
        const res = await fetch(`/api/issues/${id}`);
        if (!res.ok) throw new Error("Failed to fetch issue");
        const data = await res.json();
        setIssue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [id]);

  return { issue, loading, error };
}

export async function createIssue(data: any) {
  const res = await fetch("/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create issue");
  return res.json();
}

export async function toggleVote(issueId: string, userId: string) {
  const res = await fetch(`/api/issues/${issueId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Failed to toggle vote");
  return res.json();
}

export async function addComment(issueId: string, body: string, authorId: string) {
  const res = await fetch(`/api/issues/${issueId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, authorId }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}
