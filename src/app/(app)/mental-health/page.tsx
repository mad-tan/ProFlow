"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import {
  Plus,
  Heart,
  BookOpen,
  History,
  Trash2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCheckIns,
  useJournalEntries,
} from "@/lib/hooks/use-mental-health";
import type { MoodRating, EnergyLevel, StressLevel, MentalHealthCheckIn } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MOOD_EMOJIS: { value: MoodRating; emoji: string; label: string }[] = [
  { value: 1, emoji: "\ud83d\ude22", label: "Terrible" },
  { value: 2, emoji: "\ud83d\ude1f", label: "Bad" },
  { value: 3, emoji: "\ud83d\ude10", label: "Okay" },
  { value: 4, emoji: "\ud83d\ude42", label: "Good" },
  { value: 5, emoji: "\ud83d\ude04", label: "Great" },
];

function moodToEmoji(rating: number): string {
  return MOOD_EMOJIS.find((m) => m.value === rating)?.emoji ?? "\ud83d\ude10";
}

function moodToLabel(rating: number): string {
  return MOOD_EMOJIS.find((m) => m.value === rating)?.label ?? "Okay";
}

function LevelBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 flex-1 rounded-full transition-colors",
            i < value ? color : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

/** Group check-ins by calendar date (YYYY-MM-DD), preserving insertion order. */
function groupByDate(checkIns: MentalHealthCheckIn[]): { dateLabel: string; entries: MentalHealthCheckIn[] }[] {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const map = new Map<string, MentalHealthCheckIn[]>();
  for (const ci of checkIns) {
    const key = ci.date.slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ci);
  }

  return Array.from(map.entries()).map(([key, entries]) => {
    let dateLabel: string;
    if (key === today) dateLabel = "Today";
    else if (key === yesterday) dateLabel = "Yesterday";
    else dateLabel = new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    return { dateLabel, entries };
  });
}

function formatCheckInTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type TrendDir = "improving" | "declining" | "stable";
type InsightsData = {
  summary: string;
  burnoutRisk: "low" | "moderate" | "high";
  burnoutRiskReason: string;
  patterns: { title: string; description: string; sentiment: "positive" | "negative" | "neutral" }[];
  recommendations: string[];
  moodTrend: TrendDir;
  energyTrend: TrendDir;
  stressTrend: TrendDir;
  highlights: string[];
  checkinCount: number;
  averages: { avgMood: number; avgEnergy: number; avgStress: number; count: number };
  generatedAt: string;
  aiPowered: boolean;
};

