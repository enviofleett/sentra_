import { Wind, Flower2, TreeDeciduous } from "lucide-react";
import { motion } from "framer-motion";

interface ScentPyramidProps {
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  className?: string;
}

export const ScentPyramid = ({ 
  topNotes = [], 
  heartNotes = [], 
  baseNotes = [],
  className = ""
}: ScentPyramidProps) => {
  const hasNotes = topNotes.length > 0 || heartNotes.length > 0 || baseNotes.length > 0;
  
  if (!hasNotes) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      <h3 className="font-serif text-xl tracking-wide text-foreground">
        Scent Profile
      </h3>
      
      <div className="space-y-5">
        {/* Top Notes */}
        {topNotes.length > 0 && (
          <motion.div 
            className="flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Wind className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Top Notes
              </p>
              <div className="flex flex-wrap gap-2">
                {topNotes.map((note, i) => (
                  <motion.span
                    key={note}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="px-3 py-1.5 text-sm bg-accent text-foreground rounded-full font-medium"
                  >
                    {note}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Heart Notes */}
        {heartNotes.length > 0 && (
          <motion.div 
            className="flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Heart Notes
              </p>
              <div className="flex flex-wrap gap-2">
                {heartNotes.map((note, i) => (
                  <motion.span
                    key={note}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                    className="px-3 py-1.5 text-sm bg-secondary/10 text-secondary rounded-full font-medium"
                  >
                    {note}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Base Notes */}
        {baseNotes.length > 0 && (
          <motion.div 
            className="flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <TreeDeciduous className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Base Notes
              </p>
              <div className="flex flex-wrap gap-2">
                {baseNotes.map((note, i) => (
                  <motion.span
                    key={note}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                    className="px-3 py-1.5 text-sm bg-primary/10 text-foreground rounded-full font-medium"
                  >
                    {note}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
