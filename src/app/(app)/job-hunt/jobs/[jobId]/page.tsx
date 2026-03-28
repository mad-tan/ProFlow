"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Mail,
  Linkedin,
  ExternalLink,
  Copy,
  Loader2,
  MapPin,
  DollarSign,
  Building,
  Target,
  Trash2,
  CheckCircle,
  Plus,
  Send,
} from "lucide-react";
import { useJobListings, useResume, useColdEmails, useLinkedInOutreaches, useApplications, useTailorResume } from "@/lib/hooks/use-job-hunt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const { resume } = useResume();
  const { jobs, updateJob, deleteJob } = useJobListings();
  const { applications, createApplication } = useApplications({ listingId: jobId });
  const { emails, createEmail, generateEmail } = useColdEmails(jobId);
  const { outreaches, createOutreach, generateMessage } = useLinkedInOutreaches(jobId);
  const { tailorForJob } = useTailorResume();

  const job = jobs?.find((j) => j.id === jobId);

  // State
  const [tailoring, setTailoring] = useState(false);
  const [tailoredData, setTailoredData] = useState<Record<string, unknown> | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatingLinkedin, setGeneratingLinkedin] = useState(false);
  const [emailForm, setEmailForm] = useState({ recipientName: "", recipientEmail: "", recipientTitle: "", subject: "", body: "", style: "formal" as const });
  const [linkedinForm, setLinkedinForm] = useState({ personName: "", personTitle: "", personUrl: "", message: "", approach: "referral" as const });

  // Actions
  const handleTailor = useCallback(async () => {
    if (!resume) { toast.error("Upload your resume first"); return; }
    setTailoring(true);
    try {
      const result = await tailorForJob({ jobId, includeCoverLetter: true });
      setTailoredData(result);
      toast.success("Resume tailored for this position!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to tailor resume");
    } finally {
      setTailoring(false);
    }
  }, [resume, jobId, tailorForJob]);

  const handleApply = useCallback(async () => {
    try {
      await createApplication({
        listingId: jobId,
        appliedVia: "direct",
        appliedAt: new Date().toISOString(),
        status: "submitted",
      });
      await updateJob(jobId, { status: "applied", appliedAt: new Date().toISOString() });
      toast.success("Marked as applied!");
      if (job?.url) window.open(job.url, "_blank");
    } catch (err) {
      console.error(err);
      toast.error("Failed to track application");
    }
  }, [jobId, job, createApplication, updateJob]);

  const handleGenerateEmail = useCallback(async () => {
    setGeneratingEmail(true);
    try {
      const result = await generateEmail({
        recipientName: emailForm.recipientName,
        recipientTitle: emailForm.recipientTitle,
        company: job?.company,
        jobTitle: job?.title,
        style: emailForm.style,
      });
      setEmailForm(f => ({ ...f, subject: result.subject, body: result.body }));
      toast.success("Email generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  }, [emailForm.recipientName, emailForm.recipientTitle, emailForm.style, job, generateEmail]);

  const handleSaveEmail = useCallback(async () => {
    try {
      await createEmail({
        listingId: jobId,
        recipientName: emailForm.recipientName,
        recipientEmail: emailForm.recipientEmail,
        recipientTitle: emailForm.recipientTitle || null,
        company: job?.company ?? "",
        subject: emailForm.subject,
        body: emailForm.body,
        status: "drafted",
      });
      toast.success("Email saved!");
      setEmailDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save email");
    }
  }, [emailForm, jobId, job, createEmail]);

  const handleOpenMailto = useCallback(() => {
    const mailto = `mailto:${emailForm.recipientEmail}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`;
    window.open(mailto);
  }, [emailForm]);

  const handleGenerateLinkedin = useCallback(async () => {
    setGeneratingLinkedin(true);
    try {
      const result = await generateMessage({
        personName: linkedinForm.personName,
        personTitle: linkedinForm.personTitle,
        company: job?.company,
        jobTitle: job?.title,
        approach: linkedinForm.approach,
      });
      setLinkedinForm(f => ({ ...f, message: result.message }));
      toast.success("Connection request drafted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate message");
    } finally {
      setGeneratingLinkedin(false);
    }
  }, [linkedinForm.personName, linkedinForm.personTitle, linkedinForm.approach, job, generateMessage]);

  const handleSaveOutreach = useCallback(async () => {
    try {
      await createOutreach({
        listingId: jobId,
        personName: linkedinForm.personName,
        personTitle: linkedinForm.personTitle || null,
        personUrl: linkedinForm.personUrl || null,
        company: job?.company ?? "",
        message: linkedinForm.message,
        status: "drafted",
      });
      toast.success("Outreach saved!");
      setLinkedinDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save outreach");
    }
  }, [linkedinForm, jobId, job, createOutreach]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteJob(jobId);
      toast.success("Job deleted");
      router.push("/job-hunt");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete job");
    }
  }, [jobId, deleteJob, router]);

  const handleStatusChange = useCallback(async (status: string) => {
    try {
      await updateJob(jobId, { status } as Record<string, unknown>);
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  }, [jobId, updateJob]);

  if (!job) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const alreadyApplied = job.status === "applied" || job.status === "interviewing" || job.status === "offered";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/job-hunt")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            {job.score !== null && (
              <Badge className={`${job.score >= 80 ? "bg-green-500" : job.score >= 60 ? "bg-yellow-500" : "bg-orange-500"} text-white font-mono`}>
                {job.score}% match
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{job.company}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || "Remote"}</span>
            {job.salaryRange && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{job.salaryRange}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={job.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offered">Offered</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {job.url && (
            <Button variant="outline" size="icon" onClick={() => window.open(job.url!, "_blank")}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3 Action Buttons */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-2 border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer" onClick={handleTailor}>
          <CardContent className="py-6 text-center">
            {tailoring ? <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-2" /> : <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />}
            <p className="font-semibold text-sm">Apply with Tailor</p>
            <p className="text-xs text-muted-foreground mt-1">AI-tailored resume + ATS optimization</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-500/20 hover:border-green-500/40 transition-colors cursor-pointer" onClick={() => setEmailDialogOpen(true)}>
          <CardContent className="py-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="font-semibold text-sm">Cold Email</p>
            <p className="text-xs text-muted-foreground mt-1">Find recruiters & send personalized emails</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-pointer" onClick={() => setLinkedinDialogOpen(true)}>
          <CardContent className="py-6 text-center">
            <Linkedin className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="font-semibold text-sm">LinkedIn Reachout</p>
            <p className="text-xs text-muted-foreground mt-1">Draft referral connection requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Tailored Resume Result */}
      {tailoredData && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Resume Tailored
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const tr = tailoredData.tailoredResume as Record<string, unknown> | undefined;
              const keywords = Array.isArray(tr?.atsKeywords) ? tr.atsKeywords as string[] : [];
              const changes = Array.isArray(tr?.changes) ? tr.changes as string[] : [];
              return (
                <>
                  {keywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">ATS Keywords Injected:</p>
                      <div className="flex flex-wrap gap-1">
                        {keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {changes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Changes Made:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {changes.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
            {tailoredData.coverLetter && (
              <div>
                <p className="text-sm font-medium mb-1">Cover Letter:</p>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">{tailoredData.coverLetter as string}</pre>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} disabled={alreadyApplied}>
                <Target className="mr-1.5 h-3.5 w-3.5" />
                {alreadyApplied ? "Already Applied" : "Mark as Applied"}
              </Button>
              {job.url && (
                <Button size="sm" variant="outline" onClick={() => window.open(job.url!, "_blank")}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Job Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Details Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emails?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn ({outreaches?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}
          {Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">•</span> {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {Array.isArray(job.scoreReasons) && job.scoreReasons.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Why This Score</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {job.scoreReasons.map((reason, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Target className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" /> {reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          {emails && emails.length > 0 ? (
            <div className="space-y-3">
              {emails.map((email) => (
                <Card key={email.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{email.recipientName} ({email.recipientEmail})</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Subject: {email.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.body}</p>
                      </div>
                      <Badge variant={email.status === "sent" ? "default" : email.status === "replied" ? "secondary" : "outline"}>
                        {email.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No emails yet. Click &quot;Cold Email&quot; above to get started.</p>
          )}
        </TabsContent>

        <TabsContent value="linkedin" className="mt-4">
          {outreaches && outreaches.length > 0 ? (
            <div className="space-y-3">
              {outreaches.map((o) => (
                <Card key={o.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.personName} {o.personTitle && `- ${o.personTitle}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">{o.message}</p>
                        {o.personUrl && (
                          <a href={o.personUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-1 inline-flex items-center gap-1">
                            View Profile <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <Badge variant={o.status === "connected" ? "default" : o.status === "replied" ? "secondary" : "outline"}>
                        {o.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No LinkedIn outreaches yet. Click &quot;LinkedIn Reachout&quot; above to get started.</p>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {applications && applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Applied via {app.appliedVia}</p>
                        <p className="text-xs text-muted-foreground">{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Not yet"}</p>
                      </div>
                      <Badge>{app.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No applications tracked yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Cold Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={(open) => { setEmailDialogOpen(open); if (!open) setEmailForm({ recipientName: "", recipientEmail: "", recipientTitle: "", subject: "", body: "", style: "formal" }); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Cold Email for {job.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient Name</Label>
                <Input placeholder="John Smith" value={emailForm.recipientName} onChange={e => setEmailForm(f => ({ ...f, recipientName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="john@company.com" value={emailForm.recipientEmail} onChange={e => setEmailForm(f => ({ ...f, recipientEmail: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input placeholder="Recruiter, Hiring Manager..." value={emailForm.recipientTitle} onChange={e => setEmailForm(f => ({ ...f, recipientTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={emailForm.style} onValueChange={v => setEmailForm(f => ({ ...f, style: v as "formal" | "casual" | "bold" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerateEmail} disabled={generatingEmail || !emailForm.recipientName}>
              {generatingEmail ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Target className="mr-1.5 h-3.5 w-3.5" />}
              Generate with AI
            </Button>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={6} value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleOpenMailto} disabled={!emailForm.recipientEmail || !emailForm.subject}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Open in Mail
            </Button>
            <Button onClick={handleSaveEmail} disabled={!emailForm.recipientName || !emailForm.recipientEmail || !emailForm.subject || !emailForm.body}>
              Save Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LinkedIn Dialog */}
      <Dialog open={linkedinDialogOpen} onOpenChange={(open) => { setLinkedinDialogOpen(open); if (!open) setLinkedinForm({ personName: "", personTitle: "", personUrl: "", message: "", approach: "referral" }); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>LinkedIn Outreach for {job.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Person Name</Label>
                <Input placeholder="Priya Sharma" value={linkedinForm.personName} onChange={e => setLinkedinForm(f => ({ ...f, personName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input placeholder="Software Engineer" value={linkedinForm.personTitle} onChange={e => setLinkedinForm(f => ({ ...f, personTitle: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LinkedIn URL (optional)</Label>
                <Input placeholder="linkedin.com/in/..." value={linkedinForm.personUrl} onChange={e => setLinkedinForm(f => ({ ...f, personUrl: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Approach</Label>
                <Select value={linkedinForm.approach} onValueChange={v => setLinkedinForm(f => ({ ...f, approach: v as "referral" | "informational" | "direct" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral Ask</SelectItem>
                    <SelectItem value="informational">Informational Chat</SelectItem>
                    <SelectItem value="direct">Direct Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerateLinkedin} disabled={generatingLinkedin || !linkedinForm.personName}>
              {generatingLinkedin ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Target className="mr-1.5 h-3.5 w-3.5" />}
              Draft with AI
            </Button>
            <div className="space-y-2">
              <Label>Connection Request Message (max 300 chars)</Label>
              <Textarea rows={3} maxLength={300} value={linkedinForm.message} onChange={e => setLinkedinForm(f => ({ ...f, message: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{linkedinForm.message.length}/300</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkedinDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(linkedinForm.message); toast.success("Message copied!"); }} disabled={!linkedinForm.message}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy Message
            </Button>
            <Button onClick={handleSaveOutreach} disabled={!linkedinForm.personName || !linkedinForm.message}>
              Save Outreach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