function TrendIcon({ trend }: { trend: TrendDir }) {
  if (trend === "improving") return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function BurnoutBadge({ risk }: { risk: "low" | "moderate" | "high" }) {
  if (risk === "high") return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">High Risk</Badge>;
  if (risk === "moderate") return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Moderate Risk</Badge>;
  return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Low Risk</Badge>;
}

export default function MentalHealthPage() {
  const { checkIns, isLoading: checkInsLoading, createCheckIn } = useCheckIns();
  const {
    journalEntries,
    isLoading: journalLoading,
    createJournalEntry,
    deleteJournalEntry,
  } = useJournalEntries();

  const [activeTab, setActiveTab] = usePersistedState<string>("proflow-mentalhealth-tab", "checkin");

  // Check-in form state
  const [mood, setMood] = useState<MoodRating>(3);
  const [energy, setEnergy] = useState<EnergyLevel>(3);
  const [stress, setStress] = useState<StressLevel>(3);
  const [sleepHours, setSleepHours] = useState("");
  const [notes, setNotes] = useState("");
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  // Journal dialog state
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");
  const [journalSubmitting, setJournalSubmitting] = useState(false);

  // Insights state
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayCount = (checkIns ?? []).filter((c) => c.date.slice(0, 10) === today).length;

  async function handleCheckIn() {
    setCheckInSubmitting(true);
    try {
      await createCheckIn({
        moodRating: mood,
        energyLevel: energy,
        stressLevel: stress,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        notes: notes.trim() || undefined,
      });
      // Reset
      setMood(3);
      setEnergy(3);
      setStress(3);
      setSleepHours("");
      setNotes("");
      toast.success("Check-in submitted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit check-in");
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function handleCreateJournal() {
    if (!journalContent.trim()) return;
    setJournalSubmitting(true);
    try {
      await createJournalEntry({
        title: journalTitle.trim() || undefined,
        content: journalContent.trim(),
      });
      setJournalOpen(false);
      setJournalTitle("");
      setJournalContent("");
      toast.success("Journal entry created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create journal entry");
    } finally {
      setJournalSubmitting(false);
    }
  }

  async function loadInsights() {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/mental-health/insights");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load insights");
      setInsights(json.data as InsightsData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load insights");
    } finally {
      setInsightsLoading(false);
    }
  }

  const grouped = groupByDate(checkIns ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mental Health"
        description="Track your mood, energy, and journal your thoughts"
      />

      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); if (tab === "insights" && !insights) loadInsights(); }}>
        <TabsList>
          <TabsTrigger value="checkin" className="gap-1.5">
            <Heart className="h-4 w-4" />
            Check-in
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            History
            {(checkIns ?? []).length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
                {(checkIns ?? []).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Journal
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="mt-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">How are you feeling?</CardTitle>
              <p className="text-sm text-muted-foreground">
                {todayCount === 0
                  ? "Take a moment to check in with yourself"
                  : `You've logged ${todayCount} check-in${todayCount > 1 ? "s" : ""} today — log another anytime`}
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Mood Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mood</Label>
                <div className="flex justify-center gap-3">
                  {MOOD_EMOJIS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl p-3 transition-all hover:scale-105",
                        mood === m.value
                          ? "bg-primary/10 ring-2 ring-primary scale-105"
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm font-medium">Energy Level</Label>
                  <span className="text-sm text-muted-foreground">
                    {energy}/5
                  </span>
                </div>
                <Slider
                  value={[energy]}
                  onValueChange={(v) => setEnergy(v[0] as EnergyLevel)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Exhausted</span>
                  <span>Energized</span>
                </div>
              </div>

              {/* Stress */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm font-medium">Stress Level</Label>
                  <span className="text-sm text-muted-foreground">
                    {stress}/5
                  </span>
                </div>
                <Slider
                  value={[stress]}
                  onValueChange={(v) => setStress(v[0] as StressLevel)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Relaxed</span>
                  <span>Very Stressed</span>
                </div>
              </div>

              {/* Sleep */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Hours of Sleep (optional)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="e.g., 7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  placeholder="Anything on your mind..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckIn}
                disabled={checkInSubmitting}
              >
                {checkInSubmitting ? "Submitting..." : "Submit Check-in"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {checkInsLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No check-ins yet"
              description="Submit your first check-in to start tracking your mental health."
            />
          ) : (
            <div className="space-y-8">
              {grouped.map(({ dateLabel, entries }) => (
                <div key={dateLabel}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{dateLabel}</h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {entries.length} {entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map((checkIn) => (
                      <Card key={checkIn.id} className="transition-shadow hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">{moodToEmoji(checkIn.moodRating)}</span>
                              <div>
                                <p className="text-sm font-medium">{moodToLabel(checkIn.moodRating)}</p>
                                <p className="text-xs text-muted-foreground">{formatCheckInTime(checkIn.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Energy</span>
                              <span>{checkIn.energyLevel}/5</span>
                            </div>
                            <LevelBar
                              value={checkIn.energyLevel}
                              color="bg-amber-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Stress</span>
                              <span>{checkIn.stressLevel}/5</span>
                            </div>
                            <LevelBar
                              value={checkIn.stressLevel}
                              color="bg-red-500"
                            />
                          </div>
                          {checkIn.sleepHours !== null && (
                            <p className="text-xs text-muted-foreground">
                              Sleep: {checkIn.sleepHours}h
                            </p>
                          )}
                          {checkIn.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">
                              &ldquo;{checkIn.notes}&rdquo;
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Journal Tab */}
        <TabsContent value="journal" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setJournalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </div>

          {journalLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No journal entries"
              description="Start writing to reflect on your day and track your thoughts."
              actionLabel="New Entry"
              onAction={() => setJournalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className="transition-shadow hover:shadow-md group"
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">
                            {entry.title || "Untitled Entry"}
                          </h3>
                          {entry.mood && (
                            <span className="text-lg shrink-0">
                              {moodToEmoji(entry.mood)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(entry.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 text-destructive"
                        onClick={async () => {
                          try {
                            await deleteJournalEntry(entry.id);
                            toast.success("Journal entry deleted");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to delete journal entry");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Journal Dialog */}
          <Dialog open={journalOpen} onOpenChange={(open) => { setJournalOpen(open); if (!open) { setJournalTitle(""); setJournalContent(""); } }}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>New Journal Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title (optional)</Label>
                  <Input
                    placeholder="Give your entry a title..."
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write your thoughts..."
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setJournalOpen(false)}
                  disabled={journalSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateJournal}
                  disabled={!journalContent.trim() || journalSubmitting}
                >
                  {journalSubmitting ? "Saving..." : "Save Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={loadInsights} disabled={insightsLoading}>
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", insightsLoading && "animate-spin")} />
              {insightsLoading ? "Analyzing..." : "Refresh Insights"}
            </Button>
          </div>

          {insightsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          ) : !insights ? (
            <EmptyState
              icon={Sparkles}
              title="Get AI Insights"
              description="Analyze your mental health patterns with AI-powered insights based on your check-in history."
              actionLabel="Generate Insights"
              onAction={loadInsights}
            />
          ) : (
            <div className="space-y-5 max-w-3xl">
              {/* Summary card */}
              <Card className={cn(
                "border",
                insights.burnoutRisk === "high" ? "border-red-500/30 bg-red-500/5" :
                insights.burnoutRisk === "moderate" ? "border-amber-500/30 bg-amber-500/5" :
                "border-emerald-500/30 bg-emerald-500/5"
              )}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {insights.burnoutRisk === "high" ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                      )}
                      <p className="text-sm font-semibold">Burnout Risk</p>
                    </div>
                    <BurnoutBadge risk={insights.burnoutRisk} />
                  </div>
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                  {insights.aiPowered && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI-powered analysis
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trends */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Mood", trend: insights.moodTrend, avg: insights.averages?.avgMood },
                  { label: "Energy", trend: insights.energyTrend, avg: insights.averages?.avgEnergy },
                  { label: "Stress", trend: insights.stressTrend, avg: insights.averages?.avgStress },
                ].map(({ label, trend, avg }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <TrendIcon trend={trend} />
                      </div>
                      <p className="text-xl font-bold">{avg?.toFixed(1) ?? "—"}<span className="text-xs font-normal text-muted-foreground">/5</span></p>
                      <p className="text-xs text-muted-foreground capitalize">{trend}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Patterns */}
              {insights.patterns.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Patterns Detected</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.patterns.map((p, i) => (
                      <div key={i} className={cn(
                        "rounded-lg border p-3",
                        p.sentiment === "positive" ? "border-emerald-500/20 bg-emerald-500/5" :
                        p.sentiment === "negative" ? "border-red-500/20 bg-red-500/5" :
                        "border-border bg-muted/30"
                      )}>
                        <p className="text-sm font-medium mb-1">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Highlights / Burnout factors */}
              {insights.highlights.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Key Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {insights.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground text-right">
                Based on {insights.checkinCount} check-ins · Generated {new Date(insights.generatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
