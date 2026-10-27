export interface ClassItem {
  id: string;
  name: string;
  section?: string;
  description?: string;
  is_active: boolean;
  student_count: number;
  assigned_staff?: string[];
  created_at?: string;
}

export interface StaffUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  assigned_class?: string;
  roles?: string[];
}

export interface Member {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  identifier?: string;
  member_id?: string;
  admission_number?: string;
  roll_number?: string;
  class_name?: string;
  class_grade?: string;
  photo_url?: string;
  avatar_url?: string;
  phone?: string;
  blood_group?: string;
  dob?: string;
  emergency_contact?: string;
  status: "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
  rejection_reason?: string;
  created_at?: string;
}

export interface DesignProject {
  id: string;
  name?: string;
  title?: string;
  card_type?: string;
  orientation?: string;
  current_version?: number;
  status: "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED" | string;
  brief?: string;
  variations?: any[];
  created_at?: string;
}

export interface BatchSnapshot {
  id: string;
  snapshot_number: string;
  total_cards: number;
  status: string;
  created_at: string;
  missing_photo_count?: number;
  class_breakdown?: Record<string, number>;
}

export interface ProductionMetricsSummary {
  super_admin_metrics?: any;
  vendor_metrics?: any;
  organization_metrics?: {
    total_classes: number;
    total_staff: number;
    total_members: number;
    draft_members: number;
    submitted_members: number;
    approved_members: number;
    missing_photos: number;
    design_awaiting_approval: number;
    batches_approved: number;
    active_print_jobs: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")
    ? "" // Production: relative path works on any domain or reverse proxy
    : typeof window !== "undefined" && (window.location.port === "3001" || window.location.port === "8001" || window.location.href.includes(":3001"))
      ? "http://localhost:8001"
      : "http://localhost:8000";

export class APIError extends Error {
  status?: number;
  data?: any;
  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

export class TimeoutError extends APIError {
  constructor(message = "The request timed out. Please check your connectivity and try again.") {
    super(message, 408);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends APIError {
  constructor(message = "Network connection failed. Unable to reach the Madani backend service.") {
    super(message, 503);
    this.name = "NetworkError";
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

// Custom fetch wrapper to pass HttpOnly session cookies across origins (port 3000 vs 8000)
// Includes AbortController timeout and resilient fallback
async function fetchWithCredentials(input: RequestInfo | URL, init: FetchOptions = {}) {
  const { timeoutMs = 25000, retries = 1, ...restInit } = init;
  restInit.credentials = "include";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  restInit.signal = controller.signal;

  try {
    const res = await fetch(input, restInit);
    clearTimeout(timeoutId);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new TimeoutError(`Request took longer than ${Math.round(timeoutMs / 1000)}s.`);
    }

    // Port fallback retry between 8000 and 8001 in dev
    if (typeof input === "string" && input.includes("localhost:8000")) {
      const fallbackInput = input.replace("localhost:8000", "localhost:8001");
      console.warn(`Connection to port 8000 failed. Retrying fallback: ${fallbackInput}`);
      try {
        const fallbackRes = await fetch(fallbackInput, { ...restInit, signal: undefined });
        return fallbackRes;
      } catch (fallbackErr) {
        throw new NetworkError();
      }
    }

    throw new NetworkError(error.message || "Failed to establish server connection");
  }
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = "An unexpected error occurred";
    let errorData: any = null;
    try {
      errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => {
              const field = err.loc && err.loc.length > 1 ? err.loc.slice(1).join(".") : "";
              return field ? `${field}: ${err.msg}` : err.msg;
            })
            .join(", ");
        } else if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
    } catch {
      errorMessage = `Server returned HTTP ${response.status}: ${response.statusText}`;
    }
    throw new APIError(errorMessage, response.status, errorData);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

export const api = {
  // Auth
  async login(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async register(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  async getMe(token?: string) {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/me`, { headers });
    return handleResponse(res);
  },

  // Organization Settings
  async getOrganization() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization`);
    return handleResponse(res);
  },

  async getMyOrganization() {
    return this.getOrganization();
  },

  async updateOrganization(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getBranding() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/branding`);
    return handleResponse(res);
  },

  async updateBranding(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/branding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async uploadLogo(type: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/branding/logo?logo_type=${type}`, {
      method: "POST",
      body: formData
    });
    return handleResponse(res);
  },

  // Staff
  async getStaff() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/staff`);
    return handleResponse(res);
  },

  async createStaff(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateStaff(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async deleteStaff(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/staff/${id}`, {
      method: "DELETE"
    });
    return handleResponse(res);
  },

  // Members / Students
  async getMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    department_id?: string;
    class_name?: string;
    status?: string;
    has_photo?: boolean;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.search) query.append("search", params.search);
    if (params.department_id) query.append("department_id", params.department_id);
    if (params.class_name) query.append("class_name", params.class_name);
    if (params.status) query.append("status", params.status);
    if (params.has_photo !== undefined) query.append("has_photo", params.has_photo.toString());

    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members?${query.toString()}`);
    return handleResponse(res);
  },

  async createMember(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateMember(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async deleteMember(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}`, {
      method: "DELETE"
    });
    return handleResponse(res);
  },

