// Adds sample data to the SIMPASCA API so a fresh database is not empty.
// Run: pnpm seed   (asks for a username and password, or reads SIMPASCA_USERNAME / SIMPASCA_PASSWORD)
// Safe to re-run: existing items/disasters are matched and reused, shipments and cash use fixed request keys.
import { createInterface } from "node:readline/promises";

const API = process.env.SIMPASCA_API_URL ?? "https://api.simpasca.shiddiq.dev";

const items = [
  { name: "Beras", category: "PANGAN", stock_unit: "kg", initial_stock: 5500, need_ratio: 0.5, need_type: "HARIAN", ratio_basis: "orang/hari", expiration_date: "2027-03-01" },
  { name: "Air mineral", category: "PANGAN", stock_unit: "liter", initial_stock: 8000, need_ratio: 2.5, need_type: "HARIAN", ratio_basis: "orang/hari", expiration_date: "2027-06-30" },
  { name: "Mie instan", category: "PANGAN", stock_unit: "dus", initial_stock: 8, need_ratio: null, need_type: null, ratio_basis: null, expiration_date: "2026-10-01" },
  { name: "Selimut", category: "SANDANG", stock_unit: "buah", initial_stock: 400, need_ratio: 1, need_type: "SATU_KALI", ratio_basis: "orang", expiration_date: null },
  { name: "Pakaian layak pakai", category: "SANDANG", stock_unit: "paket", initial_stock: 150, need_ratio: 0.5, need_type: "SATU_KALI", ratio_basis: "orang", expiration_date: null },
  { name: "Tenda keluarga", category: "PAPAN", stock_unit: "unit", initial_stock: 33, need_ratio: 0.05, need_type: "SATU_KALI", ratio_basis: "orang", expiration_date: null },
  { name: "Matras", category: "PAPAN", stock_unit: "unit", initial_stock: 56, need_ratio: 0.2, need_type: "SATU_KALI", ratio_basis: "orang", expiration_date: null },
  { name: "Terpal", category: "PAPAN", stock_unit: "lembar", initial_stock: 120, need_ratio: 0.1, need_type: "SATU_KALI", ratio_basis: "orang", expiration_date: null },
  { name: "Peralatan dapur", category: "LOGISTIK_LAINNYA", stock_unit: "paket", initial_stock: 15, need_ratio: null, need_type: null, ratio_basis: null, expiration_date: null },
  { name: "Perlengkapan kebersihan", category: "LOGISTIK_LAINNYA", stock_unit: "paket", initial_stock: 40, need_ratio: null, need_type: null, ratio_basis: null, expiration_date: null },
];

