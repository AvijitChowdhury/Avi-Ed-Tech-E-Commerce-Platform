import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ann = { id: string; text: string; link: string | null };

export default function AnnouncementTicker() {
  const [items, setItems] = useState<Ann[]>([]);
  useEffect(() => {
    supabase
      .from("announcements")
      .select("id, text, link")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setItems(data ?? []));
  }, []);
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className="gradient-primary-bg text-primary-foreground overflow-hidden">
      <div className="relative flex whitespace-nowrap py-2 text-sm font-medium">
        <div className="flex shrink-0 animate-marquee items-center gap-12 px-6">
          {doubled.map((a, i) => (
            <a key={a.id + i} href={a.link ?? "#"} className="hover:underline">
              {a.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
