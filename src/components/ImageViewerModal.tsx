'use client';

import { AnimatePresence } from 'framer-motion';
import AdminModalShell from '@/components/AdminModalShell';

interface ImageViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function getProxiedImageUrl(url: string) {
  if (!url) return '';
  return `/api/car-wash/image?url=${encodeURIComponent(url)}`;
}

export default function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  return (
    <AnimatePresence>
      {imageUrl && (
        <AdminModalShell
          onClose={onClose}
          contentClassName="w-full sm:max-w-md rounded-[var(--radius-xl)] overflow-hidden"
        >
          <img src={getProxiedImageUrl(imageUrl)} alt="รูปใบงาน" className="w-full h-auto max-h-[80vh] object-contain" style={{ background: 'var(--bg-inset)' }} />
        </AdminModalShell>
      )}
    </AnimatePresence>
  );
}
