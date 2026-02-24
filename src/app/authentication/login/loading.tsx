import { Skeleton } from '@/components/ui/skeleton';

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo placeholder */}
        <div className="flex justify-center">
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>

        {/* Card container */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-lg backdrop-blur-sm md:p-8">
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>

            {/* Input rows */}
            <div className="space-y-4">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-11 w-full rounded-lg" />

            {/* Divider / sign up link */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </div>
        </div>

        {/* Subtle footer */}
        <div className="flex justify-center">
          <Skeleton className="h-3 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
