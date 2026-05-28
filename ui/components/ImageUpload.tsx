'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Eye, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import {
  type ChangeEventHandler,
  type RefObject,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { generateCredentialAction } from '@/actions/upload-file-action';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_SIZE,
  uploadFile,
} from '@/lib/cos';
import { cn, getActionErrorMsg } from '@/lib/utils';

export type ImageUploadRef = {
  uploadImage: (defaultImageUrl?: string) => Promise<string | null>;
};

type Props = {
  id?: string;
  alt: string;
  imageUrl?: string;
  allowedExtensions?: string[];
  className?: string;
  label?: string;
  ref?: RefObject<ImageUploadRef | null>;
  required?: boolean;
  onAutoUpload?: (url: string | null) => Promise<void>;
};

const ImageUpload = ({
  id,
  alt,
  imageUrl,
  className,
  allowedExtensions = ALLOWED_IMAGE_EXTENSIONS,
  label = 'Upload Image',
  ref,
  required = false,
  onAutoUpload,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || null);
  const [isPending, setIsPending] = useState(false);

  useImperativeHandle(ref, () => {
    return {
      uploadImage,
    };
  });

  const handleImageChange: ChangeEventHandler<HTMLInputElement> = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));

    if (onAutoUpload) {
      const url = await uploadImage();
      onAutoUpload(url);
    }
  };

  const handleClear = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const uploadImage = async (defaultImageUrl?: string) => {
    const file = inputRef.current?.files?.[0];
    if (!file && !imageUrl && required && !defaultImageUrl) {
      toast.error('Please upload an image');
      return null;
    }

    if (!file) {
      return defaultImageUrl || imageUrl || null;
    }

    try {
      setIsPending(true);

      const res = await generateCredentialAction({
        fileName: file.name,
        fileSize: file.size,
      });

      if (!res?.data) {
        toast.error(getActionErrorMsg(res, 'Upload failed'));
        return null;
      }

      const { credential, key, bucket } = res.data;

      const url = await uploadFile(credential, {
        bucket: bucket.name,
        region: bucket.region,
        key,
        file,
        sliceSize: ALLOWED_IMAGE_SIZE,
        schema: bucket.schema,
      });

      if (url === null) {
        toast.error('Upload failed');
      } else {
        toast.success('Upload successful');
      }

      return url;
    } catch (error) {
      console.error('Image upload failed: ', error);
      toast.error('Upload failed');
      return null;
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setIsPending(false);
    }
  };

  return (
    <div>
      {previewUrl ? (
        <div
          className={cn(
            'size-20 bg-muted rounded-lg overflow-hidden relative group',
            className,
          )}
        >
          <Avatar className="w-full h-full rounded-lg">
            <AvatarImage src={previewUrl} alt={alt} />
          </Avatar>
          {isPending ? (
            <div className="absolute left-0 top-0 w-full h-full bg-gray-500/80">
              <div className="flex justify-center items-center w-full h-full">
                <p className="text-white text-xs">Uploading...</p>
              </div>
            </div>
          ) : (
            <div className="flex text-white justify-around items-center absolute top-0 left-0 w-full h-full bg-gray-500/80 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
              <Dialog>
                <DialogTrigger>
                  <Eye size={16} />
                </DialogTrigger>
                <DialogContent className="w-fit border-none">
                  <VisuallyHidden asChild>
                    <DialogHeader>
                      <DialogTitle>Preview Image</DialogTitle>
                      <DialogDescription>Preview {alt}</DialogDescription>
                    </DialogHeader>
                  </VisuallyHidden>
                  <Image
                    src={previewUrl}
                    alt={alt}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </DialogContent>
              </Dialog>

              <Separator orientation="vertical" className="h-4" />
              <button type="button" onClick={handleClear}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'size-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center border',
            className,
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-0.5">
            <Plus size={16} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </button>
      )}

      <input
        id={id}
        ref={inputRef}
        hidden
        type="file"
        accept={allowedExtensions.map((ext) => `image/${ext}`).join(',')}
        max={ALLOWED_IMAGE_SIZE}
        onChange={handleImageChange}
      />
    </div>
  );
};

export default ImageUpload;
