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
      <div className="relative rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[hsl(var(--watch-case-frame-start))] to-[hsl(var(--watch-case-frame-end))] shadow-[0_4px_60px_-12px_hsl(var(--watch-case-shadow))]">
        
        {/* Glass lid effect - top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-3xl" />
        <div className="absolute inset-x-4 top-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Inner velvet lining */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[hsl(var(--watch-velvet-start))] to-[hsl(var(--watch-velvet-end))] p-4 sm:p-5 min-h-[200px]">
          
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 rounded-2xl opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />
          
          {/* Watch grid */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5"
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
        
        {/* Bottom edge shadow */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent rounded-b-3xl" />
      </div>
    </div>
  );
};
