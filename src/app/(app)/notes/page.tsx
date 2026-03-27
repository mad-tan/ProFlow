"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  StickyNote,
  Pin,
  PinOff,
  MoreHorizontal,
  Trash2,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNotes } from "@/lib/hooks/use-notes";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Renders text with URLs auto-linked
function LinkedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 break-all inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function NotesPage() {
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<{ id: string; title: string; content: string } | null>(null);
  const [viewNote, setViewNote] = useState<{ id: string; title: string; content: string; isPinned: boolean; createdAt: string } | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filters = {
    search: search || undefined,
    pinned: pinnedOnly ? true : undefined,
  };

  const { notes, isLoading, createNote, updateNote, deleteNote, togglePin } = useNotes(filters);

  function openCreate() {
    setFormTitle("");
    setFormContent("");
    setFormPinned(false);
    setCreateOpen(true);
  }

  function openEdit(note: { id: string; title: string; content: string }) {
    setViewNote(null);
    setEditNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
  }

  async function handleCreate() {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await createNote({
        title: formTitle.trim(),
        content: formContent.trim(),
        isPinned: formPinned,
      });
      setCreateOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editNote || !formTitle.trim()) return;
    setSubmitting(true);
    try {
      await updateNote(editNote.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
      });
      setEditNote(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Capture your thoughts and ideas"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="pinned-only"
            checked={pinnedOnly}
            onCheckedChange={setPinnedOnly}
          />
          <Label htmlFor="pinned-only" className="text-sm cursor-pointer">
            Pinned only
          </Label>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Create your first note to start capturing ideas."
          actionLabel="New Note"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={cn(
                "group relative transition-shadow hover:shadow-md cursor-pointer",
                note.isPinned && "ring-1 ring-amber-400/60"
              )}
              onClick={() => setViewNote(note)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {note.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    <h3 className="text-sm font-semibold truncate">{note.title}</h3>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(note)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => togglePin(note.id, note.isPinned)}
                        >
                          {note.isPinned ? (
                            <>
                              <PinOff className="mr-2 h-4 w-4" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="mr-2 h-4 w-4" />
                              Pin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteNote(note.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {note.content && (
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), "MMM d, yyyy")}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {note.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewNote} onOpenChange={(open) => !open && setViewNote(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              {viewNote?.isPinned && <Pin className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="truncate">{viewNote?.title}</span>
            </DialogTitle>
            {viewNote && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(viewNote.createdAt), "MMMM d, yyyy")}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {viewNote?.content ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                <LinkedText text={viewNote.content} />
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No content.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewNote) openEdit(viewNote);
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button size="sm" onClick={() => setViewNote(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="Note title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your note..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="note-pin"
                checked={formPinned}
                onCheckedChange={setFormPinned}
              />
              <Label htmlFor="note-pin" className="text-sm cursor-pointer">
                Pin this note
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formTitle.trim() || submitting}
            >
              {submitting ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editNote} onOpenChange={(open) => !open && setEditNote(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-note-title">Title</Label>
              <Input
                id="edit-note-title"
                placeholder="Note title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note-content">Content</Label>
              <Textarea
                id="edit-note-content"
                placeholder="Write your note..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditNote(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formTitle.trim() || submitting}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
