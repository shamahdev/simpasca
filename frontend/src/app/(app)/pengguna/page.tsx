import { AlertContent, AlertDescription, AlertIndicator, AlertRoot, Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { UserManager } from "@/components/pengguna/user-manager";
import { getCurrentUser, isSuperadmin } from "@/lib/auth";
import { listUsers } from "@/lib/data/users";
import { formatShortDate } from "@/lib/format";
import { redirectToLogin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kelola akun",
};

/** Kelola akun petugas (UC-02): superadmin only (KF-01.4, AC-02). */
export default function UserPage() {
  return (
    <>
      <PageHeader title="Kelola akun" description="Buat dan kelola akun petugas BNPB." />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const user = await getCurrentUser();
  if (!user) redirectToLogin();
  if (!isSuperadmin(user)) {
    return (
      <AlertRoot status="warning">
        <AlertIndicator />
        <AlertContent>
          <AlertDescription>Hanya superadmin yang dapat mengelola akun pengguna.</AlertDescription>
        </AlertContent>
      </AlertRoot>
    );
  }
  const users = await listUsers();
  return (
    <UserManager
      rows={users.map((u) => ({
        id: String(u.id),
        name: u.name,
        username: u.username,
        role: u.role,
        createdText: u.createdAt ? formatShortDate(u.createdAt) : "—",
        isSelf: u.id === user.id,
      }))}
    />
  );
}