const disasters = [
  { key: "bandung", disaster_type: "Banjir", province: "Jawa Barat", regency_city: "Kab. Bandung", latitude: "-7.0253000", longitude: "107.5198000", location_details: "Kec. Dayeuhkolot, bantaran Citarum", status: "AKTIF", handling_scale: "PROVINSI", occurred_at: "2026-11-16T08:30:00+07:00", affected_people: 250, affected_households: 65, impact_notes: "Hujan lebat menyebabkan Sungai Citarum meluap. Permukiman di Kecamatan Dayeuhkolot tergenang dan warga memerlukan bantuan pangan serta tempat tinggal sementara." },
  { key: "agam", disaster_type: "Tanah longsor", province: "Sumatera Barat", regency_city: "Kab. Agam", latitude: "-0.2500000", longitude: "100.1700000", location_details: "Kec. Palembayan", status: "AKTIF", handling_scale: "KABUPATEN_KOTA", occurred_at: "2026-11-09T16:10:00+07:00", affected_people: 320, affected_households: 80, impact_notes: "Akses jalan kabupaten tertutup material longsor; 12 rumah rusak berat." },
  { key: "demak", disaster_type: "Banjir", province: "Jawa Tengah", regency_city: "Kab. Demak", latitude: "-6.8940000", longitude: "110.6380000", location_details: "Kec. Karanganyar", status: "AKTIF", handling_scale: "KABUPATEN_KOTA", occurred_at: "2026-10-24T21:00:00+07:00", affected_people: 410, affected_households: 102, impact_notes: "Tanggul Sungai Wulan jebol di dua titik." },
  { key: "cianjur", disaster_type: "Gempa bumi", province: "Jawa Barat", regency_city: "Kab. Cianjur", latitude: "-6.8160000", longitude: "107.1420000", location_details: "Kec. Cugenang", status: "SELESAI", handling_scale: "NASIONAL", occurred_at: "2026-10-05T13:21:00+07:00", affected_people: 280, affected_households: 70, impact_notes: "Kerusakan rumah warga dan fasilitas umum." },
  { key: "bogor", disaster_type: "Angin kencang", province: "Jawa Barat", regency_city: "Kab. Bogor", latitude: "-6.4810000", longitude: "106.8540000", location_details: "Kec. Cibinong", status: "SELESAI", handling_scale: "KABUPATEN_KOTA", occurred_at: "2026-09-12T15:45:00+07:00", affected_people: 90, affected_households: 22, impact_notes: "Atap rumah warga rusak ringan." },
  { key: "palembang", disaster_type: "Banjir", province: "Sumatera Selatan", regency_city: "Kota Palembang", latitude: null, longitude: null, location_details: "Kec. Seberang Ulu I", status: "AKTIF", handling_scale: "KABUPATEN_KOTA", occurred_at: "2026-08-02T05:20:00+07:00", affected_people: 300, affected_households: 75, impact_notes: "Genangan setinggi 60 cm di permukiman bantaran sungai." },
  { key: "banjarnegara", disaster_type: "Tanah longsor", province: "Jawa Tengah", regency_city: "Kab. Banjarnegara", latitude: "-7.3670000", longitude: "109.7000000", location_details: "Kec. Pejawaran", status: "SELESAI", handling_scale: "PROVINSI", occurred_at: "2026-07-28T02:40:00+07:00", affected_people: 200, affected_households: 50, impact_notes: "Warga di lereng bukit dievakuasi ke balai desa." },
  { key: "lombok", disaster_type: "Gempa bumi", province: "Nusa Tenggara Barat", regency_city: "Kab. Lombok Utara", latitude: "-8.3600000", longitude: "116.2100000", location_details: "Kec. Tanjung", status: "SELESAI", handling_scale: "PROVINSI", occurred_at: "2026-06-14T10:05:00+07:00", affected_people: 520, affected_households: 130, impact_notes: "Gempa M5,8; puluhan rumah retak dan warga mengungsi sementara." },
];

// Quantities stay within the opening stock above, so every shipment is valid.
const shipments = [
  { request_key: "seed-dst-1", disaster: "bandung", shipped: "2026-11-17", received: null, destination: "Posko Dayeuhkolot", person_in_charge: "Budi Santoso", items: { Beras: 1000, "Air mineral": 2000, "Tenda keluarga": 15, "Peralatan dapur": 5 } },
  { request_key: "seed-dst-2", disaster: "agam", shipped: "2026-11-11", received: null, destination: "Posko Palembayan", person_in_charge: "Andi Saputra", items: { "Air mineral": 1500, Matras: 40, Terpal: 30 } },
  { request_key: "seed-dst-3", disaster: "demak", shipped: "2026-10-26", received: "2026-10-28", destination: "Balai Desa Karanganyar", person_in_charge: "Dewi Lestari", items: { Beras: 1500, Selimut: 150, "Perlengkapan kebersihan": 20 } },
  { request_key: "seed-dst-4", disaster: "cianjur", shipped: "2026-10-07", received: "2026-10-09", destination: "Posko Cugenang", person_in_charge: "Rina Anggraini", items: { "Tenda keluarga": 10, Selimut: 120, "Pakaian layak pakai": 60 } },
];

const cash = [
  { request_key: "seed-kas-1", type: "income", amount: "50000000.00", description: "Dana siap pakai BNPB", transaction_date: "2026-11-01" },
  { request_key: "seed-kas-2", type: "expense", amount: "12500000.00", description: "Pembelian beras 1.000 kg", transaction_date: "2026-11-03" },
  { request_key: "seed-kas-3", type: "expense", amount: "3200000.00", description: "Pembelian terpal dan matras", transaction_date: "2026-11-10" },
  { request_key: "seed-kas-4", type: "income", amount: "15000000.00", description: "Donasi masyarakat", transaction_date: "2026-11-12" },
  { request_key: "seed-kas-5", type: "expense", amount: "4750000.00", description: "Sewa truk distribusi ke Dayeuhkolot", transaction_date: "2026-11-17" },
];

// --- API helpers -------------------------------------------------------------

