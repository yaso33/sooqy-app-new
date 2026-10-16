import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DeliveryCompany = Database["public"]["Tables"]["delivery_companies"]["Row"];
export type DeliveryCompanyInsert = Database["public"]["Tables"]["delivery_companies"]["Insert"];
export type DeliveryCompanyUpdate = Database["public"]["Tables"]["delivery_companies"]["Update"];

export type DeliveryCoverageArea = Database["public"]["Tables"]["delivery_coverage_areas"]["Row"];
export type DeliveryService = Database["public"]["Tables"]["delivery_services"]["Row"];

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type ShipmentStatusLog = Database["public"]["Tables"]["shipment_status_logs"]["Row"];
export type ShipmentTracking = Database["public"]["Tables"]["shipment_tracking"]["Row"];

export type ShipmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
  picked_up: "تم الاستلام من المتجر",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  failed: "تعذر التسليم",
  returned: "مرتجع",
};

// ---------- شركات التوصيل ----------

/** جلب جميع شركات التوصيل المعتمدة والنشطة. */
export async function fetchApprovedDeliveryCompanies(): Promise<DeliveryCompany[]> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("is_approved", true)
    .order("company_name");
  if (error) throw error;
  return data;
}

/** جلب شركة توصيل واحدة حسب المعرف. */
export async function fetchDeliveryCompanyById(id: string): Promise<DeliveryCompany | null> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** جلب شركات التوصيل الخاصة بالمستخدم الحالي (لوحة الشركة). */
export async function fetchMyDeliveryCompany(userId: string): Promise<DeliveryCompany | null> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

/** تسجيل شركة توصيل جديدة (تحت المراجعة حتى يتم اعتمادها من المشرف). */
export async function registerDeliveryCompany(
  payload: DeliveryCompanyInsert,
): Promise<DeliveryCompany> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** تحديث بيانات شركة التوصيل. */
export async function updateDeliveryCompany(
  id: string,
  payload: DeliveryCompanyUpdate,
): Promise<DeliveryCompany> {
  const { data, error } = await supabase
    .from("delivery_companies")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- مناطق التغطية والخدمات ----------

/** جلب مناطق التغطية لشركة توصيل. */
export async function fetchCoverageAreas(companyId: string): Promise<DeliveryCoverageArea[]> {
  const { data, error } = await supabase
    .from("delivery_coverage_areas")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** جلب خدمات التوصيل لشركة توصيل. */
export async function fetchDeliveryServices(companyId: string): Promise<DeliveryService[]> {
  const { data, error } = await supabase
    .from("delivery_services")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("base_price");
  if (error) throw error;
  return data;
}

// ---------- طلبات الشحن ----------

/** إنشاء طلب شحن جديد من متجر. */
export async function createShipment(payload: ShipmentInsert): Promise<Shipment> {
  const { data, error } = await supabase.from("shipments").insert(payload).select().single();
  if (error) throw error;
  return data;
}

/** جلب شحنة واحدة حسب المعرف. */
export async function fetchShipmentById(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase.from("shipments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** جلب شحنة مرتبطة بطلب. */
export async function fetchShipmentByOrderId(orderId: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .single();
  if (error) throw error;
  return data;
}

/** جلب جميع شحنات شركة توصيل (لللوحة). */
export async function fetchShipmentsByCompany(
  companyId: string,
): Promise<(Shipment & { order_id: string })[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, order:orders!inner(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** جلب الشحنات pending لشركة توصيل (طلبات جديدة تحتاج قرار). */
export async function fetchPendingShipmentsForCompany(companyId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** تحديث حالة الشحنة (تُستدعى من شركة التوصيل). */
export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
  note?: string,
): Promise<Shipment> {
  const { data, error } = await supabase
    .from("shipments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // تسجيل في سجل الحالات
  await supabase.from("shipment_status_logs").insert({
    shipment_id: id,
    status,
    note,
  });

  return data;
}

/** تحديث بيانات التتبع (GPS) للشحنة. */
export async function addTrackingPoint(
  shipmentId: string,
  lat: number,
  lng: number,
): Promise<ShipmentTracking> {
  const { data, error } = await supabase
    .from("shipment_tracking")
    .insert({ shipment_id: shipmentId, lat, lng })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** جلب نقاط تتبع الشحنة. */
export async function fetchTrackingPoints(shipmentId: string): Promise<ShipmentTracking[]> {
  const { data, error } = await supabase
    .from("shipment_tracking")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ---------- ربط الشحنة بالطلب ----------

/** ربط طلب بشحنة (تُستدعى من المتجر بعد اختيار الشركة). */
export async function linkOrderToShipment(
  orderId: string,
  shipmentId: string,
  deliveryMethod: string,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ shipment_id: shipmentId, delivery_method: deliveryMethod })
    .eq("id", orderId);
  if (error) throw error;
}

/** جلب طلب مع شحنته المرتبطة. */
export async function fetchOrderWithShipment(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, shipment:shipments(*)")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

/** جلب شحنات متجر معين (تُستدعى من لوحة المتجر). */
export async function fetchShipmentsByStore(storeId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, order:orders!inner(id, store_id, status, total, created_at, full_name, phone)")
    .eq("order.store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
