"use client";

import React, { useState, useEffect } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTimeEntries, type UpdateTimeEntryInput } from "@/lib/hooks/use-time-tracking";

interface TimeEntryFormProps {
  entry?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TimeEntryForm({ entry, open: controlledOpen, onOpenChange, trigger }: TimeEntryFormProps) {
  const [open, setOpen] = useState(false);
  const { tasks } = useTasks();
  const { createManualEntry, updateEntry } = useTimeEntries();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const setIsOpen = isControlled ? onOpenChange! : setOpen;

  const isEditing = !!entry;

  const [taskId, setTaskId] = useState(entry?.taskId || "");
  const [description, setDescription] = useState(entry?.description || "");
  const [startTime, setStartTime] = useState(entry?.startTime || "");
  const [endTime, setEndTime] = useState(entry?.endTime || "");
  const [durationMinutes, setDurationMinutes] = useState<string>(
    entry?.duration ? String(entry.duration) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setTaskId(entry.taskId || "");
      setDescription(entry.description || "");
      setStartTime(entry.startTime ? new Date(entry.startTime).toISOString().slice(0, 16) : "");
      setEndTime(entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : "");
      setDurationMinutes(entry.duration ? String(entry.duration) : "");
    }
  }, [entry]);

  const resetForm = () => {
    setTaskId("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setDurationMinutes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: any = {
        taskId,
        description,
        source: "manual",
      };

      if (startTime && endTime) {
        data.startTime = new Date(startTime).toISOString();
        data.endTime = new Date(endTime).toISOString();
        data.duration = Math.round(
          (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
        );
      } else if (startTime && durationMinutes) {
        data.startTime = new Date(startTime).toISOString();
        data.duration = parseInt(durationMinutes, 10);
        data.endTime = new Date(
          new Date(startTime).getTime() + parseInt(durationMinutes, 10) * 60000
        ).toISOString();
      }

      if (isEditing) {
        const updateData: UpdateTimeEntryInput = {
          taskId: taskId || undefined,
          description: description || undefined,
        };
        await updateEntry(entry.id, updateData);
      } else {
        await createManualEntry(data);
      }

      resetForm();
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Manual Entry
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {isEditing ? "Edit Time Entry" : "Add Manual Entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Select */}
          <div className="space-y-2">
            <Label htmlFor="task">Task</Label>
            <Select value={taskId} onValueChange={setTaskId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a task..." />
              </SelectTrigger>
              <SelectContent>
                {tasks?.map((task: any) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration (alternative) */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Or Duration (minutes)
              <span className="ml-1 text-xs text-muted-foreground">if no end time</span>
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="e.g. 45"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              disabled={!!endTime}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!taskId || !startTime || isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
