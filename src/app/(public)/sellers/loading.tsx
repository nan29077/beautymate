export default function Loading() {
  return (
    <div className="beautymate-pc-page flex min-h-[65vh] items-center justify-center bg-white">
      <div className="text-center">
        <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-rose-100 border-t-[#b44b68]" />
        <p className="mt-4 text-sm font-medium text-gray-500">뷰티 전문가를 불러오고 있어요</p>
      </div>
    </div>
  );
}