  async uploadMemberPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}/photo`, {
      method: "POST",
      body: formData
    });
    return handleResponse(res);
  },

  async submitMember(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}/submit`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  async approveMember(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}/approve`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  async rejectMember(id: string, reason: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  async importMembers(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/import`, {
      method: "POST",
      body: formData
    });
    return handleResponse(res);
  },

  async importPhotosZip(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/photos/import`, {
      method: "POST",
      body: formData
    });
    return handleResponse(res);
  },

  async getDepartments() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/departments/list`);
    return handleResponse(res);
  },

  // Templates & Designer
  async getTemplates() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates`);
    return handleResponse(res);
  },

  async createTemplate(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getTemplateDetails(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates/${id}`);
    return handleResponse(res);
  },

  async updateTemplate(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async duplicateTemplate(id: string, suffix: string = " Copy") {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates/${id}/duplicate?name_suffix=${encodeURIComponent(suffix)}`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  async saveTemplateVersion(id: string, layoutData: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/templates/${id}/version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout_data: layoutData })
    });
    return handleResponse(res);
  },

  // PDF Generation
  async triggerGeneration(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getGenerationStatus(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/generation/${id}`);
    return handleResponse(res);
  },

  // Orders
  async getOrders() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/orders`);
    return handleResponse(res);
  },

  async createOrder(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getOrderDetails(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/orders/${id}`);
    return handleResponse(res);
  },

  async updateOrderStatusAdmin(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Public QR Verification
  async verifyCardPublic(token: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/public/verify/${token}`);
    return handleResponse(res);
  },

  // Vendors
  async getVendors() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors`);
    return handleResponse(res);
  },

  async createVendor(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getVendorDetails(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors/${id}`);
    return handleResponse(res);
  },

  async getVendorOrganizations(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors/${id}/organizations`);
    return handleResponse(res);
  },

  // AI Design Studio
  async generateDesignVariations(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/ai/design/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async chatRefineCanvas(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/ai/design/chat-refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async runQualityCheck(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/ai/design/quality-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Design Projects & Approvals
  async createDesignProject(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/design/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getDesignProjects(organizationId?: string) {
    const url = organizationId 
      ? `${API_BASE_URL}/api/design/projects?organization_id=${organizationId}`
      : `${API_BASE_URL}/api/design/projects`;
    const res = await fetchWithCredentials(url);
    return handleResponse(res);
  },

  async getDesignProject(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/design/projects/${id}`);
    return handleResponse(res);
  },

  async submitDesignProposal(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/design/projects/${id}/submit`, {
      method: "POST"
    });
    return handleResponse(res);
  },

  async reviewDesignProposal(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/design/projects/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Classes
  async getClasses(orgId?: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/classes`);
    return handleResponse(res);
  },

  async createClass(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateClass(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/classes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async deleteClass(id: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/organization/classes/${id}`, {
      method: "DELETE"
    });
    return handleResponse(res);
  },

  // Member Status Workflow & Bulk
  async bulkSubmitMembers(memberIds?: string[]) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/bulk-submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_ids: memberIds })
    });
    return handleResponse(res);
  },

  async bulkReviewMembers(payload: { member_ids?: string[]; action: "APPROVE" | "REQUEST_CHANGES"; reason?: string; class_name?: string }) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/members/bulk-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Production & Snapshots
  async createBatchSnapshot(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/batch-snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getBatchSnapshots(orgId?: string) {
    const url = orgId 
      ? `${API_BASE_URL}/api/production/batch-snapshots?organization_id=${orgId}`
      : `${API_BASE_URL}/api/production/batch-snapshots`;
    const res = await fetchWithCredentials(url);
    return handleResponse(res);
  },

  async getBatchSnapshotDetails(snapshotId: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/batch-snapshots/${snapshotId}`);
    return handleResponse(res);
  },

  async submitPrintJob(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async createPrintJob(payload: any) {
    return this.submitPrintJob(payload);
  },

  async getPrintJobs() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs`);
    return handleResponse(res);
  },

  async getPrintJobDetails(jobId: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${jobId}`);
    return handleResponse(res);
  },

  async downloadPrintJobPdf(jobId: string, filename?: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${jobId}/download-pdf`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to download print PDF." }));
      throw new Error(err.detail || "Download failed");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${jobId}_imposition_A4.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadPrintJobCsv(jobId: string, filename?: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${jobId}/download-csv`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to download student manifest CSV." }));
      throw new Error(err.detail || "Download failed");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${jobId}_manifest.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async updatePrintJobStatus(id: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async addQCCheck(jobId: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${jobId}/qc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async recordDispatch(jobId: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/jobs/${jobId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getProductionMetricsSummary() {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/production/metrics/summary`);
    return handleResponse(res);
  },

  // Invitations & Activation
  async inviteVendor(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async inviteOrganization(vendorId: string, payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/vendors/${vendorId}/organizations/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getInvitationDetails(token: string) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/invitations/${token}`);
    return handleResponse(res);
  },

  async activateVendor(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/activate-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async activateOrgAdmin(payload: any) {
    const res = await fetchWithCredentials(`${API_BASE_URL}/api/auth/activate-org-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  baseUrl: API_BASE_URL
};
