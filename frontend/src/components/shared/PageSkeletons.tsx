import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-2 shrink-0">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DataTableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-slate-200 rounded-xl bg-white shadow-xs",
        className
      )}
    >
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="px-4 py-3 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className={cn("h-4 flex-1", col === 0 && "max-w-[180px]", col === columns - 1 && "max-w-[60px] ml-auto")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton({ roleView = "Auditor" }: { roleView?: "Admin" | "Auditor" }) {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading dashboard">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={roleView === "Admin" ? 4 : 5} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Skeleton className="lg:col-span-5 h-80 rounded-xl" />
        <Skeleton className="lg:col-span-4 h-80 rounded-xl" />
        <Skeleton className="lg:col-span-3 h-80 rounded-xl" />
      </div>
      <DataTableSkeleton rows={5} columns={6} />
    </div>
  );
}

export function AssessmentListSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading assessments">
      <PageHeaderSkeleton />
      <CardListSkeleton count={4} />
    </div>
  );
}

export function AssessmentWorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading assessment">
      <Skeleton className="h-10 w-1/3 max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        <Skeleton className="lg:col-span-3 h-full min-h-[400px] rounded-xl" />
        <Skeleton className="lg:col-span-6 h-full min-h-[400px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-full min-h-[400px] rounded-xl" />
      </div>
    </div>
  );
}

export function AssessmentResultsSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading results">
      <Skeleton className="h-10 w-1/3 max-w-md" />
      <StatCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

export function AssessmentFindingsSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto" aria-busy aria-label="Loading findings">
      <Skeleton className="h-10 w-1/3 max-w-md" />
      <StatCardsSkeleton count={4} />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function AssessmentReviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading review">
      <Skeleton className="h-10 w-1/3 max-w-md" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function OrganizationDetailSkeleton() {
  return (
    <div className="space-y-6 h-full" aria-busy aria-label="Loading organization">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
      <DataTableSkeleton rows={4} columns={5} />
    </div>
  );
}

export function OrganizationsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-3 px-3 text-center">
            <Skeleton className="h-3 w-5 mx-auto" />
          </td>
          <td className="py-3 px-3.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-4 w-16 rounded-full" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-4 w-14 rounded-full" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-3.5 w-16" />
          </td>
          <td className="py-3 px-3 text-right">
            <Skeleton className="h-6 w-6 ml-auto rounded" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="py-3 px-3 text-center">
            <Skeleton className="h-3 w-5 mx-auto" />
          </td>
          <td className="py-3 px-3.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-4 w-16 rounded-full" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-4 w-14 rounded-full" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-3.5 w-12" />
          </td>
          <td className="py-3 px-3">
            <Skeleton className="h-3.5 w-16" />
          </td>
          <td className="py-3 px-3 text-right">
            <Skeleton className="h-6 w-6 ml-auto rounded" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading subscriptions">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <DataTableSkeleton rows={8} columns={6} />
    </div>
  );
}

export function ApiKeysPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading API keys">
      <PageHeaderSkeleton />
      <DataTableSkeleton rows={5} columns={4} />
    </div>
  );
}

export function WebhooksPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading webhooks">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}

export function FrameworkListSkeleton() {
  return <CardListSkeleton count={3} />;
}

export function ProfileSettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" aria-busy aria-label="Loading profile">
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function FormFieldsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg mt-4" />
    </div>
  );
}

export function DashboardShellContentSkeleton() {
  return (
    <div className="space-y-6 p-1" aria-busy aria-label="Loading workspace">
      <Skeleton className="h-8 w-48" />
      <StatCardsSkeleton count={4} />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function TableBodySkeletonRows({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3 px-3">
              <Skeleton className={cn("h-4", j === 0 ? "w-8 mx-auto" : "w-full max-w-[120px]")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
