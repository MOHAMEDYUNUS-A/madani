"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Package, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X, 
  FileText, 
  ChevronRight, 
  AlertCircle, 
  Printer, 
  Receipt,
  MapPin,
  Phone,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batch_id");

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(!!initialBatchId);

  // Form State
  const [formData, setFormData] = useState({
    generated_batch_id: initialBatchId || "",
    quantity: 100,
    material: "Standard PVC",
    lamination: "Glossy",
    delivery_recipient: "",
    delivery_phone: "",
    delivery_address: "",
    delivery_city: "",
    delivery_state: "",
    delivery_pincode: "",
    special_instructions: ""
  });

  const [formError, setFormError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = await api.getOrders();
      setOrders(list);
      if (list.length > 0 && !selectedOrder) {
        setSelectedOrder(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.createOrder({
        ...formData,
        quantity: parseInt(formData.quantity as any) || 100
      });
      setShowOrderForm(false);
      fetchOrders();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit print order.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
      case "Completed":
      case "Payment Confirmed":
      case "Approved":
        return <Badge variant="success">{status}</Badge>;
      case "Printing":
      case "Quality Check":
      case "Packed":
      case "Dispatched":
      case "Quotation Sent":
        return <Badge variant="warning">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const workflowNodes = [
    "Submitted",
    "Quotation Sent",
    "Payment Confirmed",
    "Printing",
    "Dispatched",
    "Delivered"
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fulfillment</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">PVC Physical Printing Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Submit verified batch snapshots to Madani centralized production and monitor live consignment tracking.
          </p>
        </div>

        {!showOrderForm && (
          <Button 
            onClick={() => setShowOrderForm(true)}
            className="font-bold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Print Order
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : showOrderForm ? (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" /> New Physical Print Order
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide batch verification code and destination delivery manifest.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowOrderForm(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {formError && (
              <div className="p-3 mb-5 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Generated Batch ID *
                  </label>
                  <Input 
                    type="text" 
                    name="generated_batch_id"
                    required
                    value={formData.generated_batch_id}
                    onChange={handleFormChange}
                    className="font-mono text-xs"
                    placeholder="Batch UUID from generator"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Print Quantity (Cards) *
                  </label>
                  <Input 
                    type="number" 
                    name="quantity"
                    required
                    min={10}
                    value={formData.quantity}
                    onChange={handleFormChange}
                    className="text-xs"
                    placeholder="Minimum 10 cards"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    PVC Material Style
                  </label>
                  <select
                    name="material"
                    value={formData.material}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Standard PVC</option>
                    <option>Matte Card PVC</option>
                    <option>Eco Friendly BioPVC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Lamination Finish
                  </label>
                  <select
                    name="lamination"
                    value={formData.lamination}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Glossy</option>
                    <option>Matte</option>
                    <option>None</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Consignment Delivery Address
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Recipient Name *</label>
                      <Input 
                        type="text" 
                        name="delivery_recipient"
                        required
                        value={formData.delivery_recipient}
                        onChange={handleFormChange}
                        className="text-xs"
                        placeholder="Authorized recipient"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Phone *</label>
                      <Input 
                        type="text" 
                        name="delivery_phone"
                        required
                        value={formData.delivery_phone}
                        onChange={handleFormChange}
                        className="text-xs"
                        placeholder="Mobile number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Street Address *</label>
                    <Textarea 
                      name="delivery_address"
                      required
                      rows={2}
                      value={formData.delivery_address}
                      onChange={handleFormChange}
                      className="text-xs"
                      placeholder="Street address, building, landmark..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">City *</label>
                      <Input 
                        type="text" 
                        name="delivery_city"
                        required
                        value={formData.delivery_city}
                        onChange={handleFormChange}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">State *</label>
                      <Input 
                        type="text" 
                        name="delivery_state"
                        required
                        value={formData.delivery_state}
                        onChange={handleFormChange}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Pincode *</label>
                      <Input 
                        type="text" 
                        name="delivery_pincode"
                        required
                        value={formData.delivery_pincode}
                        onChange={handleFormChange}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  type="submit"
                  className="flex-1 font-bold text-xs"
                >
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Submit to Central Production
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowOrderForm(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="font-bold text-foreground text-base mb-1">No orders submitted yet</h3>
          <p className="text-muted-foreground text-xs mb-6 max-w-sm mx-auto">
            Compile a student card PDF batch first, and then send it to physical PVC printing.
          </p>
          <Button onClick={() => setShowOrderForm(true)} className="font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Create First Order
          </Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Orders Table */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" /> Active Consignment Orders
                </CardTitle>
                <Badge variant="outline" className="text-xs">{orders.length} total</Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Quantity</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Courier Code</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr 
                      key={o.id} 
                      onClick={() => setSelectedOrder(o)}
                      className={`cursor-pointer transition-colors ${
                        selectedOrder?.id === o.id ? "bg-muted/70 font-medium" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-foreground">{o.order_id}</td>
                      <td className="p-3.5 text-muted-foreground">{o.quantity} cards</td>
                      <td className="p-3.5 text-foreground font-semibold">₹{o.price_details?.total?.toFixed(2) || "0.00"}</td>
                      <td className="p-3.5 font-mono text-muted-foreground">{o.tracking_number || "Pending dispatch"}</td>
                      <td className="p-3.5">
                        {getStatusBadge(o.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Selected Order Tracking Detail Card */}
          <div className="space-y-4">
            {selectedOrder ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Consignment Lifecycle
                  </span>
                  <CardTitle className="text-base font-bold font-mono text-foreground mt-0.5">
                    {selectedOrder.order_id}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-6">
                  {/* Workflow Timeline */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Production Pipeline
                    </span>
                    <div className="space-y-2.5 pl-3 border-l-2 border-border">
                      {workflowNodes.map((node) => {
                        const orderStatusIdx = workflowNodes.indexOf(selectedOrder.status);
                        const nodeIdx = workflowNodes.indexOf(node);
                        const completed = nodeIdx <= orderStatusIdx && selectedOrder.status !== "Cancelled";
                        const current = selectedOrder.status === node;
                        
                        return (
                          <div key={node} className="relative pl-5">
                            <span className={`absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full border ${
                              current ? "bg-primary border-primary ring-2 ring-primary/20" : completed ? "bg-emerald-500 border-emerald-500" : "bg-muted border-border"
                            }`}></span>
                            <div className={`text-xs ${completed ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                              {node} {current && <span className="text-primary font-bold ml-1">• Active</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-muted/40 border border-border/60 p-3.5 rounded-lg space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Commercial Quotation
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Print Run ({selectedOrder.quantity}):</span>
                      <span className="text-foreground font-medium">₹{selectedOrder.price_details?.subtotal || "0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Courier Freight:</span>
                      <span className="text-foreground font-medium">₹{selectedOrder.price_details?.delivery || "0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (18%):</span>
                      <span className="text-foreground font-medium">₹{selectedOrder.price_details?.tax_gst?.toFixed(2) || "0"}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                      <span>Total Invoice:</span>
                      <span className="text-primary">₹{selectedOrder.price_details?.total?.toFixed(2) || "0"}</span>
                    </div>
                  </div>

                  {/* Consignment Address */}
                  <div className="text-xs space-y-2 text-muted-foreground">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Destination Manifest
                    </div>
                    <div>Recipient: <span className="text-foreground font-medium">{selectedOrder.delivery_recipient}</span></div>
                    <div>Phone: <span className="text-foreground font-medium">{selectedOrder.delivery_phone}</span></div>
                    <div className="leading-relaxed">Address: <span className="text-foreground font-medium">{selectedOrder.delivery_address}, {selectedOrder.delivery_city}, {selectedOrder.delivery_state} - {selectedOrder.delivery_pincode}</span></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground text-xs">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                Select an order to view dispatch timeline and tracking details.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto p-12 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
