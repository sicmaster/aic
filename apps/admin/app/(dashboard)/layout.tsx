import { ProtectedDashboardLayout } from '@/widgets/protected-dashboard-layout/ui/protected-dashboard-layout';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedDashboardLayout>{children}</ProtectedDashboardLayout>;
}
