import type { CashTransaction, CashTransactionType } from "../types.ts";

/** Base URL of the SIMPASCA backend (docs: /docs/api/). */
export const API_URL =
  process.env.SIMPASCA_API_URL ?? "https://api.simpasca.shiddiq.dev";

/** API limit: 13 integer digits, 2 decimals (UC-12 finding T2). */
export const MAX_CASH_AMOUNT = 9_999_999_999_999.99;
/** Description length limit (UC-12 finding T5; the API allows up to 5000). */
export const MAX_DESCRIPTION_LENGTH = 1000;
export const PAGE_SIZE = 20;

export interface CashInput {
  type: string;
  amount: string;
  description: string;
  transactionDate: string;
}

export type CashField = keyof CashInput;
export type CashFieldErrors = Partial<Record<CashField, string>>;

export type CashErrorCode =
  | "INVALID"
  | "NOT_FOUND"
  | "REQUEST_KEY_CONFLICT"
  | "UNAVAILABLE";

export class CashError extends Error {
  readonly code: CashErrorCode;
  readonly fieldErrors?: CashFieldErrors;

  constructor(code: CashErrorCode, message: string, fieldErrors?: CashFieldErrors) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/** Validates raw form input before it reaches the API (KF-08.1, UC-12 A3). */
export function validateCashInput(input: CashInput) {
  const errors: CashFieldErrors = {};
  const amountText = input.amount.trim();
  const amount = Number(amountText);
  const description = input.description.trim();

  if (input.type !== "MASUK" && input.type !== "KELUAR") {
    errors.type = "Pilih jenis transaksi Masuk atau Keluar.";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || !(amount > 0)) {
    errors.amount = "Nominal harus lebih dari 0 dengan paling banyak 2 desimal.";
  } else if (amount > MAX_CASH_AMOUNT) {
    errors.amount = "Nominal paling banyak 13 digit sebelum desimal.";
  }
  if (description.length === 0) {
    errors.description = "Keterangan wajib diisi.";
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keterangan paling banyak ${MAX_DESCRIPTION_LENGTH} karakter.`;
  }
  if (!isValidDate(input.transactionDate)) {
    errors.transactionDate = "Tanggal transaksi tidak valid.";
  }

  if (Object.keys(errors).length > 0) {
    throw new CashError("INVALID", "Periksa kembali isian transaksi.", errors);
  }
  return {
    type: input.type as CashTransactionType,
    amount: amount.toFixed(2),
    description,
    transaction_date: input.transactionDate,
  };
}

// --- API mapping -----------------------------------------------------------

type ApiCashType = "income" | "expense";

export interface ApiCashTransaction {
  id: number;
  type: ApiCashType;
  amount: string;
  description: string | null;
  transaction_date: string;
  request_key: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toApiType: Record<CashTransactionType, ApiCashType> = {
  MASUK: "income",
  KELUAR: "expense",
};
const fromApiType: Record<ApiCashType, CashTransactionType> = {
  income: "MASUK",
  expense: "KELUAR",
};

export function fromApi(t: ApiCashTransaction): CashTransaction {
  return {
    id: String(t.id),
    type: fromApiType[t.type],
    amount: Number(t.amount),
    description: t.description ?? "",
    transactionDate: t.transaction_date,
    requestKey: t.request_key,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    deletedAt: t.deleted_at,
  };
}

const errorCodeFor = (status: number): CashErrorCode =>
  status === 404
    ? "NOT_FOUND"
    : status === 409
      ? "REQUEST_KEY_CONFLICT"
      : status >= 500
        ? "UNAVAILABLE"
        : "INVALID";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new CashError("UNAVAILABLE", "Server API tidak dapat dihubungi.");
  }
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CashError(
      errorCodeFor(response.status),
      body?.message ?? `Permintaan ke server gagal (${response.status}).`,
    );
  }
  return body as T;
}

// --- Endpoints -------------------------------------------------------------

export interface CashListFilter {
  page?: number;
  limit?: number;
  type?: CashTransactionType;
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  dateTo?: string;
}

/** GET /api/cash-transactions: live rows, newest date first (finding T4). */
export async function listCashTransactions(filter: CashListFilter = {}) {
  const params = new URLSearchParams({
    page: String(filter.page ?? 1),
    limit: String(filter.limit ?? PAGE_SIZE),
  });
  if (filter.type) params.set("type", toApiType[filter.type]);
  if (filter.dateFrom) params.set("date_from", filter.dateFrom);
  if (filter.dateTo) params.set("date_to", filter.dateTo);

  const { data, meta } = await request<{
    data: ApiCashTransaction[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }>(`/api/cash-transactions?${params}`);
  return {
    rows: data.map(fromApi),
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    totalPages: meta.total_pages,
  };
}

/** GET /api/cash-transactions/summary without filters: totals over every live row (AB-04.1, finding T1). */
export async function getCashSummary() {
  const { data } = await request<{
    data: {
      total_transactions: number;
      total_income: string;
      total_expense: string;
      balance: string;
    };
  }>("/api/cash-transactions/summary");
  return {
    totalTransactions: data.total_transactions,
    totalIncome: Number(data.total_income),
    totalExpense: Number(data.total_expense),
    balance: Number(data.balance),
  };
}

/** GET /api/cash-transactions/{id}; undefined when missing or deleted (UC-12 A6). */
export async function getCashTransaction(
  id: string,
): Promise<CashTransaction | undefined> {
  if (!/^\d{1,10}$/.test(id)) return undefined;
  try {
    const { data } = await request<{ data: ApiCashTransaction }>(
      `/api/cash-transactions/${id}`,
    );
    return fromApi(data);
  } catch (error) {
    if (error instanceof CashError && error.code === "NOT_FOUND") return undefined;
    throw error;
  }
}

/**
 * POST /api/cash-transactions. The API rejects a reused request key with 409
 * instead of creating a duplicate (AB-03.4, AC-19).
 */
export async function createCashTransaction(
  input: CashInput,
  requestKey: string,
  userId: number,
): Promise<CashTransaction> {
  const { type, ...data } = validateCashInput(input);
  try {
    const { data: created } = await request<{ data: ApiCashTransaction }>(
      "/api/cash-transactions",
      {
        method: "POST",
        body: JSON.stringify({
          ...data,
          type: toApiType[type],
          request_key: requestKey,
          created_by: userId,
        }),
      },
    );
    return fromApi(created);
  } catch (error) {
    if (error instanceof CashError && error.code === "REQUEST_KEY_CONFLICT") {
      throw new CashError(
        error.code,
        "Transaksi ini sudah tercatat sebelumnya. Tutup formulir lalu periksa daftar transaksi.",
      );
    }
    throw error;
  }
}

/** PATCH /api/cash-transactions/{id}: every attribute, including the type (finding T3). */
export async function updateCashTransaction(
  id: string,
  input: CashInput,
): Promise<CashTransaction> {
  const { type, ...data } = validateCashInput(input);
  const { data: updated } = await request<{ data: ApiCashTransaction }>(
    `/api/cash-transactions/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ ...data, type: toApiType[type] }) },
  );
  return fromApi(updated);
}

/** DELETE /api/cash-transactions/{id}: soft delete (UC-12 A5). */
export async function deleteCashTransaction(id: string): Promise<void> {
  await request<void>(`/api/cash-transactions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
