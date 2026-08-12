import BeeLoader from "@/components/shared/BeeLoader";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <BeeLoader size={96} />
    </div>
  );
}
