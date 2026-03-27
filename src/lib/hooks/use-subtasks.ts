import useSWR, { mutate } from "swr";
import type { Subtask, TaskComment } from "@/lib/types";
import { fetcher, apiPost, apiDelete } from "./use-fetch";

function invalidateTask(taskId: string) {
  return mutate((key) => typeof key === "string" && key.startsWith(`/api/tasks/${taskId}`));
}

export function useSubtasks(taskId: string) {
  const key = `/api/tasks/${taskId}/subtasks`;
  const { data, isLoading, error } = useSWR<Subtask[]>(key, fetcher);

  return {
    subtasks: data ?? [],
    isLoading,
    error,

    async addSubtask(title: string): Promise<Subtask> {
      const created = await apiPost<Subtask>(key, { title });
      await invalidateTask(taskId);
      return created;
    },

    async toggleSubtask(subtaskId: string, isCompleted: boolean): Promise<void> {
      await fetch(`${key}/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      await invalidateTask(taskId);
    },

    async deleteSubtask(subtaskId: string): Promise<void> {
      await apiDelete(`${key}/${subtaskId}`);
      await invalidateTask(taskId);
    },
  };
}

export function useTaskComments(taskId: string) {
  const key = `/api/tasks/${taskId}/comments`;
  const { data, isLoading, error } = useSWR<TaskComment[]>(key, fetcher);

  return {
    comments: data ?? [],
    isLoading,
    error,

    async addComment(content: string): Promise<TaskComment> {
      const created = await apiPost<TaskComment>(key, { content });
      await invalidateTask(taskId);
      return created;
    },

    async deleteComment(commentId: string): Promise<void> {
      await apiDelete(`${key}/${commentId}`);
      await invalidateTask(taskId);
    },
  };
}
