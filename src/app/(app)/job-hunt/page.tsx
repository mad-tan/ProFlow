"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Upload,
  Search,
  FileText,
  Target,
  Mail,
  Linkedin,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useResume, useJobListings, useApplications } from "@/lib/hooks/use-job-hunt";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline">Unscored</Badge>;
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-yellow-500" :
    score >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <Badge className={`${color} text-white font-mono`}>
      {score}%
    </Badge>
  );
}

export default function JobHuntPage() {
  const { resume, isLoading: resumeLoading, uploadResume, deleteResume } = useResume();
  const { jobs, isLoading: jobsLoading, searchJobs } = useJobListings();
  const { applications } = useApplications();

  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadResume(file);
      toast.success("Resume uploaded and parsed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [uploadResume]);

  const handleSearch = useCallback(async () => {
    if (!resume) {
      toast.error("Please upload your resume first");
      return;
    }
    setSearching(true);
    try {
      const results = await searchJobs(searchQuery || undefined, searchLocation || undefined, undefined, 10);
      toast.success(`Found ${(results ?? []).length} jobs matching your profile!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to search for jobs");
    } finally {
      setSearching(false);
    }
  }, [resume, searchQuery, searchLocation, searchJobs]);

  const handleDeleteResume = useCallback(async () => {
    try {
      await deleteResume();
      toast.success("Resume deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete resume");
    }
  }, [deleteResume]);

  // Stats
  const totalJobs = jobs?.length ?? 0;
  const appliedCount = jobs?.filter(j => j.status === "applied").length ?? 0;
  const interviewCount = jobs?.filter(j => j.status === "interviewing").length ?? 0;
  const offerCount = jobs?.filter(j => j.status === "offered").length ?? 0;
  const totalApps = applications?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Hunt"
        description="AI-powered job search, application, and outreach"
        actions={
          <Link href="/job-hunt/applications">
            <Button variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Applications Pipeline
            </Button>
          </Link>
        }
      />

      {/* Resume Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Your Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumeLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ) : resume ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{resume.parsedData?.name || resume.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(Array.isArray(resume.skills) ? resume.skills : []).length} skills detected &middot; {(Array.isArray(resume.experience) ? resume.experience : []).length} experiences &middot; {(Array.isArray(resume.education) ? resume.education : []).length} education entries
                  </p>
                </div>
                <div className="flex gap-2">
                  <Label htmlFor="resume-replace" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="mr-1.5 h-3.5 w-3.5" />Replace</span>
                    </Button>
                  </Label>
                  <input id="resume-replace" type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDeleteResume}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {Array.isArray(resume.skills) && resume.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.slice(0, 15).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                  {resume.skills.length > 15 && (
                    <Badge variant="outline" className="text-xs">+{resume.skills.length - 15} more</Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Upload your resume to get started. We&apos;ll parse it with AI and match you with jobs.</p>
              <Label htmlFor="resume-upload" className="cursor-pointer">
                <Button asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? "Parsing..." : "Upload Resume (PDF)"}
                  </span>
                </Button>
              </Label>
              <input id="resume-upload" type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold">{totalJobs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold">{appliedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-2xl font-bold">{interviewCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <p className="text-2xl font-bold">{offerCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Job title, skills, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Input
              placeholder="Location (optional)"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="sm:max-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !resume}>
              {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {searching ? "Searching..." : "Find Jobs For Me"}
            </Button>
          </div>
          {!resume && (
            <p className="text-xs text-muted-foreground mt-2">Upload your resume first to enable AI job matching.</p>
          )}
        </CardContent>
      </Card>

      {/* Job Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Your Jobs ({totalJobs})
            </CardTitle>
            {totalJobs > 0 && (
              <Link href="/job-hunt/applications">
                <Button variant="ghost" size="sm">View Pipeline</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              description="Search for jobs or add them manually to start tracking."
            />
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 10).map((job) => (
                <Link key={job.id} href={`/job-hunt/jobs/${job.id}`}>
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <ScoreBadge score={job.score} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.company} &middot; {job.location || "Remote"}
                        {job.salaryRange && ` &middot; ${job.salaryRange}`}
                      </p>
                      <div className="flex items-center gap-2">
                        {(Array.isArray(job.tags) ? job.tags : []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                        <Badge variant={
                          job.status === "applied" ? "default" :
                          job.status === "interviewing" ? "secondary" :
                          job.status === "offered" ? "default" :
                          job.status === "rejected" ? "destructive" : "outline"
                        } className="text-[10px]">
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
              {totalJobs > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing 10 of {totalJobs} jobs. <Link href="/job-hunt/applications" className="text-primary underline">View all</Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {totalApps > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Saved → Applied</span>
                <span className="font-medium">{totalJobs > 0 ? Math.round((appliedCount / totalJobs) * 100) : 0}%</span>
              </div>
              <Progress value={totalJobs > 0 ? (appliedCount / totalJobs) * 100 : 0} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span>Applied → Interview</span>
                <span className="font-medium">{appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0}%</span>
              </div>
              <Progress value={appliedCount > 0 ? (interviewCount / appliedCount) * 100 : 0} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span>Interview → Offer</span>
                <span className="font-medium">{interviewCount > 0 ? Math.round((offerCount / interviewCount) * 100) : 0}%</span>
              </div>
              <Progress value={interviewCount > 0 ? (offerCount / interviewCount) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
