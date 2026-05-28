'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ImageUpload, { type ImageUploadRef } from '@/components/ImageUpload';
import LoadingButton from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const datasetFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name should be less than 100 characters' }),
  description: z
    .string()
    .max(2000, { message: 'Description should be less than 2000 characters' }),
});

type DatasetFormData = z.infer<typeof datasetFormSchema>;

export type FormData = DatasetFormData & { icon: string };

type Props = {
  defaultValues?: FormData;
  onSubmit: (values: FormData) => Promise<void>;
  onCancel: () => void;
};

const DatasetForm = ({ defaultValues, onSubmit, onCancel }: Props) => {
  const form = useForm<DatasetFormData>({
    resolver: zodResolver(datasetFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const uploadImageRef = useRef<ImageUploadRef>(null);
  const iconUrlRef = useRef<string>(defaultValues?.icon || '');

  const handleSubmit = async (values: DatasetFormData) => {
    try {
      setIsLoading(true);
      const iconUrl = await uploadImageRef.current?.uploadImage(
        iconUrlRef.current,
      );

      if (!iconUrl) {
        return;
      }

      iconUrlRef.current = iconUrl;

      await onSubmit({
        ...values,
        icon: iconUrl,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-center mb-6">
        <ImageUpload
          alt="dataset icon"
          imageUrl={defaultValues?.icon}
          ref={uploadImageRef}
          required
        />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 px-1"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required-label">Dataset name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Please enter the dataset name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required-label">
                  Dataset description
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please enter the dataset description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <LoadingButton type="submit" text="Save" isLoading={isLoading} />
          </div>
        </form>
      </Form>
    </div>
  );
};

export default DatasetForm;
