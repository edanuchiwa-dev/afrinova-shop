export default function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-[#EAE8E2] overflow-hidden animate-pulse"
    >
      {/* Skeleton Image 4:5 */}
      <div className="aspect-[4/5] bg-[#EAE8E2] w-full" />

      {/* Skeleton Info */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-4 bg-[#EAE8E2] rounded-md w-3/4" />
        <div className="space-y-1.5">
          <div className="h-3 bg-[#F3F1EC] rounded-md w-full" />
          <div className="h-3 bg-[#F3F1EC] rounded-md w-4/5" />
        </div>
        <div className="pt-3.5 border-t border-[#F3F1EC] space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="h-5 bg-[#EAE8E2] rounded-md w-28" />
            <div className="h-4 bg-[#F3F1EC] rounded-full w-20" />
          </div>
          <div className="h-11 bg-[#EAE8E2] rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}
