import { motion } from "framer-motion";
import { WatchShowcaseCard } from "./WatchShowcaseCard";

interface Watch {
  id: string;
  brand: string;
  model: string;
  dial_color: string;
  type: string;
  cost: number;
  image_url?: string;
  ai_image_url?: string;
  rarity?: string;
  available_for_trade?: boolean;
}

interface WatchCaseGridProps {
  watches: Watch[];
  wearEntries: { watch_id: string }[];
  onDelete?: () => void;
}

export const WatchCaseGrid = ({ watches, wearEntries, onDelete }: WatchCaseGridProps) => {
  return (
    <div className="relative">
      {/* Watch case frame */}
      <div className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-[hsl(var(--watch-case-frame-start))] to-[hsl(var(--watch-case-frame-end))] shadow-[0_8px_60px_-12px_hsl(var(--watch-case-shadow))]">
        
        {/* Glass lid effect - top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-t-3xl" />
        <div className="absolute inset-x-4 top-1 h-[0.5px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Case hinge details */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gradient-to-b from-white/10 to-transparent" />
        
        {/* Inner velvet lining */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[hsl(var(--watch-velvet-start))] to-[hsl(var(--watch-velvet-end))] p-3 sm:p-4 min-h-[200px] shadow-inner">
          
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 rounded-2xl opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />
          
          {/* Inner shadow for depth */}
          <div className="absolute inset-0 rounded-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" />
          
          {/* Watch grid */}
          <motion.div 
            className="relative grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } }
            }}
          >
            {watches.map((watch, index) => (
              <WatchShowcaseCard
                key={watch.id}
                watch={watch}
                totalDays={wearEntries.filter(w => w.watch_id === watch.id).length}
                index={index}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        </div>
        
        {/* Bottom edge shadow & clasp detail */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent rounded-b-3xl" />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gold/30" />
      </div>
    </div>
  );
};
