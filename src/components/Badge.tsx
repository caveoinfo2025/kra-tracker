type Variant = "success" | "warning" | "danger" | "info" | "neutral";

const styles: Record<Variant, string> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-700",
};

export default function Badge({ label, variant = "neutral" }: { label: string; variant?: Variant }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  );
}
