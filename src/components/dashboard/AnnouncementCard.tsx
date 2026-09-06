4import { motion } from 'framer-motion';
import { Megaphone, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AnnouncementCardProps {
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  date: string;
  course?: string;
  isPinned?: boolean;
  isGlobal?: boolean;
  delay?: number;
}

export function AnnouncementCard({
  title,
  content,
  author,
  authorAvatar,
  date,
  course,
  isPinned = false,
  isGlobal = false,
  delay = 0,
}: AnnouncementCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative p-4 rounded-xl border bg-card hover:shadow-md transition-all",
        isPinned && "border-secondary/50 bg-secondary/5"
      )}
    >
      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute -top-2 -right-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg">
            <Pin className="h-3 w-3" />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* Icon or Avatar */}
        {isGlobal ? (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Megaphone className="h-5 w-5" />
          </div>
        ) : (
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={authorAvatar} alt={author} />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {author.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {course && (
                <p className="text-xs font-medium text-secondary mb-0.5">{course}</p>
              )}
              <h4 className="font-semibold text-foreground">{title}</h4>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{date}</span>
          </div>

          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{content}</p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">by {author}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
