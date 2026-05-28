'use client';

import { FileSignal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getDocumentsByBatchAction } from '@/actions/dataset-action';

const formatFileSize = (fileSize: number) => {
  if (fileSize < 1024) {
    return `${fileSize}B`;
  }
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(2)}KB`;
  }
  return `${(fileSize / 1024 / 1024).toFixed(2)}MB`;
};

type Props = {
  batch: string | undefined;
  datasetId: string;
};

const DataProcessing = ({ batch, datasetId }: Props) => {
  const [documents, setDocuments] = useState<
    {
      id: string;
      name: string;
      fileSize: number;
      progress: number;
    }[]
  >([]);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!batch) {
      return;
    }
    if (timer.current) {
      clearInterval(timer.current);
    }
    timer.current = setInterval(async () => {
      const result = await getDocumentsByBatchAction({
        datasetId: datasetId,
        batchId: batch,
      });
      if (!result?.data) {
        toast.error('Failed to get documents by batch');
        return;
      }
      setDocuments(
        result.data.map((document) => ({
          id: document.id,
          name: document.name,
          fileSize: document.size,
          progress:
            document.status === 'completed'
              ? 100
              : Math.round(
                  (document.completedSegmentCount / document.segmentCount) *
                    100,
                ),
        })),
      );
    }, 3000);
  }, [batch, datasetId]);

  return (
    <div>
      <h1 className="text-sm font-medium mb-2">Server-side processing</h1>
      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex items-center bg-muted rounded-lg border py-2 px-4 gap-2"
          >
            <FileSignal className="shrink-0 size-6" />
            <div className="grow">
              <p>{document.name}</p>
              <p>{formatFileSize(document.fileSize)}</p>
            </div>
            <p className="shrink-0">
              {document.progress === 100
                ? 'Completed'
                : `${document.progress}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataProcessing;
