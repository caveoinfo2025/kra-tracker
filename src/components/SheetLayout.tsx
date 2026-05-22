import type { ReactNode } from "react";

export default function SheetLayout({
  title,
  icon,
  description,
  action,
  children,
}: {
  title: string;
  icon: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>{icon}</span> {title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
