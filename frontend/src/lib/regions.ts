/** A kabupaten/kota with its approximate centre, used when a disaster has no coordinates (AC-27). */
export interface Regency {
  name: string;
  latitude: number;
  longitude: number;
}

// shortcut: a sample of provinces and regencies; load the full Kemendagri list when the backend provides it.
export const regions: Record<string, Regency[]> = {
  Aceh: [{ name: "Kota Banda Aceh", latitude: 5.548, longitude: 95.324 }],
  "Sumatera Barat": [
    { name: "Kab. Agam", latitude: -0.25, longitude: 100.17 },
    { name: "Kota Padang", latitude: -0.947, longitude: 100.417 },
  ],
  "Sumatera Selatan": [
    { name: "Kota Palembang", latitude: -2.99, longitude: 104.756 },
  ],
  "DKI Jakarta": [
    { name: "Kota Jakarta Timur", latitude: -6.225, longitude: 106.9 },
  ],
  "Jawa Barat": [
    { name: "Kab. Bandung", latitude: -7.025, longitude: 107.52 },
    { name: "Kab. Bogor", latitude: -6.481, longitude: 106.854 },
    { name: "Kab. Cianjur", latitude: -6.816, longitude: 107.142 },
    { name: "Kab. Garut", latitude: -7.227, longitude: 107.908 },
    { name: "Kota Bandung", latitude: -6.917, longitude: 107.619 },
  ],
  "Jawa Tengah": [
    { name: "Kab. Banjarnegara", latitude: -7.367, longitude: 109.7 },
    { name: "Kab. Demak", latitude: -6.894, longitude: 110.638 },
    { name: "Kota Semarang", latitude: -6.966, longitude: 110.42 },
  ],
  "Jawa Timur": [
    { name: "Kab. Malang", latitude: -8.05, longitude: 112.63 },
    { name: "Kota Surabaya", latitude: -7.257, longitude: 112.752 },
  ],
  "Nusa Tenggara Barat": [
    { name: "Kab. Lombok Utara", latitude: -8.36, longitude: 116.21 },
  ],
  "Sulawesi Tengah": [{ name: "Kota Palu", latitude: -0.9, longitude: 119.87 }],
};

export function findRegency(province: string, regencyCity: string) {
  return regions[province]?.find((r) => r.name === regencyCity);
}
