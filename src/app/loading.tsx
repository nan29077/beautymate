export default function RootLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-rose-100 border-t-[#b44b68]" />
        <p className="mt-4 text-sm font-medium text-gray-500">페이지를 준비하고 있어요</p>
      </div>
    </div>
  );
}
