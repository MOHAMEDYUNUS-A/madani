"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Palette, 
  Layers, 
  Printer, 
  Copy, 
  Plus, 
  Sparkles, 
  LayoutTemplate,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  Building2,
  Globe2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.getTemplates();
      setTemplates(res);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const clone = await api.duplicateTemplate(templateId, " Copy");
      router.push(`/organization/designer?template_id=${clone.id}`);
    } catch (err) {
      alert("Failed to duplicate template.");
      setLoading(false);
    }
  };

  const globalTemplates = templates.filter(t => t.organization_id === null);
  const myTemplates = templates.filter(t => t.organization_id !== null);

  const categories = ["All", "School", "College", "Corporate", "Hospital", "Minimal", "Premium"];

  const filteredGlobal = categoryFilter === "All" 
    ? globalTemplates 
    : globalTemplates.filter(t => t.category === categoryFilter);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canvas Studio Assets</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">ID Card Template Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Select a verified CR80 base layout to duplicate into your organization workspace, or launch your approved layouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.push("/organization/designer")}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Blank Canvas
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section A: Organization Owned Layouts */}
          {myTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-foreground">Custom Organization Designs</h2>
                <Badge variant="secondary" className="ml-2 font-mono text-xs">{myTemplates.length}</Badge>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {myTemplates.map((t) => (
                  <Card key={t.id} className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                          {t.category || "Standard"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium capitalize">{t.orientation}</span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">{t.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Dimensions: {t.card_width} × {t.card_height} {t.unit} (CR80 Standard)
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 pb-4">
                      <div className="h-28 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-center relative overflow-hidden group">
                        <Palette className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs font-semibold text-primary flex items-center gap-1">
                            Live Canvas <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 flex gap-2">
                      <Button 
                        onClick={() => router.push(`/organization/designer?template_id=${t.id}`)}
                        className="flex-1 text-xs font-semibold"
                        variant="default"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" /> Edit Canvas
                      </Button>
                      <Button 
                        onClick={() => router.push(`/organization/generate?template_id=${t.id}`)}
                        variant="outline"
                        size="icon"
                        title="Generate Batch PDF"
                      >
                        <Printer className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section B: Global Base Designs */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-foreground">Madani Verified Master Templates</h2>
                <Badge variant="outline" className="text-xs">{filteredGlobal.length}</Badge>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={categoryFilter === c ? "default" : "outline"}
                    onClick={() => setCategoryFilter(c)}
                    className="text-xs h-8 px-3 rounded-full"
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            {filteredGlobal.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                <LayoutTemplate className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium">No system templates found matching category filter &quot;{categoryFilter}&quot;.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredGlobal.map((t) => (
                  <Card key={t.id} className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                          {t.category || "Standard"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium capitalize">{t.orientation}</span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">{t.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Production-ready vector layout with bleed guides and dynamic placeholders.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 pb-4">
                      <div className="h-28 rounded-lg bg-muted/40 border border-border/50 flex flex-col items-center justify-center p-3 text-center">
                        <Sparkles className="w-6 h-6 text-primary/60 mb-1" />
                        <span className="text-[11px] text-muted-foreground font-medium">Verified Print Specification</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button 
                        onClick={() => handleUseTemplate(t.id)}
                        variant="outline"
                        className="w-full text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> Clone into Workspace
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
