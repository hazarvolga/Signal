export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-32 text-center font-editorial italic text-5xl text-ink/20">{message}</div>
  );
}
