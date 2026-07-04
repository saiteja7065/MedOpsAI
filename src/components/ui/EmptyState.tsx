export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
