"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Printer, 
  Layers, 
  Settings2, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Package,
  Sliders,
  ArrowRight,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get("template_id");

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");
  const [loading, setLoading] = useState(true);
  
  // Imposition Configuration
  const [name, setName] = useState("A4 School Batch");
  const [paperSize, setPaperSize] = useState("A4");
  const [cardsPerPage, setCardsPerPage] = useState(8);
  const [margin, setMargin] = useState(20);
  const [gapHorizontal, setGapHorizontal] = useState(10);
  const [gapVertical, setGapVertical] = useState(10);
  const [bleed, setBleed] = useState(0);
  const [cropMarks, setCropMarks] = useState(true);
  const [layoutFormat, setLayoutFormat] = useState("duplex");
  
  // Grouping Options
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Background Job polling state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchTemplates();

    api.getDepartments()
      .then(depts => setDepartments(depts || []))
      .catch(err => console.error("Error fetching departments:", err));

    api.getMembers({ status: "APPROVED", limit: 200 })
      .then(res => {
        if (res && res.items) {
          const uniqueClasses = Array.from(
            new Set(res.items.map((m: any) => m.class_name).filter(Boolean))
          ) as string[];
          setClasses(uniqueClasses.sort());
        }
      })
      .catch(err => console.error("Error fetching unique classes:", err));

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.getTemplates();
      const myTemplates = res.filter((t: any) => t.organization_id !== null);
      setTemplates(myTemplates);
      if (myTemplates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(myTemplates[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert("Please select a template layout.");
      return;
    }

    setBatchId(null);
    setBatchStatus("Queued");
    setProgress(0);
    setPdfUrl(null);
    setErrorMsg(null);

    try {
      const tpl = templates.find(t => t.id === selectedTemplateId);
      const latestVer = tpl?.versions?.[tpl.versions.length - 1];
      
      if (!latestVer) {
        alert("Selected template has no saved canvas layout version.");
        return;
      }

      const payload = {
        template_version_id: latestVer.id,
        name,
        generation_config: {
          paper_size: paperSize,
          cards_per_page: cardsPerPage,
          margin,
          gap_horizontal: gapHorizontal,
          gap_vertical: gapVertical,
          bleed,
          crop_marks: cropMarks,
          layout_format: layoutFormat,
          group_class: selectedClass === "all" ? undefined : selectedClass,
          group_department: selectedDept === "all" ? undefined : selectedDept
        }
      };

      const batch = await api.triggerGeneration(payload);
      setBatchId(batch.id);
      setBatchStatus(batch.status);
      startPolling(batch.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger PDF sheet generation.");
      setBatchStatus("Failed");
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const batch = await api.getGenerationStatus(id);
        setBatchStatus(batch.status);
        setProgress(batch.progress);

        if (batch.status === "Completed") {
          setPdfUrl(batch.pdf_url);
          clearInterval(pollIntervalRef.current);
        } else if (batch.status === "Failed") {
          setErrorMsg(batch.error_message || "PDF compiling process crashed.");
          clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 1500);
  };

  const getFileUrl = (path: string | null) => {
    if (!path) return "";
    const isPort8001 = typeof window !== "undefined" && (window.location.port === "3001" || window.location.port === "8001" || window.location.href.includes(":3001"));
    const base = isPort8001 ? "http://localhost:8001" : "http://localhost:8000";
    return `${base}${path}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Print Preparation</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">Batch PDF Imposition Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure physical sheet imposition, cutting guides, and compile print-ready vector PDF batches.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Palette className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="font-bold text-foreground text-base mb-1">No custom organization templates available</h3>
          <p className="text-muted-foreground text-xs mb-6 max-w-sm mx-auto">
            You must copy a base template from the library or design an approved template canvas first.
          </p>
          <Button 
            onClick={() => router.push("/organization/templates")}
            className="font-semibold text-xs"
          >
            Browse Template Library
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Settings Form */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" /> Imposition & Layout Parameters
              </CardTitle>
              <CardDescription className="text-xs">
                Target media specifications for duplex printing, sheet arrangement, and cutter registration marks.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleStartGeneration} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Batch Run Label
                  </label>
                  <Input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-sm"
                    placeholder="E.g. Class of 2026 - Production Run 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Approved Template Layout
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.orientation})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Paper Sheet Size
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>A4</option>
                      <option>A3</option>
                      <option>Letter</option>
                      <option>Legal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Cards Per Page
                    </label>
                    <select
                      value={cardsPerPage}
                      onChange={(e) => setCardsPerPage(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={1}>1 Card (Single)</option>
                      <option value={4}>4 Cards</option>
                      <option value={8}>8 Cards (Standard A4 Grid)</option>
                      <option value={10}>10 Cards</option>
                      <option value={12}>12 Cards</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Margin (pt)
                    </label>
                    <Input 
                      type="number"
                      value={margin}
                      onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Horiz Gap (pt)
                    </label>
                    <Input 
                      type="number"
                      value={gapHorizontal}
                      onChange={(e) => setGapHorizontal(parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Vert Gap (pt)
                    </label>
                    <Input 
                      type="number"
                      value={gapVertical}
                      onChange={(e) => setGapVertical(parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Duplex Print Layout
                  </label>
                  <select
                    value={layoutFormat}
                    onChange={(e) => setLayoutFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="duplex">Duplex Alternating Pages (Page 1 Fronts → Page 2 Backs)</option>
                    <option value="side_by_side">Side-by-Side Imposition (Front & Back adjacent on same page)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Side-by-Side places Front and Back sides adjacent on the same sheet—ideal for manual lamination.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Filter by Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Filter by Department
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/40 border border-border/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="crop-marks-check"
                      checked={cropMarks}
                      onChange={(e) => setCropMarks(e.target.checked)}
                      className="rounded accent-primary w-4 h-4"
                    />
                    <label htmlFor="crop-marks-check" className="text-xs font-semibold text-foreground cursor-pointer">
                      Print Crop & Bleed Marks
                    </label>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Guides physical guillotine cutting</span>
                </div>

                <Button 
                  type="submit" 
                  className="w-full font-bold text-sm"
                  disabled={batchStatus === "Processing" || batchStatus === "Queued"}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {batchStatus === "Processing" || batchStatus === "Queued" 
                    ? "Compiling Vector PDF..." 
                    : "Compile Print Batch PDF"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Progress & Output Pane */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Compilation Status
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!batchStatus ? (
                <div className="text-center text-muted-foreground py-8 text-xs font-medium space-y-2">
                  <Printer className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p>No active generation job running.</p>
                  <p className="text-[11px]">Configure options and trigger compilation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-muted-foreground">Job Status:</span>
                    <Badge 
                      variant={
                        batchStatus === "Completed" ? "success" : 
                        batchStatus === "Failed" ? "destructive" : 
                        "warning"
                      }
                      className="uppercase text-[10px]"
                    >
                      {batchStatus}
                    </Badge>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        batchStatus === "Completed" ? "bg-emerald-500" :
                        batchStatus === "Failed" ? "bg-red-500" :
                        "bg-primary"
                      }`}
                      style={{ width: `${Math.max(5, progress)}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground font-mono">
                    {progress}% compiled
                  </div>

                  {batchStatus === "Completed" && pdfUrl && (
                    <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Print sheet compiled successfully</span>
                      </div>
                      
                      <Button asChild className="w-full text-xs font-bold" variant="default">
                        <a
                          href={getFileUrl(pdfUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Download Vector PDF
                        </a>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/organization/orders?batch_id=${batchId}`)}
                        className="w-full text-xs font-semibold"
                      >
                        <Package className="w-3.5 h-3.5 mr-1.5" /> Submit Physical Order
                      </Button>
                    </div>
                  )}

                  {batchStatus === "Failed" && errorMsg && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Compilation Error</div>
                        <div className="text-[11px] mt-0.5">{errorMsg}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto p-12 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}
