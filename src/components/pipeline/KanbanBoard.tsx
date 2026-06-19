"use client";
/**
 * Generic Kanban board with native HTML5 drag-and-drop.
 * Columns and cards are fully typed via generics.
 */
import { useState } from "react";

export type KanbanColumn<T> = {
  key: string;
  label: string;
  color: string;
  items: T[];
};

type Props<T> = {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, column: string) => React.ReactNode;
  onMove: (itemId: number | string, fromColumn: string, toColumn: string) => Promise<void>;
  getId: (item: T) => number | string;
};

export function KanbanBoard<T>({ columns: initialColumns, renderCard, onMove, getId }: Props<T>) {
  const [columns, setColumns]   = useState(initialColumns);
  const [dragging, setDragging] = useState<{ id: number | string; from: string } | null>(null);
  const [dragOver, setDragOver]  = useState<string | null>(null);

  function handleDragStart(id: number | string, from: string) {
    setDragging({ id, from });
  }

  function handleDrop(toKey: string) {
    if (!dragging || dragging.from === toKey) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    // Optimistic update
    setColumns((prev) => {
      const fromCol = prev.find((c) => c.key === dragging.from);
      const toCol   = prev.find((c) => c.key === toKey);
      if (!fromCol || !toCol) return prev;

      const item = fromCol.items.find((i) => getId(i) === dragging.id);
      if (!item) return prev;

      return prev.map((c) => {
        if (c.key === dragging.from) return { ...c, items: c.items.filter((i) => getId(i) !== dragging.id) };
        if (c.key === toKey)        return { ...c, items: [item, ...c.items] };
        return c;
      });
    });

    // Persist
    onMove(dragging.id, dragging.from, toKey).catch(() => {
      // Revert on error (simple: restore from initialColumns re-fetch)
      setColumns(initialColumns);
    });

    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.key}
          className={`flex-shrink-0 w-64 rounded-xl flex flex-col transition-colors ${
            dragOver === col.key ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-100"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop(col.key)}
        >
          {/* Column header */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.color}`}>
            <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
            <span className="text-xs font-semibold bg-white/50 px-1.5 py-0.5 rounded-full">
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 p-2 space-y-2 min-h-[120px]">
            {col.items.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg">
                Drop here
              </div>
            )}
            {col.items.map((item) => {
              const id = getId(item);
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(id, col.key)}
                  className={`cursor-grab active:cursor-grabbing transition-opacity ${
                    dragging?.id === id ? "opacity-40" : "opacity-100"
                  }`}
                >
                  {renderCard(item, col.key)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
