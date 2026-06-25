"use client";
import type { ReactNode } from "react";

export type MobileTimelineItem = {
  time: string;
  title: string;
  body?: ReactNode;
  state?: "past" | "current" | "future";
};

interface MobileTimelineProps {
  items: MobileTimelineItem[];
}

export default function MobileTimeline({ items }: MobileTimelineProps) {
  return (
    <div className="m-timeline">
      {items.map((item, i) => (
        <div
          key={i}
          className="m-timeline-item"
          style={item.state === "future" ? { opacity: 0.45 } : undefined}
        >
          <div className="when">
            {item.time}
            {item.state === "current" ? " · In progress" : ""}
          </div>
          <div className="body" style={{ fontWeight: item.state === "current" ? 700 : 600 }}>
            {item.title}
          </div>
          {item.body && <div className="body">{item.body}</div>}
        </div>
      ))}
    </div>
  );
}
