"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckSquare,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChecklist } from "@/lib/hooks/use-checklists";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const checklistId = params.checklistId as string;

  const {
    checklist,
    isLoading,
    updateChecklist,
    addItem,
    toggleItem,
    deleteItem,
  } = useChecklist(checklistId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const items = checklist?.items ?? [];
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.isCompleted).length;
  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  function startEditTitle() {
    if (!checklist) return;
    setTitleValue(checklist.title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    if (!titleValue.trim()) return;
    try {
      await updateChecklist({ title: titleValue.trim() });
      setEditingTitle(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddItem() {
    if (!newItemContent.trim()) return;
    setAddingItem(true);
    try {
      await addItem({ content: newItemContent.trim() });
      setNewItemContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingItem(false);
    }
  }

  async function handleToggle(itemId: string) {
    try {
      await toggleItem(itemId);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteItem(itemId);
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-full max-w-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Checklist not found"
        description="This checklist may have been deleted."
        actionLabel="Back to Checklists"
        onAction={() => router.push("/checklists")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/checklists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="text-xl font-bold max-w-md"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <Button size="icon" variant="ghost" onClick={saveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditingTitle(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {checklist.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={startEditTitle}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {completedItems} of {totalItems} completed
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No items yet. Add your first item below.
            </p>
          ) : (
            items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    className={cn(
                      "flex items-center justify-center h-5 w-5 rounded border-2 shrink-0 transition-colors",
                      item.isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {item.isCompleted && <Check className="h-3 w-3" />}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      item.isCompleted &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {item.content}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
          )}

          {/* Add Item */}
          <div className="flex items-center gap-2 pt-3 border-t mt-3">
            <Input
              placeholder="Add a new item..."
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newItemContent.trim()) handleAddItem();
              }}
              disabled={addingItem}
            />
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={!newItemContent.trim() || addingItem}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
