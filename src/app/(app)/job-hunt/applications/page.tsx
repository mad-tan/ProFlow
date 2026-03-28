"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Target,
  Search,
  Filter,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Trophy,
  Mail,
  Linkedin,
} from "lucide-react";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { useJobListings, useApplications, useColdEmails, useLinkedInOutreaches } from "@/lib/hooks/use-job-hunt";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  interviewing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  offered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { jobs, isLoading, updateJob } = useJobListings();
  const { emails } = useColdEmails();
  const { outreaches } = useLinkedInOutreaches();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("proflow-jh-status", "all");
  const [viewMode, setViewMode] = usePersistedState<string>("proflow-jh-view", "board");

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    let list = [...jobs];
    if (statusFilter !== "all") {
      list = list.filter(j => j.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [jobs, statusFilter, search]);

  const columns = ["saved", "applied", "interviewing", "offered", "rejected"];
  const boardData = useMemo(() => {
    const data: Record<string, typeof filteredJobs> = {};
    for (const col of columns) {
      data[col] = filteredJobs.filter(j => j.status === col);
    }
    return data;
  }, [filteredJobs]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJob(jobId, { status: newStatus } as Record<string, unknown>);
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const emailCountForJob = (jobId: string) => emails?.filter(e => e.listingId === jobId).length ?? 0;
  const outreachCountForJob = (jobId: string) => outreaches?.filter(o => o.listingId === jobId).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/job-hunt")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Application Pipeline"
          description="Track your job applications across all stages"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <div className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {columns.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Views */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-5 gap-4">
              {columns.map(c => (
                <div key={c} className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {columns.map(col => (
                <div key={col} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold">{STATUS_LABELS[col]}</h3>
                    <Badge variant="outline" className="text-xs">{boardData[col]?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px] rounded-lg bg-muted/30 p-2">
                    {(boardData[col] ?? []).map(job => (
                      <Link key={job.id} href={`/job-hunt/jobs/${job.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-3 space-y-1.5">
                            <p className="text-sm font-medium truncate">{job.title}</p>
                            <p className="text-xs text-muted-foreground">{job.company}</p>
                            {job.score !== null && (
                              <Badge className={`text-[10px] ${job.score >= 80 ? "bg-green-500" : job.score >= 60 ? "bg-yellow-500" : "bg-orange-500"} text-white`}>
                                {job.score}%
                              </Badge>
                            )}
                            <div className="flex items-center gap-1.5 pt-1">
                              {emailCountForJob(job.id) > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Mail className="h-3 w-3" />{emailCountForJob(job.id)}
                                </span>
                              )}
                              {outreachCountForJob(job.id) > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Linkedin className="h-3 w-3" />{outreachCountForJob(job.id)}
                                </span>
                              )}
                            </div>
                            {/* Mobile status change */}
                            <select
                              className="md:hidden w-full text-xs border rounded px-1 py-0.5 mt-1 bg-background"
                              value={job.status}
                              onClick={e => e.preventDefault()}
                              onChange={e => { e.preventDefault(); e.stopPropagation(); handleStatusChange(job.id, e.target.value); }}
                            >
                              {columns.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs found"
              description="Search for jobs from the Job Hunt dashboard to start tracking."
            />
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => (
                <Link key={job.id} href={`/job-hunt/jobs/${job.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        {job.score !== null && (
                          <Badge className={`text-[10px] ${job.score >= 80 ? "bg-green-500" : job.score >= 60 ? "bg-yellow-500" : "bg-orange-500"} text-white`}>
                            {job.score}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.company} &middot; {job.location || "Remote"}
                        {job.salaryRange && ` &middot; ${job.salaryRange}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {emailCountForJob(job.id) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />{emailCountForJob(job.id)}
                        </span>
                      )}
                      {outreachCountForJob(job.id) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Linkedin className="h-3.5 w-3.5" />{outreachCountForJob(job.id)}
                        </span>
                      )}
                      <Badge className={STATUS_COLORS[job.status]}>{STATUS_LABELS[job.status]}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