let token;
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status}: ${json?.message ?? "gagal"}`);
    error.status = res.status;
    throw error;
  }
  return json?.data;
}
async function listAll(path) {
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}${path}?page=${page}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    const { data, meta } = await res.json();
    rows.push(...data);
    if (page >= meta.total_pages) return rows;
  }
}
const atWib = (date) => `${date}T00:00:00+07:00`;

// --- Run ---------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });
const username = process.env.SIMPASCA_USERNAME ?? (await rl.question("Nama pengguna: "));
const password = process.env.SIMPASCA_PASSWORD ?? (await rl.question("Kata sandi: "));
rl.close();

({ access_token: token } = await api("POST", "/api/auth/login", { username, password }));
const me = await api("GET", "/api/auth/me");
console.log(`Masuk sebagai ${me.name} (id ${me.id}) ke ${API}`);

try {
  const itemIds = {};
  const existingItems = await listAll("/api/inventory-items");
  for (const { initial_stock, ...item } of items) {
    const found = existingItems.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
    if (found) {
      itemIds[item.name] = found.id;
      console.log(`  barang ada: ${item.name}`);
      continue;
    }
    const created = await api("POST", "/api/inventory-items", {
      ...item,
      initial_stock: String(initial_stock),
      need_ratio: item.need_ratio === null ? null : String(item.need_ratio),
    });
    // The API records the opening stock as STOK_AWAL itself (AB-02).
    itemIds[item.name] = created.id;
    console.log(`+ barang: ${item.name} (${initial_stock} ${item.stock_unit})`);
  }

  const disasterIds = {};
  const existingDisasters = await listAll("/api/disasters");
  for (const { key, ...disaster } of disasters) {
    const found = existingDisasters.find(
      (d) =>
        d.disaster_type === disaster.disaster_type &&
        d.regency_city === disaster.regency_city &&
        new Date(d.occurred_at).getTime() === new Date(disaster.occurred_at).getTime(),
    );
    if (found) {
      disasterIds[key] = found.id;
      console.log(`  bencana ada: ${disaster.disaster_type} ${disaster.regency_city}`);
      continue;
    }
    disasterIds[key] = (await api("POST", "/api/disasters", disaster)).id;
    console.log(`+ bencana: ${disaster.disaster_type} ${disaster.regency_city}`);
  }

  const stock = {};
  for (const m of await listAll("/api/stock-movements")) {
    stock[m.item_id] = (stock[m.item_id] ?? 0) + Number(m.quantity_in) - Number(m.quantity_out);
  }
  for (const s of shipments) {
    // Never ship more than is in stock (AB-03), e.g. when an item already existed with less.
    const short = Object.entries(s.items).filter(([name, q]) => (stock[itemIds[name]] ?? 0) < q);
    if (short.length > 0) {
      console.log(`  pengiriman dilewati (stok kurang: ${short.map(([n]) => n).join(", ")}): ${s.request_key}`);
      continue;
    }
    let shipment;
    try {
      // One request: the API writes the items and their PENGIRIMAN movements (AB-03.1).
      shipment = await api("POST", "/api/shipments", {
        disaster_id: disasterIds[s.disaster],
        shipped_at: atWib(s.shipped),
        destination: s.destination,
        person_in_charge: s.person_in_charge,
        request_key: s.request_key,
        items: Object.entries(s.items).map(([name, quantity]) => ({ item_id: itemIds[name], quantity })),
      });
    } catch (error) {
      if (error.status === 409) {
        console.log(`  pengiriman ada: ${s.request_key}`);
        continue;
      }
      throw error;
    }
    for (const [name, quantity] of Object.entries(s.items)) stock[itemIds[name]] -= quantity;
    // A new shipment is always DIKIRIM; receipt is confirmed separately (AB-03.3).
    if (s.received) {
      await api("PATCH", `/api/shipments/${shipment.id}`, { status: "DITERIMA", received_at: atWib(s.received) });
    }
    console.log(`+ pengiriman: ${s.destination} (${Object.keys(s.items).length} barang)`);
  }

  for (const t of cash) {
    try {
      await api("POST", "/api/cash-transactions", t);
      console.log(`+ kas: ${t.description}`);
    } catch (error) {
      if (error.status !== 409) throw error;
      console.log(`  kas ada: ${t.request_key}`);
    }
  }
  console.log("Selesai.");
} finally {
  await api("POST", "/api/auth/logout").catch(() => {});
}
