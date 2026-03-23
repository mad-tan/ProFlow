"use client";

import Link from "next/link";
import { Smile, SmilePlus, Frown, Meh, Laugh, Angry } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCheckIns } from "@/lib/hooks/use-mental-health";
import { getToday } from "@/lib/utils/dates";
import { MOOD_LABELS, ENERGY_LABELS, STRESS_LABELS } from "@/lib/utils/constants";
import type { MoodRating, EnergyLevel, StressLevel } from "@/lib/types";

const moodEmojis: Record<MoodRating, { icon: React.ElementType; color: string }> = {
  1: { icon: Angry, color: "text-red-500" },
  2: { icon: Frown, color: "text-orange-500" },
  3: { icon: Meh, color: "text-yellow-500" },
  4: { icon: Smile, color: "text-emerald-500" },
  5: { icon: Laugh, color: "text-green-500" },
};

function LevelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percent = (value / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function MoodSnapshot() {
  const today = getToday();
  const { checkIns, isLoading } = useCheckIns({ startDate: today, endDate: today });
  const todayCheckIn = checkIns?.[0];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!todayCheckIn) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <SmilePlus className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Mood Check-in</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-950/30 dark:to-purple-950/30">
              <SmilePlus className="h-7 w-7 text-pink-500" />
            </div>
            <p className="text-sm font-medium mb-1">How are you feeling?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Take a moment to check in with yourself
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/mental-health">Daily Check-in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mood = todayCheckIn.moodRating as MoodRating;
  const MoodIcon = moodEmojis[mood].icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Today&apos;s Mood</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MoodIcon className={cn("h-7 w-7", moodEmojis[mood].color)} />
          </div>
          <div>
            <p className="text-lg font-semibold">{MOOD_LABELS[mood]}</p>
            <p className="text-xs text-muted-foreground">
              {todayCheckIn.notes || "No notes added"}
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          <LevelBar
            label={`Energy - ${ENERGY_LABELS[todayCheckIn.energyLevel as EnergyLevel]}`}
            value={todayCheckIn.energyLevel}
            max={5}
            color="bg-amber-500"
          />
          <LevelBar
            label={`Stress - ${STRESS_LABELS[todayCheckIn.stressLevel as StressLevel]}`}
            value={todayCheckIn.stressLevel}
            max={5}
            color="bg-red-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}
